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
      '/api/questions/import-csv': {
        post: {
          tags: ['Questions'],
          summary: 'Import questions via CSV (Frontend format)',
          description: 'Accepts an array of formatted question objects, validates them, and inserts them into the database. Supports dynamic creation of entities like Branch, Subject, etc.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      questionText: { type: 'string' },
                      options: { type: 'string', example: 'Option1|Option2|Option3' },
                      correctOptions: { type: 'string', example: 'Option1' },
                      explanation: { type: 'string' },
                      difficulty: {
                        type: 'string',
                        enum: ['Easy', 'Medium', 'Hard']
                      },
                      marks: { type: 'number' },
                      branch: { type: 'string' },
                      subject: { type: 'string' },
                      topic: { type: 'string' },
                      subtopic: { type: 'string' },
                      examType: { type: 'string' },
                      explanations: {
                        type: 'string',
                        example: '[{"type":"text","label":"Concept","content":"g is acceleration."}]'
                      },
                      askedIn: {
                        type: 'string',
                        example: '[{"examName":"NEET","year":2022}]'
                      },
                      status: {
                        type: 'string',
                        enum: ['active', 'inactive']
                      },
                      version: { type: 'integer' }
                    },
                    required: [
                      'questionText',
                      'options',
                      'correctOptions',
                      'branch',
                      'subject'
                    ]
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Questions imported successfully' },
            '207': { description: 'Partial success with some errors' },
            '400': { description: 'Bad Request' },
            '500': { description: 'Internal Server Error' }
          }
        }
      }
    },
  },
  apis: ['./routes/*.js'], // Pulls @swagger comments from routes
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
