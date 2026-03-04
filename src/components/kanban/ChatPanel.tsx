import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/types/kanban';
import { streamChat } from '@/lib/chat';
import { triggerBoardRefresh } from './KanbanBoard';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => {
          setIsLoading(false);
          // Refresh board in case AI made changes
          triggerBoardRefresh();
        },
      });
    } catch (e: any) {
      toast.error(e.message || 'Chat error');
      setIsLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary shadow-float flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] rounded-2xl bg-card border border-border shadow-float flex flex-col animate-slide-in-right overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-sm">AI Assistant</h3>
          <p className="text-[10px] text-muted-foreground">Can view & edit your tasks</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center mt-16">
            <Sparkles className="h-8 w-8 text-primary/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Ask me about your tasks!</p>
            <p className="text-xs text-muted-foreground/60 mt-1">I can view, create, edit & delete tasks for you</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-chat-bubble text-foreground rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none [&_p]:my-0.5 [&_ul]:my-1 [&_li]:my-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-1.5 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse-dot" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse-dot [animation-delay:0.2s]" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse-dot [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your tasks..."
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
