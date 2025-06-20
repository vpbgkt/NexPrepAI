const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http'); // Added http
const { Server } = require("socket.io"); // Added socket.io

// Register all models for populate
require('./models/Branch');
require('./models/Subject');
require('./models/Topic');
require('./models/SubTopic');
require('./models/Question');
require('./models/TestSeries');
require('./models/Reward');
require('./models/RewardTransaction');
require('./models/RewardRedemption');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({ path: envFile });

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app); // Create HTTP server

// Get allowed origins from environment (can be comma-separated)
const allowedOrigins = process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : ['http://localhost:4200'];

const io = new Server(server, { // Attach socket.io to server
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  transports: ['websocket', 'polling'], // Support both transports
  allowEIO3: true, // Allow Engine.IO v3 clients to connect
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000, // Increase ping interval
  upgradeTimeout: 30000, // Time to wait for upgrade
  maxHttpBufferSize: 1e6 // 1MB buffer size
});

// Initialize chat handler
require('./socket/chatHandler')(io);

const PORT = process.env.PORT || 5000;

// CORS configuration using environment variables
app.use(cors({
  origin: allowedOrigins,
  credentials: process.env.CORS_CREDENTIALS === 'true'
}));

// Debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Body parser
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users')); // Added user routes
app.use('/api/rewards', require('./routes/rewards')); // Added rewards routes
app.use('/api/questions', require('./routes/questions'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/hierarchy', require('./routes/hierarchy'));
app.use('/api/subjects', require('./routes/subject'));
app.use('/api/topics', require('./routes/topic'));
app.use('/api/subtopics', require('./routes/subtopic'));
app.use('/api/testSeries', require('./routes/testSeries'));
app.use('/api/examTypes', require('./routes/examTypes'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/examFamilies', require('./routes/examFamilies'));
app.use('/api/examLevels', require('./routes/examLevels'));
app.use('/api/examBranches', require('./routes/examBranches'));
app.use('/api/examStreams', require('./routes/examStreams'));
app.use('/api/examPapers', require('./routes/examPapers'));
app.use('/api/examShifts', require('./routes/examShifts'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/images', require('./routes/images')); // Added image serving routes

// Swagger Docs
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/', (req, res) => {
  res.send('🚀 NexPrepAI API is running...');
});

// Start server
// app.listen(PORT, () => {  // Commented out original app.listen
//   console.log(`✅ Server running on port ${PORT}`);
server.listen(PORT, () => { // Start server with http server instance
  console.log(`✅ Server running on port ${PORT}`);
  
  // Log Firebase auth availability
  try {
    const admin = require('./config/firebaseAdmin');
    if (admin) {
      console.log('✅ Firebase Admin SDK available');
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK not properly initialized', error);
  }
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
