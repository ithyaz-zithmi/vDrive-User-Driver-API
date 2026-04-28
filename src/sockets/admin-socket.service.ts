import { logger } from "../shared/logger";
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { Server } from 'socket.io';
import config from '../config';

let adminSocket: ClientSocket;

export function connectToAdminBackend(userIo: Server) {
    const adminUrl = config.adminApiUrl;

    logger.info(`Connecting to Admin Backend WebSocket at ${adminUrl}/internal`);

    // socket.io-client handles http:// → ws:// upgrade automatically.
    // The /internal segment is the Socket.IO namespace, not an HTTP path.
    adminSocket = ioClient(`${adminUrl}/internal`, {
        transports: ['websocket'],
        auth: { token: process.env.INTERNAL_SERVICE_SECRET },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
    });

    adminSocket.on('connect', () => {
        logger.info(`✅ Connected to Admin Backend at ${adminUrl}`);
    });

    // Listen for commands FROM admin backend and forward to users
    adminSocket.on('broadcast_to_users', (data) => {
        logger.info('Admin sent broadcast:', data);
        userIo.emit('announcement', data);
    });

    adminSocket.on('disconnect', (reason) => {
        logger.warn(`Lost connection to Admin Backend: ${reason}`);
    });

    adminSocket.on('connect_error', (err: any) => {
        logger.error(
            `Admin Backend connection error` +
            ` | URL: ${adminUrl}/internal` +
            ` | Message: ${err.message}` +
            ` | Type: ${err.type ?? 'unknown'}` +
            ` | Description: ${JSON.stringify(err.description ?? {})}`
        );
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