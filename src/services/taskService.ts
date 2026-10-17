import { randomUUID } from 'crypto';
import { Task, CreateTaskDTO, TaskFilters, UpdateTaskDTO } from '../types/task';

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

  getTaskById(id: string): Task | null {
    const task = tasks.find(t => t.id === id);
    return task ? { ...task } : null;
  },

  updateTask(id: string, dto: UpdateTaskDTO): Task | null {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return null;
    }

    const existing = tasks[index];
    let newDescription = existing.description;
    if (dto.description === null) {
      newDescription = undefined;
    } else if (dto.description !== undefined) {
      newDescription = dto.description.trim();
    }

    const updated: Task = {
      ...existing,
      title: dto.title !== undefined ? dto.title.trim() : existing.title,
      description: newDescription,
      status: dto.status !== undefined ? dto.status : existing.status,
      priority: dto.priority !== undefined ? dto.priority : existing.priority,
      updatedAt: new Date().toISOString()
    };

    tasks[index] = updated;
    return { ...updated };
  },

  deleteTask(id: string): boolean {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    tasks.splice(index, 1);
    return true;
  },

  // Helper method for testing isolation
  clearTasks(): void {
    tasks = [];
  }
};
