import { Request, Response } from 'express';
import { taskService } from '../services/taskService';
import { TaskStatus, TaskPriority, TaskFilters } from '../types/task';

export const taskController = {
  createTask(req: Request, res: Response): void {
    const { title, description, status, priority } = req.body;
    const task = taskService.createTask({
      title,
      description,
      status,
      priority
    });

    res.status(201).json(task);
  },

  listTasks(req: Request, res: Response): void {
    const { status, priority } = req.query;

    const filters: TaskFilters = {};
    if (typeof status === 'string') {
      filters.status = status as TaskStatus;
    }
    if (typeof priority === 'string') {
      filters.priority = priority as TaskPriority;
    }

    const tasks = taskService.listTasks(filters);
    res.status(200).json({
      tasks,
      count: tasks.length
    });
  },

  getTaskById(req: Request, res: Response): void {
    const id = req.params.id as string;
    const task = taskService.getTaskById(id);

    if (!task) {
      res.status(404).json({
        error: 'NotFound',
        message: `Task with id "${id}" was not found.`
      });
      return;
    }

    res.status(200).json(task);
  },

  updateTask(req: Request, res: Response): void {
    const id = req.params.id as string;
    const { title, description, status, priority } = req.body;

    const updatedTask = taskService.updateTask(id, {
      title,
      description,
      status,
      priority
    });

    if (!updatedTask) {
      res.status(404).json({
        error: 'NotFound',
        message: `Task with id "${id}" was not found.`
      });
      return;
    }

    res.status(200).json(updatedTask);
  },

  deleteTask(req: Request, res: Response): void {
    const id = req.params.id as string;
    const deleted = taskService.deleteTask(id);

    if (!deleted) {
      res.status(404).json({
        error: 'NotFound',
        message: `Task with id "${id}" was not found.`
      });
      return;
    }

    res.status(204).send();
  }
};
