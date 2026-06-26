'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, List, Calendar, MapPin, Clock, Loader2, Pencil, Trash2, Repeat2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFirestore,
  useMemoFirebase,
  useCollection,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, addWeeks } from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCATIONS = [
  { id: 'treehouse',     label: 'Treehouse',    emoji: '🌲' },
  { id: 'sukkah',        label: 'Sukkah',        emoji: '🕍' },
  { id: 'main_fire_pit', label: 'Main Fire Pit', emoji: '🔥' },
  { id: 'gazebo',        label: 'Gazebo',         emoji: '⛺' },
] as const;

const TIME_BLOCKS = [
  { id: 'ACT1',   label: 'ACT 1',           time: '10:00–10:50' },
  { id: 'ACT2',   label: 'ACT 2',           time: '11:00–11:50' },
  { id: 'ACT3HT', label: 'ACT 3HT',         time: '12:00–12:50' },
  { id: 'ACT3SK', label: 'ACT 3SK',         time: '2:00–2:50'   },
  { id: 'ACT4',   label: 'ACT 4',           time: '3:30–4:20'   },
  { id: 'ACT5',   label: 'ACT 5',           time: '4:30–5:20'   },
  { id: 'ACT6HT', label: 'ACT 6HT',         time: '5:30–6:20'   },
  { id: 'ACT6SK', label: 'ACT 6SK',         time: '6:30–7:20'   },
  { id: 'ACT7',   label: 'ACT 7',           time: '7:30–8:20'   },
  { id: 'ACT8',   label: 'ACT 8',            time: '8:30–9:20'   },
  { id: 'SIKUM',  label: 'Sikum',           time: '9:30–10:30'  },
] as const;

type Location   = typeof LOCATIONS[number];
type TimeBlock  = typeof TIME_BLOCKS[number];
type RepeatMode = 'none' | 'daily' | 'every-other' | 'weekly';

type EKCReservation = {
  name:           string;
  unit:           string;
  cabin:          string;
  location:       string;
  locationLabel:  string;
  timeBlock:      string;
  timeBlockLabel: string;
  date:           string;
  createdAt:      any;
};

type Booking = EKCReservation & { id: string; path: string };

type DialogState =
  | { mode: 'reserve'; location: Location; timeBlock: TimeBlock }
  | { mode: 'view';    location: Location; timeBlock: TimeBlock; booking: Booking }
  | { mode: 'edit';    location: Location; timeBlock: TimeBlock; booking: Booking }
  | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateDates(start: string, repeat: RepeatMode, count: number): string[] {
  if (repeat === 'none') return [start];
  const dates: string[] = [];
  let cur = new Date(`${start}T12:00:00`);
  for (let i = 0; i < count; i++) {
    dates.push(format(cur, 'yyyy-MM-dd'));
    if (repeat === 'daily')       cur = addDays(cur, 1);
    else if (repeat === 'every-other') cur = addDays(cur, 2);
    else if (repeat === 'weekly') cur = addWeeks(cur, 1);
  }
  return dates;
}

// ─── Sub-components (defined outside to avoid remount on parent re-render) ──

type SlotChipProps = {
  booking: Booking | undefined;
  onClick: () => void;
};

function SlotChip({ booking, onClick }: SlotChipProps) {
  if (booking) {
    return (
      <button onClick={onClick} className="text-left group min-w-0">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-opacity group-hover:opacity-75"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: '#f87171' }}
        >
          Booked
        </span>
        <p className="text-[10px] mt-0.5 truncate max-w-[110px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {booking.name}
        </p>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-transform hover:scale-105 active:scale-95"
      style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.30)', color: '#4ade80' }}
    >
      Reserve
    </button>
  );
}

type RepeatSectionProps = {
  mode: RepeatMode;
  count: number;
  onModeChange: (m: RepeatMode) => void;
  onCountChange: (n: number) => void;
};

