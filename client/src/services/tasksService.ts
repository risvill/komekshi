import { apiFetch } from './api';
import { Task, TaskStatus } from '@/types/task';

export type CreateTaskData = {
  title: string;
  deadline?: string | null;
  order_ids?: string[];
};

export type UpdateTaskData = {
  title?: string;
  deadline?: string | null;
};

function normalizeTask(task: Task): Task {
  return {
    ...task,
    orders: task.orders ?? [],
  };
}

export async function getTasks(token: string): Promise<Task[]> {
  const tasks = await apiFetch('/tasks', {}, token);

  return tasks.map(normalizeTask);
}

export async function createTask(
  token: string,
  task: CreateTaskData
): Promise<Task> {
  const newTask = await apiFetch(
    '/tasks',
    {
      method: 'POST',
      body: JSON.stringify(task),
    },
    token
  );

  return normalizeTask(newTask);
}

export async function updateTask(
  token: string,
  taskId: string,
  task: UpdateTaskData
): Promise<Task> {
  const updatedTask = await apiFetch(
    `/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(task),
    },
    token
  );

  return normalizeTask(updatedTask);
}

export async function updateTaskStatus(
  token: string,
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  const updatedTask = await apiFetch(
    `/tasks/${taskId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token
  );

  return normalizeTask(updatedTask);
}

export async function deleteTask(
  token: string,
  taskId: string
): Promise<void> {
  return apiFetch(
    `/tasks/${taskId}`,
    {
      method: 'DELETE',
    },
    token
  );
}

export async function getTask(
  token: string,
  taskId: string
): Promise<Task> {
  const task = await apiFetch(
    `/tasks/${taskId}`,
    {},
    token
  );

  return normalizeTask(task);
}