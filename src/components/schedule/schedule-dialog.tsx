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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CalendarDays,
  List,
  X,
  Clock,
  Flag,
  AlarmClock,
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
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isPast,
  differenceInDays,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

type EventType = 'Meeting' | 'Deadline' | 'Milestone' | 'Reminder' | 'Other';
type FilterMode = 'all' | 'mine' | 'Meeting' | 'Deadline' | 'Milestone' | 'Reminder' | 'Other';

type ScheduleEvent = {
  id: string;
  path: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  time?: string;
  type: EventType;
  color: string;
  description?: string;
  assignedTo: string; // 'all' or username
  createdBy: string;
  createdAt: any;
  allDay: boolean;
};

type NewEventForm = {
  title: string;
  date: string;
  time: string;
  type: EventType;
  color: string;
  description: string;
  assignedTo: string;
  allDay: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  Meeting: 'bg-blue-500',
  Deadline: 'bg-red-500',
  Milestone: 'bg-purple-500',
  Reminder: 'bg-yellow-500',
  Other: 'bg-muted-foreground',
};

const EVENT_TYPE_TEXT_COLORS: Record<EventType, string> = {
  Meeting: 'text-blue-400',
  Deadline: 'text-red-400',
  Milestone: 'text-purple-400',
  Reminder: 'text-yellow-400',
  Other: 'text-muted-foreground',
};

const PRESET_COLORS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Yellow', value: '#eab308' },
];

const EVENT_TYPES: EventType[] = ['Meeting', 'Deadline', 'Milestone', 'Reminder', 'Other'];

const EMPTY_FORM: NewEventForm = {
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  time: '',
  type: 'Meeting',
  color: PRESET_COLORS[0].value,
  description: '',
  assignedTo: 'all',
  allDay: true,
};

// ─── Urgency helpers ──────────────────────────────────────────────────────────

function getUrgencyClass(eventDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInDays(eventDate, today);
  if (diff <= 0) return 'border-red-500/60 text-red-400';
  if (diff <= 3) return 'border-orange-500/60 text-orange-400';
  if (diff <= 7) return 'border-yellow-500/60 text-yellow-400';
  return 'border-green-500/60 text-green-400';
}

function getUrgencyDot(eventDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInDays(eventDate, today);
  if (diff <= 0) return 'bg-red-500';
  if (diff <= 3) return 'bg-orange-500';
  if (diff <= 7) return 'bg-yellow-500';
  return 'bg-green-500';
}

