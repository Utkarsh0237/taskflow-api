import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import { validateCreateTask } from '../middleware/validateTask';

export const taskRouter = Router();

taskRouter.post('/', validateCreateTask, taskController.createTask);
taskRouter.get('/', taskController.listTasks);

export default taskRouter;
