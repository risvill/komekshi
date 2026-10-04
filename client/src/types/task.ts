export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type TaskOrder = {
  id: string;
  client_name?: string | null;
  clientName?: string | null;
  client?: { name?: string | null } | null;
  name?: string | null;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  orders: TaskOrder[];
};