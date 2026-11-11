'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const taskService = require('../services/taskService');
const {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema
} = require('../schemas/task.schemas');

const router = express.Router();

// Every task endpoint requires a valid access token.
router.use(authenticate);

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Task created }
 *   get:
 *     summary: List the current user's tasks
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: status, schema: { type: string, enum: [todo, in_progress, done] } }
 *       - { in: query, name: priority, schema: { type: string, enum: [low, medium, high] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Paginated task list }
 */
router.post(
  '/',
  validate({ body: createTaskSchema }),
  asyncHandler(async (req, res) => {
    const task = await taskService.createTask(req.user.id, req.body);
    res.status(201).json({ task });
  })
);

router.get(
  '/',
  validate({ query: listTasksQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await taskService.listTasks(req.user.id, req.validatedQuery);
    res.json(result);
  })
);

/**
 * @openapi
 * /api/tasks/stats:
 *   get:
 *     summary: Aggregate task counts by status
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status breakdown }
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await taskService.getStats(req.user.id);
    res.json(stats);
  })
);

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Task }
 *       404: { description: Not found }
 *   patch:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated task }
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted }
 */
router.get(
  '/:id',
  validate({ params: taskIdParamSchema }),
  asyncHandler(async (req, res) => {
    const task = await taskService.getTask(req.user.id, req.params.id);
    res.json({ task });
  })
);

router.patch(
  '/:id',
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  asyncHandler(async (req, res) => {
    const task = await taskService.updateTask(req.user.id, req.params.id, req.body);
    res.json({ task });
  })
);

router.put(
  '/:id',
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  asyncHandler(async (req, res) => {
    const task = await taskService.updateTask(req.user.id, req.params.id, req.body);
    res.json({ task });
  })
);

router.delete(
  '/:id',
  validate({ params: taskIdParamSchema }),
  asyncHandler(async (req, res) => {
    await taskService.deleteTask(req.user.id, req.params.id);
    res.status(204).send();
  })
);

module.exports = router;
