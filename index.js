const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your Flutter app to connect from any device
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Users must "register" with their unique Presence ID
  socket.on('register', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their private room.`);
  });

  // A sends a request to B
  socket.on('send_request', (data) => {
    // data: { from: 'Alice', to: 'Bob', time: '14:00', note: 'Sync' }
    const requestId = `req_${Date.now()}`;
    io.to(data.to).emit('receive_request', { ...data, id: requestId });
    console.log(`Request sent from ${data.from} to ${data.to}`);
  });

  // B responds to A
  socket.on('respond', (data) => {
    // data: { to: 'Alice', from: 'Bob', status: 'counter', time: '15:00', id: 'req_123' }
    if (data.status === 'counter') {
      // For a counter, we essentially flip the request
      io.to(data.to).emit('receive_request', {
        ...data,
        isCounter: true
      });
    } else {
      // For Accept/Decline, we just notify the original sender
      io.to(data.to).emit('decision_final', data);
    }
    console.log(`Response (${data.status}) from ${data.from} to ${data.to}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Queue Server running on port ${PORT}`);
});
