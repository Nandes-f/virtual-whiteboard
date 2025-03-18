import React, { createContext, useState, useContext, useEffect } from 'react';

const WhiteboardContext = createContext();

export const useWhiteboard = () => useContext(WhiteboardContext);

export const WhiteboardProvider = ({ children, userId, initialRole }) => {
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [users, setUsers] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasObjects, setCanvasObjects] = useState([]);
  // Use initialRole if provided, otherwise get from localStorage or default to student
  const [userRole, setUserRole] = useState(initialRole || localStorage.getItem('whiteboard_user_role') || 'student');
  const [isActionBlocked, setIsActionBlocked] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('whiteboard_dark_mode');
    if (savedDarkMode) {
      setDarkMode(savedDarkMode === 'true');
    }
    
    const savedColor = localStorage.getItem('whiteboard_color');
    if (savedColor) {
      setColor(savedColor);
    }
    
    const savedBrushSize = localStorage.getItem('whiteboard_brush_size');
    if (savedBrushSize) {
      setBrushSize(parseInt(savedBrushSize, 10));
    }
    
    // We're now setting the role in the useState initialization above
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('whiteboard_dark_mode', darkMode);
    localStorage.setItem('whiteboard_color', color);
    localStorage.setItem('whiteboard_brush_size', brushSize);
    localStorage.setItem('whiteboard_user_role', userRole);
  }, [darkMode, color, brushSize, userRole]);

  // Apply dark mode to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const addToHistory = (objects) => {
    // Remove any forward history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(objects);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      return history[historyIndex - 1];
    }
    return null;
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      return history[historyIndex + 1];
    }
    return null;
  };

  // Add a function to properly change tools
  const changeTool = (newTool) => {
    console.log('Changing tool to:', newTool);
    setTool(newTool);
    
    // Reset any active states when changing tools
    if (newTool !== 'pen' && newTool !== 'eraser') {
      // Additional logic for specific tools if needed
    }
  };
  
  // Update the value object to include the new function
  const value = {
    tool,
    setTool: changeTool, // Replace setTool with changeTool
    color,
    setColor,
    brushSize,
    setBrushSize,
    users,
    setUsers,
    darkMode,
    setDarkMode,
    history,
    historyIndex,
    addToHistory,
    undo,
    redo,
    canvasObjects,
    setCanvasObjects,
    // Add new properties
    userRole,
    setUserRole,
    isActionBlocked,
    setIsActionBlocked,
    userId
  };

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  );
};