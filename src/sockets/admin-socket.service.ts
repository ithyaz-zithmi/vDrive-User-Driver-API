import { logger } from "../shared/logger"; // comment to trigger restart
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { Server } from 'socket.io';

let adminSocket: ClientSocket;

export function connectToAdminBackend(userIo: Server) {
    adminSocket = ioClient('http://localhost:3000/internal', { // ✅ Admin backend should be on a DIFFERENT port
        transports: ['websocket'],
        auth: { token: process.env.INTERNAL_SERVICE_SECRET },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
    });

    adminSocket.on('connect', () => {
        logger.info('✅ Connected to Admin Backend');
    });

    // ✅ Listen for commands FROM admin backend and forward to users
    adminSocket.on('broadcast_to_users', (data) => {
        logger.info('Admin sent broadcast:', data);
        userIo.emit('announcement', data); // ✅ userIo is now properly scoped
    });

    adminSocket.on('disconnect', (reason) => {
        logger.warn(`Lost connection to Admin Backend: ${reason}`);
    });

    adminSocket.on('connect_error', (err) => {
        logger.error(`Admin Backend connection error: ${err.message}`);
    });
}

// ✅ Export a helper to notify admin from anywhere in the app
export const notifyAdmin = (event: string, data: unknown) => {
    if (adminSocket?.connected) {
        adminSocket.emit(event, data);
    } else {
        logger.warn(`⚠️ Cannot notify admin — socket not connected. Event: ${event}`);
    }
};