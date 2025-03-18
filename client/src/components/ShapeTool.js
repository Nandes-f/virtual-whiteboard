import React, { useState, useRef, useEffect } from 'react';
import { useWhiteboard } from '../context/WhiteboardContext';

const ShapeTool = ({ canvas, type }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const shapeRef = useRef(null);
  
  const { color, brushSize } = useWhiteboard();
  
  useEffect(() => {
    if (!canvas) return;
    
    const handleMouseDown = (e) => {
      const pointer = canvas.getPointer(e.e);
      setStartPoint({ x: pointer.x, y: pointer.y });
      setIsDrawing(true);
      
      // Create temporary shape based on type
      let shape;
      
      switch (type) {
        case 'rectangle':
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: brushSize,
            selectable: false,
            evented: false
          });
          break;
        case 'circle':
          shape = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: brushSize,
            selectable: false,
            evented: false
          });
          break;
        case 'line':
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: brushSize,
            selectable: false,
            evented: false
          });
          break;
        case 'arrow':
          // For arrow, we'll use a line for now and convert to arrow on mouse up
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: brushSize,
            selectable: false,
            evented: false
          });
          break;
        default:
          break;
      }
      
      if (shape) {
        canvas.add(shape);
        shapeRef.current = shape;
      }
    };
    
    const handleMouseMove = (e) => {
      if (!isDrawing || !shapeRef.current) return;
      
      const pointer = canvas.getPointer(e.e);
      
      switch (type) {
        case 'rectangle':
          const width = pointer.x - startPoint.x;
          const height = pointer.y - startPoint.y;
          
          shapeRef.current.set({
            width: Math.abs(width),
            height: Math.abs(height),
            left: width > 0 ? startPoint.x : pointer.x,
            top: height > 0 ? startPoint.y : pointer.y
          });
          break;
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(pointer.x - startPoint.x, 2) + 
            Math.pow(pointer.y - startPoint.y, 2)
          ) / 2;
          
          const centerX = (startPoint.x + pointer.x) / 2;
          const centerY = (startPoint.y + pointer.y) / 2;
          
          shapeRef.current.set({
            radius: radius,
            left: centerX - radius,
            top: centerY - radius
          });
          break;
        case 'line':
        case 'arrow':
          shapeRef.current.set({
            x2: pointer.x,
            y2: pointer.y
          });
          break;
        default:
          break;
      }
      
      canvas.renderAll();
    };
    
    const handleMouseUp = () => {
      if (!isDrawing || !shapeRef.current) return;
      
      // If it's an arrow, convert the line to an arrow
      if (type === 'arrow') {
        const line = shapeRef.current;
        const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
        
        // Create arrow head
        const headSize = brushSize * 5;
        const triangle = new fabric.Triangle({
          left: line.x2,
          top: line.y2,
          pointType: 'arrow_start',
          angle: (angle * 180 / Math.PI) + 90,
          width: headSize,
          height: headSize,
          fill: color
        });
        
        // Remove the temporary line
        canvas.remove(line);
        
        // Create a new group with line and arrow head
        const arrow = new fabric.Group([
          new fabric.Line([line.x1, line.y1, line.x2, line.y2], {
            stroke: color,
            strokeWidth: brushSize
          }),
          triangle
        ]);
        
        canvas.add(arrow);
      }
      
      // Make the shape selectable again
      shapeRef.current.set({
        selectable: true,
        evented: true
      });
      
      canvas.renderAll();
      setIsDrawing(false);
      shapeRef.current = null;
    };
    
    // Add event listeners
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    
    // Clean up
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [canvas, type, color, brushSize, isDrawing, startPoint]);
  
  return null; // This is a functional component with no UI
};

export default ShapeTool;