function RepeatSection({ mode, count, onModeChange, onCountChange }: RepeatSectionProps) {
  const REPEAT_OPTIONS: { value: RepeatMode; label: string }[] = [
    { value: 'none',        label: 'No Repeat'       },
    { value: 'daily',       label: 'Daily'           },
    { value: 'every-other', label: 'Every Other Day' },
    { value: 'weekly',      label: 'Weekly'          },
  ];
  const spanLabel =
    mode === 'daily'       ? `${count} days`
    : mode === 'every-other' ? `${(count - 1) * 2 + 1} days`
    : mode === 'weekly'    ? `${count} weeks`
    : '';

  return (
    <div
      className="space-y-2.5 rounded-xl p-3"
      style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Repeat2 className="h-3.5 w-3.5" style={{ color: '#4ade80' }} />
        <span className="text-xs font-semibold" style={{ color: '#86efac' }}>Repeat</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {REPEAT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
            style={mode === value
              ? { background: 'rgba(74,222,128,0.20)', border: '1px solid rgba(74,222,128,0.40)', color: '#4ade80' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode !== 'none' && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>Occurrences</span>
          <input
            type="number"
            min={2}
            max={30}
            value={count}
            onChange={(e) => onCountChange(Math.min(30, Math.max(2, Number(e.target.value))))}
            className="w-14 h-7 px-2 rounded-md text-xs text-center outline-none"
            style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.22)', color: '#fff' }}
          />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>→ {spanLabel}</span>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EKCPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [view, setView]                 = useState<'grid' | 'list'>('grid');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dialog, setDialog]             = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [form, setForm]                 = useState({ name: '', unit: '', cabin: '' });
  const [repeatMode, setRepeatMode]     = useState<RepeatMode>('none');
  const [repeatCount, setRepeatCount]   = useState(7);
  const [submitting, setSubmitting]     = useState(false);

  // Live bookings for selected date
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'ekc_reservations'),
      where('date', '==', selectedDate),
    );
  }, [firestore, selectedDate]);

  const { data: bookings, isLoading } = useCollection<EKCReservation>(bookingsQuery);

  const bookedMap = useMemo(() => {
    const map = new Map<string, Booking>();
    (bookings ?? []).forEach((b) => map.set(`${b.location}_${b.timeBlock}`, b));
    return map;
  }, [bookings]);

  const getBooking = (locId: string, tbId: string) => bookedMap.get(`${locId}_${tbId}`);

  const openSlot = (location: Location, timeBlock: TimeBlock) => {
    const existing = getBooking(location.id, timeBlock.id);
    if (existing) {
      setDialog({ mode: 'view', location, timeBlock, booking: existing });
    } else {
      setForm({ name: '', unit: '', cabin: '' });
      setRepeatMode('none');
      setRepeatCount(7);
      setDialog({ mode: 'reserve', location, timeBlock });
    }
  };

  const handleSubmit = () => {
    if (!dialog || dialog.mode === 'view' || !firestore) return;
    const { name, unit, cabin } = form;
    if (!name.trim() || !unit.trim() || !cabin.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    const isEdit    = dialog.mode === 'edit';
    const baseDate  = isEdit ? dialog.booking.date : selectedDate;
    const dates     = isEdit
      ? [baseDate]
      : generateDates(baseDate, repeatMode, repeatMode === 'none' ? 1 : repeatCount);

    dates.forEach((date) => {
      const docRef = doc(firestore, 'ekc_reservations', `${date}_${dialog.location.id}_${dialog.timeBlock.id}`);
      setDocumentNonBlocking(docRef, {
        name: name.trim(),
        unit: unit.trim(),
        cabin: cabin.trim(),
        location: dialog.location.id,
        locationLabel: dialog.location.label,
        timeBlock: dialog.timeBlock.id,
        timeBlockLabel: dialog.timeBlock.label,
        date,
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    toast({
      title: isEdit ? 'Reservation updated' : 'Reserved!',
      description: dates.length > 1
        ? `${dialog.location.label} · ${dialog.timeBlock.label} × ${dates.length} dates`
        : `${dialog.location.label} · ${dialog.timeBlock.label}`,
    });
    setDialog(null);
    setSubmitting(false);
  };

  const handleDelete = (booking: Booking) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'ekc_reservations', booking.id));
    toast({ title: 'Reservation deleted', variant: 'destructive' });
    setDeleteTarget(null);
    setDialog(null);
  };

  // ── Shared chip/cell style constants ──────────────────────────────────────

  const locationTimeChips = (location: Location, timeBlock: TimeBlock) => (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
        <MapPin className="h-3 w-3" />{location.label}
      </span>
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', color: '#86efac' }}>
        <Clock className="h-3 w-3" />{timeBlock.label} · {timeBlock.time}
      </span>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #050f05 0%, #0b1a0b 50%, #060e06 100%)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative text-center px-6 py-7" style={{ borderBottom: '1px solid rgba(74,222,128,0.12)' }}>
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <span className="text-3xl select-none">🏕️</span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Emma Kaufmann Camp</h1>
        </div>
        <p className="text-sm font-medium" style={{ color: 'rgba(74,222,128,0.7)' }}>Space Reservation Hub</p>
        <a
          href="/EKC/admin"
          className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)', color: 'rgba(74,222,128,0.7)' }}
        >
          <Shield className="h-3.5 w-3.5" />
          Admin
        </a>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <Calendar className="h-4 w-4 shrink-0" style={{ color: '#4ade80' }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.22)', color: '#fff', colorScheme: 'dark', minWidth: 140 }}
          />
        </label>

        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 5px #4ade80' }} />
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: '#f87171', boxShadow: '0 0 5px #f87171' }} />
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Booked</span>
          </span>
        </div>

        {/* View toggle — Grid = table, List = cards */}
        <div
          className="ml-auto flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-all"
              style={view === v
                ? { background: 'rgba(74,222,128,0.18)', color: '#86efac' }
                : { color: 'rgba(255,255,255,0.4)' }}
            >
              {v === 'grid' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(74,222,128,0.5)' }} />
        </div>
      )}

      {/* ── Grid view — table, horizontally scrollable ─────────────────────── */}
      {!isLoading && view === 'grid' && (
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid rgba(74,222,128,0.12)', boxShadow: '0 4px 28px rgba(0,0,0,0.35)' }}>
            <table className="text-sm border-collapse" style={{ minWidth: 680, width: '100%', background: 'rgba(255,255,255,0.02)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(74,222,128,0.15)', background: 'rgba(74,222,128,0.07)' }}>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.45)', minWidth: 160 }}>
                    Time Block
                  </th>
                  {LOCATIONS.map((loc) => (
                    <th key={loc.id} className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'rgba(255,255,255,0.7)', minWidth: 150 }}>
                      <span className="mr-1 text-base">{loc.emoji}</span>{loc.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_BLOCKS.map((tb, i) => (
                  <tr key={tb.id} style={{ borderBottom: i < TIME_BLOCKS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-xs font-semibold text-white/90">{tb.label}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tb.time}</p>
                    </td>
                    {LOCATIONS.map((loc) => (
                      <td key={loc.id} className="px-4 py-3 text-center">
                        <SlotChip
                          booking={getBooking(loc.id, tb.id)}
                          onClick={() => openSlot(loc, tb)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── List view — location cards ──────────────────────────────────────── */}
      {!isLoading && view === 'list' && (
        <div className="max-w-6xl mx-auto px-4 pb-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(74,222,128,0.12)', boxShadow: '0 4px 28px rgba(0,0,0,0.35)' }}
            >
              <div className="flex items-center gap-3 px-5 py-3.5"
                style={{ background: 'rgba(74,222,128,0.07)', borderBottom: '1px solid rgba(74,222,128,0.10)' }}>
                <span className="text-2xl select-none">{loc.emoji}</span>
                <h3 className="font-bold text-white text-base">{loc.label}</h3>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {TIME_BLOCKS.map((tb) => (
                  <div key={tb.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0 shrink-0">
                      <p className="text-xs font-semibold text-white/90 whitespace-nowrap">{tb.label}</p>
                      <p className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>{tb.time}</p>
                    </div>
                    <SlotChip
                      booking={getBooking(loc.id, tb.id)}
                      onClick={() => openSlot(loc, tb)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main dialog (reserve / view / edit) ────────────────────────────── */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'rgba(8,18,8,0.98)', border: '1px solid rgba(74,222,128,0.20)', backdropFilter: 'blur(28px)' }}
        >

          {/* VIEW mode */}
          {dialog?.mode === 'view' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <span className="text-xl">{dialog.location.emoji}</span>
                  Reservation Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                {locationTimeChips(dialog.location, dialog.timeBlock)}

                <div className="rounded-xl p-4 space-y-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {([
                    { label: 'Name',  value: dialog.booking.name  },
                    { label: 'Unit',  value: dialog.booking.unit  },
                    { label: 'Cabin', value: dialog.booking.cabin },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</span>
                      <span className="text-sm font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => {
                      setForm({ name: dialog.booking.name, unit: dialog.booking.unit, cabin: dialog.booking.cabin });
                      setDialog({ mode: 'edit', location: dialog.location, timeBlock: dialog.timeBlock, booking: dialog.booking });
                    }}
                    className="flex-1 h-9 gap-1.5"
                    style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.30)', color: '#4ade80' }}
                  >
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </Button>
                  <Button
                    onClick={() => setDeleteTarget(dialog.booking)}
                    className="flex-1 h-9 gap-1.5"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: '#f87171' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* RESERVE / EDIT mode */}
          {(dialog?.mode === 'reserve' || dialog?.mode === 'edit') && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <span className="text-xl">{dialog.location.emoji}</span>
                  {dialog.mode === 'edit' ? 'Edit Reservation' : 'Reserve Space'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                {locationTimeChips(dialog.location, dialog.timeBlock)}

                {([
                  { key: 'name',  label: 'Full Name', placeholder: 'Your full name' },
                  { key: 'unit',  label: 'Unit',      placeholder: 'Your unit'      },
                  { key: 'cabin', label: 'Cabin',     placeholder: 'Your cabin'     },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <Label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</Label>
                    <Input
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder={placeholder}
                      className="h-9 text-sm"
                      style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.20)' }}
                    />
                  </div>
                ))}

                {dialog.mode === 'reserve' && (
                  <RepeatSection
                    mode={repeatMode}
                    count={repeatCount}
                    onModeChange={setRepeatMode}
                    onCountChange={setRepeatCount}
                  />
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full"
                  style={{ background: 'rgba(74,222,128,0.18)', border: '1px solid rgba(74,222,128,0.40)', color: '#4ade80', boxShadow: '0 0 14px rgba(74,222,128,0.12)' }}
                >
                  {submitting
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Saving…</>
                    : dialog.mode === 'edit'
                      ? 'Save Changes'
                      : repeatMode !== 'none'
                        ? `Reserve ${repeatCount} Slots`
                        : 'Confirm Reservation'
                  }
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent style={{ background: 'rgba(8,18,8,0.98)', border: '1px solid rgba(239,68,68,0.25)', backdropFilter: 'blur(28px)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong className="text-white">{deleteTarget?.name}</strong>'s
              reservation. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              style={{ background: 'rgba(239,68,68,0.20)', border: '1px solid rgba(239,68,68,0.40)', color: '#f87171' }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
