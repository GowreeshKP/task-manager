export type TaskStatus = 'pending' | 'in-progress' | 'done';

export interface Task {
  id: string;
  _id?: string; // MongoDB compatibility
  title: string;
  description: string; // Rich Text HTML
  status: TaskStatus;
  color: string; // Hex or tailwind class
  userId?: string; // Associated user
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  token?: string;
}
