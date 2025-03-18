import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Whiteboard from './components/Whiteboard';
import HomePage from './components/HomePage';
import './App.css';

function App() {
  const [userId, setUserId] = useState('');
  
  useEffect(() => {
    // Generate a unique user ID if not already set
    const storedUserId = localStorage.getItem('whiteboard_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = uuidv4();
      localStorage.setItem('whiteboard_user_id', newUserId);
      setUserId(newUserId);
    }
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage userId={userId} />} />
          <Route path="/room/:roomId" element={<Whiteboard userId={userId} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;