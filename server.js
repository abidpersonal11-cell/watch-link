const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// এই কী দিয়েই admin ড্যাশবোর্ডে ঢোকা যাবে। প্রোডাকশনে এটা অবশ্যই বদলে নিন
// (ENV variable ADMIN_KEY সেট করে, অথবা নিচের লাইনে সরাসরি বদলে)।
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-secret-key';
const ROOM = 'main';

app.use(express.static(path.join(__dirname, 'public')));

// socketId -> { role: 'visitor' | 'admin' }
const participants = new Map();

io.on('connection', (socket) => {
  socket.on('visitor-join', () => {
    socket.join(ROOM);
    participants.set(socket.id, { role: 'visitor' });
    // রুমে থাকা admin(দের) জানানো যে নতুন visitor এসেছে
    socket.to(ROOM).emit('visitor-joined', { id: socket.id });
  });

  socket.on('admin-join', ({ key }) => {
    if (key !== ADMIN_KEY) {
      socket.emit('admin-auth-failed');
      return;
    }
    socket.join(ROOM);
    participants.set(socket.id, { role: 'admin' });
    socket.emit('admin-auth-success');

    // বর্তমানে সংযুক্ত সব visitor এর তালিকা এই admin কে পাঠানো
    const visitors = Array.from(participants.entries())
      .filter(([, p]) => p.role === 'visitor')
      .map(([id]) => id);
    socket.emit('existing-visitors', visitors);
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('disconnect', () => {
    const p = participants.get(socket.id);
    participants.delete(socket.id);
    if (p && p.role === 'visitor') {
      socket.to(ROOM).emit('visitor-left', { id: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
