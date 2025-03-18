import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboard } from '../context/WhiteboardContext';
import ColorPicker from './ColorPicker';
import { EVENTS, DRAW_ACTIONS, createDrawAction } from '../utils/socketEvents';
import * as fabricHelpers from '../utils/fabricHelpers';
import { 
  FaPen, 
  FaEraser, 
  FaFont, 
  FaSquare, 
  FaCircle, 
  FaLongArrowAltRight,
  FaMinus,
  FaMousePointer,
  FaImage,
  FaFilePdf,
  FaUndo,
  FaRedo,
  FaTrash,
  FaDownload,
  FaSquareFull,
  FaRegSquare,
  FaMagic // Use FaMagic instead of RiLaserPenFill
} from 'react-icons/fa';
import { SiLatex } from 'react-icons/si';

const Toolbar = ({ fabricCanvasRef, isConnected, emit, roomId, userId }) => {
  const { 
    tool, 
    setTool, 
    color, 
    setColor, 
    brushSize, 
    setBrushSize, 
    darkMode,
    undo,
    redo,
    addToHistory,
    setCanvasObjects
  } = useWhiteboard();
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);
  
  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle tool selection
  const handleToolSelect = (toolId) => {
    console.log('Tool selected:', toolId);
    setTool(toolId);
    
    // Close color picker if open
    if (showColorPicker) {
      setShowColorPicker(false);
    }
  };
  
  // Handle clear canvas
  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        // Clear the canvas
        canvas.clear();
        
        // Emit clear event to other users
        if (isConnected) {
          emit(EVENTS.DRAW_ACTION, roomId, createDrawAction(
            DRAW_ACTIONS.CLEAR,
            {},
            userId
          ));
          
          // Also emit a specific clear canvas event
          emit(EVENTS.CLEAR_CANVAS, roomId);
        }
        
        // Reset history
        addToHistory([]);
        setCanvasObjects([]);
      }
    }
  };
  
  // Handle undo
  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const prevState = undo();
    if (prevState) {
      fabricHelpers.loadCanvasFromJson(canvas, prevState);
      
      // Notify other users
      if (isConnected) {
        emit(EVENTS.CANVAS_STATE, roomId, prevState);
      }
    }
  };
  
  // Handle redo
  const handleRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const nextState = redo();
    if (nextState) {
      fabricHelpers.loadCanvasFromJson(canvas, nextState);
      
      // Notify other users
      if (isConnected) {
        emit(EVENTS.CANVAS_STATE, roomId, nextState);
      }
    }
  };
  
  // Handle download canvas
  const handleDownload = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1.0
    });
    
    const link = document.createElement('a');
    link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgObj = new Image();
      imgObj.src = event.target.result;
      imgObj.onload = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        
        // Change from fabricHelpers.addImageToCanvas to fabricHelpers.addImage
        fabricHelpers.addImage(canvas, imgObj);
      };
    };
    reader.readAsDataURL(file);
    
    // Reset the input value so the same file can be selected again
    e.target.value = null;
  };
  
  return (
    <div className={`toolbar ${darkMode ? 'dark-mode' : ''}`}>
      <div className="tool-group">
        <button 
          className={`tool-button ${tool === 'select' ? 'active' : ''}`}
          onClick={() => handleToolSelect('select')}
          title="Select"
        >
          <FaMousePointer />
        </button>
        <button 
          className={`tool-button ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => handleToolSelect('pen')}
          title="Pen"
        >
          <FaPen />
        </button>
        <button 
          className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => handleToolSelect('eraser')}
          title="Eraser"
        >
          <FaEraser />
        </button>
      </div>
      
      <div className="tool-group">
        <button 
          className={`tool-button ${tool === 'text' ? 'active' : ''}`}
          onClick={() => handleToolSelect('text')}
          title="Text"
        >
          <FaFont />
        </button>
        <button 
          className={`tool-button ${tool === 'rectangle' ? 'active' : ''}`}
          onClick={() => handleToolSelect('rectangle')}
          title="Rectangle"
        >
          <FaRegSquare />
        </button>
        <button 
          className={`tool-button ${tool === 'circle' ? 'active' : ''}`}
          onClick={() => handleToolSelect('circle')}
          title="Circle"
        >
          <FaCircle />
        </button>
        <button 
          className={`tool-button ${tool === 'line' ? 'active' : ''}`}
          onClick={() => handleToolSelect('line')}
          title="Line"
        >
          <FaMinus />
        </button>
        <button 
          className={`tool-button ${tool === 'arrow' ? 'active' : ''}`}
          onClick={() => handleToolSelect('arrow')}
          title="Arrow"
        >
          <FaLongArrowAltRight />
        </button>
      </div>
      
      <div className="tool-group">
        <button 
          className={`tool-button ${tool === 'equation' ? 'active' : ''}`}
          onClick={() => handleToolSelect('equation')}
          title="Equation"
        >
          <SiLatex />
        </button>
        <button 
          className={`tool-button ${tool === 'laser' ? 'active' : ''}`}
          onClick={() => handleToolSelect('laser')}
          title="Laser Pointer"
        >
          <FaMagic />
        </button>
        <div className="color-tool" ref={colorPickerRef}>
          <button 
            className="tool-button color-button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Color"
            style={{ backgroundColor: color }}
          >
            <FaSquareFull style={{ color: 'transparent' }} />
          </button>
          {showColorPicker && (
            <div className="color-picker-container">
              <ColorPicker 
                color={color} 
                onChange={setColor} 
                onClose={() => setShowColorPicker(false)} 
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="tool-group">
        <input 
          type="file" 
          id="image-upload" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={handleImageUpload}
        />
        <button 
          className="tool-button"
          onClick={() => document.getElementById('image-upload').click()}
          title="Upload Image"
        >
          <FaImage />
        </button>
        <input 
          type="file" 
          id="pdf-upload" 
          accept=".pdf" 
          style={{ display: 'none' }} 
          // PDF upload handler would go here
        />
        <button 
          className="tool-button"
          onClick={() => document.getElementById('pdf-upload').click()}
          title="Upload PDF"
        >
          <FaFilePdf />
        </button>
      </div>
      
      <div className="tool-group">
        <button 
          className="tool-button"
          onClick={handleUndo}
          title="Undo"
        >
          <FaUndo />
        </button>
        <button 
          className="tool-button"
          onClick={handleRedo}
          title="Redo"
        >
          <FaRedo />
        </button>
        <button 
          className="tool-button"
          onClick={handleClearCanvas}
          title="Clear Canvas"
        >
          <FaTrash />
        </button>
        <button 
          className="tool-button"
          onClick={handleDownload}
          title="Download"
        >
          <FaDownload />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;