function countdownLabel(eventDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInDays(eventDate, today);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff}d`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type ScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduleDialog({ open, onOpenChange, client, activeUser }: ScheduleDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  // View state
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [form, setForm] = useState<NewEventForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Firestore
  const eventsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'scheduleEvents');
  }, [firestore, client.path]);

  const { data: rawEvents, isLoading } = useCollection<Omit<ScheduleEvent, 'id' | 'path'>>(eventsCollectionRef);

  const events: ScheduleEvent[] = useMemo(() => {
    if (!rawEvents) return [];
    return rawEvents as ScheduleEvent[];
  }, [rawEvents]);

  // ── Filtered events ────────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterMode === 'all') return true;
      if (filterMode === 'mine') return ev.assignedTo === 'all' || ev.assignedTo === activeUser?.username;
      return ev.type === filterMode;
    });
  }, [events, filterMode, activeUser]);

  // ── Calendar helpers ────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  function eventsForDay(day: Date) {
    return filteredEvents.filter((ev) => isSameDay(new Date(ev.date + 'T00:00:00'), day));
  }

  // ── Upcoming deadlines sidebar (next 5) ───────────────────────────────────

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...filteredEvents]
      .map((ev) => ({ ...ev, dateObj: new Date(ev.date + 'T00:00:00') }))
      .filter((ev) => ev.dateObj >= today || isSameDay(ev.dateObj, today))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 5);
  }, [filteredEvents]);

  // ── Agenda ─────────────────────────────────────────────────────────────────

  const agendaEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...filteredEvents]
      .map((ev) => ({ ...ev, dateObj: new Date(ev.date + 'T00:00:00') }))
      .filter((ev) => !isPast(ev.dateObj) || isSameDay(ev.dateObj, today))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [filteredEvents]);

  // ── Day events panel ────────────────────────────────────────────────────────

  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return filteredEvents.filter((ev) => isSameDay(new Date(ev.date + 'T00:00:00'), selectedDay));
  }, [selectedDay, filteredEvents]);

  // ── Add event ────────────────────────────────────────────────────────────────

  async function handleAddEvent() {
    if (!eventsCollectionRef) return;
    if (!form.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(eventsCollectionRef, {
        title: form.title.trim(),
        date: form.date,
        time: form.allDay ? '' : form.time,
        type: form.type,
        color: form.color,
        description: form.description.trim(),
        assignedTo: form.assignedTo,
        createdBy: activeUser?.username ?? 'unknown',
        createdAt: serverTimestamp(),
        allDay: form.allDay,
      });
      toast({ title: 'Event added', description: `"${form.title}" scheduled for ${format(new Date(form.date + 'T00:00:00'), 'PPP')}.` });
      setForm({ ...EMPTY_FORM, date: form.date });
      setShowAddPanel(false);
    } catch {
      toast({ title: 'Error adding event', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete event ─────────────────────────────────────────────────────────────

  async function handleDeleteEvent(event: ScheduleEvent) {
    if (!eventsCollectionRef) return;
    const isAdmin = activeUser?.role === 'admin';
    const isOwner = event.createdBy === activeUser?.username;
    if (!isAdmin && !isOwner) {
      toast({ title: 'Permission denied', description: 'You can only delete your own events.', variant: 'destructive' });
      return;
    }
    try {
      await deleteDoc(doc(eventsCollectionRef, event.id));
      toast({ title: 'Event deleted', variant: 'destructive' });
    } catch {
      toast({ title: 'Error deleting event', variant: 'destructive' });
    }
  }

  // ── Open add panel pre-filled for a day ─────────────────────────────────────

  function openAddForDay(day: Date) {
    setForm({ ...EMPTY_FORM, date: format(day, 'yyyy-MM-dd') });
    setShowAddPanel(true);
  }

  const isAdmin = activeUser?.role === 'admin';
  const today = new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                Schedule &amp; Deadlines
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {client.firmName} — team calendar, deadlines &amp; milestones
              </DialogDescription>
            </div>

            {/* View toggle + filter */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border/50 overflow-hidden">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                    viewMode === 'calendar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('agenda')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                    viewMode === 'agenda' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Agenda
                </button>
              </div>

              <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-background/30 border-border/50">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="mine">Only Mine</SelectItem>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="btn-gradient h-8 gap-1"
                onClick={() => {
                  setForm({ ...EMPTY_FORM, date: format(selectedDay ?? new Date(), 'yyyy-MM-dd') });
                  setShowAddPanel(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Event
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {viewMode === 'calendar' ? (
              /* ── Calendar view ──────────────────────────────────────────── */
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Calendar grid */}
                <div className="flex-1 flex flex-col min-w-0 p-4 overflow-auto">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-lg font-semibold">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <button
                      onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1 flex-1">
                    {calendarDays.map((day) => {
                      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                      const isToday = isSameDay(day, today);
                      const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                      const dayEvs = eventsForDay(day);

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`
                            relative min-h-[70px] rounded-lg p-1.5 text-left transition-all text-sm
                            border
                            ${isCurrentMonth ? 'bg-white/5 hover:bg-white/10' : 'bg-transparent opacity-40'}
                            ${isToday ? 'border-primary/70 ring-1 ring-primary/30' : 'border-border/30'}
                            ${isSelected ? 'bg-primary/15 border-primary/60' : ''}
                          `}
                        >
                          <span
                            className={`
                              inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                              ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                            `}
                          >
                            {format(day, 'd')}
                          </span>
                          {/* Event dots */}
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {dayEvs.slice(0, 3).map((ev) => (
                              <span
                                key={ev.id}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: ev.color }}
                                title={ev.title}
                              />
                            ))}
                            {dayEvs.length > 3 && (
                              <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                                +{dayEvs.length - 3}
                              </span>
                            )}
                          </div>
                          {/* First event title preview */}
                          {dayEvs[0] && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
                              {dayEvs[0].title}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day detail panel */}
                {selectedDay && (
                  <div className="w-64 border-l border-border/40 flex flex-col shrink-0">
                    <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{format(selectedDay, 'EEEE')}</p>
                        <p className="text-xs text-muted-foreground">{format(selectedDay, 'MMMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openAddForDay(selectedDay)}
                          className="p-1 rounded hover:bg-white/10"
                          title="Add event for this day"
                        >
                          <Plus className="h-4 w-4 text-primary" />
                        </button>
                        <button
                          onClick={() => setSelectedDay(null)}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                      {isLoading ? (
                        <p className="text-xs text-muted-foreground">Loading…</p>
                      ) : dayEvents.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-xs text-muted-foreground">No events</p>
                          <button
                            onClick={() => openAddForDay(selectedDay)}
                            className="text-xs text-primary hover:underline mt-1"
                          >
                            + Add one
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dayEvents.map((ev) => (
                            <EventCard
                              key={ev.id}
                              event={ev}
                              activeUser={activeUser}
                              isAdmin={isAdmin}
                              onDelete={handleDeleteEvent}
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              /* ── Agenda view ────────────────────────────────────────────── */
              <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                  <p className="text-muted-foreground text-sm">Loading events…</p>
                ) : agendaEvents.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agendaEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-border/30 hover:bg-white/8 transition-colors"
                      >
                        {/* Color stripe */}
                        <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{ev.title}</span>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${EVENT_TYPE_TEXT_COLORS[ev.type]}`}>
                              {ev.type}
                            </Badge>
                            {ev.assignedTo !== 'all' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                @{ev.assignedTo}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {format(ev.dateObj, 'EEE, MMM d')}
                            </span>
                            {!ev.allDay && ev.time && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />{ev.time}
                              </span>
                            )}
                            <span className={`text-xs font-medium ${getUrgencyClass(ev.dateObj).split(' ')[1]}`}>
                              {countdownLabel(ev.dateObj)}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.description}</p>
                          )}
                        </div>
                        {(isAdmin || ev.createdBy === activeUser?.username) && (
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          {/* ── Sidebar: upcoming deadlines + add panel ──────────────────────── */}
          <div className="w-72 border-l border-border/40 flex flex-col shrink-0">
            {showAddPanel ? (
              /* Add Event Panel */
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
                  <h3 className="font-semibold text-sm">New Event</h3>
                  <button
                    onClick={() => setShowAddPanel(false)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <div className="space-y-1">
                      <Label className="text-xs">Title *</Label>
                      <Input
                        className="h-8 text-sm bg-background/30 border-border/50"
                        placeholder="Event title"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-sm bg-background/30 border-border/50"
                        value={form.date}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      />
                    </div>

                    {/* All day toggle */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">All Day</Label>
                      <Switch
                        checked={form.allDay}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, allDay: v }))}
                      />
                    </div>

                    {/* Time (if not all day) */}
                    {!form.allDay && (
                      <div className="space-y-1">
                        <Label className="text-xs">Time (optional)</Label>
                        <Input
                          type="time"
                          className="h-8 text-sm bg-background/30 border-border/50"
                          value={form.time}
                          onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                        />
                      </div>
                    )}

                    {/* Type */}
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as EventType }))}>
                        <SelectTrigger className="h-8 text-sm bg-background/30 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Color */}
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <div className="flex gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${
                              form.color === c.value ? 'border-white scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Assigned to */}
                    <div className="space-y-1">
                      <Label className="text-xs">Assigned To</Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setForm((f) => ({ ...f, assignedTo: 'all' }))}
                          className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                            form.assignedTo === 'all'
                              ? 'bg-primary/20 border-primary/60 text-primary'
                              : 'border-border/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          All Team
                        </button>
                        <button
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              assignedTo: activeUser?.username ?? f.assignedTo,
                            }))
                          }
                          className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                            form.assignedTo !== 'all'
                              ? 'bg-primary/20 border-primary/60 text-primary'
                              : 'border-border/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Only Me
                        </button>
                      </div>
                      {form.assignedTo !== 'all' && (
                        <Input
                          className="h-7 text-xs bg-background/30 border-border/50 mt-1"
                          placeholder="Username"
                          value={form.assignedTo}
                          onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                        />
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Textarea
                        className="text-sm bg-background/30 border-border/50 min-h-[60px] resize-none"
                        placeholder="Notes about this event…"
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    <Button
                      className="btn-gradient w-full h-9"
                      onClick={handleAddEvent}
                      disabled={isSaving || !form.title.trim()}
                    >
                      {isSaving ? 'Saving…' : 'Save Event'}
                    </Button>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              /* Deadline countdowns */
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 border-b border-border/40 shrink-0">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <AlarmClock className="h-4 w-4 text-primary" />
                    Upcoming
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Next 5 events</p>
                </div>
                <ScrollArea className="flex-1 p-3">
                  {isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  ) : upcomingDeadlines.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No upcoming events</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingDeadlines.map((ev) => (
                        <div
                          key={ev.id}
                          className={`p-2.5 rounded-lg bg-white/5 border ${getUrgencyClass(ev.dateObj)} transition-colors`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-1 w-2 h-2 rounded-full shrink-0 ${getUrgencyDot(ev.dateObj)}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{ev.title}</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  {format(ev.dateObj, 'MMM d')}
                                  {!ev.allDay && ev.time ? ` · ${ev.time}` : ''}
                                </span>
                                <span className={`text-[10px] font-semibold ${getUrgencyClass(ev.dateObj).split(' ')[1]}`}>
                                  {countdownLabel(ev.dateObj)}
                                </span>
                              </div>
                              <Badge
                                variant="secondary"
                                className={`text-[9px] px-1 py-0 mt-0.5 ${EVENT_TYPE_TEXT_COLORS[ev.type]}`}
                              >
                                {ev.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-border/40 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EventCard sub-component ──────────────────────────────────────────────────

function EventCard({
  event,
  activeUser,
  isAdmin,
  onDelete,
}: {
  event: ScheduleEvent;
  activeUser: AccessKey | null;
  isAdmin: boolean;
  onDelete: (event: ScheduleEvent) => void;
}) {
  const canDelete = isAdmin || event.createdBy === activeUser?.username;

  return (
    <div className="p-2.5 rounded-lg bg-white/5 border border-border/30 hover:bg-white/8 transition-colors group">
      <div className="flex items-start gap-2">
        <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: event.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate leading-snug">{event.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-[10px] ${EVENT_TYPE_TEXT_COLORS[event.type]}`}>{event.type}</span>
            {!event.allDay && event.time && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />{event.time}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
          )}
          {event.assignedTo !== 'all' && (
            <p className="text-[10px] text-muted-foreground mt-0.5">@{event.assignedTo}</p>
          )}
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(event)}
            className="p-0.5 opacity-0 group-hover:opacity-100 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all shrink-0"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
