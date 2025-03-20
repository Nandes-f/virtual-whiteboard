import React from 'react';
import { useWhiteboard } from '../context/WhiteboardContext';
import { FaMoon, FaSun, FaShareAlt, FaUsers } from 'react-icons/fa';

const Controls = ({ roomId }) => {
  const { darkMode, setDarkMode } = useWhiteboard();
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const shareRoom = () => {
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join my TutorTrack Whiteboard',
        text: 'Join my whiteboard session',
        url: url
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url)
        .then(() => {
          alert('Room link copied to clipboard!');
        })
        .catch(err => {
        });
    }
  };
  
  return (
    <div className="whiteboard-controls">
      <button 
        className="control-button"
        onClick={toggleDarkMode}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? <FaSun /> : <FaMoon />}
      </button>
      
      <button 
        className="control-button"
        onClick={shareRoom}
        title="Share Room Link"
      >
        <FaShareAlt />
      </button>
    </div>
  );
};

export default Controls;