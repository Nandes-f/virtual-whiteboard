const express = require('express');
const http = require('http');
const https = require("https");
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const initializeSocket = require('./socket');
const fs = require("fs");
// Initialize express app
const app = express();
// const options = {
//   key: fs.readFileSync("/etc/ssl/certs/selfsigned.key"),
//   cert: fs.readFileSync("/etc/ssl/certs/selfsigned.crt"),
// };

// const server = http.createServer(options,app);
const server = http.createServer(app);
// Configure CORS
app.use(cors());
app.use(express.json());

// Create Socket.io server with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: '*'
  }
});

// Initialize socket handlers with our new implementation
initializeSocket(io);

// API routes
app.use('/api', require('./routes/api'));

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}


const PORT = process.env.PORT || 9999;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});