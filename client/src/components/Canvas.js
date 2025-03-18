import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useWhiteboard } from '../context/WhiteboardContext';
import { EVENTS, DRAW_ACTIONS, createDrawAction } from '../utils/socketEvents';
import * as fabricHelpers from '../utils/fabricHelpers';
import EquationEditor from './EquationEditor';
import html2canvas from 'html2canvas';
import katex from 'katex';

const Canvas = ({ roomId, userId, userRole, isConnected, emit, on, off }) => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const isProcessingEvent = useRef(false);
    const pendingUpdates = useRef(new Map());
    const [equationEditorOpen, setEquationEditorOpen] = useState(false);
    const [equationPosition, setEquationPosition] = useState({ x: 0, y: 0 });
    const laserPointerTimeout = useRef(null);

    const {
        tool,
        setTool,
        color,
        brushSize,
        isActionBlocked,
        setIsActionBlocked
    } = useWhiteboard();

    // Canvas initialization
    useEffect(() => {
        const canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: false,
            selection: true,
            width: window.innerWidth - 60,
            height: window.innerHeight - 60
        });

        fabricCanvasRef.current = canvas;

        const handleResize = () => {
            canvas.setDimensions({
                width: window.innerWidth - 60,
                height: window.innerHeight - 60
            });
        };

        window.addEventListener('resize', handleResize);
        isConnected && emit(EVENTS.REQUEST_CANVAS_STATE, roomId);

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.dispose();
        };
    }, [isConnected, emit, roomId]);

    // Tool configuration
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // Ensure color is a valid string format
        const ensureColorString = (colorValue) => {
            if (!colorValue || typeof colorValue !== 'string') {
                return '#000000'; // Default to black if color is invalid
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
            return;
        }

        // Clean up any active drawing listeners
        const cleanupDrawingListeners = () => {
            canvas.off('mouse:down');
            canvas.off('mouse:move');
            canvas.off('mouse:up');
        };

        const configureTool = () => {
            // First clean up any previous tool listeners
            cleanupDrawingListeners();
            
            switch (tool) {
                case 'pen':
                    fabricHelpers.createPenBrush(canvas, safeColor, brushSize);
                    canvas.isDrawingMode = true;
                    break;
                case 'eraser':
                    fabricHelpers.createEraserBrush(canvas, brushSize);
                    canvas.isDrawingMode = true;
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
                    break;
                default:
                    canvas.isDrawingMode = false;
                    canvas.selection = tool === 'select';
            }
            canvas.renderAll();
        };

        // Setup shape drawing (rectangle, circle, line, arrow)
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
                            evented: false
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
                            evented: false
                        });
                        break;
                    case 'line':
                        shape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                            stroke: safeColor,
                            strokeWidth: brushSize,
                            selectable: false,
                            evented: false
                        });
                        break;
                    case 'arrow':
                        shape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                            stroke: safeColor,
                            strokeWidth: brushSize,
                            selectable: false,
                            evented: false
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
                
                if (shapeType === 'arrow') {
                    // Remove the temporary line
                    canvas.remove(shape);
                    
                    // Create an arrow using the line coordinates
                    const dx = shape.x2 - shape.x1;
                    const dy = shape.y2 - shape.y1;
                    const angle = Math.atan2(dy, dx);
                    
                    // Create the arrow head
                    const headLength = brushSize * 3;
                    const headAngle = Math.PI / 6; // 30 degrees
                    
                    // Calculate arrow head points
                    const x1 = shape.x2 - headLength * Math.cos(angle - headAngle);
                    const y1 = shape.y2 - headLength * Math.sin(angle - headAngle);
                    const x2 = shape.x2 - headLength * Math.cos(angle + headAngle);
                    const y2 = shape.y2 - headLength * Math.sin(angle + headAngle);
                    
                    // Create a path for the arrow
                    const path = [
                        'M', shape.x1, shape.y1,
                        'L', shape.x2, shape.y2,
                        'L', x1, y1,
                        'M', shape.x2, shape.y2,
                        'L', x2, y2
                    ];
                    
                    // Create the arrow as a path
                    const arrow = new fabric.Path(path.join(' '), {
                        stroke: safeColor,
                        strokeWidth: brushSize,
                        fill: '',
                        id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        ownerId: userId
                    });
                    
                    canvas.add(arrow);
                } else {
                    // For other shapes, make them selectable and add ID
                    shape.set({
                        selectable: true,
                        evented: true,
                        id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        ownerId: userId
                    });
                }
                
                canvas.renderAll();
                shape = null;
            });
        };

        // Setup text tool
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
                    id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    ownerId: userId
                });
                
                canvas.add(text);
                canvas.setActiveObject(text);
                text.enterEditing();
                canvas.renderAll();
            });
        };

        // Setup equation tool
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

        // Setup laser pointer
        const setupLaserPointer = () => {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.defaultCursor = 'none';
            
            let laserPoint = null;
            
            canvas.on('mouse:move', (e) => {
                if (isActionBlocked) return;
                
                const pointer = canvas.getPointer(e.e);
                
                // Remove previous laser point if exists
                if (laserPoint) {
                    canvas.remove(laserPoint);
                }
                
                // Create new laser point
                laserPoint = new fabric.Circle({
                    left: pointer.x - 5,
                    top: pointer.y - 5,
                    radius: 5,
                    fill: safeColor,
                    opacity: 0.7,
                    selectable: false,
                    evented: false,
                    originX: 'center',
                    originY: 'center'
                });
                
                canvas.add(laserPoint);
                
                // Send laser pointer position to other users
                emit(EVENTS.DRAW_ACTION, roomId, createDrawAction(
                    'laser-pointer',
                    { x: pointer.x, y: pointer.y, color: safeColor },
                    userId
                ));
                
                // Auto-fade the laser point
                setTimeout(() => {
                    if (laserPoint && laserPoint.canvas) {
                        canvas.remove(laserPoint);
                        canvas.renderAll();
                    }
                }, 100);
                
                canvas.renderAll();
            });
        };

        configureTool();
        
        return () => {
            cleanupDrawingListeners();
        };
    }, [tool, color, brushSize, isActionBlocked, userId, roomId, emit]);

    // Socket event handling
    useEffect(() => {
        if (!isConnected) return;

        const handleRemoteUpdate = (drawAction) => {
            if (drawAction.userId === userId) return;

            const canvas = fabricCanvasRef.current;
            if (!canvas) return;

            const processUpdate = () => {
                switch (drawAction.type) {
                    case DRAW_ACTIONS.ADD_OBJECT:
                        fabric.util.enlivenObjects([drawAction.data], (objects) => {
                            objects.forEach(obj => {
                                obj.set({
                                    ownerId: drawAction.data.ownerId || drawAction.userId,
                                    source: 'remote'
                                });

                                if (!canvas.getObjects().some(o => o.id === obj.id)) {
                                    canvas.add(obj);
                                    applyPermissions(obj);
                                }
                            });
                            canvas.renderAll();
                        });
                        break;

                    case DRAW_ACTIONS.MODIFY_OBJECT: {
                        const obj = canvas.getObjects().find(o => o.id === drawAction.data.id);
                        if (obj) {
                            obj.source = 'remote';
                            const originalOwnerId = obj.ownerId;
                            obj.set(drawAction.data);
                            // Preserve original ownership
                            obj.set({ ownerId: originalOwnerId });
                            applyPermissions(obj);
                            obj.setCoords();
                            canvas.renderAll();
                            setTimeout(() => obj.source = undefined, 100);
                        }
                        break;
                    }

                    case DRAW_ACTIONS.REMOVE_OBJECT: {
                        const obj = canvas.getObjects().find(o => o.id === drawAction.data.id);
                        if (obj) {
                            canvas.remove(obj);
                            canvas.renderAll();
                        }
                        break;
                    }

                    case DRAW_ACTIONS.CLEAR:
                        canvas.clear();
                        canvas.renderAll();
                        break;
                }
            };

            if (pendingUpdates.current.has(drawAction.objectId)) {
                pendingUpdates.current.get(drawAction.objectId).push(processUpdate);
            } else {
                pendingUpdates.current.set(drawAction.objectId, [processUpdate]);
                requestAnimationFrame(() => {
                    const queue = pendingUpdates.current.get(drawAction.objectId);
                    pendingUpdates.current.delete(drawAction.objectId);
                    queue?.forEach(fn => fn());
                });
            }
        };

        const applyPermissions = (obj) => {
            if (isActionBlocked) {
                obj.selectable = false;
                obj.evented = false;
            } else if (userRole === 'tutor') {
                obj.selectable = true;
                obj.evented = true;
            } else {
                obj.selectable = obj.ownerId === userId;
                obj.evented = obj.ownerId === userId;
            }
        };

        const handleCanvasState = (state) => {
            fabricCanvasRef.current?.loadFromJSON(state, () => {
                fabricCanvasRef.current?.getObjects().forEach(obj => {
                    if (!obj.ownerId) obj.ownerId = obj.userId || userId;
                    applyPermissions(obj);
                    obj.set({ source: 'remote' });
                });
                fabricCanvasRef.current?.renderAll();
            });
        };

        const handlePermissionChange = (studentId, isBlocked) => {
            if (userId === studentId) {
                setIsActionBlocked(isBlocked);
                isBlocked && setTool('select');
            }
        };

        on(EVENTS.DRAW_ACTION, handleRemoteUpdate);
        on(EVENTS.CANVAS_STATE_RESPONSE, handleCanvasState);
        on(EVENTS.STUDENT_PERMISSION_CHANGE, handlePermissionChange);

        return () => {
            off(EVENTS.DRAW_ACTION, handleRemoteUpdate);
            off(EVENTS.CANVAS_STATE_RESPONSE, handleCanvasState);
            off(EVENTS.STUDENT_PERMISSION_CHANGE, handlePermissionChange);
        };
    }, [isConnected, userId, userRole, on, off, setIsActionBlocked, isActionBlocked, setTool]);

    // Add this function to handle saving equations
    const handleSaveEquation = (latexEquation) => {
        if (!latexEquation.trim()) return;
        
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        
        // Create a div element to render the equation
        const tempElement = document.createElement('div');
        katex.render(latexEquation, tempElement, { displayMode: true, throwOnError: false });
        
        // Convert the rendered equation to an image
        html2canvas(tempElement).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            
            fabric.Image.fromURL(imgData, (img) => {
                img.set({
                    left: equationPosition.x,
                    top: equationPosition.y,
                    id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    ownerId: userId
                });
                
                fabricCanvasRef.current.add(img);
                fabricCanvasRef.current.renderAll();
                
                // Send to other users
                emit(EVENTS.DRAW_ACTION, roomId, createDrawAction(
                    DRAW_ACTIONS.ADD_OBJECT,
                    img.toObject(['id', 'ownerId']),
                    userId
                ));
            });
        });
        
        setEquationEditorOpen(false);
    };

    // Local event handlers
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const handleObjectModified = (e) => {
            if (e.target?.source === 'remote' || isProcessingEvent.current || isActionBlocked) return;
            const target = e.target;

            if (!target.id) target.id = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            if (!target.ownerId) target.ownerId = userId;

            // Allow tutors to modify any object, students only their own
            if (userRole === 'student' && target.ownerId !== userId) return;

            isProcessingEvent.current = true;
            emit(EVENTS.DRAW_ACTION, roomId, createDrawAction(
                DRAW_ACTIONS.MODIFY_OBJECT,
                target.toJSON(['id', 'ownerId']),
                userId,
                target.id
            ));
            isProcessingEvent.current = false;
        };

        const handleLocalAdd = (e) => {
            if (e.target?.source === 'remote' || isActionBlocked) return;
            const target = e.target;

            target.id = target.id || `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            target.ownerId = userId;

            emit(EVENTS.DRAW_ACTION, roomId, createDrawAction(
                DRAW_ACTIONS.ADD_OBJECT,
                target.toJSON(['id', 'ownerId']),
                userId,
                target.id
            ));
        };

        const handleLocalRemove = (e) => {
            if (e.target?.source === 'remote' || isActionBlocked) return;
            const target = e.target;

            if (userRole === 'student' && target.ownerId !== userId) return;

            emit(EVENTS.DRAW_ACTION, roomId, createDrawAction(
                DRAW_ACTIONS.REMOVE_OBJECT,
                { id: target.id },
                userId,
                target.id
            ));
        };

        canvas.on('object:added', handleLocalAdd);
        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:removed', handleLocalRemove);

        return () => {
            canvas.off('object:added', handleLocalAdd);
            canvas.off('object:modified', handleObjectModified);
            canvas.off('object:removed', handleLocalRemove);
        };
    }, [isConnected, roomId, userId, emit, userRole, isActionBlocked]);

    return (
        <>
            <canvas ref={canvasRef} />
            
            {equationEditorOpen && (
                <EquationEditor 
                    position={equationPosition}
                    onSave={handleSaveEquation}
                    onCancel={() => setEquationEditorOpen(false)}
                />
            )}
        </>
    );
};

export default Canvas;