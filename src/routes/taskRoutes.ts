import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import { validateCreateTask, validateListTasks } from '../middleware/validateTask';

export const taskRouter = Router();

taskRouter.post('/', validateCreateTask, taskController.createTask);
taskRouter.get('/', validateListTasks, taskController.listTasks);

export default taskRouter;
