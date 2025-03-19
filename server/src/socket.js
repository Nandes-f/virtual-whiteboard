// Add this handler to your socket.js file where other socket events are handled
socket.on(EVENTS.REQUEST_CANVAS_STATE, (roomId) => {
  const room = rooms.get(roomId);
  if (room) {
    // Send the current canvas state back to the requesting client
    socket.emit(EVENTS.CANVAS_STATE_RESPONSE, room.canvasState);
  }
});