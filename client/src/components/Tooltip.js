import React, { useState } from 'react';
import '../styles/Tooltip.css';

const Tooltip = ({ children, content, direction = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`tooltip tooltip-${direction}`}>
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip; 