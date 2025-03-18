// Handle room closure
socket.on(EVENTS.CLOSE_ROOM, (roomId) => {
    console.log(`Room ${roomId} close request received from socket ${socket.id}`);
    
    // Check if the user is a tutor (you'll need to adapt this to your user tracking system)
    const userInfo = socket.handshake.query;
    const userRole = userInfo.userRole;
    
    if (userRole === 'tutor') {
        console.log(`Tutor ${socket.id} is closing room ${roomId}`);
        
        // Broadcast to all clients in the room
        io.to(roomId).emit(EVENTS.CLOSE_ROOM);
        console.log(`CLOSE_ROOM event broadcast to room ${roomId}`);
        
        // You might want to clean up room data here
    } else {
        console.log(`Non-tutor user ${socket.id} attempted to close room ${roomId}`);
    }
});