'use client';

import { useState, useMemo } from 'react';
import { Users, CalendarDays, Search, ChevronDown, ChevronRight, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UNITS, findPersonInBunks, type Cabin, type Unit } from './data';
import { getSchedule, type DayKey, type SlotKey } from './schedule-data';

// ─── Password gate ────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = 'CHEATJCC';

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (pw === ADMIN_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setPw('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #050f05 0%, #0b1a0b 50%, #060e06 100%)' }}>
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4"
            style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <Shield className="h-7 w-7" style={{ color: '#4ade80' }} />
          </div>
          <h1 className="text-xl font-bold text-white">EKC Admin</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Enter your password to continue</p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Password"
            autoFocus
            className={cn(
              'w-full h-11 px-4 rounded-xl text-sm outline-none transition-all',
              error ? 'animate-shake' : ''
            )}
            style={{
              background: error ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.06)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.40)' : 'rgba(74,222,128,0.22)'}`,
              color: '#fff',
            }}
          />
          <button
            onClick={submit}
            className="w-full h-11 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'rgba(74,222,128,0.18)', border: '1px solid rgba(74,222,128,0.40)', color: '#4ade80' }}
          >
            Unlock
          </button>
          {error && (
            <p className="text-center text-xs" style={{ color: '#f87171' }}>Incorrect password</p>
          )}
        </div>

        <div className="text-center">
          <a href="/EKC" className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>← Back to Reservations</a>
        </div>
      </div>
    </div>
  );
}

// ─── Bunking Tab ─────────────────────────────────────────────────────────────

const UNIT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  sabra:    { bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)',  text: '#4ade80',  dot: '#4ade80'  },
  kineret:  { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)',  text: '#60a5fa',  dot: '#60a5fa'  },
  halutzim: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24',  dot: '#fbbf24'  },
  teens:    { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa',  dot: '#a78bfa'  },
};

