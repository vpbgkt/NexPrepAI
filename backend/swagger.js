const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NexPrep API',
      version: '1.0.0',
      description: 'Documentation for NexPrep backend',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local dev server',
      },
    ],
  },
  apis: ['./routes/*.js'], // Pulls @swagger comments from routes
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
