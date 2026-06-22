'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, List, Calendar, MapPin, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFirestore,
  useMemoFirebase,
  useCollection,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// ─── Data ────────────────────────────────────────────────────────────────────

const LOCATIONS = [
  { id: 'treehouse',     label: 'Treehouse',      emoji: '🌲' },
  { id: 'sukkah',        label: 'Sukkah',          emoji: '🕍' },
  { id: 'main_fire_pit', label: 'Main Fire Pit',   emoji: '🔥' },
  { id: 'gazebo',        label: 'Gazebo',           emoji: '⛺' },
] as const;

const TIME_BLOCKS = [
  { id: 'ACT1',   label: 'ACT 1',          time: '10:00–10:50' },
  { id: 'ACT2',   label: 'ACT 2',          time: '11:00–11:50' },
  { id: 'ACT3HT', label: 'ACT 3HT',        time: '12:00–12:50' },
  { id: 'ACT3SK', label: 'ACT 3SK',        time: '2:00–2:50'   },
  { id: 'ACT4',   label: 'ACT 4',          time: '3:30–4:20'   },
  { id: 'ACT5',   label: 'ACT 5',          time: '4:30–5:20'   },
  { id: 'ACT6HT', label: 'ACT 6HT',        time: '5:30–6:20'   },
  { id: 'ACT6SK', label: 'ACT 6SK',        time: '6:30–7:20'   },
  { id: 'ACT7',   label: 'ACT 7',          time: '7:30–8:20'   },
  { id: 'ACT8A',  label: 'ACT 8 / SIKUM A', time: '8:30–9:20'  },
  { id: 'SIKUMB', label: 'SIKUM B',        time: '9:30–10:15'  },
] as const;

type Location  = typeof LOCATIONS[number];
type TimeBlock = typeof TIME_BLOCKS[number];

type EKCReservation = {
  name: string;
  unit: string;
  cabin: string;
  location: string;
  locationLabel: string;
  timeBlock: string;
  timeBlockLabel: string;
  date: string;
  createdAt: any;
};

type ReserveTarget = { location: Location; timeBlock: TimeBlock };

// ─── Slot chip shared style ──────────────────────────────────────────────────

const bookedStyle = {
  background: 'rgba(239,68,68,0.10)',
  border: '1px solid rgba(239,68,68,0.30)',
  color: '#f87171',
} as const;

