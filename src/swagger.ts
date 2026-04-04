import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerSchemas } from './swagger/schemas';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dungeon Desk API',
      version: '1.0.0',
      description: 'API documentation for Dungeon Desk application',
    },
    servers: [
      {
        url: '/api',
        description: 'Relative API base URL',
      },
    ],
    components: {
      schemas: swaggerSchemas,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], 
};

export const swaggerSpec = swaggerJsdoc(options);
