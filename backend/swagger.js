const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {      title: 'NexPrepAI API',
      version: '1.0.0',
      description: 'Documentation for NexPrepAI backend',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local dev server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ObjectId: {
          type: 'string',
          pattern: '^[0-9a-fA-F]{24}$'
        },
        QuestionHistory: {
          type: 'object',
          properties: {
            testSeries: { $ref: '#/components/schemas/ObjectId' },
            title:    { type: 'string' },
            askedAt:  { type: 'string', format: 'date-time'}
          }
        },
        Translation: {
          type: 'object',
          required: ['lang', 'questionText', 'options'],
          properties: {
            lang: { type: 'string', enum: ['en', 'hi'] },
            questionText: { type: 'string' },
            images: { type: 'array', items: { type: 'string', format: 'url' } },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  img: { type: 'string', format: 'url' },
                  isCorrect: { type: 'boolean' }
                }
              }
            },
            explanations: {
              type: 'array',
              items: { $ref: '#/components/schemas/Explanation' }
            }
          }
        },
        Question: {
          type: 'object',
          required: [
            'branch','translations','difficulty','type'
          ],
          properties: {
            _id:          { $ref: '#/components/schemas/ObjectId' },
            branch:       { $ref: '#/components/schemas/ObjectId' },
            subject:      { $ref: '#/components/schemas/ObjectId' },
            topic:        { $ref: '#/components/schemas/ObjectId' },
            subTopic:     { $ref: '#/components/schemas/ObjectId' },
            translations: {
              type: 'array',
              items: { $ref: '#/components/schemas/Translation' }
            },
            marks:         { type: 'number', minimum: 0 },
            negativeMarks: { type: 'number', minimum: 0 },
            difficulty: {
              type: 'string',
              enum: ['Easy','Medium','Hard','Not-mentioned'],
              default: 'Medium'
            },
            type: {
              type: 'string',
              enum: ['single','multiple','integer','matrix']
            },
            explanations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type:    { type: 'string', enum: ['text','video','pdf','image'] },
                  label:   { type: 'string' },
                  content: { type: 'string' }
                }
              }
            },
            questionHistory: {
              type: 'array',
              items: { $ref: '#/components/schemas/QuestionHistory' }
            },
            stats: {
              type: 'object',
              properties: {
                shown:     { type: 'integer' },
                correct:   { type: 'integer' },
                totalTime: { type: 'integer' }
              }
            },
            status: { type: 'string', enum: ['active','inactive','draft'] },
            version: { type: 'integer' },
            createdBy: { $ref: '#/components/schemas/ObjectId' },
            updatedBy: { $ref: '#/components/schemas/ObjectId' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        SectionEntry: {
          type: 'object',
          required: ['title', 'order', 'questions'],
          properties: {
            title: { type: 'string', example: 'Section 1' },
            order: { type: 'integer', example: 1 },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['question', 'marks'],
                properties: {
                  question: {
                    $ref: '#/components/schemas/ObjectId',
                    description: 'Question _id'
                  },
                  marks: { type: 'number', example: 1 }
                }
              }
            }
          }
        },
        TestSeries: {
          type: 'object',
          required: ['title', 'duration', 'examType', 'sections'],
          properties: {
            title: { type: 'string', example: 'Sample 5-Q Medical Paper' },
            duration: { type: 'integer', example: 10, description: 'minutes' },
            examType: {
              $ref: '#/components/schemas/ObjectId',
              description: 'ExamType _id'
            },
            sections: {
              type: 'array',
              items: { $ref: '#/components/schemas/SectionEntry' }
            }
          }
        }
      }
    },
    paths: {
      '/api/questions/add': {
        post: {
          summary: 'Add a new question',
          tags: ['Questions'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Question'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Question created successfully'
            },
            '400': {
              description: 'Validation error'
            },
            '500': {
              description: 'Server error'
            }
          }
        }
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
                    $ref: '#/components/schemas/Question'
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
      },
      '/api/testSeries/create': {
        post: {
          summary: 'Create a new TestSeries',
          tags: ['TestSeries'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TestSeries'
                }
              }
            }
          },
          responses: {
            '201': { description: 'TestSeries created' },
            '400': { description: 'Validation error' }
          }
        }
      }
    },
  },
  apis: ['./routes/*.js'], // Pulls @swagger comments from routes
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
