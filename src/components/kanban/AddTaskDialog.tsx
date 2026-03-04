import { useState } from 'react';
import { TaskStatus, TaskPriority } from '@/types/kanban';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus: TaskStatus;
  onAdd: (task: { title: string; description?: string; priority: TaskPriority; due_date?: string; status: TaskStatus }) => void;
}

export function AddTaskDialog({ open, onOpenChange, defaultStatus, onAdd }: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      status: defaultStatus,
    });
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display">New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Task title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            className="font-medium"
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
          <div className="flex gap-3">
            <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button type="submit" className="w-full">Add Task</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
