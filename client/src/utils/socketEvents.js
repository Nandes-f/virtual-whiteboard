// Socket event names
export const EVENTS = {
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
  REQUEST_CANVAS_STATE: 'request_canvas_state',
  CANVAS_STATE_RESPONSE: 'canvas_state_response'
};

// Create a draw action event payload
export const createDrawAction = (type, data, userId) => {
  return {
    type,
    data,
    userId,
    timestamp: Date.now()
  };
};

// Types of draw actions
export const DRAW_ACTIONS = {
  ADD_OBJECT: 'add-object',
  MODIFY_OBJECT: 'modify-object',
  REMOVE_OBJECT: 'remove-object',
  CLEAR: 'clear'
};