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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  KanbanSquare,
  List,
  PlusCircle,
  Trash2,
  Loader2,
  Settings2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Calendar,
  User,
  Tag,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Client, AccessKey as ClientAccessKey } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Priority = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

type PipelineTask = {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  assignee?: string;
  assigneeDisplay?: string;
  dueDate?: string;
  status: string;
  tags?: string;
  createdAt: any;
  createdBy?: string;
};

type PipelineSettings = {
  id: string;
  columns: string[];
};

type ViewMode = 'kanban' | 'list';
type SidePanel = 'none' | 'add-task' | 'settings';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; badgeClass: string }> = {
  None: {
    label: 'None',
    color: 'text-muted-foreground',
    badgeClass: 'border-border/40 bg-muted/30 text-muted-foreground',
  },
  Low: {
    label: 'Low',
    color: 'text-blue-400',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  Medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    badgeClass: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  },
  High: {
    label: 'High',
    color: 'text-orange-400',
    badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  },
  Critical: {
    label: 'Critical',
    color: 'text-red-400',
    badgeClass: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.None;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        cfg.badgeClass
      )}
    >
      {cfg.label}
    </span>
  );
}

function formatDueDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Task Form (slide-in right panel)
// ─────────────────────────────────────────────────────────────────────────────

type AddTaskFormProps = {
  columns: string[];
  accessKeys: ClientAccessKey[];
  activeUser: AccessKey | null;
  onSave: (data: Omit<PipelineTask, 'id' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
};

function AddTaskForm({ columns, accessKeys, activeUser, onSave, onClose }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('None');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState(columns[0] ?? 'To Do');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const selectedKey = accessKeys.find((k) => k.username === assignee);
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee: (assignee && assignee !== '__unassigned__') ? assignee : undefined,
      assigneeDisplay: selectedKey?.displayName || assignee || undefined,
      dueDate: dueDate || undefined,
      status,
      tags: tags.trim() || undefined,
      createdBy: activeUser?.username,
    });
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">New Task</p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Title <span className="text-red-400">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title…"
            className="h-8 text-sm border-border/60 bg-background/50"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Description
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description…"
            rows={3}
            className="resize-none text-sm border-border/60 bg-background/50"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <GripVertical className="h-3 w-3" /> Status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Priority
          </Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['None', 'Low', 'Medium', 'High', 'Critical'] as Priority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  <span className={PRIORITY_CONFIG[p].color}>{p}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignee */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> Assignee
          </Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {accessKeys.map((k) => (
                <SelectItem key={k.username} value={k.username}>
                  {k.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Due Date
          </Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 text-sm border-border/60 bg-background/50"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Tag className="h-3 w-3" /> Tags
          </Label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="design, backend, urgent…"
            className="h-8 text-sm border-border/60 bg-background/50"
          />
          <p className="text-[10px] text-muted-foreground">Comma-separated</p>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/30 space-y-2">
        <Button
          className="w-full btn-gradient"
          onClick={handleSave}
          disabled={saving || !title.trim()}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Create Task
        </Button>
        <Button variant="ghost" size="sm" className="w-full border border-border/40 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Panel
// ─────────────────────────────────────────────────────────────────────────────

type SettingsPanelProps = {
  columns: string[];
  onSave: (columns: string[]) => Promise<void>;
  onClose: () => void;
};

function SettingsPanel({ columns, onSave, onClose }: SettingsPanelProps) {
  const [localColumns, setLocalColumns] = useState<string[]>([...columns]);
  const [newColName, setNewColName] = useState('');
  const [saving, setSaving] = useState(false);

  const addColumn = () => {
    const name = newColName.trim();
    if (!name || localColumns.includes(name)) return;
    setLocalColumns((prev) => [...prev, name]);
    setNewColName('');
  };

  const removeColumn = (col: string) => {
    setLocalColumns((prev) => prev.filter((c) => c !== col));
  };

  const renameColumn = (index: number, value: string) => {
    setLocalColumns((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSave = async () => {
    const valid = localColumns.map((c) => c.trim()).filter(Boolean);
    if (valid.length === 0) return;
    setSaving(true);
    await onSave(valid);
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Column Settings</p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Rename or remove columns. Changes apply to all tasks.
        </p>

        {localColumns.map((col, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={col}
              onChange={(e) => renameColumn(i, e.target.value)}
              className="h-8 text-sm flex-1 border-border/60 bg-background/50"
            />
            <button
              onClick={() => removeColumn(col)}
              disabled={localColumns.length <= 1}
              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          <Input
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="New column name…"
            className="h-8 text-sm flex-1 border-border/60 bg-background/50"
            onKeyDown={(e) => e.key === 'Enter' && addColumn()}
          />
          <Button size="sm" variant="outline" onClick={addColumn} className="h-8 px-2 border-border/50">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/30 space-y-2">
        <Button
          className="w-full btn-gradient"
          onClick={handleSave}
          disabled={saving || localColumns.length === 0}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Save Columns
        </Button>
        <Button variant="ghost" size="sm" className="w-full border border-border/40 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Card (Kanban)
// ─────────────────────────────────────────────────────────────────────────────

type TaskCardProps = {
  task: PipelineTask;
  columns: string[];
  onMove: (task: PipelineTask, newStatus: string) => void;
  onDelete: (taskId: string) => void;
};

function TaskCard({ task, columns, onMove, onDelete }: TaskCardProps) {
  const currentIndex = columns.indexOf(task.status);
  const canMovePrev = currentIndex > 0;
  const canMoveNext = currentIndex < columns.length - 1;

  const tagList = task.tags
    ? task.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm px-3 py-3 space-y-2 hover:bg-background/60 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight flex-1 min-w-0">{task.title}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &ldquo;{task.title}&rdquo;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(task.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <PriorityBadge priority={task.priority} />
        {tagList.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border border-border/40 bg-background/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {(task.assigneeDisplay || task.dueDate) && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {task.assigneeDisplay ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assigneeDisplay}
            </span>
          ) : (
            <span />
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.dueDate)}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 pt-1 border-t border-border/20">
        <button
          disabled={!canMovePrev}
          onClick={() => onMove(task, columns[currentIndex - 1])}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {canMovePrev ? columns[currentIndex - 1] : ''}
        </button>
        <div className="flex-1" />
        <button
          disabled={!canMoveNext}
          onClick={() => onMove(task, columns[currentIndex + 1])}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {canMoveNext ? columns[currentIndex + 1] : ''}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dialog
// ─────────────────────────────────────────────────────────────────────────────

type TaskPipelineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
  tagFilter?: string;
};

export function TaskPipelineDialog({
  open,
  onOpenChange,
  client,
  activeUser,
  tagFilter,
}: TaskPipelineDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [filterAssignee, setFilterAssignee] = useState('__all__');
  const [filterPriority, setFilterPriority] = useState<Priority | '__all__'>('__all__');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const isManager = activeUser?.role === 'admin';

  // ── Firestore refs ──────────────────────────────────────────────────────────

  const tasksCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'pipelineTasks');
  }, [firestore, client.path]);

  const settingsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'pipelineSettings');
  }, [firestore, client.path]);

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return doc(firestore, client.path, 'pipelineSettings', 'config');
  }, [firestore, client.path]);

  const accessKeysCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'accessKeys');
  }, [firestore, client.path]);

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: tasks, isLoading: areTasksLoading } = useCollection<PipelineTask>(tasksCollectionRef);
  // Watch the pipelineSettings collection and find the 'config' doc by id
  const { data: settingsArr, isLoading: areSettingsLoading } = useCollection<PipelineSettings>(settingsCollectionRef);
  const { data: accessKeys } = useCollection<ClientAccessKey>(accessKeysCollectionRef);

  const settings = settingsArr?.find((s) => s.id === 'config');
  const columns: string[] = settings?.columns ?? DEFAULT_COLUMNS;

  // ── Filters ────────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (myTasksOnly && t.assignee !== activeUser?.username) return false;
      if (filterAssignee !== '__all__' && t.assignee !== filterAssignee) return false;
      if (filterPriority !== '__all__' && t.priority !== filterPriority) return false;
      if (tagFilter) {
        const tag = tagFilter.toLowerCase();
        const taskTags = t.tags?.toLowerCase().split(',').map((s) => s.trim()) ?? [];
        if (!taskTags.includes(tag)) return false;
      }
      return true;
    });
  }, [tasks, myTasksOnly, filterAssignee, filterPriority, activeUser, tagFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAddTask = async (data: Omit<PipelineTask, 'id' | 'createdAt'>) => {
    if (!tasksCollectionRef) return;
    await addDoc(tasksCollectionRef, { ...data, createdAt: serverTimestamp() });
    toast({ title: 'Task created', description: data.title });
    setSidePanel('none');
    if (firestore && client.path) {
      logActivity(firestore, client.path, 'task-pipeline', `New task: ${data.title}`);
    }
  };

  const handleMoveTask = async (task: PipelineTask, newStatus: string) => {
    if (!tasksCollectionRef) return;
    const taskRef = doc(tasksCollectionRef, task.id);
    await updateDoc(taskRef, { status: newStatus });
    if (firestore && client.path) {
      logActivity(firestore, client.path, 'task-pipeline', `"${task.title}" moved to ${newStatus}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!tasksCollectionRef) return;
    await deleteDoc(doc(tasksCollectionRef, taskId));
    toast({ title: 'Task deleted', variant: 'destructive' });
  };

  const handleSaveSettings = async (newColumns: string[]) => {
    if (!settingsDocRef) return;
    await setDoc(settingsDocRef, { columns: newColumns }, { merge: true });
    toast({ title: 'Columns updated' });
    setSidePanel('none');
  };

  const isLoading = areTasksLoading || areSettingsLoading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden glass-card-strong border-border/50">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <KanbanSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="font-headline text-lg flex items-center gap-2">
                  Task Pipeline
                  {tagFilter && (
                    <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      #{tagFilter}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs">{client.firmName}</DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* My tasks toggle */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/30 px-2.5 py-1.5">
                <Switch
                  checked={myTasksOnly}
                  onCheckedChange={setMyTasksOnly}
                  id="my-tasks-toggle"
                  className="scale-75"
                />
                <label
                  htmlFor="my-tasks-toggle"
                  className="text-[10px] font-semibold cursor-pointer select-none"
                >
                  My Tasks
                </label>
              </div>

              {/* Assignee filter */}
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="h-8 text-xs w-36 border-border/50 bg-background/30">
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All assignees</SelectItem>
                  {accessKeys?.map((k) => (
                    <SelectItem key={k.username} value={k.username}>
                      {k.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority filter */}
              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as Priority | '__all__')}>
                <SelectTrigger className="h-8 text-xs w-32 border-border/50 bg-background/30">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All priorities</SelectItem>
                  {(['None', 'Low', 'Medium', 'High', 'Critical'] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View mode toggle */}
              <div className="flex rounded-lg border border-border/40 bg-background/30 p-0.5 gap-0.5">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                    viewMode === 'kanban'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <KanbanSquare className="h-3.5 w-3.5" />
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                    viewMode === 'list'
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
              </div>

              {/* Settings */}
              {isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-border/50"
                  onClick={() => setSidePanel(sidePanel === 'settings' ? 'none' : 'settings')}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Settings
                </Button>
              )}

              {/* Add task */}
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs btn-gradient"
                onClick={() => setSidePanel(sidePanel === 'add-task' ? 'none' : 'add-task')}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Task
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Main content area */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : viewMode === 'kanban' ? (
              <KanbanView
                tasks={filteredTasks}
                columns={columns}
                onMove={handleMoveTask}
                onDelete={handleDeleteTask}
              />
            ) : (
              <ListView
                tasks={filteredTasks}
                columns={columns}
                onMove={handleMoveTask}
                onDelete={handleDeleteTask}
              />
            )}
          </div>

          {/* Side panel */}
          {sidePanel !== 'none' && (
            <div className="w-72 shrink-0 border-l border-border/30 bg-background/50 backdrop-blur-sm flex flex-col">
              {sidePanel === 'add-task' && (
                <AddTaskForm
                  columns={columns}
                  accessKeys={accessKeys ?? []}
                  activeUser={activeUser}
                  onSave={handleAddTask}
                  onClose={() => setSidePanel('none')}
                />
              )}
              {sidePanel === 'settings' && isManager && (
                <SettingsPanel
                  columns={columns}
                  onSave={handleSaveSettings}
                  onClose={() => setSidePanel('none')}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kanban View
// ─────────────────────────────────────────────────────────────────────────────

type KanbanViewProps = {
  tasks: PipelineTask[];
  columns: string[];
  onMove: (task: PipelineTask, newStatus: string) => void;
  onDelete: (taskId: string) => void;
};

function KanbanView({ tasks, columns, onMove, onDelete }: KanbanViewProps) {
  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-3 h-full px-4 py-4 min-w-max">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div
              key={col}
              className="flex flex-col w-64 shrink-0 rounded-xl border border-border/40 bg-background/20 overflow-hidden"
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {col}
                </p>
                <span className="rounded-full border border-border/40 bg-background/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-[11px] text-muted-foreground/50 text-center">No tasks</p>
                  </div>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    columns={columns}
                    onMove={onMove}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List View
// ─────────────────────────────────────────────────────────────────────────────

type ListViewProps = {
  tasks: PipelineTask[];
  columns: string[];
  onMove: (task: PipelineTask, newStatus: string) => void;
  onDelete: (taskId: string) => void;
};

function ListView({ tasks, columns, onMove, onDelete }: ListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center">
        <KanbanSquare className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No tasks found.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4 py-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-24">Move</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const currentIndex = columns.indexOf(task.status);
            const canMovePrev = currentIndex > 0;
            const canMoveNext = currentIndex < columns.length - 1;

            return (
              <TableRow key={task.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words mt-0.5">
                        {task.description}
                      </p>
                    )}
                    {task.tags && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {task.tags
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full border border-border/40 bg-background/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {task.assigneeDisplay || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDueDate(task.dueDate)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full border border-border/40 bg-background/30 px-2 py-0.5 text-xs font-medium">
                    {task.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!canMovePrev}
                      onClick={() => onMove(task, columns[currentIndex - 1])}
                      title={canMovePrev ? `Move to ${columns[currentIndex - 1]}` : undefined}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!canMoveNext}
                      onClick={() => onMove(task, columns[currentIndex + 1])}
                      title={canMoveNext ? `Move to ${columns[currentIndex + 1]}` : undefined}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete task?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &ldquo;{task.title}&rdquo;.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(task.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
