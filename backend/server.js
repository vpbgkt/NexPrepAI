const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); // Import DB connection function
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions'); // Import questions route
const testRoutes = require('./routes/tests'); // Import test routes
const resultRoutes = require('./routes/results'); // Import results route
const submitRoutes = require('./routes/submit'); // Import submit route
const testSeriesRoutes = require('./routes/testSeries'); // Import test series route
const hierarchyRoutes = require('./routes/hierarchy'); // Import hierarchy route

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Setup CORS for GitHub Codespaces
app.use(cors({
  origin: 'http://localhost:4200',  // allow local frontend
  credentials: true
}));


// ✅ Debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Middleware
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/submit', submitRoutes);
app.use('/api/test-series', testSeriesRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/subjects', require('./routes/subject'));
app.use('/api/topics', require('./routes/topic'));
app.use('/api/subtopics', require('./routes/subtopic'));

// Sample Route
app.get('/', (req, res) => {
  res.send('🚀 NexPrep API is running...');
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
