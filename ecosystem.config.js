module.exports = {
  apps: [{
    name: 'nexprep-backend',
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
    },
    // Environment variables for production
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000, // Internal port Nginx will proxy to
      // Updated to use new Elastic IP
      ALLOWED_ORIGIN: 'http://43.205.88.43,http://admin.43.205.88.43',
      // Note: For the admin panel, you'd typically use a subdomain like admin.yourdomain.com.
      // If you serve both frontend and admin from the same EC2 public DNS but different paths
      // (e.g., 43.205.88.43/ and 43.205.88.43/admin), then the origin is the same.
      // The example above assumes you might set up a subdomain for the admin panel later.
      // If both are served from the root of the same domain, then just one origin is needed:
      // ALLOWED_ORIGIN: 'http://43.205.88.43',
      CORS_CREDENTIALS: 'true'
      // Ensure MONGO_URI, JWT_SECRET, etc., are in /var/www/nexprep/backend/.env on the server
      // and loaded by your application using dotenv.
    }
  }]
};
