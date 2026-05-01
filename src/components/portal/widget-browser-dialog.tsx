'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, Phone, BarChart2, Database, Timer,
  GanttChartSquare, Bot, ListTodo, Wrench, FileSignature,
  FileText, DollarSign, Users, Search, Plus, Check, MapPin,
  KanbanSquare, Users2, TrendingUp, Sparkles, CircleDollarSign,
  CalendarDays, FolderOpen, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WIDGET_CATALOG,
  WIDGET_CATEGORIES,
  type WidgetType,
  type WidgetCategory,
} from '@/lib/widget-catalog';
import type { Widget } from '@/types/widget';

/** Map icon name string → Lucide component */
export function WidgetIcon({ iconName, className }: { iconName: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    MessageSquare: <MessageSquare className={cn('h-5 w-5', className)} />,
    Phone:         <Phone         className={cn('h-5 w-5', className)} />,
    BarChart2:     <BarChart2     className={cn('h-5 w-5', className)} />,
    Database:      <Database      className={cn('h-5 w-5', className)} />,
    Timer:         <Timer         className={cn('h-5 w-5', className)} />,
    GanttChartSquare: <GanttChartSquare className={cn('h-5 w-5', className)} />,
    Bot:           <Bot           className={cn('h-5 w-5', className)} />,
    ListTodo:      <ListTodo      className={cn('h-5 w-5', className)} />,
    Wrench:        <Wrench        className={cn('h-5 w-5', className)} />,
    FileSignature: <FileSignature className={cn('h-5 w-5', className)} />,
    FileText:      <FileText      className={cn('h-5 w-5', className)} />,
    DollarSign:    <DollarSign    className={cn('h-5 w-5', className)} />,
    Users:              <Users              className={cn('h-5 w-5', className)} />,
    MapPin:             <MapPin             className={cn('h-5 w-5', className)} />,
    KanbanSquare:       <KanbanSquare       className={cn('h-5 w-5', className)} />,
    Users2:             <Users2             className={cn('h-5 w-5', className)} />,
    TrendingUp:         <TrendingUp         className={cn('h-5 w-5', className)} />,
    Sparkles:           <Sparkles           className={cn('h-5 w-5', className)} />,
    CircleDollarSign:   <CircleDollarSign   className={cn('h-5 w-5', className)} />,
    CalendarDays:       <CalendarDays       className={cn('h-5 w-5', className)} />,
    FolderOpen:         <FolderOpen         className={cn('h-5 w-5', className)} />,
    Hash:               <Hash               className={cn('h-5 w-5', className)} />,
  };
  return <>{icons[iconName] ?? <Bot className={cn('h-5 w-5', className)} />}</>;
}

const CATEGORY_COLORS: Record<WidgetCategory, string> = {
  'Sales Training': 'bg-primary/15 text-primary border-primary/30',
  'Operations':     'bg-secondary/15 text-secondary border-secondary/30',
  'Leads':          'bg-accent/15 text-accent border-accent/30',
  'Essentials':     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

interface WidgetBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently active widget IDs so we can mark them as added */
  activeWidgetIds: WidgetType[];
  onAdd: (type: WidgetType) => Promise<void>;
}

export function WidgetBrowserDialog({
  open,
  onOpenChange,
  activeWidgetIds,
  onAdd,
}: WidgetBrowserDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'All'>('All');
  const [adding, setAdding] = useState<WidgetType | null>(null);

  const filtered = useMemo(() => {
    return WIDGET_CATALOG.filter((w) => {
      const matchesSearch =
        !search ||
        w.defaultTitle.toLowerCase().includes(search.toLowerCase()) ||
        w.defaultDescription.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || w.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const handleAdd = async (type: WidgetType) => {
    setAdding(type);
    try {
      await onAdd(type);
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            <Search className="h-5 w-5 text-primary/70" />
            Widget Browser
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Browse all available widgets and add them to your portal.
          </DialogDescription>
        </DialogHeader>

        {/* Search + filter */}
        <div className="px-6 py-3 border-b border-border/20 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-border/50 bg-background/50"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', ...WIDGET_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold border transition-all',
                  selectedCategory === cat
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No widgets match your search.
            </p>
          )}
          {filtered.map((def) => {
            const isActive = activeWidgetIds.includes(def.type);
            return (
              <div
                key={def.type}
                className={cn(
                  'flex items-center gap-4 rounded-xl border p-4 transition-all',
                  isActive
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/40 bg-background/30 hover:border-border/60 hover:bg-background/50'
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 border border-border/40">
                  <WidgetIcon iconName={def.iconName} className="text-primary/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{def.defaultTitle}</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', CATEGORY_COLORS[def.category])}>
                      {def.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {def.defaultDescription}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? 'outline' : 'default'}
                  className={cn(
                    'shrink-0 h-8 px-3 text-xs',
                    isActive ? 'border-primary/30 text-primary/80' : 'btn-gradient'
                  )}
                  onClick={() => !isActive && handleAdd(def.type)}
                  disabled={isActive || adding === def.type}
                >
                  {isActive ? (
                    <><Check className="mr-1 h-3 w-3" />Added</>
                  ) : adding === def.type ? (
                    <>Adding…</>
                  ) : (
                    <><Plus className="mr-1 h-3 w-3" />Add</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t border-border/30 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="border border-border/40">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
