import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, TaskPriority } from '@/types/kanban';

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(task: {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  status?: TaskStatus;
}): Promise<Task> {
  // Get max position for the status column
  const status = task.status ?? 'todo';
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1);

  const maxPos = existing?.[0]?.position ?? -1;

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, status, position: maxPos + 1 })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
