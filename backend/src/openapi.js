'use strict';

const config = require('./config');

/**
 * OpenAPI 3.0 specification for the Task/Notes API.
 * Served as JSON at /docs/openapi.json and rendered by Swagger UI at /docs.
 */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'CICD Backend - Task & Notes API',
    version: config.serviceVersion,
    description:
      'REST API for managing tasks/notes with JWT authentication, backed by PostgreSQL (Prisma).',
    license: { name: 'MIT' }
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'Health', description: 'Liveness & readiness probes' },
    { name: 'Auth', description: 'Registration and authentication' },
    { name: 'Tasks', description: 'Task CRUD' },
    { name: 'Observability', description: 'Metrics' },
    { name: 'Legacy', description: 'Deprecated endpoints' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
              requestId: { type: 'string' }
            }
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: { 200: { description: 'Service healthy' } }
      }
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Kubernetes liveness probe',
        responses: { 200: { description: 'Alive' } }
      }
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe (checks database)',
        responses: {
          200: { description: 'Ready' },
          503: { description: 'Not ready' }
        }
      }
    },
    '/metrics': {
      get: {
        tags: ['Observability'],
        summary: 'Prometheus metrics',
        responses: { 200: { description: 'Prometheus exposition format' } }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'name', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string' },
                  password: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Registered' },
          409: { description: 'Email already exists' },
          422: { description: 'Validation error' },
          429: { description: 'Rate limited' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        responses: {
          200: { description: 'New token pair' },
          401: { description: 'Invalid refresh token' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: "List the current user's tasks",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['todo', 'in_progress', 'done'] }
          },
          {
            in: 'query',
            name: 'priority',
            schema: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          { in: 'query', name: 'search', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Paginated list' }, 401: { description: 'Unauthorized' } }
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  dueDate: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Created' }, 422: { description: 'Validation error' } }
      }
    },
    '/api/tasks/stats': {
      get: {
        tags: ['Tasks'],
        summary: 'Task counts by status',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Stats' } }
      }
    },
    '/api/tasks/{id}': {
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      get: {
        tags: ['Tasks'],
        summary: 'Get a task',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Task' }, 404: { description: 'Not found' } }
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'Deleted' }, 404: { description: 'Not found' } }
      }
    },
    '/api/data': {
      get: {
        tags: ['Legacy'],
        summary: 'Legacy sample endpoint',
        deprecated: true,
        responses: { 200: { description: 'Sample payload' } }
      }
    }
  }
};
