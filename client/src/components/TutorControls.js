import React, { useState, useEffect } from 'react';
import { useWhiteboard } from '../context/WhiteboardContext';
import { FaLock, FaLockOpen, FaUsers, FaCopy, FaSignOutAlt } from 'react-icons/fa';
import { EVENTS } from '../utils/socketEvents';

const TutorControls = ({ users, emit, roomId, userId, onCloseRoom }) => {
  const { userRole } = useWhiteboard();
  const [showControls, setShowControls] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [studentsStatus, setStudentsStatus] = useState({});
  
  // Initialize student status tracking - moved before the conditional return
  useEffect(() => {
    // Only process if user is a tutor
    if (userRole === 'tutor') {
      const initialStatus = {};
      users.forEach(user => {
        if (user.role === 'student') {
          initialStatus[user.id] = user.isBlocked || false;
        }
      });
      setStudentsStatus(initialStatus);
    }
  }, [users, userRole]);
  
  // Only show for tutors
  if (userRole !== 'tutor') return null;
  
  const toggleStudentPermission = (studentId, currentlyBlocked) => {
    // Update local state first for immediate feedback
    setStudentsStatus(prev => ({
      ...prev,
      [studentId]: !currentlyBlocked
    }));
    
    // Then emit to server - make sure we're only toggling for the specific student
    emit(EVENTS.TOGGLE_STUDENT_PERMISSION, {
      roomId,
      studentId,
      isAllowed: !currentlyBlocked  // isAllowed true means "blocked"
    });
    
  };
  
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
      });
  };
  
  // Filter to only show students
  const students = users.filter(user => user.role === 'student');
  
  const handleCloseRoom = () => {
    if (window.confirm('Are you sure you want to close this room? All participants will be disconnected.')) {
      
      // First emit the close room event to the server
      emit(EVENTS.CLOSE_ROOM, roomId);
      
      // Add a small delay to ensure the event is sent before navigating
      setTimeout(() => {
        // Call the parent component's onCloseRoom handler
        if (onCloseRoom) onCloseRoom();
      }, 300);
    }
  };
  
  return (
    <div className="tutor-controls">
      <div className="tutor-controls-buttons">
        <button 
          className="control-button"
          onClick={copyRoomId}
          title="Copy Room ID"
        >
          <FaCopy /> {copySuccess ? copySuccess : 'Copy Room ID'}
        </button>
        
        <button 
          className="control-button"
          onClick={handleCloseRoom}
          title="Close Room"
        >
          <FaSignOutAlt /> Close Room
        </button>
        
        <button 
          className="control-button"
          onClick={() => setShowControls(!showControls)}
          title="Student Controls"
        >
          <FaUsers /> {showControls ? 'Hide Controls' : 'Student Controls'}
        </button>
      </div>
      
      {showControls && students.length > 0 && (
        <div className="student-controls-panel">
          <h3>Student Controls</h3>
          <ul className="student-list">
            {students.map(student => {
              // Use our local state or fallback to the user object
              const isBlocked = studentsStatus[student.id] !== undefined 
                ? studentsStatus[student.id] 
                : (student.isBlocked || false);
                
              return (
                <li key={student.id}>
                  <span>{student.name}</span>
                  <button 
                    onClick={() => toggleStudentPermission(student.id, isBlocked)}
                    className={`permission-toggle ${isBlocked ? 'blocked' : 'allowed'}`}
                    title={isBlocked ? "Unblock Student" : "Block Student"}
                  >
                    {isBlocked ? <FaLock /> : <FaLockOpen />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TutorControls;