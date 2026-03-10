// src/server.ts
import app from './app';
import { logger } from './shared/logger';
import { connectDatabase, query } from './shared/database';
import config from './config';
import http from 'http'; // Required for Socket.io
import { Server } from 'socket.io';
import { TripController } from './modules/trip/trip.controllers';
import { TripService } from './modules/trip/trip.service';

const PORT = config.port || 3000;
const dbUser = config.db.user;

async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    // 1. Create HTTP server from the Express app
    const httpServer = http.createServer(app);

    // 2. Initialize Socket.io
    const io = new Server(httpServer, {
      cors: {
        origin: "*", // Allows both ngrok (User) and Direct IP/Localhost (Driver)
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    app.set('io', io);
    // 3. Socket Logic for Live Tracking
    io.on('connection', (socket) => {
      console.log('socket connected')
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('joinRide', (data) => {
        const { rideId, role } = data;
        socket.join(`trip_${rideId}`);
        logger.info(`${role} joined room: trip_${rideId}`);
      });

      socket.on('updateDriverLocation', (data) => {
        // Broadcast location only to users in this specific ride room
        io.to(data.rideId).emit('locationUpdate', {
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          eta: data.eta
        });
      });

      socket.on('JOIN_DRIVER_ROOM', (driverId) => {
        if (!driverId) return;
        const roomName = `driver_${driverId}`;
        socket.join(roomName);
        console.log(`✅ Driver ${driverId} is now listening in room: ${roomName}`);
      });

      socket.on('ACCEPT_TRIP', async (data, callback) => {
        try {
          const { tripId, driverId } = data;
          const trip = await TripService.acceptTrip(io, tripId, driverId);
          if (callback) {
            callback({
              success: true,
              trip: trip
            });
          }

        } catch (error: any) {
          console.error("Socket Accept Error:", error.message);
          if (callback) {
            callback({
              success: false,
              message: error.message || "Failed to accept trip"
            });
          }
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    // const server = app.listen(PORT, () => {
    const server = httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${PORT}`);
    });

    const shutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
