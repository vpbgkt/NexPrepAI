const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  name: { // Added name field
    type: String,
    required: true,
  },  email: {
    type: String,
    required: false, // Changed from true to false since phone users might not have email
    unique: true,
    sparse: true // Allows multiple null values for phone-only users
  },
  password: {
    type: String,
    // Not strictly required if using Firebase Auth primarily, but good for existing accounts
    // required: true, 
  },
  firebaseUid: { // Firebase Unique ID
    type: String,
    unique: true,
    sparse: true // Allows multiple null values if not all users have Firebase UID
  },
  displayName: { // For user-chosen public display
    type: String,
    trim: true,
  },
  photoURL: { // URL to profile picture
    type: String,
    trim: true,
  },  phoneNumber: { // User's phone number
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows multiple null values since not all users have phone numbers
  },
  role: {
    type: String,
    enum: ['superadmin','admin','student'],
    default: 'student',
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
