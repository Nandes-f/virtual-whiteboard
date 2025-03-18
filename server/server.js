const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { setupSocketHandlers } = require('./socket/socketManager');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors());
app.use(express.json());

// Create Socket.io server with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup socket handlers
setupSocketHandlers(io);

// API routes
app.use('/api', require('./routes/api'));

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Connect to MongoDB (optional for now)
// mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/whiteboard')
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.log('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});