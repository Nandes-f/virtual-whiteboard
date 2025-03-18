import React, { useEffect } from 'react';
import { fabric } from 'fabric';
import { useWhiteboard } from '../context/WhiteboardContext';

const TextTool = ({ canvas }) => {
  const { color, brushSize } = useWhiteboard();
  
  useEffect(() => {
    if (!canvas) return;
    
    const handleMouseDown = (e) => {
      // Get pointer position
      const pointer = canvas.getPointer(e.e);
      
      // Create a new text object
      const text = new fabric.IText('Text', {
        left: pointer.x,
        top: pointer.y,
        fontFamily: 'Arial',
        fontSize: brushSize * 5, // Scale font size based on brush size
        fill: color,
        editable: true
      });
      
      // Add to canvas
      canvas.add(text);
      
      // Set as active object and enter editing mode
      canvas.setActiveObject(text);
      text.enterEditing();
      
      // Prevent default to avoid selecting other objects
      e.e.preventDefault();
    };
    
    // Add event listener
    canvas.on('mouse:down', handleMouseDown);
    
    // Clean up
    return () => {
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [canvas, color, brushSize]);
  
  return null; // This is a functional component with no UI
};

export default TextTool;