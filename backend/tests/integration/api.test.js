'use strict';

jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/repositories/taskRepository');
jest.mock('../../src/db/prisma', () => ({
  ping: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn()
}));

const request = require('supertest');
const createApp = require('../../src/app');
const userRepository = require('../../src/repositories/userRepository');
const taskRepository = require('../../src/repositories/taskRepository');
const prisma = require('../../src/db/prisma');
const { hashPassword } = require('../../src/utils/password');
const { signAccessToken } = require('../../src/utils/tokens');

const app = createApp();

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const user = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user',
  password: 'hash',
  createdAt: new Date('2024-01-01T00:00:00.000Z')
};
const task = {
  id: TASK_ID,
  title: 'Ship the pipeline',
  description: null,
  status: 'todo',
  priority: 'high',
  dueDate: null,
  userId: 'u1',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z')
};

function authHeader() {
  return `Bearer ${signAccessToken({ sub: 'u1', email: user.email })}`;
}

describe('HTTP API (integration)', () => {
  describe('service endpoints', () => {
    test('GET / returns the service overview with an endpoints directory', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body.service).toBe('cicd-backend');
      expect(res.body.status).toBe('healthy');
      expect(Array.isArray(res.body.endpoints)).toBe(true);
      expect(res.body.endpoints.length).toBeGreaterThan(3);
    });

    test('GET /health returns healthy with uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.headers['x-request-id']).toBeDefined();
    });

    test('GET /health/live returns alive', async () => {
      const res = await request(app).get('/health/live');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('alive');
    });

    test('GET /health/ready returns ready when the database answers', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.statusCode).toBe(200);
      expect(res.body.checks.database).toBe('up');
    });

    test('GET /health/ready returns 503 when the database is down', async () => {
      prisma.ping.mockRejectedValueOnce(new Error('connection refused'));
      const res = await request(app).get('/health/ready');
      expect(res.statusCode).toBe(503);
      expect(res.body.checks.database).toBe('down');
    });

    test('GET /metrics exposes Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('http_requests_total');
    });

    test('GET /docs/openapi.json serves the spec', async () => {
      const res = await request(app).get('/docs/openapi.json');
      expect(res.statusCode).toBe(200);
      expect(res.body.openapi).toMatch(/^3\./);
    });

    test('GET /docs renders Swagger UI', async () => {
      const res = await request(app).get('/docs/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('swagger');
    });

    test('GET /api/data still works (legacy)', async () => {
      const res = await request(app).get('/api/data');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Hello from the backend service!');
    });

    test('unknown routes return a JSON 404', async () => {
      const res = await request(app).get('/does-not-exist');
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('auth', () => {
    test('POST /api/auth/register creates a user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'ada@example.com', name: 'Ada', password: 'password123' });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.email).toBe('ada@example.com');
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    test('POST /api/auth/register rejects a duplicate email', async () => {
      userRepository.findByEmail.mockResolvedValue(user);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'ada@example.com', name: 'Ada', password: 'password123' });
      expect(res.statusCode).toBe(409);
    });

    test('POST /api/auth/register validates the payload', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', name: '', password: '123' });
      expect(res.statusCode).toBe(422);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    test('POST /api/auth/login returns tokens', async () => {
      const password = await hashPassword('password123');
      userRepository.findByEmail.mockResolvedValue({ ...user, password });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'password123' });
      expect(res.statusCode).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    test('POST /api/auth/login rejects bad credentials', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'password123' });
      expect(res.statusCode).toBe(401);
    });

    test('POST /api/auth/refresh issues a new pair', async () => {
      userRepository.findById.mockResolvedValue(user);
      // obtain a refresh token via login
      const password = await hashPassword('password123');
      userRepository.findByEmail.mockResolvedValue({ ...user, password });
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ada@example.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: login.body.refreshToken });
      expect(res.statusCode).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    test('GET /api/auth/me requires a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    test('GET /api/auth/me returns the profile', async () => {
      userRepository.findById.mockResolvedValue(user);
      const res = await request(app).get('/api/auth/me').set('Authorization', authHeader());
      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBe('u1');
    });
  });

  describe('tasks', () => {
    test('all task routes require authentication', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(401);
    });

    test('POST /api/tasks creates a task', async () => {
      taskRepository.create.mockResolvedValue(task);
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', authHeader())
        .send({ title: 'Ship the pipeline', priority: 'high' });
      expect(res.statusCode).toBe(201);
      expect(res.body.task.id).toBe(TASK_ID);
    });

    test('POST /api/tasks validates input', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', authHeader())
        .send({ title: '' });
      expect(res.statusCode).toBe(422);
    });

    test('GET /api/tasks lists with pagination', async () => {
      taskRepository.findManyByUser.mockResolvedValue([task]);
      taskRepository.countByUser.mockResolvedValue(1);
      const res = await request(app)
        .get('/api/tasks?page=1&limit=10')
        .set('Authorization', authHeader());
      expect(res.statusCode).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    test('GET /api/tasks rejects an invalid query', async () => {
      const res = await request(app)
        .get('/api/tasks?limit=999')
        .set('Authorization', authHeader());
      expect(res.statusCode).toBe(422);
    });

    test('GET /api/tasks/stats returns status counts', async () => {
      taskRepository.statusCounts.mockResolvedValue({ todo: 2, done: 1 });
      const res = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', authHeader());
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(3);
    });

    test('GET /api/tasks/:id returns a task', async () => {
      taskRepository.findById.mockResolvedValue(task);
      const res = await request(app)
        .get(`/api/tasks/${TASK_ID}`)
        .set('Authorization', authHeader());
      expect(res.statusCode).toBe(200);
      expect(res.body.task.id).toBe(TASK_ID);
    });

    test('GET /api/tasks/:id rejects a non-uuid id', async () => {
      const res = await request(app)
        .get('/api/tasks/not-a-uuid')
        .set('Authorization', authHeader());
      expect(res.statusCode).toBe(422);
    });

    test('GET /api/tasks/:id returns 404 for a missing task', async () => {
      taskRepository.findById.mockResolvedValue(null);
      const res = await request(app)
        .get(`/api/tasks/${TASK_ID}`)
        .set('Authorization', authHeader());
      expect(res.statusCode).toBe(404);
    });

    test('PATCH /api/tasks/:id updates a task', async () => {
      taskRepository.findById.mockResolvedValue(task);
      taskRepository.update.mockResolvedValue({ ...task, status: 'done' });
      const res = await request(app)
        .patch(`/api/tasks/${TASK_ID}`)
        .set('Authorization', authHeader())
        .send({ status: 'done' });
      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('done');
    });

    test('PUT /api/tasks/:id updates a task', async () => {
      taskRepository.findById.mockResolvedValue(task);
      taskRepository.update.mockResolvedValue({ ...task, title: 'Renamed' });
      const res = await request(app)
        .put(`/api/tasks/${TASK_ID}`)
        .set('Authorization', authHeader())
        .send({ title: 'Renamed' });
      expect(res.statusCode).toBe(200);
      expect(res.body.task.title).toBe('Renamed');
    });

    test('DELETE /api/tasks/:id deletes a task', async () => {
      taskRepository.findById.mockResolvedValue(task);
      taskRepository.remove.mockResolvedValue(task);
      const res = await request(app)
        .delete(`/api/tasks/${TASK_ID}`)
        .set('Authorization', authHeader());
      expect(res.statusCode).toBe(204);
    });
  });
});
