import { Request, Response, NextFunction } from 'express';
import { TaskStatus, TaskPriority } from '../types/task';

const ALLOWED_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];
const ALLOWED_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export function validateCreateTask(req: Request, res: Response, next: NextFunction): void {
  const { title, description, status, priority } = req.body;
  const errors: string[] = [];

  // Title validation
  if (title === undefined || title === null) {
    errors.push('Field "title" is required.');
  } else if (typeof title !== 'string') {
    errors.push('Field "title" must be a string.');
  } else if (title.trim().length === 0) {
    errors.push('Field "title" cannot be empty or whitespace only.');
  } else if (title.trim().length > 100) {
    errors.push('Field "title" cannot exceed 100 characters.');
  }

  // Description validation (optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Field "description" must be a string if provided.');
    } else if (description.length > 500) {
      errors.push('Field "description" cannot exceed 500 characters.');
    }
  }

  // Status validation (optional)
  if (status !== undefined && status !== null) {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.push(`Field "status" must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    }
  }

  // Priority validation (optional)
  if (priority !== undefined && priority !== null) {
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      errors.push(`Field "priority" must be one of: ${ALLOWED_PRIORITIES.join(', ')}.`);
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid task creation payload',
      details: errors
    });
    return;
  }

  next();
}

export function validateListTasks(req: Request, res: Response, next: NextFunction): void {
  const { status, priority } = req.query;
  const errors: string[] = [];

  if (status !== undefined) {
    if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status as TaskStatus)) {
      errors.push(`Query parameter "status" must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    }
  }

  if (priority !== undefined) {
    if (typeof priority !== 'string' || !ALLOWED_PRIORITIES.includes(priority as TaskPriority)) {
      errors.push(`Query parameter "priority" must be one of: ${ALLOWED_PRIORITIES.join(', ')}.`);
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid query parameters',
      details: errors
    });
    return;
  }

  next();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateTaskId(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;

  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Task ID must be a valid UUID v4 format'
    });
    return;
  }

  next();
}

export function validateUpdateTask(req: Request, res: Response, next: NextFunction): void {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Request body must be a JSON object'
    });
    return;
  }

  const { id, createdAt, updatedAt, title, description, status, priority } = req.body;
  const errors: string[] = [];

  // Reject tampering with immutable system fields
  if (id !== undefined || createdAt !== undefined || updatedAt !== undefined) {
    errors.push('Fields "id", "createdAt", and "updatedAt" are immutable and cannot be updated.');
  }

  // Ensure at least one updateable field is supplied
  const hasUpdateField = title !== undefined || description !== undefined || status !== undefined || priority !== undefined;
  if (!hasUpdateField) {
    errors.push('At least one field ("title", "description", "status", or "priority") must be provided for update.');
  }

  // Title validation (if provided)
  if (title !== undefined) {
    if (typeof title !== 'string') {
      errors.push('Field "title" must be a string.');
    } else if (title.trim().length === 0) {
      errors.push('Field "title" cannot be empty or whitespace only.');
    } else if (title.trim().length > 100) {
      errors.push('Field "title" cannot exceed 100 characters.');
    }
  }

  // Description validation (if provided)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Field "description" must be a string if provided.');
    } else if (description.length > 500) {
      errors.push('Field "description" cannot exceed 500 characters.');
    }
  }

  // Status validation (if provided)
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.push(`Field "status" must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
    }
  }

  // Priority validation (if provided)
  if (priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      errors.push(`Field "priority" must be one of: ${ALLOWED_PRIORITIES.join(', ')}.`);
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid task update payload',
      details: errors
    });
    return;
  }

  next();
}
