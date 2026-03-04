import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus, COLUMN_CONFIG } from '@/types/kanban';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
}

export function KanbanColumn({ status, tasks, onAddTask, onDeleteTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = COLUMN_CONFIG[status];

  return (
    <div className="flex flex-col min-w-[300px] w-[340px] shrink-0">
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className={`h-2.5 w-2.5 rounded-full ${config.colorClass}`} />
        <h3 className="font-display font-semibold text-sm">
          {config.label}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
          {tasks.length}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onAddTask(status)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-3 p-2 rounded-xl transition-colors min-h-[200px] ${
          isOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-transparent'
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
