// Socket event types
export const EVENTS = {
    // Connection events
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    USER_JOINED: 'user-joined',
    USER_LEFT: 'user-left',
    USERS_LIST: 'users-list',
    
    // Drawing events
    DRAW_ACTION: 'draw-action',
    REQUEST_CANVAS_STATE: 'request-canvas-state',
    CANVAS_STATE: 'canvas-state',
    CANVAS_STATE_RESPONSE: 'canvas-state-response',
    CLEAR_CANVAS: 'clear-canvas',
    
    // Cursor and laser pointer events
    CURSOR_POSITION: 'cursor-position',
    
    // Room management
    CLOSE_ROOM: 'close-room',
    
    // Permission events
    TOGGLE_STUDENT_PERMISSION: 'toggle-student-permission',
    STUDENT_PERMISSION_CHANGE: 'student-permission-change',
    
    // Image upload events
    IMAGE_UPLOAD: 'image-upload',
    IMAGE_UPLOADED: 'image-uploaded',
    
    // New events
    UNDO_ACTION: 'undoAction',
    REDO_ACTION: 'redoAction'
};

// Drawing action types
export const DRAW_ACTIONS = {
    ADD_OBJECT: 'add_object',
    MODIFY_OBJECT: 'modify_object',
    REMOVE_OBJECT: 'remove_object',
    CLEAR: 'clear',
    ADD_IMAGE: 'add_image',
    ADD_PDF: 'add_pdf'
};

// Create a draw action object
export const createDrawAction = (type, data, userId, roomId) => {
    return {
        type,
        data,
        userId,
        roomId,
        timestamp: Date.now()
    };
};

// Create a cursor position object
export const createCursorPositionEvent = (roomId, userId, position) => {
    return {
        roomId,
        userId,
        position,
        timestamp: Date.now()
    };
};

// Create an image upload event
export const createImageUploadEvent = (roomId, userId, imageData, imageType, position) => {
    return {
        roomId,
        userId,
        imageData,
        imageType,
        position,
        timestamp: Date.now()
    };
};