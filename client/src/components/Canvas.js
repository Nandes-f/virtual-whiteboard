import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { fabric } from 'fabric';
import { useWhiteboard } from '../context/WhiteboardContext';
import { EVENTS, DRAW_ACTIONS, createDrawAction } from '../utils/socketEvents';
import * as fabricHelpers from '../utils/fabricHelpers';
import EquationEditor from './EquationEditor';
import html2canvas from 'html2canvas';
import katex from 'katex';

const Canvas = forwardRef(({ roomId, userId, userRole, isConnected, emit, on, off }, ref) => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const isProcessingEvent = useRef(false);
    const pendingUpdates = useRef(new Map());
    const [equationEditorOpen, setEquationEditorOpen] = useState(false);
    const [equationPosition, setEquationPosition] = useState({ x: 0, y: 0 });
    const laserPointerTimeout = useRef(null);
    const isRemoteAction = useRef(false);
    const processedObjects = useRef(new Set());

    const historyStack = useRef([]);
    const redoStack = useRef([]);
    const isUndoRedoAction = useRef(false);
    const maxHistoryLength = 50;

    const actionStack = useRef([]);

    const currentPath = useRef(null);
    const pathPoints = useRef([]);

    const {
        tool,
        setTool,
        color,
        brushSize,
        isActionBlocked,
        setIsActionBlocked
    } = useWhiteboard();

    const STORAGE_KEY = `whiteboard_${roomId}_state`;

    useImperativeHandle(ref, () => ({
        clearCanvas: () => {
            clearCanvas();
        },
        exportCanvasAsImage: (format) => {
            return exportCanvasAsImage(format);
        },
        exportCanvasAsSVG: () => {
            return exportCanvasAsSVG();
        },
        undoAction: () => {
            undoAction();
        },
        redoAction: () => {
            redoAction();
        },
        handleImageUpload: (file) => {
            handleImageUpload(file);
        }
    }));

    const cleanupDrawingListeners = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        canvas.off('mouse:down');
        canvas.off('mouse:move');
        canvas.off('mouse:up');

        if (canvas.eraserTool) {
            canvas.eraserTool.deactivate();
            canvas.eraserTool = null;
        }

        canvas.defaultCursor = 'default';
        canvas.selection = true;
    }, []);

    const setupEraserTool = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        canvas.isDrawingMode = true;
        const backgroundColor = canvas.backgroundColor || '#ffffff';

        const eraserBrush = new fabric.PencilBrush(canvas);
        eraserBrush.width = brushSize;
        eraserBrush.color = backgroundColor;

        canvas.freeDrawingBrush = eraserBrush;
        canvas.defaultCursor = 'none';

        const outerCircle = new fabric.Circle({
            radius: brushSize / 2,
            fill: 'rgba(255,255,255,0.2)',
            stroke: 'rgba(0,0,0,0.5)',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            originX: 'center',
            originY: 'center',
            left: -100,
            top: -100,
            selectable: false,
            evented: false,
            excludeFromExport: true,
            hoverCursor: 'none',
            objectCaching: false
        });

        canvas.add(outerCircle);

        // ... [Keep cursor position handlers the same] ...

        const handlePathCreated = (e) => {
            if (tool !== 'eraser') return;

            const eraserPath = e.path;
            canvas.remove(eraserPath);

            canvas.getObjects().forEach(obj => {
                if (obj === outerCircle || obj.temporary || obj.excludeFromExport) return;

                try {
                    const clipPath = new fabric.Path(eraserPath.path, {
                        inverted: true,
                        absolutePositioned: true
                    });

                    // Convert existing clipPath to array if needed
                    const currentClipPaths = obj.clipPath ?
                        (Array.isArray(obj.clipPath) ? obj.clipPath : [obj.clipPath]) :
                        [];

                    obj.clipPath = [
                        ...currentClipPaths,
                        clipPath.toObject() // Store as plain object
                    ];

                    obj.dirty = true;
                } catch (error) {
                    console.error('Error applying eraser:', error);
                }
            });

            canvas.renderAll();

            if (isConnected) {
                canvas.getObjects().forEach(obj => {
                    if (obj.id && obj !== outerCircle) {
                        // Clone object and convert clipPaths to serializable format
                        const objData = obj.toObject(['id', 'ownerId']);
                        if (objData.clipPath) {
                            objData.clipPath = objData.clipPath.map(path =>
                                typeof path.toObject === 'function' ? path.toObject() : path
                            );
                        }

                        emit(EVENTS.DRAW_ACTION, createDrawAction(
                            DRAW_ACTIONS.MODIFY_OBJECT,
                            {
                                objectId: obj.id,
                                json: objData
                            },
                            userId,
                            roomId
                        ));
                    }
                });
            }
        };

        // ... [Rest of setupEraserTool remains the same] ...
    }, [brushSize, tool, isConnected, emit, userId, roomId]);

    useEffect(() => {
        const canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: false,
            selection: true,
            width: window.innerWidth - 60,
            height: window.innerHeight - 60
        });

        canvas.userId = userId;

        fabricCanvasRef.current = canvas;

        const savedState = loadStateFromStorage();
        if (savedState) {
            isRemoteAction.current = true;
            try {
                canvas.loadFromJSON(savedState.canvasState, () => {
                    canvas.getObjects().forEach(obj => {
                        if (obj.id) {
                            processedObjects.current.add(obj.id);
                        }
                        applyPermissions(obj);
                    });

                    if (savedState.actionHistory) {
                        actionStack.current = savedState.actionHistory;
                    }

                    canvas.renderAll();
                });
            } catch (error) {
            } finally {
                isRemoteAction.current = false;
            }
        }

        const handleResize = () => {
            canvas.setDimensions({
                width: window.innerWidth - 60,
                height: window.innerHeight - 60
            });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.dispose();
        };
    }, [userId]);

    useEffect(() => {
        if (!isConnected) return;

        const handlePermissionChange = (data) => {
            if (data.studentId === userId) {
                setIsActionBlocked(data.isAllowed);

                if (data.isAllowed) {
                    setTool('select');
                }
            }
        };

        on(EVENTS.STUDENT_PERMISSION_CHANGE, handlePermissionChange);

        return () => {
            off(EVENTS.STUDENT_PERMISSION_CHANGE);
        };
    }, [isConnected, on, off, userId, setIsActionBlocked, setTool]);

    useEffect(() => {
        if (!isConnected || !fabricCanvasRef.current) return;

        emit(EVENTS.REQUEST_CANVAS_STATE, {
            roomId,
            userId,
            timestamp: Date.now()
        });

        on(EVENTS.CANVAS_STATE_RESPONSE, (response) => {
            const canvas = fabricCanvasRef.current;
            if (!canvas || !response) return;

            isRemoteAction.current = true;
            try {
                canvas.clear();
                processedObjects.current.clear();
                actionStack.current = [];
                redoStack.current = [];

                if (response.state) {
                    canvas.loadFromJSON(response.state, () => {
                        canvas.getObjects().forEach(obj => {
                            if (obj.id) {
                                processedObjects.current.add(obj.id);
                            }
                            applyPermissions(obj);
                        });

                        if (response.actionHistory) {
                            actionStack.current = response.actionHistory;
                        }

                        saveStateToStorage();

                        canvas.renderAll();
                    });
                }
            } catch (error) {
            } finally {
                isRemoteAction.current = false;
            }
        });

        on(EVENTS.REQUEST_CANVAS_STATE, (data) => {
            if (userRole === 'tutor') {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;

                emit(EVENTS.CANVAS_STATE_RESPONSE, {
                    roomId,
                    userId: data.userId,
                    state: canvas.toJSON(['id', 'ownerId', 'type']),
                    actionHistory: actionStack.current,
                    timestamp: Date.now()
                });
            }
        });

        on(EVENTS.DRAW_ACTION, (action) => {
            if (action.userId === userId) return;
            handleRemoteDrawAction(action);
            saveStateToStorage();
        });

        return () => {
            off(EVENTS.DRAW_ACTION);
            off(EVENTS.CANVAS_STATE_RESPONSE);
            off(EVENTS.REQUEST_CANVAS_STATE);
        };
    }, [isConnected, emit, on, off, roomId, userId, userRole]);

    const handleRemoteDrawAction = (action) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        if (action.userId === userId) return;

        isRemoteAction.current = true;

        try {
            switch (action.type) {
                case DRAW_ACTIONS.ADD_OBJECT:
                    if (action.data && action.data.json) {
                        const objectId = action.data.json.id;
                        if (processedObjects.current.has(objectId)) {
                            break;
                        }
                        if (objectId && processedObjects.current.has(objectId)) {
                            break;
                        }

                        const existingObj = canvas.getObjects().find(obj => obj.id === objectId);
                        if (existingObj) {
                            canvas.remove(existingObj);
                            processedObjects.current.delete(objectId);
                        }

                        if (action.data.json.type === 'image' || action.data.json.type === 'pdf-page') {
                            fabric.Image.fromURL(action.data.json.src, (img) => {
                                if (!img) return;

                                img.set({
                                    ...action.data.json,
                                    ownerId: action.userId,
                                    selectable: true,
                                    evented: true,
                                    crossOrigin: 'anonymous',
                                    id: objectId
                                });

                                canvas.add(img);
                                processedObjects.current.add(objectId);
                                applyPermissions(img);
                                canvas.renderAll();
                            }, { crossOrigin: 'anonymous' });
                        } else {
                            fabric.util.enlivenObjects([action.data.json], (objects) => {
                                objects.forEach(obj => {
                                    obj.set({
                                        ownerId: action.userId,
                                        selectable: true,
                                        evented: true,
                                        id: objectId
                                    });

                                    canvas.add(obj);
                                    processedObjects.current.add(obj.id);
                                    applyPermissions(obj);
                                });

                                canvas.renderAll();
                            });
                        }
                    }
                    break;

                case DRAW_ACTIONS.MODIFY_OBJECT:
                    if (action.data && action.data.objectId && action.data.json) {
                        const object = canvas.getObjects().find(obj => obj.id === action.data.objectId);
                        if (object) {
                            const originalOwnerId = object.ownerId;
                            const originalId = object.id;
                            const originalType = object.type;

                            object.set(action.data.json);

                            object.set({
                                ownerId: originalOwnerId,
                                id: originalId,
                                type: originalType
                            });

                            object.setCoords();
                            canvas.renderAll();
                        }
                    }
                    break;

                case DRAW_ACTIONS.REMOVE_OBJECT:
                    if (action.data && action.data.objectId) {
                        const object = canvas.getObjects().find(obj => obj.id === action.data.objectId);
                        if (object) {
                            canvas.remove(object);
                            processedObjects.current.delete(action.data.objectId);
                            canvas.renderAll();
                        }
                    }
                    break;

                case DRAW_ACTIONS.CLEAR:
                    canvas.clear();
                    processedObjects.current.clear();
                    canvas.renderAll();
                    break;

                default:
            }
        } catch (error) {
        } finally {
            isRemoteAction.current = false;
        }
    };

    const applyPermissions = (obj) => {
        obj.selectable = false;
        obj.evented = false;
        obj.lockMovementX = true;
        obj.lockMovementY = true;
        obj.lockRotation = true;
        obj.lockScalingX = true;
        obj.lockScalingY = true;

        if (isActionBlocked) {
            obj.selectable = false;
            obj.evented = false;
            return;
        }

        obj.selectable = true;
        obj.evented = true;

        if (userRole === 'tutor' || obj.ownerId === userId) {
            obj.selectable = true;
            obj.evented = true;
            obj.lockMovementX = false;
            obj.lockMovementY = false;
            obj.lockRotation = false;
            obj.lockScalingX = false;
            obj.lockScalingY = false;
        } else {
            obj.lockMovementX = true;
            obj.lockMovementY = true;
            obj.lockRotation = true;
            obj.lockScalingX = true;
            obj.lockScalingY = true;
        }
    };

    const handleRemoteCursor = (data) => {
        if (data.userId === userId) return;

        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const { x, y, color } = data.position;

        const pointer = new fabric.Circle({
            left: x - 5,
            top: y - 5,
            radius: 5,
            fill: color || '#ff0000',
            opacity: 0.7,
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
            temporary: true
        });

        canvas.add(pointer);

        setTimeout(() => {
            if (pointer && pointer.canvas) {
                canvas.remove(pointer);
                canvas.renderAll();
            }
        }, 100);

        canvas.renderAll();
    };
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
    
        canvas.getObjects().forEach(obj => {
            applyPermissions(obj);
        });
        canvas.renderAll();
    }, [isActionBlocked]);
    
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const ensureColorString = (colorValue) => {
            if (!colorValue || typeof colorValue !== 'string') {
                return '#000000';
            }
            return colorValue;
        };

        const safeColor = ensureColorString(color);

        if (isActionBlocked) {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.defaultCursor = 'not-allowed';
            canvas.forEachObject(obj => {
                obj.selectable = false;
                obj.evented = false;
            });
            canvas.renderAll();
            return;
        }

        const throttle = (func, delay) => {
            let lastCall = 0;
            return function (...args) {
                const now = new Date().getTime();
                if (now - lastCall < delay) {
                    return;
                }
                lastCall = now;
                return func(...args);
            };
        };

        const setupShapeDrawing = (shapeType) => {
            canvas.isDrawingMode = false;
            canvas.selection = false;

            let isDrawing = false;
            let startPoint = { x: 0, y: 0 };
            let shape = null;

            canvas.on('mouse:down', (e) => {
                if (e.target || isActionBlocked) return;

                isDrawing = true;
                const pointer = canvas.getPointer(e.e);
                startPoint = { x: pointer.x, y: pointer.y };

                switch (shapeType) {
                    case 'rectangle':
                        shape = new fabric.Rect({
                            left: startPoint.x,
                            top: startPoint.y,
                            width: 0,
                            height: 0,
                            fill: 'transparent',
                            stroke: safeColor,
                            strokeWidth: brushSize,
                            selectable: false,
                            evented: false,
                            temporary: true
                        });
                        break;
                    case 'circle':
                        shape = new fabric.Circle({
                            left: startPoint.x,
                            top: startPoint.y,
                            radius: 0,
                            fill: 'transparent',
                            stroke: safeColor,
                            strokeWidth: brushSize,
                            selectable: false,
                            evented: false,
                            temporary: true
                        });
                        break;
                    case 'line':
                        shape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                            stroke: safeColor,
                            strokeWidth: brushSize,
                            selectable: false,
                            evented: false,
                            temporary: true
                        });
                        break;
                    case 'arrow':
                        shape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                            stroke: safeColor,
                            strokeWidth: brushSize,
                            selectable: false,
                            evented: false,
                            temporary: true
                        });
                        break;
                }

                if (shape) {
                    canvas.add(shape);
                    canvas.renderAll();
                }
            });

            canvas.on('mouse:move', (e) => {
                if (!isDrawing || !shape) return;

                const pointer = canvas.getPointer(e.e);

                switch (shapeType) {
                    case 'rectangle':
                        const width = Math.abs(pointer.x - startPoint.x);
                        const height = Math.abs(pointer.y - startPoint.y);

                        shape.set({
                            left: Math.min(startPoint.x, pointer.x),
                            top: Math.min(startPoint.y, pointer.y),
                            width: width,
                            height: height
                        });
                        break;
                    case 'circle':
                        const dx = pointer.x - startPoint.x;
                        const dy = pointer.y - startPoint.y;
                        const radius = Math.sqrt(dx * dx + dy * dy) / 2;

                        shape.set({
                            left: startPoint.x - radius,
                            top: startPoint.y - radius,
                            radius: radius
                        });
                        break;
                    case 'line':
                    case 'arrow':
                        shape.set({
                            x2: pointer.x,
                            y2: pointer.y
                        });
                        break;
                }

                canvas.renderAll();
            });

            canvas.on('mouse:up', () => {
                if (!isDrawing || !shape) return;

                isDrawing = false;

                shape.temporary = false;

                if (shapeType === 'arrow') {
                    canvas.remove(shape);

                    const dx = shape.x2 - shape.x1;
                    const dy = shape.y2 - shape.y1;
                    const angle = Math.atan2(dy, dx);

                    const headLength = brushSize * 3;
                    const headAngle = Math.PI / 6;

                    const x1 = shape.x2 - headLength * Math.cos(angle - headAngle);
                    const y1 = shape.y2 - headLength * Math.sin(angle - headAngle);
                    const x2 = shape.x2 - headLength * Math.cos(angle + headAngle);
                    const y2 = shape.y2 - headLength * Math.sin(angle + headAngle);

                    const path = [
                        'M', shape.x1, shape.y1,
                        'L', shape.x2, shape.y2,
                        'L', x1, y1,
                        'M', shape.x2, shape.y2,
                        'L', x2, y2
                    ];

                    const arrow = new fabric.Path(path.join(' '), {
                        stroke: safeColor,
                        strokeWidth: brushSize,
                        fill: '',
                        id: `obj_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        ownerId: userId
                    });

                    canvas.add(arrow);

                    if (isConnected) {
                        const objectJSON = arrow.toJSON(['id', 'ownerId']);
                        emit(EVENTS.DRAW_ACTION, createDrawAction(
                            DRAW_ACTIONS.ADD_OBJECT,
                            { json: objectJSON },
                            userId,
                            roomId
                        ));
                    }
                } else {
                    shape.set({
                        selectable: true,
                        evented: true,
                        id: `obj_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        ownerId: userId
                    });

                    if (isConnected) {
                        const objectJSON = shape.toJSON(['id', 'ownerId']);
                        emit(EVENTS.DRAW_ACTION, createDrawAction(
                            DRAW_ACTIONS.ADD_OBJECT,
                            { json: objectJSON },
                            userId,
                            roomId
                        ));
                    }
                }

                canvas.renderAll();
                shape = null;
            });
        };

        const setupTextTool = () => {
            canvas.isDrawingMode = false;
            canvas.selection = true;

            canvas.on('mouse:down', (e) => {
                if (e.target || isActionBlocked) return;

                const pointer = canvas.getPointer(e.e);
                const text = new fabric.IText('Text', {
                    left: pointer.x,
                    top: pointer.y,
                    fontFamily: 'Arial',
                    fontSize: brushSize * 5,
                    fill: safeColor,
                    id: `obj_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    ownerId: userId
                });

                canvas.add(text);
                canvas.setActiveObject(text);
                text.enterEditing();

                if (isConnected) {
                    setTimeout(() => {
                        const objectJSON = text.toJSON(['id', 'ownerId']);
                        emit(EVENTS.DRAW_ACTION, createDrawAction(
                            DRAW_ACTIONS.ADD_OBJECT,
                            { json: objectJSON },
                            userId,
                            roomId
                        ));
                    }, 100);
                }

                canvas.renderAll();
            });

            canvas.on('text:changed', (e) => {
                if (isRemoteAction.current || !isConnected) return;

                const text = e.target;
                if (!text || !text.id) return;

                const objectJSON = text.toJSON(['id', 'ownerId']);
                emit(EVENTS.DRAW_ACTION, createDrawAction(
                    DRAW_ACTIONS.MODIFY_OBJECT,
                    { objectId: text.id, json: objectJSON },
                    userId,
                    roomId
                ));
            });
        };

        const setupEquationTool = () => {
            canvas.isDrawingMode = false;
            canvas.selection = false;

            canvas.on('mouse:down', (e) => {
                if (e.target || isActionBlocked) return;

                const pointer = canvas.getPointer(e.e);
                setEquationPosition({ x: pointer.x, y: pointer.y });
                setEquationEditorOpen(true);
            });
        };

        const setupLaserPointer = () => {
            try {
                canvas.isDrawingMode = false;
                canvas.selection = false;
                canvas.defaultCursor = 'none';

                let laserPoint = null;
                let lastPosition = { x: 0, y: 0 };

                const throttledEmit = throttle((x, y) => {
                    try {
                        if (isActionBlocked || !isConnected) return;

                        const dx = x - lastPosition.x;
                        const dy = y - lastPosition.y;
                        const distanceSquared = dx * dx + dy * dy;

                        if (distanceSquared > 25) {
                            lastPosition = { x, y };

                            emit(EVENTS.CURSOR_POSITION, {
                                roomId,
                                userId,
                                position: { x, y, color: safeColor }
                            });
                        }
                    } catch (error) {
                    }
                }, 30);

                canvas.on('mouse:move', (e) => {
                    try {
                        if (isActionBlocked) return;

                        const pointer = canvas.getPointer(e.e);

                        if (laserPoint) {
                            canvas.remove(laserPoint);
                        }

                        laserPoint = new fabric.Circle({
                            left: pointer.x - 5,
                            top: pointer.y - 5,
                            radius: 5,
                            fill: safeColor,
                            opacity: 0.7,
                            selectable: false,
                            evented: false,
                            originX: 'center',
                            originY: 'center',
                            temporary: true
                        });

                        canvas.add(laserPoint);

                        throttledEmit(pointer.x, pointer.y);

                        if (laserPointerTimeout.current) {
                            clearTimeout(laserPointerTimeout.current);
                        }

                        laserPointerTimeout.current = setTimeout(() => {
                            if (laserPoint && laserPoint.canvas) {
                                canvas.remove(laserPoint);
                                canvas.renderAll();
                                laserPoint = null;
                            }
                        }, 50);

                        canvas.renderAll();
                    } catch (error) {
                    }
                });

                const canvasContainer = document.querySelector('.canvas-container');
                if (canvasContainer) {
                    canvasContainer.addEventListener('mouseleave', () => {
                        try {
                            if (laserPoint) {
                                canvas.remove(laserPoint);
                                canvas.renderAll();
                                laserPoint = null;
                            }
                        } catch (error) {
                        }
                    });
                }
            } catch (error) {
                canvas.defaultCursor = 'default';
            }
        };

        const setupCanvasEventHandlers = () => {
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;

            canvas.on('mouse:down', (e) => {
                if (canvas.isDrawingMode && !isRemoteAction.current) {
                    const pointer = canvas.getPointer(e.e);
                    currentPath.current = {
                        startPoint: pointer,
                        points: [pointer],
                        timestamp: Date.now()
                    };
                    pathPoints.current = [pointer];
                }
            });

            canvas.on('mouse:move', (e) => {
                if (canvas.isDrawingMode && currentPath.current && !isRemoteAction.current) {
                    const pointer = canvas.getPointer(e.e);
                    pathPoints.current.push(pointer);
                    currentPath.current.points.push(pointer);
                }
            });

            canvas.on('mouse:up', () => {
                if (canvas.isDrawingMode && currentPath.current && !isRemoteAction.current) {
                    const pathData = {
                        ...currentPath.current,
                        endPoint: pathPoints.current[pathPoints.current.length - 1]
                    };
                    currentPath.current = null;
                    pathPoints.current = [];
                }
            });

            canvas.on('path:created', (e) => {
                if (isRemoteAction.current || !isConnected) return;

                const path = e.path;
                if (!path) return;

                const timestamp = Date.now();
                path.id = `path_${userId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
                path.ownerId = userId;

                actionStack.current.push({
                    type: 'draw',
                    objectId: path.id,
                    timestamp: timestamp,
                    object: path.toJSON(['id', 'ownerId', 'type', 'path'])
                });

                const objectJSON = path.toJSON(['id', 'ownerId']);
                emit(EVENTS.DRAW_ACTION, createDrawAction(
                    DRAW_ACTIONS.ADD_OBJECT,
                    { json: objectJSON },
                    userId,
                    roomId
                ));
            });

            canvas.on('object:modified', (e) => {
                if (isRemoteAction.current || !isConnected) return;

                const object = e.target;
                if (userRole === 'student' && object.ownerId !== userId) return;
                if (object.temporary === true || object.excludeFromExport === true) return;

                const timestamp = Date.now();
                actionStack.current.push({
                    type: 'modify',
                    objectId: object.id,
                    timestamp: timestamp,
                    object: object.toJSON(['id', 'ownerId', 'type'])
                });

                if (object.id) {
                    const objectJSON = object.toJSON(['id', 'ownerId']);
                    emit(EVENTS.DRAW_ACTION, createDrawAction(
                        DRAW_ACTIONS.MODIFY_OBJECT,
                        { objectId: object.id, json: objectJSON },
                        userId,
                        roomId
                    ));
                }
            });

            canvas.on('object:removed', (e) => {
                if (isRemoteAction.current || !isConnected) return;

                const object = e.target;
                if (object.temporary === true || object.excludeFromExport === true) return;
                if (userRole === 'student' && object.ownerId !== userId) return;

                const timestamp = Date.now();
                actionStack.current.push({
                    type: 'remove',
                    objectId: object.id,
                    timestamp: timestamp,
                    object: object.toJSON(['id', 'ownerId', 'type'])
                });

                if (object && object.id) {
                    emit(EVENTS.DRAW_ACTION, createDrawAction(
                        DRAW_ACTIONS.REMOVE_OBJECT,
                        { objectId: object.id },
                        userId,
                        roomId
                    ));

                    processedObjects.current.delete(object.id);
                }
            });
        };

        const configureTool = () => {
            cleanupDrawingListeners();
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;
            canvas.selection = false;
            canvas.isDrawingMode = false;

            switch (tool) {
                case 'select':
                    canvas.selection = true;
                    canvas.forEachObject((obj) => {
                        obj.selectable = !isActionBlocked && (userRole === 'tutor' || obj.ownerId === userId);
                    });
                    break;
                case 'pen':
                    fabricHelpers.createPenBrush(canvas, safeColor, brushSize);
                    canvas.isDrawingMode = true;
                    break;
                // case 'pixel':
                //     fabricHelpers.createPixelBrush(canvas, safeColor, brushSize);
                //     canvas.isDrawingMode = true;
                //     break;
                case 'eraser':
                    setupEraserTool();
                    break;
                case 'rectangle':
                    setupShapeDrawing('rectangle');
                    break;
                case 'circle':
                    setupShapeDrawing('circle');
                    break;
                case 'line':
                    setupShapeDrawing('line');
                    break;
                case 'arrow':
                    setupShapeDrawing('arrow');
                    break;
                case 'text':
                    setupTextTool();
                    break;
                case 'equation':
                    setupEquationTool();
                    break;
                case 'laser':
                    setupLaserPointer();
                    // canvas.selection = true;
                    break;
                case 'image':
                    break;
                default:
                    break;
            }
            canvas.renderAll();
        };

        setupCanvasEventHandlers();
        configureTool();

        return () => {
            cleanupDrawingListeners();
            canvas.off('object:added');
            canvas.off('object:modified');
            canvas.off('object:removed');
        };
    }, [tool, color, brushSize, isActionBlocked, isConnected, emit, userId, userRole, roomId, cleanupDrawingListeners, setupEraserTool]);

    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || tool !== 'eraser' || !canvas.eraserTool) return;
        cleanupDrawingListeners();
        setupEraserTool();

    }, [brushSize, tool, cleanupDrawingListeners, setupEraserTool]);
    const handleImageUpload = async (file) => {
        if (!file || !fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        const reader = new FileReader();

        reader.onerror = (error) => {
            alert('Failed to read the file. Please try again.');
        };

        const baseId = `${file.type.includes('pdf') ? 'pdf' : 'img'}_${userId}_${Date.now()}`;

        if (file.type === 'application/pdf') {
            reader.onload = async (e) => {
                try {
                    if (!window.pdfjsLib) {
                        window.pdfjsLib = await import('pdfjs-dist');
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${window.pdfjsLib.version}/pdf.worker.min.js`;
                    }

                    const pdfData = new Uint8Array(e.target.result);
                    const pdf = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
                    const totalPages = pdf.numPages;

                    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.5 });

                        const tempCanvas = document.createElement('canvas');
                        const context = tempCanvas.getContext('2d');
                        tempCanvas.height = viewport.height;
                        tempCanvas.width = viewport.width;

                        await page.render({
                            canvasContext: context,
                            viewport: viewport
                        }).promise;

                        const imgData = tempCanvas.toDataURL('image/jpeg', 0.8);
                        const objectId = `${baseId}_page${pageNum}`;

                        const existingPage = canvas.getObjects().find(obj => obj.id === objectId);
                        if (existingPage) {
                            canvas.remove(existingPage);
                            processedObjects.current.delete(objectId);
                        }

                        await new Promise((resolve) => {
                            fabric.Image.fromURL(imgData, (fabricImg) => {
                                if (!fabricImg) {
                                    return;
                                }

                                const margin = 20;
                                const xOffset = (pageNum - 1) * margin;
                                const yOffset = (pageNum - 1) * margin;

                                const maxWidth = canvas.width * 0.8;
                                const maxHeight = canvas.height * 0.8;
                                if (fabricImg.width > maxWidth || fabricImg.height > maxHeight) {
                                    const scale = Math.min(maxWidth / fabricImg.width, maxHeight / fabricImg.height);
                                    fabricImg.scale(scale);
                                }

                                fabricImg.set({
                                    left: xOffset + margin,
                                    top: yOffset + margin,
                                    id: objectId,
                                    ownerId: userId,
                                    type: 'pdf-page',
                                    pageNumber: pageNum,
                                    totalPages: totalPages,
                                    selectable: true,
                                    evented: true,
                                    crossOrigin: 'anonymous'
                                });

                                canvas.add(fabricImg);
                                canvas.setActiveObject(fabricImg);
                                canvas.renderAll();

                                processedObjects.current.add(objectId);

                                if (isConnected) {
                                    const objectToSync = {
                                        ...fabricImg.toObject(['id', 'ownerId']),
                                        type: 'pdf-page',
                                        pageNumber: pageNum,
                                        totalPages: totalPages,
                                        src: imgData,
                                        left: fabricImg.left,
                                        top: fabricImg.top,
                                        scaleX: fabricImg.scaleX,
                                        scaleY: fabricImg.scaleY,
                                        angle: fabricImg.angle || 0
                                    };

                                    emit(EVENTS.DRAW_ACTION, createDrawAction(
                                        DRAW_ACTIONS.ADD_OBJECT,
                                        { json: objectToSync },
                                        userId,
                                        roomId
                                    ));
                                }

                                resolve();
                            }, { crossOrigin: 'anonymous' });
                        });

                        tempCanvas.remove();
                    }
                } catch (error) {
                    alert('Failed to process the PDF. Please try again.');
                }
            };

            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (e) => {
                const imgData = e.target.result;
                const objectId = baseId;

                const existingImg = canvas.getObjects().find(obj => obj.id === objectId);
                if (existingImg) {
                    canvas.remove(existingImg);
                    processedObjects.current.delete(objectId);
                }

                const img = new Image();
                img.onload = () => {
                    try {
                        fabric.Image.fromURL(imgData, (fabricImg) => {
                            if (!fabricImg) {
                                return;
                            }

                            const viewportCenter = {
                                x: canvas.width / 2,
                                y: canvas.height / 2
                            };

                            const maxWidth = canvas.width * 0.8;
                            const maxHeight = canvas.height * 0.8;
                            if (fabricImg.width > maxWidth || fabricImg.height > maxHeight) {
                                const scale = Math.min(maxWidth / fabricImg.width, maxHeight / fabricImg.height);
                                fabricImg.scale(scale);
                            }

                            fabricImg.set({
                                left: viewportCenter.x - (fabricImg.width * fabricImg.scaleX) / 2,
                                top: viewportCenter.y - (fabricImg.height * fabricImg.scaleY) / 2,
                                id: objectId,
                                ownerId: userId,
                                type: 'image',
                                selectable: true,
                                evented: true,
                                crossOrigin: 'anonymous'
                            });

                            canvas.add(fabricImg);
                            canvas.setActiveObject(fabricImg);
                            canvas.renderAll();

                            processedObjects.current.add(objectId);

                            if (isConnected) {
                                const objectToSync = {
                                    ...fabricImg.toObject(['id', 'ownerId']),
                                    type: 'image',
                                    src: imgData,
                                    left: fabricImg.left,
                                    top: fabricImg.top,
                                    scaleX: fabricImg.scaleX,
                                    scaleY: fabricImg.scaleY,
                                    angle: fabricImg.angle || 0
                                };

                                emit(EVENTS.DRAW_ACTION, createDrawAction(
                                    DRAW_ACTIONS.ADD_OBJECT,
                                    { json: objectToSync },
                                    userId,
                                    roomId
                                ));
                            }
                        }, { crossOrigin: 'anonymous' });
                    } catch (error) {
                        alert('Failed to process the image. Please try again.');
                    }
                };

                img.onerror = () => {
                    alert('Failed to load the image. Please try again.');
                };

                img.src = imgData;
            };

            reader.readAsDataURL(file);
        }
    };

    const saveCanvasState = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !isConnected) return;

        const state = {
            roomId,
            state: canvas.toJSON(['id', 'ownerId', 'type']),
            actionHistory: actionStack.current,
            timestamp: Date.now()
        };

        emit(EVENTS.CANVAS_STATE, state);
    };

    const handleUserJoin = (userId) => {
        if (!fabricCanvasRef.current || !isConnected || userRole !== 'tutor') return;

        saveCanvasState();
    };

    const setupCanvasEventHandlers = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        canvas.on('object:added', (e) => {
            if (isRemoteAction.current || !isConnected || isUndoRedoAction.current) return;

            const object = e.target;
            if (!object || object.temporary === true || object.excludeFromExport === true) return;

            const action = {
                type: 'add',
                objectId: object.id,
                timestamp: Date.now(),
                object: object.toJSON(['id', 'ownerId', 'type', 'src'])
            };

            actionStack.current.push(action);
            saveStateToStorage();

            if (isConnected) {
                emit(EVENTS.DRAW_ACTION, createDrawAction(
                    DRAW_ACTIONS.ADD_OBJECT,
                    {
                        json: action.object,
                        actionId: action.objectId
                    },
                    userId,
                    roomId
                ));
            }
        });

        canvas.on('object:modified', (e) => {
            if (isRemoteAction.current || !isConnected || isUndoRedoAction.current) return;

            const object = e.target;
            if (!object || object.temporary === true || object.excludeFromExport === true) return;
            if (userRole === 'student' && object.ownerId !== userId) return;

            const action = {
                type: 'modify',
                objectId: object.id,
                timestamp: Date.now(),
                object: object.toJSON(['id', 'ownerId', 'type', 'src'])
            };

            actionStack.current.push(action);
            saveStateToStorage();

            if (isConnected) {
                emit(EVENTS.DRAW_ACTION, createDrawAction(
                    DRAW_ACTIONS.MODIFY_OBJECT,
                    {
                        objectId: object.id,
                        json: action.object,
                        actionId: action.objectId
                    },
                    userId,
                    roomId
                ));
            }
        });

        canvas.on('object:removed', (e) => {
            if (isRemoteAction.current || !isConnected || isUndoRedoAction.current) return;

            const object = e.target;
            if (!object || object.temporary === true || object.excludeFromExport === true) return;
            if (userRole === 'student' && object.ownerId !== userId) return;

            const action = {
                type: 'remove',
                objectId: object.id,
                timestamp: Date.now(),
                object: object.toJSON(['id', 'ownerId', 'type', 'src'])
            };

            actionStack.current.push(action);
            saveStateToStorage();

            if (object.id) {
                processedObjects.current.delete(object.id);

                if (isConnected) {
                    emit(EVENTS.DRAW_ACTION, createDrawAction(
                        DRAW_ACTIONS.REMOVE_OBJECT,
                        {
                            objectId: object.id,
                            actionId: action.objectId
                        },
                        userId,
                        roomId
                    ));
                }
            }
        });
    };

    const clearCanvas = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        isRemoteAction.current = true;
        canvas.clear();
        processedObjects.current.clear();
        isRemoteAction.current = false;

        if (isConnected) {
            emit(EVENTS.DRAW_ACTION, createDrawAction(
                DRAW_ACTIONS.CLEAR,
                {},
                userId,
                roomId
            ));
        }
    };

    const exportCanvasAsImage = (format = 'png') => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;

        return fabricHelpers.exportCanvasToImage(canvas, format);
    };

    const exportCanvasAsSVG = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;

        return fabricHelpers.exportCanvasToSVG(canvas);
    };

    const saveCurrentStateToHistory = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || isUndoRedoAction.current) return;

        const currentState = canvas.toJSON(['id', 'ownerId', 'type']);

        historyStack.current.push(currentState);

        if (historyStack.current.length > maxHistoryLength) {
            historyStack.current.shift();
        }

        redoStack.current = [];
    };

    const undoAction = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || actionStack.current.length === 0) return;

        isUndoRedoAction.current = true;
        const lastAction = actionStack.current.pop();
        redoStack.current.push(lastAction);
        try {
            switch (lastAction.type) {
                case 'add':
                    const addedObj = canvas.getObjects().find(o => o.id === lastAction.objectId);
                    if (addedObj) {
                        canvas.remove(addedObj);
                        processedObjects.current.delete(lastAction.objectId);
                    }
                    break;
                case 'modify':
                    const modifiedObj = canvas.getObjects().find(o => o.id === lastAction.objectId);
                    if (modifiedObj) {
                        fabric.util.enlivenObjects([lastAction.originalState], (objects) => {
                            objects.forEach(obj => {
                                modifiedObj.set(obj);
                                modifiedObj.setCoords();
                            });
                            canvas.renderAll();
                        });
                    }
                    break;
                case 'remove':
                    fabric.util.enlivenObjects([lastAction.object], (objects) => {
                        objects.forEach(obj => {
                            canvas.add(obj);
                            processedObjects.current.add(obj.id);
                        });
                        canvas.renderAll();
                    });
                    break;
            }

            if (isConnected) {
                const canvasState = canvas.toJSON(['id', 'ownerId', 'type']);
                emit(EVENTS.CANVAS_STATE, {
                    roomId,
                    state: canvasState
                });
            }
        } finally {
            isUndoRedoAction.current = false;
        }
    };

    const redoAction = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || redoStack.current.length === 0) return;


        isUndoRedoAction.current = true;
        const nextAction = redoStack.current.pop();
        actionStack.current.push(nextAction);
        try {
            switch (nextAction.type) {
                case 'add':
                    fabric.util.enlivenObjects([nextAction.object], (objects) => {
                        objects.forEach(obj => {
                            canvas.add(obj);
                            processedObjects.current.add(obj.id);
                        });
                        canvas.renderAll();
                    });
                    break;
                case 'modify':
                    const modifiedObj = canvas.getObjects().find(o => o.id === nextAction.objectId);
                    if (modifiedObj) {
                        modifiedObj.set(nextAction.object);
                        modifiedObj.setCoords();
                        canvas.renderAll();
                    }
                    break;
                case 'remove':
                    const removedObj = canvas.getObjects().find(o => o.id === nextAction.objectId);
                    if (removedObj) {
                        canvas.remove(removedObj);
                        processedObjects.current.delete(nextAction.objectId);
                    }
                    break;
            }

            if (isConnected) {
                const canvasState = canvas.toJSON(['id', 'ownerId', 'type']);
                emit(EVENTS.CANVAS_STATE, {
                    roomId,
                    state: canvasState
                });
            }
        } finally {
            isUndoRedoAction.current = false;
        }
    };

    const handleSaveEquation = (latexEquation) => {
        if (!latexEquation.trim()) return;

        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        try {
            const tempElement = document.createElement('div');
            tempElement.style.position = 'absolute';
            tempElement.style.left = '-9999px';
            // tempElement.style.backgroundColor = 'white';
            // tempElement.style.padding = '20px';
            document.body.appendChild(tempElement);

            katex.render(latexEquation, tempElement, {
                displayMode: true,
                throwOnError: false,
                errorColor: '#f44336'
            });

            html2canvas(tempElement, {
                backgroundColor: null,
                // scale: 2,
                logging: false
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const objectId = `eq_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                fabric.Image.fromURL(imgData, (img) => {
                    const id = `equation_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    if (!img) {
                        return;
                    }

                    img.set({
                        left: equationPosition.x,
                        top: equationPosition.y,
                        id: objectId,
                        ownerId: userId,
                        selectable: true,
                        equation: latexEquation
                    });

                    fabricCanvasRef.current.add(img);
                    fabricCanvasRef.current.renderAll();

                    processedObjects.current.add(objectId);
                    processedObjects.current.add(id);
                    applyPermissions(img);  // Add this line

                    if (isConnected) {
                        emit(EVENTS.DRAW_ACTION, createDrawAction(
                            DRAW_ACTIONS.ADD_IMAGE,
                            {
                                imageData: imgData,
                                position: {
                                    left: equationPosition.x,
                                    top: equationPosition.y
                                },
                                id: objectId,
                                equation: latexEquation
                            },
                            userId,
                            roomId
                        ));
                    }
                });

                document.body.removeChild(tempElement);
            }).catch(error => {
                document.body.removeChild(tempElement);
            });
        } catch (error) {
        }

        setEquationEditorOpen(false);
    };

    useEffect(() => {
        const handleKeyboardEvents = (e) => {
            const canvas = fabricCanvasRef.current;
            if (!canvas || isActionBlocked) return;

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                undoAction();
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = canvas.getActiveObjects();
                if (activeObjects.length > 0) {
                    e.preventDefault();
                    activeObjects.forEach(obj => {
                        if (userRole === 'tutor' || obj.ownerId === userId) {
                            canvas.remove(obj);
                            actionStack.current.push({
                                type: 'remove',
                                objectId: obj.id,
                                object: obj.toJSON(['id', 'ownerId'])
                            });
                            processedObjects.current.delete(obj.id);
                            if (isConnected) {
                                emit(EVENTS.DRAW_ACTION, createDrawAction(
                                    DRAW_ACTIONS.REMOVE_OBJECT,
                                    { objectId: obj.id },
                                    userId,
                                    roomId
                                ));
                            }
                        }
                    });
                    canvas.discardActiveObject().renderAll();
                }
            }
        };

        window.addEventListener('keydown', handleKeyboardEvents);
        return () => window.removeEventListener('keydown', handleKeyboardEvents);
    }, [isActionBlocked, userRole, userId, isConnected, emit, roomId]);

    const saveStateToStorage = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const state = {
            canvasState: canvas.toJSON(['id', 'ownerId', 'type']),
            actionHistory: actionStack.current,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
        }
    };

    const loadStateFromStorage = () => {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (!savedState) return null;

            return JSON.parse(savedState);
        } catch (error) {
            return null;
        }
    };

    return (
        <div className="canvas-container">
            <canvas ref={canvasRef} />
            {equationEditorOpen && (
                <EquationEditor
                    position={equationPosition}
                    onClose={() => setEquationEditorOpen(false)}
                    onSubmit={handleSaveEquation}
                />
            )}
        </div>
    );
});

export default Canvas;