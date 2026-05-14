'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import {
  ChefHat,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  CircleDot,
  Pencil,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'pending' | 'in-progress' | 'done';

type ChecklistItem = {
  text: string;
  done: boolean;
};

type KitchenTicket = {
  id: string;
  path: string;
  orderItem: string;
  ingredients: string[];
  checklist: ChecklistItem[];
  status: TicketStatus;
  createdBy: string;
  createdAt: any;
  ticketNumber: number;
};

type NewTicketForm = {
  orderItem: string;
  ingredientInput: string;
  ingredients: string[];
  stepInput: string;
  steps: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: NewTicketForm = {
  orderItem: '',
  ingredientInput: '',
  ingredients: [],
  stepInput: '',
  steps: [],
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  done: 'Done',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: 'border-yellow-500/60 bg-yellow-500/5',
  'in-progress': 'border-blue-500/60 bg-blue-500/5',
  done: 'border-green-500/60 bg-green-500/5',
};

const STATUS_BADGE: Record<TicketStatus, string> = {
  pending: 'text-yellow-400',
  'in-progress': 'text-blue-400',
  done: 'text-green-400',
};

const STATUS_ICON = {
  pending: CircleDot,
  'in-progress': Clock,
  done: CheckCircle2,
};

// ─── Props ────────────────────────────────────────────────────────────────────

type KitchenTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function KitchenTicketDialog({
  open,
  onOpenChange,
  client,
  activeUser,
}: KitchenTicketDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [form, setForm] = useState<NewTicketForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ticketsRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'kitchenTickets');
  }, [firestore, client.path]);

  const { data: rawTickets, isLoading } = useCollection<Omit<KitchenTicket, 'id' | 'path'>>(ticketsRef);

  const tickets: KitchenTicket[] = useMemo(() => {
    if (!rawTickets) return [];
    return (rawTickets as KitchenTicket[]).sort((a, b) => b.ticketNumber - a.ticketNumber);
  }, [rawTickets]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const nextTicketNumber = useMemo(() => {
    if (!tickets.length) return 1;
    return Math.max(...tickets.map((t) => t.ticketNumber ?? 0)) + 1;
  }, [tickets]);

  const isAdmin = activeUser?.role === 'admin';

  // ── Add ingredient chip ───────────────────────────────────────────────────

  function handleAddIngredient() {
    const val = form.ingredientInput.trim();
    if (!val || form.ingredients.includes(val)) return;
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, val], ingredientInput: '' }));
  }

  function handleRemoveIngredient(ing: string) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((i) => i !== ing) }));
  }

  // ── Add step chip ──────────────────────────────────────────────────────────

  function handleAddStep() {
    const val = form.stepInput.trim();
    if (!val) return;
    setForm((f) => ({ ...f, steps: [...f.steps, val], stepInput: '' }));
  }

  function handleRemoveStep(index: number) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  }

  // ── Save ticket ────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!ticketsRef) return;
    if (!form.orderItem.trim()) {
      toast({ title: 'Order item required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(ticketsRef, {
        orderItem: form.orderItem.trim(),
        ingredients: form.ingredients,
        checklist: form.steps.map((s) => ({ text: s, done: false })),
        status: 'pending' as TicketStatus,
        createdBy: activeUser?.username ?? 'unknown',
        createdAt: serverTimestamp(),
        ticketNumber: nextTicketNumber,
      });
      toast({ title: `Ticket #${nextTicketNumber} created`, description: form.orderItem.trim() });
      setForm(EMPTY_FORM);
      setShowAddPanel(false);
    } catch {
      toast({ title: 'Error creating ticket', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Toggle checklist item ─────────────────────────────────────────────────

  async function handleCheckItem(ticket: KitchenTicket, index: number, done: boolean) {
    if (!ticketsRef) return;
    const updated = ticket.checklist.map((item, i) =>
      i === index ? { ...item, done } : item
    );
    const allDone = updated.every((item) => item.done);
    const anyDone = updated.some((item) => item.done);
    const newStatus: TicketStatus = allDone ? 'done' : anyDone ? 'in-progress' : 'pending';
    try {
      await updateDoc(doc(ticketsRef, ticket.id), {
        checklist: updated,
        status: newStatus,
      });
    } catch {
      toast({ title: 'Error updating checklist', variant: 'destructive' });
    }
  }

  // ── Update status manually ─────────────────────────────────────────────────

  async function handleStatusChange(ticket: KitchenTicket, status: TicketStatus) {
    if (!ticketsRef) return;
    try {
      await updateDoc(doc(ticketsRef, ticket.id), { status });
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  }

  // ── Delete ticket ─────────────────────────────────────────────────────────

  async function handleDelete(ticket: KitchenTicket) {
    if (!ticketsRef) return;
    const canDelete = isAdmin || ticket.createdBy === activeUser?.username;
    if (!canDelete) {
      toast({ title: 'Permission denied', variant: 'destructive' });
      return;
    }
    try {
      await deleteDoc(doc(ticketsRef, ticket.id));
      toast({ title: `Ticket #${ticket.ticketNumber} removed`, variant: 'destructive' });
      if (expandedId === ticket.id) setExpandedId(null);
    } catch {
      toast({ title: 'Error deleting ticket', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                Kitchen Ticket System
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {client.firmName} — food orders with ingredients &amp; prep checklists
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Status filter */}
              <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs">
                {(['all', 'pending', 'in-progress', 'done'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s === 'all' ? 'All' : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                className="btn-gradient h-8 gap-1"
                onClick={() => setShowAddPanel(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Ticket
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Ticket board */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading tickets…</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ChefHat className="h-14 w-14 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No tickets yet</p>
                <p className="text-xs mt-1">Create a new ticket to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((ticket) => {
                  const isExpanded = expandedId === ticket.id;
                  const doneCount = ticket.checklist.filter((c) => c.done).length;
                  const totalSteps = ticket.checklist.length;
                  const StatusIcon = STATUS_ICON[ticket.status];

                  return (
                    <div
                      key={ticket.id}
                      className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${STATUS_COLORS[ticket.status]}`}
                    >
                      {/* Ticket header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground shrink-0">
                            #{ticket.ticketNumber}
                          </span>
                          <p className="font-semibold text-sm truncate">{ticket.orderItem}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {(isAdmin || ticket.createdBy === activeUser?.username) && (
                            <button
                              onClick={() => handleDelete(ticket)}
                              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-3.5 w-3.5 ${STATUS_BADGE[ticket.status]}`} />
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[ticket.status]}`}
                        >
                          {STATUS_LABELS[ticket.status]}
                        </Badge>
                        {totalSteps > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {doneCount}/{totalSteps} steps
                          </span>
                        )}
                      </div>

                      {/* Ingredients */}
                      {ticket.ingredients.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
                            Ingredients
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {ticket.ingredients.map((ing) => (
                              <span
                                key={ing}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-border/30 text-foreground/80"
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Checklist */}
                      {ticket.checklist.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
                            Prep Steps
                          </p>
                          <div className="space-y-1.5">
                            {ticket.checklist.map((item, i) => (
                              <label
                                key={i}
                                className="flex items-start gap-2 cursor-pointer group"
                              >
                                <Checkbox
                                  checked={item.done}
                                  onCheckedChange={(v) => handleCheckItem(ticket, i, !!v)}
                                  className="mt-0.5 shrink-0"
                                />
                                <span
                                  className={`text-xs leading-snug transition-colors ${
                                    item.done
                                      ? 'line-through text-muted-foreground'
                                      : 'text-foreground'
                                  }`}
                                >
                                  {item.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual status override (expanded) */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
                            Set Status
                          </p>
                          <div className="flex gap-1.5">
                            {(['pending', 'in-progress', 'done'] as TicketStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(ticket, s)}
                                className={`flex-1 text-[10px] py-1 rounded border transition-colors capitalize ${
                                  ticket.status === s
                                    ? 'bg-primary/20 border-primary/60 text-primary'
                                    : 'border-border/50 text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <p className="text-[10px] text-muted-foreground mt-auto">
                        by {ticket.createdBy}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Add ticket panel */}
          {showAddPanel && (
            <div className="w-72 border-l border-border/40 flex flex-col shrink-0">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-sm">New Ticket</h3>
                <button
                  onClick={() => { setShowAddPanel(false); setForm(EMPTY_FORM); }}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Order item */}
                  <div className="space-y-1">
                    <Label className="text-xs">Food Item *</Label>
                    <Input
                      className="h-8 text-sm bg-background/30 border-border/50"
                      placeholder="e.g. Cheeseburger"
                      value={form.orderItem}
                      onChange={(e) => setForm((f) => ({ ...f, orderItem: e.target.value }))}
                    />
                  </div>

                  {/* Ingredients */}
                  <div className="space-y-1">
                    <Label className="text-xs">Ingredients</Label>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-8 text-sm bg-background/30 border-border/50 flex-1"
                        placeholder="Add ingredient…"
                        value={form.ingredientInput}
                        onChange={(e) => setForm((f) => ({ ...f, ingredientInput: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIngredient(); } }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={handleAddIngredient}
                        disabled={!form.ingredientInput.trim()}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {form.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {form.ingredients.map((ing) => (
                          <span
                            key={ing}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-border/30"
                          >
                            {ing}
                            <button onClick={() => handleRemoveIngredient(ing)}>
                              <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prep steps */}
                  <div className="space-y-1">
                    <Label className="text-xs">Prep Steps / Checklist</Label>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-8 text-sm bg-background/30 border-border/50 flex-1"
                        placeholder="Add step…"
                        value={form.stepInput}
                        onChange={(e) => setForm((f) => ({ ...f, stepInput: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); } }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={handleAddStep}
                        disabled={!form.stepInput.trim()}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {form.steps.length > 0 && (
                      <ol className="space-y-1 mt-1.5">
                        {form.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs">
                            <span className="text-muted-foreground shrink-0 font-mono">{i + 1}.</span>
                            <span className="flex-1">{step}</span>
                            <button onClick={() => handleRemoveStep(i)}>
                              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <Button
                    className="btn-gradient w-full h-9"
                    onClick={handleSave}
                    disabled={isSaving || !form.orderItem.trim()}
                  >
                    {isSaving ? 'Saving…' : 'Create Ticket'}
                  </Button>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border/40 shrink-0">
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{tickets.filter((t) => t.status === 'pending').length} pending</span>
              <span>{tickets.filter((t) => t.status === 'in-progress').length} in progress</span>
              <span>{tickets.filter((t) => t.status === 'done').length} done</span>
            </div>
            <div className="ml-auto">
              <DialogClose asChild>
                <Button variant="outline" size="sm">Close</Button>
              </DialogClose>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
