import * as admin from 'firebase-admin';
import path from 'path';

// Construct the path to your service account file
const serviceAccountPath = path.resolve(__dirname, './vdrive-3edf7-firebase-adminsdk-fbsvc-30078802c8.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

export default admin;