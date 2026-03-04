export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const COLUMN_CONFIG: Record<TaskStatus, { label: string; colorClass: string }> = {
  todo: { label: 'To Do', colorClass: 'bg-column-todo' },
  in_progress: { label: 'In Progress', colorClass: 'bg-column-progress' },
  done: { label: 'Complete', colorClass: 'bg-column-done' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; colorClass: string }> = {
  low: { label: 'Low', colorClass: 'bg-priority-low text-success-foreground' },
  medium: { label: 'Medium', colorClass: 'bg-priority-medium text-warning-foreground' },
  high: { label: 'High', colorClass: 'bg-priority-high text-destructive-foreground' },
};
