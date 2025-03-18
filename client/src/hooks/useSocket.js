import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { EVENTS } from '../utils/socketEvents';

const useSocket = (roomId, userId, userName, userRole) => {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const socketRef = useRef(null);
  // Store the effective role to ensure consistency
  const [effectiveRole, setEffectiveRole] = useState(null);

  useEffect(() => {
    // Don't create a connection if we don't have all required info
    if (!roomId || !userId || !userName) {
      return;
    }
    
    // Get the stored role if not provided
    const role = userRole || localStorage.getItem('whiteboard_user_role') || 'student';
    setEffectiveRole(role);
    
    // Create socket connection with more detailed logging
    console.log(`Attempting to connect to socket server at: ${process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'}`);
    
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true, // Force a new connection each time
      transports: ['websocket', 'polling'], // Try WebSocket first, then fallback to polling
      query: {
        roomId,
        userId,
        userName,
        userRole: role
      }
    });
    
    socketRef.current = socket;

    // Set up event listeners with enhanced logging
    socket.on('connect', () => {
      console.log('Connected to server with role:', role);
      setIsConnected(true);
      
      // Join the room with role information
      socket.emit(EVENTS.JOIN_ROOM, roomId, userId, userName || 'Anonymous', role);
      console.log(`Joined room: ${roomId} as ${role}`);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from server. Reason: ${reason}`);
      setIsConnected(false);
    });

    socket.on('users-list', (usersList) => {
      console.log('Received updated users list:', usersList);
      setUsers(usersList);
    });

    // Add specific listener for draw action acknowledgements
    socket.on(EVENTS.DRAW_ACTION, (drawAction) => {
      console.log('Received draw action from server:', drawAction);
    });

    // Clean up on unmount
    return () => {
      if (socket.connected) {
        console.log('Cleaning up socket connection on unmount');
        socket.emit('leave-room', roomId, userId);
        socket.disconnect();
      }
    };
  }, [roomId, userId, userName, userRole]);

  // Function to manually disconnect the socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Manually disconnecting socket');
      
      // Notify server that user is leaving intentionally
      if (socketRef.current.connected) {
        socketRef.current.emit('leave-room', roomId, userId);
        socketRef.current.disconnect();
      }
      
      // Force disconnect and cleanup
      socketRef.current = null;
      setIsConnected(false);
      setUsers([]);
    }
  }, [roomId, userId]);

  // Enhanced emit function with better error handling and debugging
  const emit = useCallback((event, ...args) => {
    if (socketRef.current && socketRef.current.connected) {
      console.log(`Emitting event: ${event}`, args);
      
      // Special handling for draw actions to ensure they're properly formatted
      if (event === EVENTS.DRAW_ACTION) {
        console.log('Draw action details:', JSON.stringify(args[2]));
      }
      
      socketRef.current.emit(event, ...args, (response) => {
        if (response && response.error) {
          console.error(`Error in ${event}:`, response.error);
        } else if (response) {
          console.log(`Server acknowledged ${event}:`, response);
        }
      });
      return true;
    } else {
      console.warn(`Cannot emit ${event}: socket not connected. Current state:`, 
        socketRef.current ? 'Socket exists but not connected' : 'Socket not initialized');
      return false;
    }
  }, []);

  // Function to add event listeners
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      console.log(`Registering listener for event: ${event}`);
      socketRef.current.on(event, (...args) => {
        console.log(`Received event: ${event}`, args);
        callback(...args);
      });
    } else {
      console.warn(`Cannot register listener for ${event}: socket not initialized`);
    }
  }, []);
  
  // Function to remove event listeners
  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      console.log(`Removing listener for event: ${event}`);
      socketRef.current.off(event, callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    users,
    emit,
    on,
    off,
    disconnect,
    effectiveRole // Return the effective role so components can use it
  };
};

export default useSocket;