import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ChatPanel } from '@/components/kanban/ChatPanel';
import { LayoutDashboard } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">TaskFlow</h1>
            <p className="text-xs text-muted-foreground">Organize. Prioritize. Execute.</p>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <KanbanBoard />
      </main>

      {/* AI Chat */}
      <ChatPanel />
    </div>
  );
};

export default Index;
