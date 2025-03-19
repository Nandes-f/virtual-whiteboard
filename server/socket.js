const EVENTS = {
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    USER_JOINED: 'user-joined',
    USERS_LIST: 'users-list',
    USER_LEFT: 'user-left',
    DRAW_ACTION: 'draw-action',
    CURSOR_POSITION: 'cursor-position',
    CLEAR_CANVAS: 'clear-canvas',
    CANVAS_STATE: 'canvas-state',
    TOGGLE_STUDENT_PERMISSION: 'toggle-student-permission',
    STUDENT_PERMISSION_CHANGE: 'student-permission-change',
    CLOSE_ROOM: 'close-room',
    REQUEST_CANVAS_STATE: 'request-canvas-state',
    CANVAS_STATE_RESPONSE: 'canvas-state-response'
};

// Initialize socket handling
module.exports = function(io) {
    // Store active rooms and their canvas states
    const roomStates = new Map();
    
    io.on('connection', (socket) => {
        
        // Extract user info from connection query
        const { roomId, userId, userName, userRole } = socket.handshake.query;
        
        // Keep track of rooms this socket is in
        let currentRoom = null;
        
        // JOIN ROOM
        socket.on(EVENTS.JOIN_ROOM, (room, user, name, role) => {
            currentRoom = room;
            
            // Join socket.io room
            socket.join(room);
            
            // Initialize room state if needed
            if (!roomStates.has(room)) {
                roomStates.set(room, {
                    users: new Map(),
                    canvasObjects: [],
                    canvasJson: null
                });
            }
            
            // Add user to room
            const roomState = roomStates.get(room);
            roomState.users.set(user, {
                id: user,
                name: name,
                role: role,
                socketId: socket.id
            });
            
            // Broadcast updated user list
            const usersList = Array.from(roomState.users.values());
            io.to(room).emit(EVENTS.USERS_LIST, usersList);
            
            // Send current canvas state to new user
            if (roomState.canvasJson) {
                socket.emit(EVENTS.CANVAS_STATE_RESPONSE, roomState.canvasJson);
            }
        });
        
        // LEAVE ROOM
        socket.on(EVENTS.LEAVE_ROOM, (room, user) => {
            handleUserLeaving(socket, room, user);
        });
        
        // DRAW ACTION - Main handler for all drawing operations
        socket.on(EVENTS.DRAW_ACTION, (action) => {
            
            if (!action.roomId) {
                return;
            }
            
            // Store latest canvas state if it's a state update
            if (action.type === 'canvas-state') {
                const roomState = roomStates.get(action.roomId);
                if (roomState) {
                    roomState.canvasJson = action.data;
                }
            }
            
            // Broadcast to everyone else in the room
            socket.to(action.roomId).emit(EVENTS.DRAW_ACTION, action);
        });
        
        // CANVAS STATE REQUEST
        socket.on(EVENTS.REQUEST_CANVAS_STATE, (room) => {
            const roomState = roomStates.get(room);
            if (roomState && roomState.canvasJson) {
                socket.emit(EVENTS.CANVAS_STATE_RESPONSE, roomState.canvasJson);
            }
        });
        
        // CANVAS STATE - Update the stored canvas state
        socket.on(EVENTS.CANVAS_STATE, (data) => {
            const { roomId, state } = data;
            const roomState = roomStates.get(roomId);
            if (roomState) {
                roomState.canvasJson = state;
                // Broadcast to everyone else
                socket.to(roomId).emit(EVENTS.CANVAS_STATE, state);
            }
        });
        
        // TOGGLE STUDENT PERMISSION
        socket.on(EVENTS.TOGGLE_STUDENT_PERMISSION, (data) => {
            const { roomId, studentId, isAllowed } = data;
            io.to(roomId).emit(EVENTS.STUDENT_PERMISSION_CHANGE, { studentId, isAllowed });
        });
        
        // CLOSE ROOM
        socket.on(EVENTS.CLOSE_ROOM, (roomId) => {
            const userInfo = socket.handshake.query;
            const userRole = userInfo.userRole;
            
            if (userRole === 'tutor') {
                
                // Broadcast to all clients in the room
                io.to(roomId).emit(EVENTS.CLOSE_ROOM);
                
                // Clean up room data
                roomStates.delete(roomId);
            } else {
            }
        });
        
        // CURSOR POSITION
        socket.on(EVENTS.CURSOR_POSITION, (data) => {
            const { roomId, userId, position } = data;
            
            // Broadcast cursor position to all other users in the room
            socket.to(roomId).emit(EVENTS.CURSOR_POSITION, { userId, position });
        });
        
        // CLEAR CANVAS
        socket.on(EVENTS.CLEAR_CANVAS, (roomId) => {
            const roomState = roomStates.get(roomId);
            if (roomState) {
                roomState.canvasObjects = [];
                roomState.canvasJson = null;
            }
            // Broadcast to everyone in the room
            io.to(roomId).emit(EVENTS.CLEAR_CANVAS);
        });
        
        // DISCONNECT
        socket.on('disconnect', () => {
            
            if (currentRoom) {
                handleUserLeaving(socket, currentRoom, userId);
            }
            
            // Check all rooms for this socket and clean up
            for (const [roomId, roomState] of roomStates.entries()) {
                for (const [userId, user] of roomState.users.entries()) {
                    if (user.socketId === socket.id) {
                        handleUserLeaving(socket, roomId, userId);
                        break;
                    }
                }
            }
        });
        
        // Add to your socket connection handler
        socket.on('undo', () => {
            // Broadcast the undo action to all other clients
            socket.broadcast.emit('undoAction');
        });

        socket.on('redo', () => {
            // Broadcast the redo action to all other clients
            socket.broadcast.emit('redoAction');
        });
        
        // Helper function to handle user leaving
        function handleUserLeaving(socket, roomId, userId) {
            
            const roomState = roomStates.get(roomId);
            if (!roomState) return;
            
            // Remove user from room
            roomState.users.delete(userId);
            
            // Leave the socket.io room
            socket.leave(roomId);
            
            // If the room is empty, clean it up
            if (roomState.users.size === 0) {
                roomStates.delete(roomId);
            } else {
                // Broadcast updated user list
                const usersList = Array.from(roomState.users.values());
                io.to(roomId).emit(EVENTS.USERS_LIST, usersList);
            }
        }
    });
};