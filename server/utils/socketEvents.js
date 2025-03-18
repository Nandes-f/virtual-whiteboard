// Socket event constants
const EVENTS = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  DRAW_ACTION: 'draw-action',
  CANVAS_STATE: 'canvas-state',
  CLEAR_CANVAS: 'clear-canvas',
  CURSOR_POSITION: 'cursor-position',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  USERS_LIST: 'users-list',
  CLOSE_ROOM: 'close-room',
  TOGGLE_STUDENT_PERMISSION: 'toggle-student-permission',
  STUDENT_PERMISSION_CHANGE: 'student-permission-change'
};

module.exports = { EVENTS };