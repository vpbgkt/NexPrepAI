const admin = require('firebase-admin');
const path = require('path');

// Construct the absolute path to the service account key JSON file
const serviceAccountPath = path.join(__dirname, 'nexprepauth-firebase-adminsdk-fbsvc-4b2f8377b1.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  // Optionally, you might want to exit the process if Firebase Admin fails to initialize
  // process.exit(1);
}

module.exports = admin;