const availStyle = {
  background: 'rgba(74,222,128,0.10)',
  border: '1px solid rgba(74,222,128,0.30)',
  color: '#4ade80',
  cursor: 'pointer',
} as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EKCPage() {
  const firestore = useFirestore();
  const { toast }  = useToast();

  const [view, setView]               = useState<'grid' | 'list'>('grid');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [target, setTarget]           = useState<ReserveTarget | null>(null);
  const [form, setForm]               = useState({ name: '', unit: '', cabin: '' });
  const [submitting, setSubmitting]   = useState(false);

  // Live bookings for the selected date
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'ekc_reservations'),
      where('date', '==', selectedDate),
    );
  }, [firestore, selectedDate]);

  const { data: bookings, isLoading } = useCollection<EKCReservation>(bookingsQuery);

  const bookedMap = useMemo(() => {
    const map = new Map<string, EKCReservation & { id: string; path: string }>();
    (bookings ?? []).forEach((b) => map.set(`${b.location}_${b.timeBlock}`, b));
    return map;
  }, [bookings]);

  const slotKey   = (locId: string, tbId: string) => `${locId}_${tbId}`;
  const isBooked  = (locId: string, tbId: string) => bookedMap.has(slotKey(locId, tbId));
  const getBooker = (locId: string, tbId: string) => bookedMap.get(slotKey(locId, tbId));

  const openReserve = (location: Location, timeBlock: TimeBlock) => {
    if (isBooked(location.id, timeBlock.id)) return;
    setTarget({ location, timeBlock });
    setForm({ name: '', unit: '', cabin: '' });
  };

  const handleSubmit = () => {
    if (!target || !firestore) return;
    const { name, unit, cabin } = form;
    if (!name.trim() || !unit.trim() || !cabin.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const docId  = `${selectedDate}_${target.location.id}_${target.timeBlock.id}`;
    const docRef = doc(firestore, 'ekc_reservations', docId);
    setDocumentNonBlocking(
      docRef,
      {
        name: name.trim(),
        unit: unit.trim(),
        cabin: cabin.trim(),
        location: target.location.id,
        locationLabel: target.location.label,
        timeBlock: target.timeBlock.id,
        timeBlockLabel: target.timeBlock.label,
        date: selectedDate,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    toast({
      title: 'Reserved!',
      description: `${target.location.label} · ${target.timeBlock.label} (${target.timeBlock.time})`,
    });
    setTarget(null);
    setSubmitting(false);
  };

  // ─── Slot cell (reused in both views) ─────────────────────────────────────

  const SlotCell = ({ location, timeBlock }: { location: Location; timeBlock: TimeBlock }) => {
    const booked  = isBooked(location.id, timeBlock.id);
    const booker  = getBooker(location.id, timeBlock.id);
    return booked ? (
      <div className="text-center">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={bookedStyle}
        >
          Booked
        </span>
        {booker && (
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {booker.name}
          </p>
        )}
      </div>
    ) : (
      <button
        onClick={() => openReserve(location, timeBlock)}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-transform hover:scale-105 active:scale-95"
        style={availStyle}
      >
        Reserve
      </button>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #050f05 0%, #0b1a0b 50%, #060e06 100%)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="text-center px-6 py-7"
        style={{ borderBottom: '1px solid rgba(74,222,128,0.12)' }}
      >
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <span className="text-3xl select-none">🏕️</span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Emma Kaufmann Camp</h1>
        </div>
        <p className="text-sm font-medium" style={{ color: 'rgba(74,222,128,0.7)' }}>
          Space Reservation Hub
        </p>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-3 flex flex-wrap items-center gap-3">

        {/* Date picker */}
        <label className="flex items-center gap-2 cursor-pointer">
          <Calendar className="h-4 w-4 shrink-0" style={{ color: '#4ade80' }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(74,222,128,0.07)',
              border: '1px solid rgba(74,222,128,0.22)',
              color: '#fff',
              colorScheme: 'dark',
              minWidth: 140,
            }}
          />
        </label>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium ml-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 5px #4ade80' }} />
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: '#f87171', boxShadow: '0 0 5px #f87171' }} />
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Booked</span>
          </span>
        </div>

        {/* View toggle */}
        <div
          className="ml-auto flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-7 rounded-md text-xs transition-all font-medium',
                view === v
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-white',
              )}
              style={view === v ? { background: 'rgba(74,222,128,0.18)', color: '#86efac' } : {}}
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

      {/* ── Grid view ──────────────────────────────────────────────────────── */}
      {!isLoading && view === 'grid' && (
        <div className="max-w-6xl mx-auto px-4 pb-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(74,222,128,0.12)',
                boxShadow: '0 4px 28px rgba(0,0,0,0.35)',
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center gap-3 px-5 py-3.5"
                style={{
                  background: 'rgba(74,222,128,0.07)',
                  borderBottom: '1px solid rgba(74,222,128,0.10)',
                }}
              >
                <span className="text-2xl select-none">{loc.emoji}</span>
                <h3 className="font-bold text-white text-base">{loc.label}</h3>
              </div>

              {/* Time blocks */}
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {TIME_BLOCKS.map((tb) => (
                  <div
                    key={tb.id}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white/90">{tb.label}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tb.time}</p>
                    </div>
                    <SlotCell location={loc} timeBlock={tb} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {!isLoading && view === 'list' && (
        <div className="max-w-6xl mx-auto px-4 pb-12 overflow-x-auto">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: '1px solid rgba(74,222,128,0.12)',
              background: 'rgba(255,255,255,0.02)',
              boxShadow: '0 4px 28px rgba(0,0,0,0.35)',
            }}
          >
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(74,222,128,0.15)', background: 'rgba(74,222,128,0.07)' }}>
                  <th
                    className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.45)', width: '170px' }}
                  >
                    Time Block
                  </th>
                  {LOCATIONS.map((loc) => (
                    <th
                      key={loc.id}
                      className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      <span className="mr-1 text-base">{loc.emoji}</span>
                      {loc.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_BLOCKS.map((tb, i) => (
                  <tr
                    key={tb.id}
                    style={{ borderBottom: i < TIME_BLOCKS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-white/90">{tb.label}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tb.time}</p>
                    </td>
                    {LOCATIONS.map((loc) => (
                      <td key={loc.id} className="px-4 py-3 text-center">
                        <SlotCell location={loc} timeBlock={tb} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Reserve dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent
          className="max-w-sm"
          style={{
            background: 'rgba(8,18,8,0.98)',
            border: '1px solid rgba(74,222,128,0.20)',
            backdropFilter: 'blur(28px)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <span className="text-xl">{target?.location.emoji}</span>
              Reserve Space
            </DialogTitle>
          </DialogHeader>

          {target && (
            <div className="space-y-4 pt-1">
              {/* Location + time chips */}
              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                >
                  <MapPin className="h-3 w-3" />
                  {target.location.label}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', color: '#86efac' }}
                >
                  <Clock className="h-3 w-3" />
                  {target.timeBlock.label} · {target.timeBlock.time}
                </span>
              </div>

              {/* Form */}
              <div className="space-y-3">
                {([
                  { key: 'name',  label: 'Full Name', placeholder: 'Your full name' },
                  { key: 'unit',  label: 'Unit',      placeholder: 'Your unit'      },
                  { key: 'cabin', label: 'Cabin',     placeholder: 'Your cabin'     },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <Label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {label}
                    </Label>
                    <Input
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder={placeholder}
                      className="h-9 text-sm"
                      style={{
                        background: 'rgba(74,222,128,0.05)',
                        border: '1px solid rgba(74,222,128,0.20)',
                      }}
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
                style={{
                  background: 'rgba(74,222,128,0.18)',
                  border: '1px solid rgba(74,222,128,0.40)',
                  color: '#4ade80',
                  boxShadow: '0 0 14px rgba(74,222,128,0.12)',
                }}
              >
                {submitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Reserving…</>
                ) : (
                  'Confirm Reservation'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
