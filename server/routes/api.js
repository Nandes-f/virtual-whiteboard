const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Whiteboard server is running' });
});

// Create a new room (placeholder for future functionality)
router.post('/rooms', (req, res) => {
  const roomId = Math.random().toString(36).substring(2, 9);
  res.json({ roomId });
});

module.exports = router;