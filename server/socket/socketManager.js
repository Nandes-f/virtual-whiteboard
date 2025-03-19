// Socket event handlers
const rooms = new Map();
const { EVENTS } = require('../utils/socketEvents');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {

    // Join a room
    socket.on('join-room', (roomId, userId, userName, userRole = 'student') => {
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          canvasState: null,
          history: [],
          blockedStudents: new Set()
        });
      }
      
      const room = rooms.get(roomId);
      room.users.set(userId, {
        id: userId,
        name: userName,
        socketId: socket.id,
        role: userRole,
        isBlocked: userRole === 'student' && room.blockedStudents.has(userId)
      });
      
      // Send current canvas state to the new user
      if (room.canvasState) {
        socket.emit(EVENTS.CANVAS_STATE_RESPONSE, room.canvasState);
      }
      
      // If this user is a student, check if they should be blocked
      if (userRole === 'student' && room.blockedStudents.has(userId)) {
        socket.emit(EVENTS.STUDENT_PERMISSION_CHANGE, userId, true);
      }
      
      // Notify others that a new user joined
      socket.to(roomId).emit('user-joined', {
        id: userId,
        name: userName,
        role: userRole,
        isBlocked: userRole === 'student' && room.blockedStudents.has(userId)
      });
      
      // Send list of connected users
      const usersList = Array.from(room.users.values());
      io.to(roomId).emit('users-list', usersList);
      
    });

    // Add a new event for tutor to control student permissions
    socket.on(EVENTS.TOGGLE_STUDENT_PERMISSION, (roomId, tutorId, studentId, isBlocked) => {
      const room = rooms.get(roomId);
      if (!room) {
        return;
      }
      
      // Verify the sender is a tutor
      const tutor = room.users.get(tutorId);
      if (!tutor || tutor.role !== 'tutor') {
        return;
      }
      
      
      // Update blocked status
      if (isBlocked) {
        room.blockedStudents.add(studentId);
      } else {
        room.blockedStudents.delete(studentId);
      }
      
      // Update the user object to reflect the blocked status
      const student = room.users.get(studentId);
      if (student) {
        student.isBlocked = isBlocked;
      }
      
      // Notify all users about permission change
      io.to(roomId).emit(EVENTS.STUDENT_PERMISSION_CHANGE, studentId, isBlocked);
      
      // Also update the users list to reflect the new status
      const usersList = Array.from(room.users.values());
      io.to(roomId).emit(EVENTS.USERS_LIST, usersList);
    });

    // Handle drawing events
    socket.on(EVENTS.DRAW_ACTION, (roomId, drawAction) => {
      const room = rooms.get(roomId);
      if (!room) return;
      
      // Get the user who sent the action
      let user = null;
      for (const [id, u] of room.users.entries()) {
        if (u.socketId === socket.id) {
          user = u;
          break;
        }
      }
      
      // If user is a blocked student, ignore their drawing actions
      if (user && user.role === 'student' && room.blockedStudents.has(user.id)) {
        return;
      }
      
      // Store the action in history
      room.history.push(drawAction);
      
      // If it's a clear action, update the canvas state
      if (drawAction.type === 'clear') {
        room.canvasState = null;
      }
      
      // Broadcast to all clients in the room EXCEPT the sender
      // This prevents the feedback loop causing duplicate drawings
      socket.to(roomId).emit(EVENTS.DRAW_ACTION, drawAction);
      
    });

    // Handle canvas state updates
    socket.on('canvas-state', (roomId, canvasState) => {
      const room = rooms.get(roomId);
      if (!room) return;
      
      // Update the stored canvas state
      room.canvasState = canvasState;
      
    });
    
    // Handle cursor position updates
    socket.on('cursor-position', (roomId, userId, position) => {
      socket.to(roomId).emit('cursor-position', userId, position);
    });

    // Handle clear canvas
    socket.on('clear-canvas', (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        room.canvasState = null;
        room.history = [];
        // Broadcast to all clients including sender to ensure everyone clears
        io.to(roomId).emit('clear-canvas');
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      
      // Find and remove user from all rooms
      rooms.forEach((room, roomId) => {
        let disconnectedUserId = null;
        
        room.users.forEach((user, userId) => {
          if (user.socketId === socket.id) {
            disconnectedUserId = userId;
          }
        });
        
        if (disconnectedUserId) {
          room.users.delete(disconnectedUserId);
          io.to(roomId).emit('user-left', disconnectedUserId);
          
          // Send updated users list
          const usersList = Array.from(room.users.values());
          io.to(roomId).emit('users-list', usersList);
          
          
          // Clean up empty rooms
          if (room.users.size === 0) {
            rooms.delete(roomId);
          }
        }
      });
    });

    // Handle intentional room leaving
    socket.on('leave-room', (roomId, userId) => {
      
      const room = rooms.get(roomId);
      if (room && room.users.has(userId)) {
        const user = room.users.get(userId);
        room.users.delete(userId);
        
        // Notify others that user left
        io.to(roomId).emit('user-left', userId);
        
        // Send updated users list
        const usersList = Array.from(room.users.values());
        io.to(roomId).emit('users-list', usersList);
        
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
    
    // Add this handler for room closure
    socket.on('close-room', (roomId) => {
      
      // Find the room
      const room = rooms.get(roomId);
      if (!room) {
        return;
      }
      
      // Find the user who sent the request
      let isUserTutor = false;
      let userId = null;
      
      for (const [id, user] of room.users.entries()) {
        if (user.socketId === socket.id && user.role === 'tutor') {
          isUserTutor = true;
          userId = id;
          break;
        }
      }
      
      if (!isUserTutor) {
        return;
      }
      
      
      // Broadcast to all clients in the room
      io.to(roomId).emit('close-room');
      
      // Clean up the room data
      rooms.delete(roomId);
      
    });
    
    // Add handler for canvas state requests
    socket.on(EVENTS.REQUEST_CANVAS_STATE, (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        // Send the current canvas state back to the requesting client
        socket.emit(EVENTS.CANVAS_STATE_RESPONSE, room.canvasState);
      } else {
        // Send empty state to prevent client from waiting indefinitely
        socket.emit(EVENTS.CANVAS_STATE_RESPONSE, null);
      }
    });
  });
}

module.exports = { setupSocketHandlers };