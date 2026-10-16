import { randomUUID } from 'crypto';
import { Task, CreateTaskDTO, TaskFilters } from '../types/task';

// In-memory data store for tasks
let tasks: Task[] = [];

export const taskService = {
  createTask(dto: CreateTaskDTO): Task {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: randomUUID(),
      title: dto.title.trim(),
      description: dto.description?.trim(),
      status: dto.status || 'pending',
      priority: dto.priority || 'medium',
      createdAt: now,
      updatedAt: now
    };

    tasks.push(newTask);
    return newTask;
  },

  listTasks(filters?: TaskFilters): Task[] {
    let result = [...tasks];

    if (filters?.status) {
      result = result.filter(task => task.status === filters.status);
    }

    if (filters?.priority) {
      result = result.filter(task => task.priority === filters.priority);
    }

    return result;
  },

  // Helper method for testing isolation
  clearTasks(): void {
    tasks = [];
  }
};
