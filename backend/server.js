const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Register all models for populate
require('./models/Branch');
require('./models/Subject');
require('./models/Topic');
require('./models/SubTopic');
require('./models/Question');
require('./models/TestSeries');   


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS for local frontend
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
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
app.use('/api/questions', require('./routes/questions'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/hierarchy', require('./routes/hierarchy'));
app.use('/api/subjects', require('./routes/subject'));
app.use('/api/topics', require('./routes/topic'));
app.use('/api/subtopics', require('./routes/subtopic'));
app.use('/api/testSeries', require('./routes/testSeries'));
app.use('/api/examTypes', require('./routes/examTypes'));

// Health check
app.get('/', (req, res) => {
  res.send('🚀 NexPrep API is running...');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