function CabinCard({ cabin, unit }: { cabin: Cabin; unit: Unit }) {
  const [open, setOpen] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const color = UNIT_COLORS[unit.id] ?? UNIT_COLORS.sabra;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color.dot }} />
          <span className="text-sm font-semibold text-white/90">{cabin.label}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}>
            {cabin.grade || 'Staff'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{cabin.campers.length} campers</span>
          {open ? <ChevronDown className="h-3.5 w-3.5 text-white/40" /> : <ChevronRight className="h-3.5 w-3.5 text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 pt-0.5 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Campers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {cabin.campers.map((name) => (
              <div key={name} className="text-xs py-1 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.75)' }}>
                {name}
              </div>
            ))}
          </div>

          {/* Staff toggle */}
          {cabin.staff.length > 0 && (
            <>
              <button
                onClick={() => setShowStaff(v => !v)}
                className="text-[11px] flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {showStaff ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {cabin.staff.length} staff
              </button>
              {showStaff && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {cabin.staff.map((name) => (
                    <div key={name} className="text-xs py-1 px-2 rounded-lg flex items-center gap-1.5"
                      style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.12)', color: 'rgba(74,222,128,0.8)' }}>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#4ade80' }} />
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BunkingTab({ searchQuery }: { searchQuery: string }) {
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({ sabra: true });

  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return UNITS;
    const q = searchQuery.toLowerCase();
    return UNITS.map(unit => ({
      ...unit,
      cabins: unit.cabins.filter(cabin =>
        cabin.campers.some(n => n.toLowerCase().includes(q)) ||
        cabin.staff.some(n => n.toLowerCase().includes(q)) ||
        cabin.label.toLowerCase().includes(q) ||
        cabin.grade.toLowerCase().includes(q)
      )
    })).filter(u => u.cabins.length > 0);
  }, [searchQuery]);

  const toggleUnit = (id: string) => setOpenUnits(v => ({ ...v, [id]: !v[id] }));

  return (
    <div className="space-y-4">
      {filteredUnits.map((unit) => {
        const color = UNIT_COLORS[unit.id] ?? UNIT_COLORS.sabra;
        const totalCampers = unit.cabins.reduce((s, c) => s + c.campers.length, 0);
        const isOpen = !!openUnits[unit.id];

        return (
          <div key={unit.id} className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${color.border}`, background: color.bg }}>
            <button
              onClick={() => toggleUnit(unit.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-bold" style={{ color: color.text }}>{unit.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.50)' }}>
                  {unit.cabins.length} cabins · {totalCampers} campers
                </span>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" style={{ color: color.text }} />
                      : <ChevronRight className="h-4 w-4" style={{ color: color.text }} />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${color.border}` }}>
                {unit.cabins.map((cabin) => (
                  <CabinCard key={cabin.id} cabin={cabin} unit={unit} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Search Tab ───────────────────────────────────────────────────────────────

type CampStatusKind = 'activity' | 'meal' | 'nosh' | 'lila-tov';
type CampStatus = { kind: CampStatusKind; label: string } | null;

// Fixed daily time windows per unit (minutes from midnight)
const UNIT_DAILY: Record<string, Array<{ from: number; to: number; kind: CampStatusKind; label: string }>> = {
  sabra: [
    { from: 510,  to: 540,  kind: 'meal',     label: 'Breakfast'    }, // 8:30–9:00
    { from: 720,  to: 770,  kind: 'meal',     label: 'Lunch'        }, // 12:00–12:50
    { from: 1050, to: 1100, kind: 'meal',     label: 'Dinner'       }, // 5:30–6:20
    { from: 1230, to: 1260, kind: 'nosh',     label: 'Evening Nosh' }, // 8:30–9:00
    { from: 1260, to: 1440, kind: 'lila-tov', label: 'Lila Tov'    }, // 9:00 PM+
  ],
  kineret: [
    { from: 510,  to: 540,  kind: 'meal',     label: 'Breakfast'    }, // 8:30–9:00
    { from: 720,  to: 770,  kind: 'meal',     label: 'Lunch'        }, // 12:00–12:50
    { from: 1050, to: 1100, kind: 'meal',     label: 'Dinner'       }, // 5:30–6:20
    { from: 1230, to: 1260, kind: 'nosh',     label: 'Evening Nosh' }, // 8:30–9:00
    { from: 1320, to: 1440, kind: 'lila-tov', label: 'Lila Tov'    }, // 10:00 PM+
  ],
  halutzim: [
    { from: 550,  to: 580,  kind: 'meal',     label: 'Breakfast'    }, // 9:10–9:40
    { from: 780,  to: 820,  kind: 'meal',     label: 'Lunch'        }, // 1:00–1:40
    { from: 1110, to: 1160, kind: 'meal',     label: 'Dinner'       }, // 6:30–7:20
    { from: 1230, to: 1260, kind: 'nosh',     label: 'Evening Nosh' }, // 8:30–9:00
    { from: 1350, to: 1440, kind: 'lila-tov', label: 'Lila Tov'    }, // 10:30 PM+
  ],
  teens: [
    { from: 550,  to: 580,  kind: 'meal',     label: 'Breakfast'    }, // 9:10–9:40
    { from: 780,  to: 820,  kind: 'meal',     label: 'Lunch'        }, // 1:00–1:40
    { from: 1110, to: 1160, kind: 'meal',     label: 'Dinner'       }, // 6:30–7:20
    { from: 1290, to: 1310, kind: 'nosh',     label: 'Evening Nosh' }, // 9:30–9:50
    { from: 1410, to: 1440, kind: 'lila-tov', label: 'Lila Tov'    }, // 11:30 PM+
  ],
};

function currentCampStatus(cabinId: string, unitId: string): CampStatus {
  const utype = getUnitType(unitId);
  const slot = currentSlotId(utype);
  if (slot) {
    const sched = getSchedule(cabinId);
    const activity = sched?.[todayKey()]?.[slot];
    if (activity) return { kind: 'activity', label: activity };
  }
  const t = new Date().getHours() * 60 + new Date().getMinutes();
  for (const w of (UNIT_DAILY[unitId] ?? [])) {
    if (t >= w.from && t < w.to) return { kind: w.kind, label: w.label };
  }
  return null;
}

function SearchTab() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return findPersonInBunks(query);
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name… (e.g. 'Smith', 'Emma', 'Cantor')"
          className="w-full h-11 pl-10 pr-4 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.22)', color: '#fff' }}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
          </button>
        )}
      </div>

      {query.trim().length >= 2 && results.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No results for "{query}"</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{results.length} result{results.length !== 1 ? 's' : ''}</p>
          {results.map(({ name, cabin, unit, isStaff }, i) => {
            const color = UNIT_COLORS[unit.id] ?? UNIT_COLORS.sabra;
            const status = currentCampStatus(cabin.id, unit.id);
            return (
              <div key={i} className="rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-semibold text-white">{name}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}>
                    {unit.label}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)' }}>
                    {cabin.label}
                  </span>
                  {isStaff && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.20)', color: '#86efac' }}>
                      Staff
                    </span>
                  )}
                  {!isStaff && cabin.grade && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
                      {cabin.grade}
                    </span>
                  )}
                </div>
                {status?.kind === 'activity' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" style={{ background: '#4ade80' }} />
                    <span className="text-xs font-medium" style={{ color: '#86efac' }}>
                      Now: {status.label === 'Free Swim' ? '🏊 Free Swim' : status.label}
                    </span>
                  </div>
                )}
                {status?.kind === 'meal' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-sm leading-none">🍽️</span>
                    <span className="text-xs font-medium" style={{ color: '#fb923c' }}>
                      {status.label}
                    </span>
                  </div>
                )}
                {status?.kind === 'nosh' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-sm leading-none">🍎</span>
                    <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>
                      {status.label}
                    </span>
                  </div>
                )}
                {status?.kind === 'lila-tov' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-sm leading-none">🌙</span>
                    <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
                      Lila Tov
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {query.trim().length === 0 && (
        <div className="text-center py-12">
          <Search className="h-8 w-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Type a name to find their cabin, unit, and current activity, meal, or status</p>
        </div>
      )}
    </div>
  );
}

// ─── Scheduler Tab ────────────────────────────────────────────────────────────

const DAYS: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Slot definitions differ by unit type
type UnitType = 'sk' | 'ht'; // sabra/kineret vs halutzim/teens

function getUnitType(unitId: string): UnitType {
  return unitId === 'halutzim' || unitId === 'teens' ? 'ht' : 'sk';
}

const SK_SLOTS: { id: SlotKey; label: string; time: string; isFreeSwim?: boolean }[] = [
  { id: 'ACT1', label: 'Aleph',  time: '10:00–10:50' },
  { id: 'ACT2', label: 'Bet',    time: '11:00–11:50' },
  { id: 'ACT3', label: 'Gimel',  time: '2:00–2:50',  isFreeSwim: true },
  { id: 'ACT4', label: 'Dalet',  time: '3:30–4:20'  },
  { id: 'ACT5', label: 'Hay',    time: '4:30–5:20'  },
  { id: 'ACT6', label: 'Vav',    time: '6:30–7:20'  },
  { id: 'ACT7', label: 'Zayin',  time: '7:30–8:20'  },
];

const HT_SLOTS: { id: SlotKey; label: string; time: string; isFreeSwim?: boolean }[] = [
  { id: 'ACT1', label: 'Aleph',  time: '10:00–10:50' },
  { id: 'ACT2', label: 'Bet',    time: '11:00–11:50' },
  { id: 'ACT3', label: 'Gimel',  time: '12:00–12:50' },
  { id: 'ACT4', label: 'Dalet',  time: '3:30–4:20',  isFreeSwim: true },
  { id: 'ACT5', label: 'Hay',    time: '4:30–5:20'  },
  { id: 'ACT6', label: 'Vav',    time: '5:30–6:20'  },
  { id: 'ACT7', label: 'Zayin',  time: '7:30–8:20'  },
];

type ActivitySlot = { id: SlotKey; label: string; time: string; isFreeSwim?: boolean };
type ScheduleRow =
  | { type: 'activity'; slot: ActivitySlot }
  | { type: 'fixed'; kind: 'meal' | 'nosh'; label: string; time: string; from: number; to: number };

function buildDisplayRows(unitId: string): ScheduleRow[] {
  if (unitId === 'sabra' || unitId === 'kineret') {
    return [
      { type: 'fixed',    kind: 'meal', label: 'Breakfast',    time: '8:30–9:00',   from: 510,  to: 540  },
      { type: 'activity', slot: SK_SLOTS[0] },
      { type: 'activity', slot: SK_SLOTS[1] },
      { type: 'fixed',    kind: 'meal', label: 'Lunch',        time: '12:00–12:50', from: 720,  to: 770  },
      { type: 'activity', slot: SK_SLOTS[2] },
      { type: 'fixed',    kind: 'nosh', label: 'Nosh',         time: '2:50–3:30',   from: 890,  to: 930  },
      { type: 'activity', slot: SK_SLOTS[3] },
      { type: 'activity', slot: SK_SLOTS[4] },
      { type: 'fixed',    kind: 'meal', label: 'Dinner',       time: '5:30–6:20',   from: 1050, to: 1100 },
      { type: 'activity', slot: SK_SLOTS[5] },
      { type: 'activity', slot: SK_SLOTS[6] },
      { type: 'fixed',    kind: 'nosh', label: 'Evening Nosh', time: '8:30–9:00',   from: 1230, to: 1260 },
    ];
  }
  // halutzim or teens
  return [
    { type: 'fixed',    kind: 'meal', label: 'Breakfast',    time: '9:10–9:40',   from: 550,  to: 580  },
    { type: 'activity', slot: HT_SLOTS[0] },
    { type: 'activity', slot: HT_SLOTS[1] },
    { type: 'activity', slot: HT_SLOTS[2] },
    { type: 'fixed',    kind: 'meal', label: 'Lunch',        time: '1:00–1:40',   from: 780,  to: 820  },
    { type: 'activity', slot: HT_SLOTS[3] },
    { type: 'activity', slot: HT_SLOTS[4] },
    { type: 'activity', slot: HT_SLOTS[5] },
    { type: 'fixed',    kind: 'meal', label: 'Dinner',       time: '6:30–7:20',   from: 1110, to: 1160 },
    { type: 'activity', slot: HT_SLOTS[6] },
    unitId === 'teens'
      ? { type: 'fixed', kind: 'nosh', label: 'Evening Nosh', time: '9:30–9:50',  from: 1290, to: 1310 }
      : { type: 'fixed', kind: 'nosh', label: 'Evening Nosh', time: '8:30–9:00',  from: 1230, to: 1260 },
  ];
}

// Current day as DayKey
function todayKey(): DayKey {
  const d = new Date().getDay(); // 0=Sun
  return DAYS[d];
}

// Current slot based on 24h time
function currentSlotId(unitType: UnitType): SlotKey | null {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const t = h * 60 + m;
  if (unitType === 'sk') {
    if (t >= 600  && t < 650)  return 'ACT1'; // 10:00–10:50
    if (t >= 660  && t < 710)  return 'ACT2'; // 11:00–11:50
    if (t >= 840  && t < 890)  return 'ACT3'; // 14:00–14:50
    if (t >= 930  && t < 980)  return 'ACT4'; // 15:30–16:20
    if (t >= 990  && t < 1040) return 'ACT5'; // 16:30–17:20
    if (t >= 1110 && t < 1160) return 'ACT6'; // 18:30–19:20
    if (t >= 1170 && t < 1220) return 'ACT7'; // 19:30–20:20
  } else {
    if (t >= 600  && t < 650)  return 'ACT1';
    if (t >= 660  && t < 710)  return 'ACT2';
    if (t >= 720  && t < 770)  return 'ACT3'; // 12:00–12:50
    if (t >= 930  && t < 980)  return 'ACT4'; // 15:30–16:20
    if (t >= 990  && t < 1040) return 'ACT5';
    if (t >= 1050 && t < 1110) return 'ACT6'; // 17:30–18:30
    if (t >= 1170 && t < 1220) return 'ACT7';
  }
  return null;
}

function SchedulerTab() {
  const [selectedUnit, setSelectedUnit] = useState<string>('sabra');
  const [selectedCabin, setSelectedCabin] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey());

  const currentUnit = UNITS.find(u => u.id === selectedUnit);
  // For Teens, show one entry per Quad (quads 3/5/6 have no top-level entry, only tents)
  const displayCabins = useMemo(() => {
    if (!currentUnit) return [];
    if (currentUnit.id === 'teens') {
      const seen = new Set<string>();
      const result: typeof currentUnit.cabins = [];
      for (const c of currentUnit.cabins) {
        const m = c.id.match(/^(quad_\d+)/);
        if (!m) continue;
        const quadId = m[1];
        if (seen.has(quadId)) continue;
        seen.add(quadId);
        const topLevel = currentUnit.cabins.find(x => x.id === quadId);
        result.push(topLevel ?? { ...c, id: quadId, label: 'Quad ' + quadId.replace('quad_', '') });
      }
      return result;
    }
    return currentUnit.cabins;
  }, [currentUnit]);

  const currentCabin = displayCabins.find(c => c.id === selectedCabin) ?? displayCabins[0];
  const unitType = getUnitType(selectedUnit);
  const cabinId = currentCabin?.id ?? '';
  const cabinSchedule = getSchedule(cabinId);
  const daySchedule = cabinSchedule?.[selectedDay] ?? {};
  const displayRows = buildDisplayRows(selectedUnit);
  const isViewingToday = selectedDay === todayKey();
  const nowMinutes = isViewingToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
  const nowActSlot = isViewingToday ? currentSlotId(unitType) : null;

  const handleUnitChange = (unitId: string) => {
    setSelectedUnit(unitId);
    setSelectedCabin('');
  };

  const color = UNIT_COLORS[selectedUnit] ?? UNIT_COLORS.sabra;

  return (
    <div className="space-y-4">
      {/* Unit pills */}
      <div className="flex flex-wrap gap-2">
        {UNITS.map(u => {
          const c = UNIT_COLORS[u.id];
          return (
            <button key={u.id} onClick={() => handleUnitChange(u.id)}
              className="px-3 h-8 rounded-lg text-xs font-semibold transition-all"
              style={selectedUnit === u.id
                ? { background: c.bg, border: `1px solid ${c.border}`, color: c.text }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
              {u.label}
            </button>
          );
        })}
      </div>

      {/* Cabin pills */}
      {currentUnit && (
        <div className="flex flex-wrap gap-1.5">
          {displayCabins.map(c => {
            const isActive = (selectedCabin || displayCabins[0]?.id) === c.id;
            const hasData = !!getSchedule(c.id);
            return (
              <button key={c.id} onClick={() => setSelectedCabin(c.id)}
                className="px-2.5 h-7 rounded-md text-xs font-medium transition-all"
                style={isActive
                  ? { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }
                  : { background: hasData ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: hasData ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.20)' }}>
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-1">
        {DAYS.map(d => {
          const isToday = d === todayKey();
          return (
            <button key={d} onClick={() => setSelectedDay(d)}
              className="flex-1 h-8 rounded-lg text-[11px] font-semibold transition-all relative"
              style={selectedDay === d
                ? { background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }
                : { background: 'rgba(255,255,255,0.03)', border: `1px solid ${isToday ? 'rgba(74,222,128,0.20)' : 'rgba(255,255,255,0.07)'}`, color: isToday ? 'rgba(74,222,128,0.55)' : 'rgba(255,255,255,0.40)' }}>
              {d}
            </button>
          );
        })}
      </div>

      {/* Schedule grid */}
      {currentCabin && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color.border}` }}>
          <div className="px-4 py-2.5 flex items-center justify-between"
            style={{ background: color.bg, borderBottom: `1px solid ${color.border}` }}>
            <span className="text-xs font-bold" style={{ color: color.text }}>{currentCabin.label}</span>
            <span className="text-[11px] font-semibold" style={{ color: color.text }}>
              {selectedDay}{selectedDay === todayKey() ? ' · Today' : ''}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {displayRows.map((row, idx) => {
              if (row.type === 'fixed') {
                const isNow = nowMinutes >= row.from && nowMinutes < row.to;
                const isMeal = row.kind === 'meal';
                return (
                  <div key={`fixed-${idx}`}
                    className="flex items-center gap-3 px-4 py-2"
                    style={{ background: isNow
                      ? (isMeal ? 'rgba(251,146,60,0.09)' : 'rgba(251,191,36,0.09)')
                      : 'rgba(0,0,0,0.12)' }}>
                    <div className="w-24 shrink-0">
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{row.time}</p>
                    </div>
                    <div className="flex-1">
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={isMeal
                          ? { background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.28)', color: isNow ? '#fed7aa' : '#fb923c' }
                          : { background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.28)', color: isNow ? '#fef3c7' : '#fbbf24' }}>
                        {isMeal ? '🍽️' : '🍎'} {row.label}{isNow ? ' ●' : ''}
                      </span>
                    </div>
                  </div>
                );
              }

              // Activity row
              const slot = row.slot;
              const val = daySchedule[slot.id] ?? '';
              const isNow = slot.id === nowActSlot;
              const isFreeSwim = slot.isFreeSwim || val === 'Free Swim';
              return (
                <div key={slot.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={isNow ? { background: 'rgba(74,222,128,0.07)' } : {}}>
                  <div className="w-24 shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: isNow ? '#4ade80' : 'rgba(255,255,255,0.55)' }}>
                      {slot.label}{isNow ? ' ●' : ''}
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{slot.time}</p>
                  </div>
                  <div className="flex-1">
                    {isFreeSwim ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'rgba(96,165,250,0.10)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
                        🏊 Free Swim
                      </span>
                    ) : val === 'Happy First Day of Camp 2026!' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
                        🎉 Opening Day
                      </span>
                    ) : val === 'Shabbat' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
                        ✡️ Shabbat
                      </span>
                    ) : val ? (
                      <span className="text-sm font-medium" style={{ color: isNow ? '#fff' : 'rgba(255,255,255,0.80)' }}>{val}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!getSchedule(cabinId) && currentCabin && (
        <p className="text-center text-xs py-4" style={{ color: 'rgba(255,255,255,0.30)' }}>
          No schedule data for {currentCabin.label}
        </p>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

type Tab = 'bunking' | 'scheduler' | 'search';

const TABS: { id: Tab; label: string; Icon: (p: { className?: string }) => JSX.Element }[] = [
  { id: 'bunking',   label: 'Bunking',   Icon: Users        },
  { id: 'scheduler', label: 'Scheduler', Icon: CalendarDays },
  { id: 'search',    label: 'Search',    Icon: Search       },
];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('bunking');
  const [bunkSearch, setBunkSearch] = useState('');

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #050f05 0%, #0b1a0b 50%, #060e06 100%)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(5,15,5,0.95)', borderBottom: '1px solid rgba(74,222,128,0.12)', backdropFilter: 'blur(16px)' }}>
        <a href="/EKC" className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }}>← Reservations</a>
        <div className="flex-1 text-center">
          <span className="text-sm font-bold text-white">🏕️ EKC Admin</span>
        </div>
        <div style={{ width: 72 }} />
      </div>

      {/* Search bar for bunking (shown in header area when on bunking tab) */}
      {activeTab === 'bunking' && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(255,255,255,0.30)' }} />
            <input
              type="text"
              value={bunkSearch}
              onChange={(e) => setBunkSearch(e.target.value)}
              placeholder="Filter by name, cabin, or grade…"
              className="w-full h-10 pl-10 pr-9 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#fff' }}
            />
            {bunkSearch && (
              <button onClick={() => setBunkSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-28">
        {activeTab === 'bunking'   && <BunkingTab searchQuery={bunkSearch} />}
        {activeTab === 'scheduler' && <SchedulerTab />}
        {activeTab === 'search'    && <SearchTab />}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-center"
        style={{ background: 'rgba(5,15,5,0.97)', borderTop: '1px solid rgba(74,222,128,0.12)', backdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex w-full max-w-sm">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
              style={{ color: activeTab === id ? '#4ade80' : 'rgba(255,255,255,0.35)' }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function EKCAdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <AdminDashboard />;
}
