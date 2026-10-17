import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { taskService } from '../src/services/taskService';

describe('Task Operations (PR #2: Retrieval, Updates, Deletion, Edge Cases)', () => {
  beforeEach(() => {
    taskService.clearTasks();
  });

  const validNonExistentId = '00000000-0000-4000-8000-000000000000';

  describe('GET /tasks/:id', () => {
    it('should retrieve a task by its ID with 200 OK', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task to retrieve', description: 'Sample description' });

      const taskId = createRes.body.id;

      const res = await request(app).get(`/tasks/${taskId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Task to retrieve');
      expect(res.body.description).toBe('Sample description');
    });

    it('should return 404 when task ID does not exist', async () => {
      const res = await request(app).get(`/tasks/${validNonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: 'NotFound',
        message: `Task with id "${validNonExistentId}" was not found.`
      });
    });

    it('should return 400 when task ID is not a valid UUID format', async () => {
      const res = await request(app).get('/tasks/invalid-uuid-123');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.message).toBe('Task ID must be a valid UUID v4 format');
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should partially update the title without affecting other fields', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({
          title: 'Initial Title',
          description: 'Initial Description',
          status: 'pending',
          priority: 'low'
        });

      const taskId = createRes.body.id;
      const originalCreatedAt = createRes.body.createdAt;

      // Small delay to ensure timestamp comparison difference if clock advances
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.description).toBe('Initial Description');
      expect(res.body.status).toBe('pending');
      expect(res.body.priority).toBe('low');
      expect(res.body.createdAt).toBe(originalCreatedAt);
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should partially update status from pending to completed', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task to Complete' });

      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('should return 400 when update payload contains no modifiable fields', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.details).toContain('At least one field ("title", "description", "status", or "priority") must be provided for update.');
    });

    it('should return 400 when attempting to mutate immutable system fields (id, createdAt, updatedAt)', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}`)
        .send({
          title: 'New Title',
          id: 'hacked-id',
          createdAt: '2020-01-01T00:00:00.000Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.details).toContain('Fields "id", "createdAt", and "updatedAt" are immutable and cannot be updated.');
    });

    it('should return 400 when updating with an empty or whitespace title', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}`)
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.details).toContain('Field "title" cannot be empty or whitespace only.');
    });

    it('should return 400 when updating with an invalid status enum', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}`)
        .send({ status: 'done_and_dusted' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.details[0]).toContain('Field "status" must be one of');
    });

    it('should return 404 when updating a non-existent task ID', async () => {
      const res = await request(app)
        .patch(`/tasks/${validNonExistentId}`)
        .send({ title: 'Valid Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NotFound');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task and return 204 No Content', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task to Delete' });

      const taskId = createRes.body.id;

      const deleteRes = await request(app).delete(`/tasks/${taskId}`);
      expect(deleteRes.status).toBe(204);
      expect(deleteRes.body).toEqual({});

      // Verify task no longer exists
      const getRes = await request(app).get(`/tasks/${taskId}`);
      expect(getRes.status).toBe(404);

      // Verify list count decreased
      const listRes = await request(app).get('/tasks');
      expect(listRes.body.count).toBe(0);
    });

    it('should return 404 when deleting a non-existent task ID', async () => {
      const res = await request(app).delete(`/tasks/${validNonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NotFound');
    });

    it('should return 400 when deleting with an invalid UUID format', async () => {
      const res = await request(app).delete('/tasks/not-a-valid-uuid');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });
  });
});
