import React, { createContext, useState, useContext, useEffect } from 'react';

const WhiteboardContext = createContext();

export const useWhiteboard = () => useContext(WhiteboardContext);

export const WhiteboardProvider = ({ children, userId, initialRole }) => {
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [users, setUsers] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [userRole, setUserRole] = useState(initialRole || localStorage.getItem('whiteboard_user_role') || 'student');
  const [isActionBlocked, setIsActionBlocked] = useState(false);
  const [viewMode, setViewMode] = useState('normal');

  // Available tools
  const availableTools = [
    { name: 'select', icon: 'mouse-pointer' },
    { name: 'pen', icon: 'pencil-alt' },
    { name: 'pixel', icon: 'th' },
    { name: 'eraser', icon: 'eraser' },
    { name: 'rectangle', icon: 'square' },
    { name: 'circle', icon: 'circle' },
    { name: 'line', icon: 'slash' },
    { name: 'arrow', icon: 'long-arrow-alt-right' },
    { name: 'text', icon: 'font' },
    { name: 'equation', icon: 'square-root-alt' },
    { name: 'laser', icon: 'dot-circle' },
    { name: 'image', icon: 'image' }
  ];

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

  // Handle tool selection
  const handleToolChange = (newTool) => {
    setTool(newTool);
  };

  // Handle color change
  const handleColorChange = (newColor) => {
    setColor(newColor);
  };

  // Handle brush size change
  const handleBrushSizeChange = (newSize) => {
    setBrushSize(newSize);
  };

  // Handle view mode change
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
  };

  // Update the value object to include the new function
  const value = {
    tool,
    setTool: handleToolChange,
    color,
    setColor: handleColorChange,
    brushSize,
    setBrushSize: handleBrushSizeChange,
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
    userRole,
    setUserRole,
    isActionBlocked,
    setIsActionBlocked,
    userId,
    viewMode,
    setViewMode,
    availableTools,
    handleToolChange,
    handleColorChange,
    handleBrushSizeChange,
    handleViewModeChange
  };

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  );
};