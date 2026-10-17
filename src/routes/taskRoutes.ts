import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import {
  validateCreateTask,
  validateListTasks,
  validateTaskId,
  validateUpdateTask
} from '../middleware/validateTask';

export const taskRouter = Router();

taskRouter.post('/', validateCreateTask, taskController.createTask);
taskRouter.get('/', validateListTasks, taskController.listTasks);
taskRouter.get('/:id', validateTaskId, taskController.getTaskById);
taskRouter.patch('/:id', validateTaskId, validateUpdateTask, taskController.updateTask);
taskRouter.delete('/:id', validateTaskId, taskController.deleteTask);

export default taskRouter;
