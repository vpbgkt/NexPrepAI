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
    paths: {
      '/api/questions/add': {
        post: {
          summary: 'Add a new question',
          tags: ['Questions'],
          security: [
            {
              bearerAuth: [],
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['questionText', 'options', 'correctOptions', 'branch', 'examType'],
                  properties: {
                    questionText: {
                      type: 'string',
                    },
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          text: {
                            type: 'string',
                          },
                          isCorrect: {
                            type: 'boolean',
                          },
                        },
                      },
                    },
                    correctOptions: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                    },
                    branch: {
                      type: 'string',
                      example: 'Medical',
                    },
                    subject: {
                      type: 'string',
                      example: 'Physics',
                    },
                    topic: {
                      type: 'string',
                      example: 'Mechanics',
                    },
                    subtopic: {
                      type: 'string',
                      example: 'Gravitation',
                    },
                    examType: {
                      type: 'string',
                      example: 'NEET',
                    },
                    difficulty: {
                      type: 'string',
                      example: 'Easy',
                    },
                    marks: {
                      type: 'number',
                      example: 4,
                    },
                    explanation: {
                      type: 'string',
                    },
                    explanations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                            enum: ['text', 'video', 'pdf', 'image'],
                          },
                          label: {
                            type: 'string',
                          },
                          content: {
                            type: 'string',
                          },
                        },
                      },
                    },
                    askedIn: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          examName: {
                            type: 'string',
                          },
                          year: {
                            type: 'integer',
                          },
                        },
                      },
                    },
                    status: {
                      type: 'string',
                      enum: ['active', 'inactive'],
                    },
                    version: {
                      type: 'integer',
                      example: 1,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Question created successfully',
            },
            '400': {
              description: 'Validation error',
            },
            '500': {
              description: 'Server error',
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Pulls @swagger comments from routes
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
