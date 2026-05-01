'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Loader2,
  TrendingUp,
  DollarSign,
  Trophy,
  XCircle,
  X,
  ArrowLeft,
  Settings,
  Trash2,
  Edit,
  MessageSquare,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { differenceInDays } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Deal = {
  id: string;
  path: string;
  title: string;
  contactName: string;
  contactPhone?: string;
  value: number;
  stage: string;
  probability: number;
  assignee: string;
  assigneeDisplay: string;
  notes?: string;
  createdAt: any;
  createdBy: string;
  stageUpdatedAt: any;
  wonAt?: any;
  lostAt?: any;
  lostReason?: string;
};

type DealSettings = {
  id: string;
  stages: string[];
};

type RightPanel = 'none' | 'add' | 'detail' | 'settings';

const DEFAULT_STAGES = [
  'Prospect',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getDaysInStage(stageUpdatedAt: any): number {
  if (!stageUpdatedAt) return 0;
  const date: Date = stageUpdatedAt?.toDate ? stageUpdatedAt.toDate() : new Date(stageUpdatedAt);
  return differenceInDays(new Date(), date);
}

function stageBadgeClass(stage: string): string {
  if (stage === 'Closed Won') return 'border-green-500/40 bg-green-500/10 text-green-400';
  if (stage === 'Closed Lost') return 'border-red-500/40 bg-red-500/10 text-red-400';
  if (stage === 'Negotiation') return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400';
  if (stage === 'Proposal') return 'border-blue-500/40 bg-blue-500/10 text-blue-400';
  if (stage === 'Qualified') return 'border-purple-500/40 bg-purple-500/10 text-purple-400';
  return 'border-border/40 bg-background/30 text-muted-foreground';
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Card
// ─────────────────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  stages,
  onMoveLeft,
  onMoveRight,
  onMarkWon,
  onMarkLost,
  onClick,
  onDelete,
}: {
  deal: Deal;
  stages: string[];
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const stageIdx = stages.indexOf(deal.stage);
  const canMoveLeft = stageIdx > 0 && deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost';
  const canMoveRight = stageIdx < stages.length - 1 && deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost';
  const isNegotiation = deal.stage === 'Negotiation';
  const isClosed = deal.stage === 'Closed Won' || deal.stage === 'Closed Lost';
  const daysInStage = getDaysInStage(deal.stageUpdatedAt);

  return (
    <div
      className={cn(
        'group rounded-xl border bg-background/40 backdrop-blur-sm px-3 py-2.5 cursor-pointer transition-all hover:bg-background/60 hover:border-border/60 space-y-2',
        deal.stage === 'Closed Won' && 'border-green-500/30 bg-green-500/5',
        deal.stage === 'Closed Lost' && 'border-red-500/20 bg-red-500/5 opacity-70',
        deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost' && 'border-border/40',
      )}
      onClick={onClick}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-semibold leading-snug line-clamp-2 flex-1">{deal.title}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete deal?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{deal.title}&quot;. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Contact + value */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{deal.contactName}</span>
        <span className="font-semibold text-foreground shrink-0 ml-2">{formatCurrency(deal.value)}</span>
      </div>

      {/* Assignee + probability */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{deal.assigneeDisplay || deal.assignee}</span>
        <span className="font-medium">{deal.probability}% prob.</span>
      </div>

      {/* Days in stage */}
      <div className="text-[10px] text-muted-foreground">
        {daysInStage} day{daysInStage !== 1 ? 's' : ''} in stage
      </div>

      {/* Won/Lost actions for Negotiation */}
      {isNegotiation && (
        <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[10px] border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/60"
            onClick={onMarkWon}
          >
            <Trophy className="h-3 w-3 mr-1" />Won
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[10px] border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/60"
            onClick={onMarkLost}
          >
            <XCircle className="h-3 w-3 mr-1" />Lost
          </Button>
        </div>
      )}

      {/* Move buttons (not for closed) */}
      {!isClosed && (
        <div className="flex gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 flex-1 text-[10px] border-border/40 disabled:opacity-30"
            disabled={!canMoveLeft}
            onClick={onMoveLeft}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 flex-1 text-[10px] border-border/40 disabled:opacity-30"
            disabled={!canMoveRight}
            onClick={onMoveRight}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Deal Panel
// ─────────────────────────────────────────────────────────────────────────────

type AddDealForm = {
  title: string;
  contactName: string;
  contactPhone: string;
  value: string;
  assignee: string;
  probability: string;
  notes: string;
  stage: string;
};

const EMPTY_FORM: AddDealForm = {
  title: '',
  contactName: '',
  contactPhone: '',
  value: '',
  assignee: '',
  probability: '50',
  notes: '',
  stage: 'Prospect',
};

function AddDealPanel({
  stages,
  activeUser,
  onSave,
  onClose,
}: {
  stages: string[];
  activeUser: AccessKey | null;
  onSave: (data: AddDealForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AddDealForm>({
    ...EMPTY_FORM,
    stage: stages[0] ?? 'Prospect',
    assignee: activeUser?.username ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AddDealForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.contactName.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setForm({ ...EMPTY_FORM, stage: stages[0] ?? 'Prospect', assignee: activeUser?.username ?? '' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <PlusCircle className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Add New Deal</p>
        <button className="ml-auto p-1 rounded hover:bg-background/40" onClick={onClose}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal Title *</Label>
            <Input value={form.title} onChange={set('title')} placeholder="e.g. Acme Corp Website" className="h-8 text-sm border-border/60 bg-background/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Name *</Label>
            <Input value={form.contactName} onChange={set('contactName')} placeholder="John Smith" className="h-8 text-sm border-border/60 bg-background/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
            <Input value={form.contactPhone} onChange={set('contactPhone')} placeholder="(555) 000-0000" type="tel" className="h-8 text-sm border-border/60 bg-background/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal Value ($)</Label>
            <Input value={form.value} onChange={set('value')} placeholder="0" type="number" min="0" className="h-8 text-sm border-border/60 bg-background/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</Label>
            <Input value={form.assignee} onChange={set('assignee')} placeholder="Username" className="h-8 text-sm border-border/60 bg-background/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Probability (%)</Label>
            <Input value={form.probability} onChange={set('probability')} placeholder="50" type="number" min="0" max="100" className="h-8 text-sm border-border/60 bg-background/50" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stage</Label>
            <Select value={form.stage} onValueChange={(val) => setForm((prev) => ({ ...prev, stage: val }))}>
              <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={set('notes')} placeholder="Any deal notes..." rows={3} className="resize-none text-sm border-border/60 bg-background/50" />
          </div>
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t border-border/30 space-y-2">
        <Button
          className="w-full btn-gradient"
          disabled={saving || !form.title.trim() || !form.contactName.trim()}
          onClick={handleSubmit}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Add Deal
        </Button>
        <Button variant="ghost" size="sm" className="w-full border border-border/40 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

function DealDetailPanel({
  deal,
  stages,
  onClose,
  onUpdate,
  onDelete,
}: {
  deal: Deal;
  stages: string[];
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Deal>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: deal.title,
    contactName: deal.contactName,
    contactPhone: deal.contactPhone ?? '',
    value: String(deal.value),
    assignee: deal.assignee,
    assigneeDisplay: deal.assigneeDisplay,
    probability: String(deal.probability),
    notes: deal.notes ?? '',
    stage: deal.stage,
  });
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(deal.id, {
      title: form.title,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      value: Number(form.value) || 0,
      assignee: form.assignee,
      assigneeDisplay: form.assigneeDisplay,
      probability: Number(form.probability) || 0,
      notes: form.notes,
      stage: form.stage,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const combined = deal.notes ? `${deal.notes}\n\n---\n${newNote.trim()}` : newNote.trim();
    await onUpdate(deal.id, { notes: combined });
    setForm((prev) => ({ ...prev, notes: combined }));
    setNewNote('');
  };

  const daysInStage = getDaysInStage(deal.stageUpdatedAt);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <button className="p-1 rounded hover:bg-background/40" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <p className="text-sm font-semibold flex-1 truncate">{deal.title}</p>
        <button
          className="p-1 rounded hover:bg-background/40"
          onClick={() => setEditing((e) => !e)}
          title="Edit deal"
        >
          <Edit className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">
          {/* Stage badge */}
          <div>
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', stageBadgeClass(deal.stage))}>
              {deal.stage}
            </span>
            <span className="ml-2 text-[10px] text-muted-foreground">{daysInStage} day{daysInStage !== 1 ? 's' : ''} in this stage</span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</Label>
                <Input value={form.title} onChange={set('title')} className="h-8 text-sm border-border/60 bg-background/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Name</Label>
                <Input value={form.contactName} onChange={set('contactName')} className="h-8 text-sm border-border/60 bg-background/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                <Input value={form.contactPhone} onChange={set('contactPhone')} type="tel" className="h-8 text-sm border-border/60 bg-background/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Value ($)</Label>
                <Input value={form.value} onChange={set('value')} type="number" className="h-8 text-sm border-border/60 bg-background/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</Label>
                <Input value={form.assignee} onChange={set('assignee')} className="h-8 text-sm border-border/60 bg-background/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Probability (%)</Label>
                <Input value={form.probability} onChange={set('probability')} type="number" min="0" max="100" className="h-8 text-sm border-border/60 bg-background/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stage</Label>
                <Select value={form.stage} onValueChange={(val) => setForm((prev) => ({ ...prev, stage: val }))}>
                  <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={set('notes')} rows={4} className="resize-none text-sm border-border/60 bg-background/50" />
              </div>
              <Button className="w-full btn-gradient" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
              <Button variant="ghost" size="sm" className="w-full border border-border/40 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <InfoRow label="Contact" value={deal.contactName} />
              {deal.contactPhone && <InfoRow label="Phone" value={deal.contactPhone} />}
              <InfoRow label="Value" value={formatCurrency(deal.value)} />
              <InfoRow label="Assignee" value={deal.assigneeDisplay || deal.assignee} />
              <InfoRow label="Probability" value={`${deal.probability}%`} />
              {deal.wonAt && <InfoRow label="Won On" value={deal.wonAt?.toDate ? deal.wonAt.toDate().toLocaleDateString() : '—'} />}
              {deal.lostAt && <InfoRow label="Lost On" value={deal.lostAt?.toDate ? deal.lostAt.toDate().toLocaleDateString() : '—'} />}
              {deal.lostReason && <InfoRow label="Lost Reason" value={deal.lostReason} />}
            </div>
          )}

          {/* Notes / Activity section */}
          {!editing && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />Activity Notes
              </p>
              {deal.notes ? (
                <div className="rounded-xl border border-border/30 bg-background/30 px-3 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap">
                  {deal.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60">No notes yet.</p>
              )}
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="h-8 text-xs border-border/60 bg-background/50 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                />
                <Button size="sm" className="h-8 btn-gradient shrink-0" onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Delete */}
          {!editing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 text-xs">
                  <Trash2 className="h-3 w-3 mr-1" />Delete Deal
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete deal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{deal.title}&quot;. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => { onDelete(deal.id); onClose(); }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm flex-1">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manager Settings Panel
// ─────────────────────────────────────────────────────────────────────────────

function SettingsPanel({
  stages,
  onSave,
  onClose,
}: {
  stages: string[];
  onSave: (stages: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [localStages, setLocalStages] = useState<string[]>(stages);
  const [newStage, setNewStage] = useState('');
  const [saving, setSaving] = useState(false);

  const addStage = () => {
    if (!newStage.trim()) return;
    setLocalStages((prev) => [...prev, newStage.trim()]);
    setNewStage('');
  };

  const removeStage = (idx: number) => {
    setLocalStages((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...localStages];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setLocalStages(next);
  };

  const moveDown = (idx: number) => {
    if (idx === localStages.length - 1) return;
    const next = [...localStages];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setLocalStages(next);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(localStages);
    setSaving(false);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Stage Settings</p>
        <button className="ml-auto p-1 rounded hover:bg-background/40" onClick={onClose}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">Reorder or rename your pipeline stages. Changes will apply to all existing deals.</p>
          {localStages.map((stage, idx) => (
            <div key={`${stage}-${idx}`} className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-background/30 px-3 py-2">
              <span className="flex-1 text-sm">{stage}</span>
              <button className="p-0.5 rounded hover:bg-background/50 disabled:opacity-30" disabled={idx === 0} onClick={() => moveUp(idx)}>
                <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
              </button>
              <button className="p-0.5 rounded hover:bg-background/50 disabled:opacity-30" disabled={idx === localStages.length - 1} onClick={() => moveDown(idx)}>
                <ChevronRight className="h-3.5 w-3.5 rotate-90" />
              </button>
              <button className="p-0.5 rounded hover:text-destructive" onClick={() => removeStage(idx)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              placeholder="New stage name..."
              className="h-8 text-sm border-border/60 bg-background/50 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addStage()}
            />
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={addStage} disabled={!newStage.trim()}>
              <PlusCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t border-border/30 space-y-2">
        <Button className="w-full btn-gradient" disabled={saving || localStages.length === 0} onClick={handleSave}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Save Stages
        </Button>
        <Button variant="ghost" size="sm" className="w-full border border-border/40 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dialog
// ─────────────────────────────────────────────────────────────────────────────

type DealTrackerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

export function DealTrackerDialog({ open, onOpenChange, client, activeUser }: DealTrackerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const isManager = activeUser?.role === 'admin';

  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showClosed, setShowClosed] = useState(true);

  // ── Firestore refs ──────────────────────────────────────────────────────────

  const dealsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'deals');
  }, [firestore, client.path]);

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return doc(firestore, client.path, 'dealSettings', 'config');
  }, [firestore, client.path]);

  // ── Data subscriptions ──────────────────────────────────────────────────────

  const { data: deals, isLoading: dealsLoading } = useCollection<Deal>(dealsCollectionRef);
  const { data: settingsData } = useDoc<DealSettings>(settingsDocRef);

  const stages: string[] = useMemo(
    () => (settingsData?.stages?.length ? settingsData.stages : DEFAULT_STAGES),
    [settingsData]
  );

  // ── Derived lists ───────────────────────────────────────────────────────────

  const allAssignees = useMemo(() => {
    if (!deals) return [];
    const set = new Set(deals.map((d) => d.assignee).filter(Boolean));
    return Array.from(set);
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((d) => {
      if (!showClosed && (d.stage === 'Closed Won' || d.stage === 'Closed Lost')) return false;
      if (filterAssignee !== 'all' && d.assignee !== filterAssignee) return false;
      if (filterStage !== 'all' && d.stage !== filterStage) return false;
      return true;
    });
  }, [deals, showClosed, filterAssignee, filterStage]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of stages) map[s] = [];
    for (const d of filteredDeals) {
      if (map[d.stage]) map[d.stage].push(d);
      else map[d.stage] = [d];
    }
    return map;
  }, [filteredDeals, stages]);

  // ── Summary stats ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!deals) return { pipeline: 0, totalDeals: 0, winRate: 0, stageCounts: {} as Record<string, number> };
    const open = deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    const won = deals.filter((d) => d.stage === 'Closed Won');
    const closed = deals.filter((d) => d.stage === 'Closed Won' || d.stage === 'Closed Lost');
    const pipeline = open.reduce((acc, d) => acc + (d.value || 0), 0);
    const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
    const stageCounts: Record<string, number> = {};
    for (const s of stages) stageCounts[s] = deals.filter((d) => d.stage === s).length;
    return { pipeline, totalDeals: deals.length, winRate, stageCounts };
  }, [deals, stages]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddDeal = useCallback(async (formData: AddDealForm) => {
    if (!dealsCollectionRef) return;
    const now = serverTimestamp();
    await addDoc(dealsCollectionRef, {
      title: formData.title,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      value: Number(formData.value) || 0,
      stage: formData.stage,
      probability: Number(formData.probability) || 0,
      assignee: formData.assignee,
      assigneeDisplay: formData.assignee,
      notes: formData.notes,
      createdAt: now,
      createdBy: activeUser?.username ?? 'unknown',
      stageUpdatedAt: now,
    });
    toast({ title: 'Deal Added', description: `"${formData.title}" added to ${formData.stage}.` });
    setRightPanel('none');
  }, [dealsCollectionRef, activeUser, toast]);

  const handleUpdateDeal = useCallback(async (id: string, data: Partial<Deal>) => {
    if (!client.path || !firestore) return;
    const ref = doc(firestore, client.path, 'deals', id);
    const updateData: any = { ...data };
    if (data.stage) updateData.stageUpdatedAt = serverTimestamp();
    await updateDoc(ref, updateData);
    toast({ title: 'Deal Updated' });
  }, [client.path, firestore, toast]);

  const handleMoveDeal = useCallback(async (deal: Deal, direction: 'left' | 'right') => {
    const idx = stages.indexOf(deal.stage);
    const newIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= stages.length) return;
    await handleUpdateDeal(deal.id, { stage: stages[newIdx] } as any);
  }, [stages, handleUpdateDeal]);

  const handleMarkWon = useCallback(async (deal: Deal) => {
    await handleUpdateDeal(deal.id, { stage: 'Closed Won', wonAt: serverTimestamp() } as any);
    toast({ title: 'Deal Won!', description: `"${deal.title}" moved to Closed Won.` });
  }, [handleUpdateDeal, toast]);

  const handleMarkLost = useCallback(async (deal: Deal) => {
    await handleUpdateDeal(deal.id, { stage: 'Closed Lost', lostAt: serverTimestamp() } as any);
    toast({ title: 'Deal Lost', description: `"${deal.title}" moved to Closed Lost.`, variant: 'destructive' });
  }, [handleUpdateDeal, toast]);

  const handleDeleteDeal = useCallback(async (id: string) => {
    if (!client.path || !firestore) return;
    const ref = doc(firestore, client.path, 'deals', id);
    await deleteDoc(ref);
    toast({ title: 'Deal Deleted', variant: 'destructive' });
    if (selectedDeal?.id === id) {
      setSelectedDeal(null);
      setRightPanel('none');
    }
  }, [client.path, firestore, toast, selectedDeal]);

  const handleSaveStages = useCallback(async (newStages: string[]) => {
    if (!client.path || !firestore) return;
    const ref = doc(firestore, client.path, 'dealSettings', 'config');
    await updateDoc(ref, { stages: newStages }).catch(async () => {
      // doc may not exist yet
      const { setDoc } = await import('firebase/firestore');
      await setDoc(ref, { stages: newStages });
    });
    toast({ title: 'Stages Saved' });
  }, [client.path, firestore, toast]);

  const handleCardClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setRightPanel('detail');
  };

  const openAdd = () => {
    setSelectedDeal(null);
    setRightPanel('add');
  };

  const openSettings = () => {
    setSelectedDeal(null);
    setRightPanel('settings');
  };

  const closePanel = () => {
    setRightPanel('none');
    setSelectedDeal(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-full h-[92vh] flex flex-col p-0 overflow-hidden glass-card-strong border-border/50">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="font-headline text-lg">Deal Tracker</DialogTitle>
                <DialogDescription className="text-xs">{client.firmName} pipeline</DialogDescription>
              </div>
            </div>

            {/* Stats pills */}
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              <StatPill icon={<DollarSign className="h-3 w-3" />} label="Pipeline" value={formatCurrency(stats.pipeline)} color="text-primary" />
              <StatPill icon={<TrendingUp className="h-3 w-3" />} label="Total Deals" value={String(stats.totalDeals)} color="text-foreground" />
              <StatPill icon={<Trophy className="h-3 w-3" />} label="Win Rate" value={`${stats.winRate}%`} color="text-green-400" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-border/50"
                  onClick={openSettings}
                >
                  <Settings className="h-3.5 w-3.5" />Stages
                </Button>
              )}
              <Button size="sm" className="h-8 gap-1.5 text-xs btn-gradient" onClick={openAdd}>
                <PlusCircle className="h-3.5 w-3.5" />Add Deal
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="h-7 text-xs w-36 border-border/50 bg-background/30">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {allAssignees.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="h-7 text-xs w-36 border-border/50 bg-background/30">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all',
                showClosed
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border/40 bg-background/30 text-muted-foreground'
              )}
              onClick={() => setShowClosed((v) => !v)}
            >
              {showClosed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              Show Closed
            </button>

            {/* Stage count pills (mobile fallback) */}
            <div className="md:hidden flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] text-muted-foreground">{formatCurrency(stats.pipeline)} pipeline · {stats.winRate}% win rate</span>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Kanban board */}
          <div className="flex-1 min-w-0 overflow-x-auto">
            {dealsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex h-full gap-0 min-w-max">
                {stages.map((stage) => {
                  const stageDeals = dealsByStage[stage] ?? [];
                  const isWon = stage === 'Closed Won';
                  const isLost = stage === 'Closed Lost';

                  return (
                    <div
                      key={stage}
                      className={cn(
                        'flex flex-col w-64 shrink-0 border-r border-border/20 last:border-r-0',
                        isWon && 'bg-green-500/3',
                        isLost && 'bg-red-500/3',
                      )}
                    >
                      {/* Column header */}
                      <div className={cn(
                        'px-3 py-2.5 border-b border-border/20 shrink-0',
                        isWon && 'border-green-500/20',
                        isLost && 'border-red-500/20',
                      )}>
                        <div className="flex items-center justify-between">
                          <span className={cn('text-xs font-bold', isWon && 'text-green-400', isLost && 'text-red-400/70')}>{stage}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {stageDeals.length}
                          </Badge>
                        </div>
                        {stageDeals.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatCurrency(stageDeals.reduce((acc, d) => acc + (d.value || 0), 0))}
                          </p>
                        )}
                      </div>

                      {/* Cards */}
                      <ScrollArea className="flex-1">
                        <div className="p-2 space-y-2">
                          {stageDeals.length === 0 ? (
                            <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-border/30">
                              <p className="text-[10px] text-muted-foreground/50">No deals</p>
                            </div>
                          ) : (
                            stageDeals.map((deal) => (
                              <DealCard
                                key={deal.id}
                                deal={deal}
                                stages={stages}
                                onMoveLeft={() => handleMoveDeal(deal, 'left')}
                                onMoveRight={() => handleMoveDeal(deal, 'right')}
                                onMarkWon={() => handleMarkWon(deal)}
                                onMarkLost={() => handleMarkLost(deal)}
                                onClick={() => handleCardClick(deal)}
                                onDelete={() => handleDeleteDeal(deal.id)}
                              />
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          {rightPanel !== 'none' && (
            <div className="w-72 shrink-0 border-l border-border/30 bg-background/50 backdrop-blur-sm flex flex-col">
              {rightPanel === 'add' && (
                <AddDealPanel
                  stages={stages}
                  activeUser={activeUser}
                  onSave={handleAddDeal}
                  onClose={closePanel}
                />
              )}
              {rightPanel === 'detail' && selectedDeal && (
                <DealDetailPanel
                  deal={selectedDeal}
                  stages={stages}
                  onClose={closePanel}
                  onUpdate={handleUpdateDeal}
                  onDelete={handleDeleteDeal}
                />
              )}
              {rightPanel === 'settings' && isManager && (
                <SettingsPanel
                  stages={stages}
                  onSave={handleSaveStages}
                  onClose={closePanel}
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
// Stat pill helper
// ─────────────────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <span className={cn('flex items-center gap-1.5 rounded-full border border-border/40 bg-background/30 px-2.5 py-1 text-[10px] font-bold', color)}>
      {icon}
      <span className="text-muted-foreground font-normal">{label}:</span>
      {value}
    </span>
  );
}
