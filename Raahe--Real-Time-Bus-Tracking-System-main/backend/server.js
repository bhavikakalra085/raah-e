// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectDB } = require('./connection');

const mongouri = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

const app = express();

// --- CORS (allow frontend origin + socket connections) ---
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- connect DB ---
connectDB(mongouri);

// --- routers ---
// ensure these files/paths exist in your project
const userRouter = require('./routers/user');
const adminRouter = require('./routers/admin');
const authRouter = require('./routers/auth');      // add this if you have auth routes
const driverRouter = require('./routers/driver');  // driver routes for start/pause/location/etc.
const passengerRouter = require('./routers/passenger'); // passenger routes for nearby buses, etc.
const safetyRouter = require('./routers/safety'); // safety alert routes
const lostFoundRouter = require('./routers/lostFound'); // lost & found routes

app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/driver', driverRouter);
app.use('/api/passenger', passengerRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/lostfound', lostFoundRouter);

// app.use("/locales", express.static("public/locales"));

// i18n route
// app.use("/i18n", require("./routes/i18n"));


// --- create HTTP server and Socket.IO server ---
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// expose io to express routes (so route handlers can emit)
app.set('io', io);

// --- socket handlers ---
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinRide', (rideId) => {
    if (!rideId) return;
    socket.join(`ride:${rideId}`);
    console.log(`Socket ${socket.id} joined room ride:${rideId}`);
  });

  socket.on('leaveRide', (rideId) => {
    if (!rideId) return;
    socket.leave(`ride:${rideId}`);
    console.log(`Socket ${socket.id} left room ride:${rideId}`);
  });

  socket.on('joinDriverRoom', (driverId) => {
    if (!driverId) return;
    socket.join(`driver:${driverId}`);
    console.log(`Socket ${socket.id} joined driver:${driverId}`);
  });

  socket.on('leaveDriverRoom', (driverId) => {
    if (!driverId) return;
    socket.leave(`driver:${driverId}`);
    console.log(`Socket ${socket.id} left driver:${driverId}`);
  });

  // Optional: allow drivers to emit location via socket (server will broadcast to ride room)
  socket.on('driverLocation', ({ rideId, point }) => {
    try {
      if (!rideId || !point) return;
      // broadcast to viewers of this ride
      socket.to(`ride:${rideId}`).emit('locationUpdate', { rideId, point });
      // NOTE: we recommend also persisting via REST endpoint (/api/driver/:rideId/location)
    } catch (err) {
      console.error('driverLocation handler error', err);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', socket.id, 'reason:', reason);
  });
});

// --- start server ---
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
