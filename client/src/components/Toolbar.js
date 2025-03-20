import React, { useState, useEffect, useRef } from 'react';
import {
    FaPencilAlt,
    FaEraser,
    FaSquare,
    FaCircle,
    FaSlash,
    FaLongArrowAltRight,
    FaFont,
    FaTh,
    FaMousePointer,
    FaUndo,
    FaRedo,
    FaDownload,
    FaTrash,
    FaSignOutAlt,
    FaDotCircle,
    FaImage,
    FaFileUpload,
    FaSquareRootAlt
} from 'react-icons/fa';
import { useWhiteboard } from '../context/WhiteboardContext';
import { CirclePicker, ChromePicker } from 'react-color';
import Tooltip from './Tooltip';
import '../styles/Toolbar.css';

const Toolbar = ({ onClear, onSave, onUndo, onRedo, onUpload, onLeave, disabled = false }) => {
    const {
        tool,
        setTool,
        color,
        setColor,
        brushSize,
        setBrushSize,
        availableTools,
        userRole,
        darkMode // Make sure to get darkMode from context
    } = useWhiteboard();

    const [showColorPicker, setShowColorPicker] = useState(false);
    const [advancedColorPicker, setAdvancedColorPicker] = useState(false);
    const colorPickerRef = useRef(null);
    const toolbarRef = useRef(null);
    const fileInputRef = useRef(null);
    // const colorButtonRef = useRef(null);
    
    // Add a safe clear handler to prevent the null context error
    const handleClear = () => {
        if (onClear) {
            try {
                onClear();
            } catch (error) {
                console.error("Error clearing canvas:", error);
                // You might want to show a user-friendly error message here
            }
        }
    };

    // Close color picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target) &&
                toolbarRef.current && !toolbarRef.current.querySelector('.color-button').contains(event.target)) {
                setShowColorPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get icon component for a tool
    const getToolIcon = (toolName) => {
        switch (toolName) {
            case 'cursor':
            case 'select':
                return <FaMousePointer />;
            case 'pen':
                return <FaPencilAlt />;
            case 'eraser':
                return <FaEraser />;
            case 'rectangle':
                return <FaSquare />;
            case 'circle':
                return <FaCircle />;
            case 'line':
                return <FaSlash />;
            case 'arrow':
                return <FaLongArrowAltRight />;
            case 'text':
                return <FaFont />;
            case 'equation':
                return <FaSquareRootAlt />;
            case 'laser':
                return <FaDotCircle />;
            case 'image':
                return <FaImage />;
            case 'pixel':
                return <FaTh />;
            default:
                return <FaPencilAlt />;
        }
    };

    // Handle tool selection
    const handleToolChange = (newTool) => {
        if (disabled) return;
        setTool(newTool);
    };

    // Handle color change
    const handleColorChange = (newColor) => {
        if (disabled) return;
        setColor(newColor.hex);
    };

    // Toggle color picker view between simple and advanced
    const toggleAdvancedColorPicker = () => {
        setAdvancedColorPicker(!advancedColorPicker);
    };

    // Handle file upload
    const handleFileUpload = (e) => {
        if (disabled || !onUpload) return;

        const file = e.target.files[0];
        if (!file) return;

        onUpload(file);
        e.target.value = null; // Reset input
    };

    // Get size control based on active tool
    const renderSizeControl = () => {
        // Don't show size control for tools that don't need it
        // if (['select', 'text', 'equation', 'image'].includes(tool)) {
        //     return null;
        // }

        return (
            <div className="size-control">
                <label>Brush Size: {brushSize}</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    disabled={disabled}
                />
            </div>
        );
    };

    // Check if user has permissions to use this tool
    const canUseTools = () => {
        if (userRole === 'teacher' || userRole === 'admin') {
            return true;
        }
        // Student can only use tools if not disabled
        return !disabled;
    };

    // useEffect(() => {
    //     if (showColorPicker && colorButtonRef.current) {
    //         const rect = colorButtonRef.current.getBoundingClientRect();
    //         colorPickerRef.current.style.top = `${rect.bottom + 5}px`;
    //         colorPickerRef.current.style.left = `${rect.left}px`;
    //     }
    // }, [showColorPicker]);
    return (
        <div className="toolbar-container">

            <div className={`toolbar ${darkMode ? 'dark-mode' : ''}`} ref={toolbarRef}>
                <div className="tool-section">
                    {/* Tool buttons */}
                    <Tooltip content="Select" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'select' ? 'active' : ''}`}
                            onClick={() => handleToolChange('select')}
                            disabled={disabled}
                        >
                            <FaMousePointer />
                        </button>
                    </Tooltip>
                    <Tooltip content="Pen" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'pen' ? 'active' : ''}`}
                            onClick={() => handleToolChange('pen')}
                            disabled={!canUseTools()}
                        >
                            <FaPencilAlt />
                        </button>
                    </Tooltip>
                    {/* <Tooltip content="Pixel" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'pixel' ? 'active' : ''}`}
                            onClick={() => handleToolChange('pixel')}
                            disabled={!canUseTools()}
                        >
                            <FaTh />
                        </button>
                    </Tooltip> */}
                    <Tooltip content="Eraser" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
                            onClick={() => handleToolChange('eraser')}
                            disabled={!canUseTools()}
                        >
                            <FaEraser />
                        </button>
                    </Tooltip>
                    <Tooltip content="Rectangle" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'rectangle' ? 'active' : ''}`}
                            onClick={() => handleToolChange('rectangle')}
                            disabled={!canUseTools()}
                        >
                            <FaSquare />
                        </button>
                    </Tooltip>
                    <Tooltip content="Circle" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'circle' ? 'active' : ''}`}
                            onClick={() => handleToolChange('circle')}
                            disabled={!canUseTools()}
                        >
                            <FaCircle />
                        </button>
                    </Tooltip>
                    <Tooltip content="Line" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'line' ? 'active' : ''}`}
                            onClick={() => handleToolChange('line')}
                            disabled={!canUseTools()}
                        >
                            <FaSlash />
                        </button>
                    </Tooltip>
                    <Tooltip content="Arrow" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'arrow' ? 'active' : ''}`}
                            onClick={() => handleToolChange('arrow')}
                            disabled={!canUseTools()}
                        >
                            <FaLongArrowAltRight />
                        </button>
                    </Tooltip>
                    <Tooltip content="Text" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'text' ? 'active' : ''}`}
                            onClick={() => handleToolChange('text')}
                            disabled={!canUseTools()}
                        >
                            <FaFont />
                        </button>
                    </Tooltip>
                    <Tooltip content="Equation" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'equation' ? 'active' : ''}`}
                            onClick={() => handleToolChange('equation')}
                            disabled={!canUseTools()}
                        >
                            <FaSquareRootAlt />
                        </button>
                    </Tooltip>
                    <Tooltip content="Laser Pointer" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'laser' ? 'active' : ''}`}
                            onClick={() => handleToolChange('laser')}
                            disabled={!canUseTools()}
                        >
                            <FaDotCircle />
                        </button>
                    </Tooltip>
                    <Tooltip content="Upload Image" direction="bottom">
                        <button
                            className={`tool-button ${tool === 'image' ? 'active' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!canUseTools() || !onUpload}
                        >
                            <FaFileUpload />
                        </button>
                    </Tooltip>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                    />
                </div>

                <div className="tool-section">
                    {/* Color picker */}
                    <div className="color-picker-container">
                        <Tooltip content="Color" direction="bottom">
                            <button
                                // ref={colorButtonRef}
                                className="color-button"
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                disabled={disabled}
                            >
                                <div className="color-preview" style={{ backgroundColor: color }}></div>
                            </button>
                        </Tooltip>
                        {showColorPicker && (
                            <div className={`color-picker-dropdown ${darkMode ? 'dark-mode' : ''}`} /*ref={colorPickerRef}*/>
                                {renderSizeControl()}
                                {advancedColorPicker ? (
                                    <ChromePicker color={color} onChange={handleColorChange} />
                                ) : (
                                    <CirclePicker color={color} onChange={handleColorChange} />
                                )}
                                <button
                                    className="toggle-picker-button"
                                    onClick={toggleAdvancedColorPicker}
                                >
                                    {advancedColorPicker ? 'Simple' : 'Advanced'} Colors
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Size controls */}
                </div>

                <div className="tool-section">
                    {/* Action buttons */}
                    <Tooltip content="Undo" direction="bottom">
                        <button
                            className="tool-button"
                            onClick={onUndo}
                            disabled={disabled}
                        >
                            <FaUndo />
                        </button>
                    </Tooltip>
                    <Tooltip content="Redo" direction="bottom">
                        <button
                            className="tool-button"
                            onClick={onRedo}
                            disabled={disabled}
                        >
                            <FaRedo />
                        </button>
                    </Tooltip>
                    <Tooltip content="Clear Canvas" direction="bottom">
                        <button
                            className="tool-button"
                            onClick={handleClear}
                            disabled={disabled}
                        >
                            <FaTrash />
                        </button>
                    </Tooltip>
                    <Tooltip content="Save" direction="bottom">
                        <button
                            className="tool-button"
                            onClick={onSave}
                        >
                            <FaDownload />
                        </button>
                    </Tooltip>
                    <Tooltip content="Leave Room" direction="bottom">
                        <button
                            className="tool-button leave-button"
                            onClick={onLeave}
                        >
                            <FaSignOutAlt />
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

export default Toolbar;