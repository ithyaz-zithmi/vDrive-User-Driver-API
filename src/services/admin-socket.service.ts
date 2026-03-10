import { io } from 'socket.io-client';

// Connect to the Admin Backend
const adminSocket = io('http://localhost:3000', {
    auth: { token: process.env.INTERNAL_SECRET } // Security check
});

export const notifyAdminOfNewTrip = (tripData: any) => {
    if (adminSocket.connected) {
        adminSocket.emit('NEW_TRIP_FROM_USER_SERVICE', tripData);
    } else {
        console.error("Admin Backend Socket not connected!");
    }
};