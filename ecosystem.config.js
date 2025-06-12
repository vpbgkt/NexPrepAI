module.exports = {
  apps: [{
    name: 'nexprep-backend',
    script: 'server.js',
    cwd: './backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      ALLOWED_ORIGIN: ['http://localhost:4200/api', 'http://localhost:4201/api'],
      CORS_CREDENTIALS: 'true'
    },    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      ALLOWED_ORIGIN: 'http://43.205.88.43,http://localhost:80,http://localhost:3000',
      CORS_CREDENTIALS: 'true'
    }
  }]
};
