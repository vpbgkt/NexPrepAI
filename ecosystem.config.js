module.exports = {
  apps: [{
    name: 'nexprepai-backend',
    script: 'server.js', // Assumes server.js is the entry point in the cwd
    cwd: './backend',    // Sets the current working directory for the app
    instances: 1,
    autorestart: true,
    watch: false,        // Should be false for production
    max_memory_restart: '512M',
    // Environment variables for development (primarily for local use if you run pm2 locally)
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      // For local development, allowing Angular dev servers
      ALLOWED_ORIGIN: 'http://localhost:4200,http://localhost:4201',
      CORS_CREDENTIALS: 'true'
    },    // Environment variables for production
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000, // Internal port Nginx will proxy to
      // Update this with your current EC2 Elastic IP or domain
      ALLOWED_ORIGIN: 'http://43.205.88.43,http://43.205.88.43/admin',
      CORS_CREDENTIALS: 'true'
      // Ensure MONGO_URI, JWT_SECRET, etc., are in /var/www/nexprepai/backend/.env on the server
      // and loaded by your application using dotenv.
    }
  }]
};
