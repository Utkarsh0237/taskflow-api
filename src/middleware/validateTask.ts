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
