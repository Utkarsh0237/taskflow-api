import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { taskService } from '../src/services/taskService';

describe('Task Endpoints (PR #1: Creation, Listing, Validation)', () => {
  beforeEach(() => {
    // Reset in-memory store before each test for clean isolation
    taskService.clearTasks();
  });

  describe('POST /tasks', () => {
    it('should create a task with default status and priority when only title is provided', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Complete Codzee Assignment' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Complete Codzee Assignment',
        status: 'pending',
        priority: 'medium'
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create a task with custom fields when all valid fields are provided', async () => {
      const payload = {
        title: 'Conduct Code Review',
        description: 'Review PR findings and document analysis',
        status: 'in_progress',
        priority: 'high'
      };

      const response = await request(app)
        .post('/tasks')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject(payload);
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ description: 'No title provided' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toContain('Field "title" is required.');
    });

    it('should return 400 if title is empty or only whitespace', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toContain('Field "title" cannot be empty or whitespace only.');
    });

    it('should return 400 if title is not a string', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toContain('Field "title" must be a string.');
    });

    it('should return 400 if title exceeds 100 characters', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'a'.repeat(101) });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toContain('Field "title" cannot exceed 100 characters.');
    });

    it('should return 400 if description exceeds 500 characters', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Valid Title',
          description: 'd'.repeat(501)
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details).toContain('Field "description" cannot exceed 500 characters.');
    });

    it('should return 400 if status is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Valid Title',
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details[0]).toContain('Field "status" must be one of');
    });

    it('should return 400 if priority is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Valid Title',
          priority: 'urgent'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
      expect(response.body.details[0]).toContain('Field "priority" must be one of');
    });
  });

  describe('GET /tasks', () => {
    it('should return an empty list and count 0 when no tasks exist', async () => {
      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        tasks: [],
        count: 0
      });
    });

    it('should list all created tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.tasks).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1', status: 'pending' });
      await request(app).post('/tasks').send({ title: 'Task 2', status: 'completed' });

      const response = await request(app).get('/tasks?status=completed');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.tasks[0].title).toBe('Task 2');
      expect(response.body.tasks[0].status).toBe('completed');
    });

    it('should filter tasks by priority', async () => {
      await request(app).post('/tasks').send({ title: 'Task Low', priority: 'low' });
      await request(app).post('/tasks').send({ title: 'Task High', priority: 'high' });

      const response = await request(app).get('/tasks?priority=high');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.tasks[0].title).toBe('Task High');
      expect(response.body.tasks[0].priority).toBe('high');
    });
  });
});
