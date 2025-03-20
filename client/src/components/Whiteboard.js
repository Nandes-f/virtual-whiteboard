import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WhiteboardProvider } from '../context/WhiteboardContext';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import Controls from './Controls';
import TutorControls from './TutorControls';
import useSocket from '../hooks/useSocket';
import { EVENTS } from '../utils/socketEvents';
import { FaSignOutAlt, FaUsers } from 'react-icons/fa';

const Whiteboard = ({ userId }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [userRole, setUserRole] = useState('');
    const disconnectFunctionRef = useRef(null);
    const [showUsersList, setShowUsersList] = useState(false);
    const canvasRef = useRef(null);
    
    // Get user name from localStorage or prompt
    useEffect(() => {
        const storedName = localStorage.getItem('whiteboard_user_name');
        const storedRole = localStorage.getItem('whiteboard_user_role');

        if (storedName) {
            setUserName(storedName);
            if (storedRole) {
                setUserRole(storedRole);
            }
        } else {
            // Only show the prompt if we don't have stored information
            setShowNamePrompt(true);
        }
    }, []);

    // Always call hooks at the top level, regardless of conditions
    const { isConnected, users, emit, on, off, disconnect, effectiveRole } = useSocket(
        roomId, 
        userId, 
        userName || '', // Provide empty string as fallback
        userRole
    );
    
    // Store the disconnect function for later use
    useEffect(() => {
        disconnectFunctionRef.current = disconnect;
    }, [disconnect]);

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (userName.trim()) {
            localStorage.setItem('whiteboard_user_name', userName);
            localStorage.setItem('whiteboard_user_role', userRole);
            setShowNamePrompt(false);
        }
    };

    const handleCloseRoom = () => {
        if (window.confirm('Are you sure you want to close this room? All participants will be disconnected.')) {
            // Navigate back to home
            navigate('/');
        }
    };

    const handleDisconnect = () => {
        if (window.confirm('Are you sure you want to disconnect from this room?')) {
            // First disconnect the socket if the function is available
            if (disconnectFunctionRef.current) {
                disconnectFunctionRef.current();
                
                // Small delay to ensure socket disconnection completes
                setTimeout(() => {
                    // Navigate back to home using navigate instead of window.location
                    navigate('/');
                }, 100);
            } else {
                navigate('/');
            }
        }
    };

    // Canvas action handlers
    const handleClearCanvas = () => {
        if (canvasRef.current && typeof canvasRef.current.clearCanvas === 'function') {
            canvasRef.current.clearCanvas();
        }
    };

    const handleSaveCanvas = () => {
        if (canvasRef.current && typeof canvasRef.current.exportCanvasAsImage === 'function') {
            const dataUrl = canvasRef.current.exportCanvasAsImage();
            if (dataUrl) {
                const link = document.createElement('a');
                link.download = `whiteboard-${roomId}-${new Date().toISOString().substring(0, 19)}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    const handleUndoAction = () => {
        if (canvasRef.current && typeof canvasRef.current.undoAction === 'function') {
            canvasRef.current.undoAction();
        }
    };

    const handleRedoAction = () => {
        if (canvasRef.current && typeof canvasRef.current.redoAction === 'function') {
            canvasRef.current.redoAction();
        }
    };

    const handleUploadFile = (file) => {
        if (canvasRef.current && typeof canvasRef.current.handleImageUpload === 'function') {
            canvasRef.current.handleImageUpload(file);
        }
    };

    // Add listener for room closure
    useEffect(() => {
        if (on) {
            // Make sure we're listening for the correct event name
            on(EVENTS.CLOSE_ROOM, () => {
                alert('The room has been closed by the tutor.');
                
                // Ensure we disconnect properly
                if (disconnectFunctionRef.current) {
                    disconnectFunctionRef.current();
                }
                
                // Force navigation to home page with replace to prevent back navigation
                navigate('/', { replace: true });
            });
        }
        
        return () => {
            if (off) {
                off(EVENTS.CLOSE_ROOM);
            }
        };
    }, [on, off, navigate]);

    // Render name prompt if needed
    if (showNamePrompt) {
        return (
            <div className="name-prompt-container">
                <div className="name-prompt">
                    <h2>Enter your information</h2>
                    <form onSubmit={handleNameSubmit}>
                        {/* Form content remains the same */}
                    </form>
                </div>
            </div>
        );
    }

    // Main whiteboard render
    return (
        <WhiteboardProvider userId={userId} initialRole={effectiveRole || userRole}>
            <div className="whiteboard-container">
                <div className="whiteboard-header">
                    <div className="room-info">
                        <h2>Room: {roomId}</h2>
                    </div>
                    <div className="header-controls">
                        <Controls roomId={roomId} />
                        <TutorControls 
                            users={users} 
                            emit={emit} 
                            roomId={roomId} 
                            userId={userId}
                            onCloseRoom={() => {
                                // Emit close room event to server before navigating
                                emit(EVENTS.CLOSE_ROOM, roomId);
                                // Small delay to ensure the event is sent before disconnecting
                                setTimeout(() => {
                                    if (disconnectFunctionRef.current) {
                                        disconnectFunctionRef.current();
                                    }
                                    navigate('/');
                                }, 200);
                            }}
                        />
                        {/* User list toggle button for students */}
                        {(effectiveRole || userRole) === 'student' && (
                            <button 
                                className="users-list-button"
                                onClick={() => setShowUsersList(!showUsersList)}
                                title="Show Users"
                            >
                                <FaUsers /> {users.length}
                            </button>
                        )}
                        <button 
                            className="disconnect-button"
                            onClick={handleDisconnect}
                            title="Disconnect"
                        >
                            <FaSignOutAlt /> Disconnect
                        </button>
                    </div>
                </div>
                
                {/* Users list popup for students */}
                {showUsersList && (
                    <div className="users-list-popup">
                        <div className="users-list-header">
                            <h3>Users in Room</h3>
                            <button onClick={() => setShowUsersList(false)}>×</button>
                        </div>
                        <ul className="users-list">
                            {users.map(user => (
                                <li key={user.id} className={`user-item ${user.role}`}>
                                    {user.name} {user.role === 'tutor' ? '(Tutor)' : ''}
                                    {user.id === userId ? ' (You)' : ''}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="whiteboard-main">
                    <Toolbar 
                        onClear={handleClearCanvas}
                        onSave={handleSaveCanvas}
                        onUndo={handleUndoAction}
                        onRedo={handleRedoAction}
                        onUpload={handleUploadFile}
                        onLeave={handleDisconnect}
                        disabled={(effectiveRole || userRole) === 'student' && users.find(u => u.id === userId)?.isBlocked}
                    />
                    <Canvas 
                        ref={canvasRef}
                        roomId={roomId}
                        userId={userId}
                        userRole={effectiveRole || userRole}
                        isConnected={isConnected}
                        emit={emit}
                        on={on}
                        off={off}
                    />
                </div>
            </div>
        </WhiteboardProvider>
    );
};

export default Whiteboard;