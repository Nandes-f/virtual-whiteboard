import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { EVENTS } from '../utils/socketEvents';

const useSocket = (roomId, userId, userName, userRole) => {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const socketRef = useRef(null);
  const [effectiveRole, setEffectiveRole] = useState(null);
  const eventListeners = useRef(new Map());

  // Setup socket connection
  useEffect(() => {
    if (!roomId || !userId || !userName) {
      return;
    }
    
    const role = userRole || localStorage.getItem('whiteboard_user_role') || 'student';
    setEffectiveRole(role);
    
    
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'https://2de8-82-223-120-180.ngrok-free.app', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
      transports: ['websocket', 'polling'],
      query: {
        roomId,
        userId,
        userName,
        userRole: role
      }
    });
    
    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      
      // Join the room
      socket.emit(EVENTS.JOIN_ROOM, roomId, userId, userName || 'Anonymous', role);
      
      // Request current canvas state
      socket.emit(EVENTS.REQUEST_CANVAS_STATE, roomId);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    // Listen for user list updates
    socket.on(EVENTS.USERS_LIST, (usersList) => {
      setUsers(usersList);
    });

    // Listen for drawing actions
    socket.on(EVENTS.DRAW_ACTION, (action) => {
      const handler = eventListeners.current.get(EVENTS.DRAW_ACTION);
      if (handler) {
        handler(action);
      } else {
      }
    });

    // Listen for canvas state
    socket.on(EVENTS.CANVAS_STATE_RESPONSE, (canvasState) => {
      const handler = eventListeners.current.get(EVENTS.CANVAS_STATE_RESPONSE);
      if (handler) {
        handler(canvasState);
      }
    });

    // Listen for room closure
    socket.on(EVENTS.CLOSE_ROOM, () => {
      const handler = eventListeners.current.get(EVENTS.CLOSE_ROOM);
      if (handler) {
        handler();
      }
    });

    // Listen for permission changes
    socket.on(EVENTS.STUDENT_PERMISSION_CHANGE, (data) => {
      const handler = eventListeners.current.get(EVENTS.STUDENT_PERMISSION_CHANGE);
      if (handler) {
        handler(data);
      }
    });

    // Clean up on unmount
    return () => {
      if (socket.connected) {
        socket.emit(EVENTS.LEAVE_ROOM, roomId, userId);
        socket.disconnect();
      }
    };
  }, [roomId, userId, userName, userRole]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        socketRef.current.emit(EVENTS.LEAVE_ROOM, roomId, userId);
        socketRef.current.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
      setUsers([]);
    }
  }, [roomId, userId]);

  // Emit function
  const emit = useCallback((event, ...args) => {
    if (socketRef.current && socketRef.current.connected) {
      
      // Special handling for DRAW_ACTION to ensure it has roomId
      if (event === EVENTS.DRAW_ACTION) {
        const drawAction = args[0];
        // Make sure roomId is included
        if (!drawAction.roomId) {
          drawAction.roomId = roomId;
        }
        // Make sure userId is included
        if (!drawAction.userId) {
          drawAction.userId = userId;
        }
        socketRef.current.emit(event, drawAction);
      } else {
        socketRef.current.emit(event, ...args);
      }
      return true;
    } else {
      return false;
    }
  }, [roomId, userId]);

  // Register event listener
  const on = useCallback((event, callback) => {
    eventListeners.current.set(event, callback);
    
    // If we already have a socket, also attach the listener directly
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);
  
  // Remove event listener
  const off = useCallback((event) => {
    eventListeners.current.delete(event);
    
    // If we have a socket, also remove the listener
    if (socketRef.current) {
      socketRef.current.off(event);
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
    effectiveRole
  };
};

export default useSocket;