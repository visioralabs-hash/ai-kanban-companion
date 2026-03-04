import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/types/kanban';
import { fetchTasks, createTask, updateTask, deleteTask } from '@/lib/tasks';
import { KanbanColumn } from './KanbanColumn';
import { AddTaskDialog } from './AddTaskDialog';
import { TaskCard } from './TaskCard';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6'],
  });
}

// Global refresh callback for AI panel
let _refreshCallback: (() => void) | null = null;
export function registerBoardRefresh(cb: () => void) { _refreshCallback = cb; }
export function triggerBoardRefresh() { _refreshCallback?.(); }

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<TaskStatus>('todo');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { registerBoardRefresh(loadTasks); return () => { _refreshCallback = null; }; }, [loadTasks]);

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position);

  const handleAddTask = async (task: Parameters<typeof createTask>[0]) => {
    try {
      const newTask = await createTask(task);
      setTasks(prev => [...prev, newTask]);
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const openAddDialog = (status: TaskStatus) => {
    setDialogStatus(status);
    setDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = tasks.find(t => t.id === activeId);
    if (!activeItem) return;

    const isOverColumn = STATUSES.includes(overId as TaskStatus);
    const overItem = tasks.find(t => t.id === overId);

    const newStatus = isOverColumn ? (overId as TaskStatus) : overItem?.status;
    if (!newStatus || newStatus === activeItem.status) return;

    setTasks(prev =>
      prev.map(t => t.id === activeId ? { ...t, status: newStatus } : t)
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedTask = activeTask;
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const activeItem = tasks.find(t => t.id === activeId);
    if (!activeItem) return;

    const overId = over.id as string;
    const isOverColumn = STATUSES.includes(overId as TaskStatus);
    const targetStatus = isOverColumn ? (overId as TaskStatus) : tasks.find(t => t.id === overId)?.status ?? activeItem.status;

    // 🎉 Confetti when moving to "done" (Complete)
    if (targetStatus === 'done' && draggedTask && draggedTask.status !== 'done') {
      fireConfetti();
    }

    // Reorder within column
    const columnTasks = getColumnTasks(targetStatus);
    const oldIdx = columnTasks.findIndex(t => t.id === activeId);
    const overTask = columnTasks.find(t => t.id === overId);
    const newIdx = overTask ? columnTasks.indexOf(overTask) : columnTasks.length - 1;

    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      const reordered = arrayMove(columnTasks, oldIdx, newIdx);
      setTasks(prev => {
        const other = prev.filter(t => t.status !== targetStatus);
        return [...other, ...reordered.map((t, i) => ({ ...t, position: i }))];
      });
    }

    // Persist changes
    try {
      await updateTask(activeId, { status: targetStatus, position: Math.max(0, columnTasks.findIndex(t => t.id === activeId)) });
    } catch {
      toast.error('Failed to update task');
      loadTasks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-primary animate-pulse-dot" />
          <span className="h-3 w-3 rounded-full bg-primary animate-pulse-dot [animation-delay:0.2s]" />
          <span className="h-3 w-3 rounded-full bg-primary animate-pulse-dot [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4 px-1">
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getColumnTasks(status)}
              onAddTask={openAddDialog}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onDelete={() => {}} />}
        </DragOverlay>
      </DndContext>

      <AddTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus={dialogStatus}
        onAdd={handleAddTask}
      />
    </>
  );
}
