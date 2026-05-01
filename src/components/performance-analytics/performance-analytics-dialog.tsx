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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart2,
  PlusCircle,
  Trash2,
  Edit,
  Loader2,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ChevronDown,
  ChevronUp,
  LogIn,
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
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type KpiPeriod = 'daily' | 'weekly' | 'monthly';

type Kpi = {
  id: string;
  name: string;
  target: number;
  unit: string;
  period: KpiPeriod;
  createdBy: string;
  createdAt: any;
  order?: number;
};

type KpiLog = {
  id: string;
  kpiId: string;
  value: number;
  loggedBy: string;
  loggedByDisplay: string;
  loggedAt: any;
};

type PeriodFilter = 'all' | 'week' | 'month';
type ActiveTab = 'overview' | 'leaderboard' | 'my-progress';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getProgressColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getProgressTextColor(pct: number): string {
  if (pct >= 80) return 'text-green-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function getPeriodLabel(period: KpiPeriod): string {
  if (period === 'daily') return 'Daily';
  if (period === 'weekly') return 'Weekly';
  return 'Monthly';
}

function filterLogsByPeriod(logs: KpiLog[], filter: PeriodFilter): KpiLog[] {
  if (filter === 'all') return logs;
  const now = new Date();
  const cutoff = new Date(now);
  if (filter === 'week') {
    cutoff.setDate(now.getDate() - 7);
  } else {
    cutoff.setMonth(now.getMonth() - 1);
  }
  return logs.filter((l) => {
    const ts = l.loggedAt?.toDate ? l.loggedAt.toDate() : new Date(l.loggedAt ?? 0);
    return ts >= cutoff;
  });
}

function sumLogs(logs: KpiLog[]): number {
  return logs.reduce((acc, l) => acc + (l.value ?? 0), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  const colorClass = getProgressColor(clamped);
  return (
    <div className={cn('h-2 w-full rounded-full bg-white/10', className)}>
      <div
        className={cn('h-2 rounded-full transition-all duration-500', colorClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

type KpiCardProps = {
  kpi: Kpi;
  logsForKpi: KpiLog[];
  periodFilter: PeriodFilter;
  isManager: boolean;
  onLogValue: (kpi: Kpi) => void;
  onEditKpi: (kpi: Kpi) => void;
  onDeleteKpi: (kpi: Kpi) => void;
};

function KpiCard({
  kpi,
  logsForKpi,
  periodFilter,
  isManager,
  onLogValue,
  onEditKpi,
  onDeleteKpi,
}: KpiCardProps) {
  const filteredLogs = filterLogsByPeriod(logsForKpi, periodFilter);
  const currentValue = sumLogs(filteredLogs);
  const pct = kpi.target > 0 ? (currentValue / kpi.target) * 100 : 0;
  const clampedPct = Math.min(100, pct);
  const colorText = getProgressTextColor(clampedPct);

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-4 flex flex-col gap-3 hover:bg-background/50 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{kpi.name}</p>
          <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
            {getPeriodLabel(kpi.period)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isManager && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEditKpi(kpi)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete KPI?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the "{kpi.name}" KPI. All logged values will
                      remain in the database but the KPI will no longer be tracked.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteKpi(kpi)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between mb-1.5">
          <span className={cn('text-2xl font-bold tabular-nums', colorText)}>
            {currentValue.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground ml-1">{kpi.unit}</span>
          </span>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">
              Target: {kpi.target.toLocaleString()} {kpi.unit}
            </p>
            <p className={cn('text-xs font-bold tabular-nums', colorText)}>
              {clampedPct.toFixed(0)}%
            </p>
          </div>
        </div>
        <KpiProgressBar value={clampedPct} />
      </div>

      <Button
        size="sm"
        className="w-full btn-gradient h-8 text-xs mt-1"
        onClick={() => onLogValue(kpi)}
      >
        <LogIn className="h-3.5 w-3.5 mr-1.5" />
        Log Value
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Value Panel
// ─────────────────────────────────────────────────────────────────────────────

type LogValuePanelProps = {
  kpi: Kpi;
  activeUser: AccessKey;
  kpiLogsRef: ReturnType<typeof collection> | null;
  onDone: () => void;
  toast: ReturnType<typeof useToast>['toast'];
};

function LogValuePanel({ kpi, activeUser, kpiLogsRef, onDone, toast }: LogValuePanelProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      toast({ title: 'Invalid value', description: 'Please enter a valid number.', variant: 'destructive' });
      return;
    }
    if (!kpiLogsRef) return;
    setSaving(true);
    try {
      await addDoc(kpiLogsRef, {
        kpiId: kpi.id,
        value: num,
        loggedBy: activeUser.username,
        loggedByDisplay: activeUser.displayName,
        loggedAt: serverTimestamp(),
      });
      toast({ title: 'Value logged!', description: `${num} ${kpi.unit} added to ${kpi.name}.` });
      setValue('');
      onDone();
    } catch {
      toast({ title: 'Error', description: 'Failed to log value.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Log value for: <span className="text-primary">{kpi.name}</span></p>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDone}>
          Cancel
        </Button>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
            Value ({kpi.unit})
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 border-border/60 bg-background/50"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
        <div className="flex items-end">
          <Button className="btn-gradient h-9" onClick={handleSave} disabled={saving || !value}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Target: {kpi.target.toLocaleString()} {kpi.unit} · {getPeriodLabel(kpi.period)}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Form (create / edit)
// ─────────────────────────────────────────────────────────────────────────────

type KpiFormProps = {
  initial?: Partial<Kpi>;
  onSave: (data: Omit<Kpi, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
};

function KpiForm({ initial, onSave, onCancel }: KpiFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [target, setTarget] = useState(initial?.target?.toString() ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [period, setPeriod] = useState<KpiPeriod>(initial?.period ?? 'weekly');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !target || !unit.trim()) return;
    const num = parseFloat(target);
    if (isNaN(num) || num <= 0) return;
    setSaving(true);
    await onSave({ name: name.trim(), target: num, unit: unit.trim(), period, order: initial?.order ?? 0 });
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-3">
      <p className="text-sm font-semibold">{initial?.id ? 'Edit KPI' : 'Create New KPI'}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">KPI Name</Label>
          <Input
            placeholder="e.g. Calls Made"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 border-border/60 bg-background/50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target</Label>
          <Input
            type="number"
            placeholder="100"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9 border-border/60 bg-background/50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit</Label>
          <Input
            placeholder="calls, $, %..."
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="h-9 border-border/60 bg-background/50"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Period</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as KpiPeriod)}>
            <SelectTrigger className="h-9 border-border/60 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1 btn-gradient h-9"
          onClick={handleSubmit}
          disabled={saving || !name.trim() || !target || !unit.trim()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial?.id ? 'Save Changes' : 'Create KPI'}
        </Button>
        <Button variant="outline" className="h-9 border-border/50" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Tab
// ─────────────────────────────────────────────────────────────────────────────

type LeaderboardTabProps = {
  kpis: Kpi[];
  logs: KpiLog[];
  periodFilter: PeriodFilter;
};

function LeaderboardTab({ kpis, logs, periodFilter }: LeaderboardTabProps) {
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

  const leaderboardData = useMemo(() => {
    return kpis.map((kpi) => {
      const kpiLogs = filterLogsByPeriod(
        logs.filter((l) => l.kpiId === kpi.id),
        periodFilter
      );
      const byUser: Record<string, { display: string; total: number }> = {};
      for (const log of kpiLogs) {
        if (!byUser[log.loggedBy]) {
          byUser[log.loggedBy] = { display: log.loggedByDisplay || log.loggedBy, total: 0 };
        }
        byUser[log.loggedBy].total += log.value ?? 0;
      }
      const ranked = Object.entries(byUser)
        .map(([username, { display, total }]) => ({ username, display, total }))
        .sort((a, b) => b.total - a.total);
      const totalLogged = ranked.reduce((acc, r) => acc + r.total, 0);
      return { kpi, ranked, totalLogged };
    });
  }, [kpis, logs, periodFilter]);

  if (kpis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Trophy className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No KPIs configured yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaderboardData.map(({ kpi, ranked, totalLogged }) => {
        const isExpanded = expandedKpi === kpi.id;
        const pct = kpi.target > 0 ? Math.min(100, (totalLogged / kpi.target) * 100) : 0;
        return (
          <div
            key={kpi.id}
            className="rounded-xl border border-border/40 bg-background/30 overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-background/50 transition-all text-left"
              onClick={() => setExpandedKpi(isExpanded ? null : kpi.id)}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{kpi.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <KpiProgressBar value={pct} className="flex-1 max-w-32" />
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {totalLogged.toLocaleString()} / {kpi.target.toLocaleString()} {kpi.unit}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="outline" className="text-[10px]">
                  {ranked.length} contributor{ranked.length !== 1 ? 's' : ''}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border/30 px-4 py-3 space-y-2">
                {ranked.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No values logged for this period.
                  </p>
                ) : (
                  ranked.map((entry, idx) => {
                    const entryPct = totalLogged > 0 ? (entry.total / totalLogged) * 100 : 0;
                    const rankColor =
                      idx === 0
                        ? 'text-yellow-400'
                        : idx === 1
                        ? 'text-slate-400'
                        : idx === 2
                        ? 'text-amber-600'
                        : 'text-muted-foreground';
                    return (
                      <div key={entry.username} className="flex items-center gap-3">
                        <span className={cn('w-5 text-xs font-bold text-right shrink-0 tabular-nums', rankColor)}>
                          #{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">{entry.display}</span>
                            <span className="text-xs font-bold tabular-nums ml-2 shrink-0">
                              {entry.total.toLocaleString()} {kpi.unit}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10">
                            <div
                              className={cn(
                                'h-1.5 rounded-full',
                                idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-primary/60'
                              )}
                              style={{ width: `${entryPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Progress Tab
// ─────────────────────────────────────────────────────────────────────────────

type MyProgressTabProps = {
  kpis: Kpi[];
  logs: KpiLog[];
  periodFilter: PeriodFilter;
  username: string;
};

function MyProgressTab({ kpis, logs, periodFilter, username }: MyProgressTabProps) {
  const myData = useMemo(() => {
    return kpis.map((kpi) => {
      const myLogs = filterLogsByPeriod(
        logs.filter((l) => l.kpiId === kpi.id && l.loggedBy === username),
        periodFilter
      ).sort((a, b) => {
        const ta = a.loggedAt?.toDate ? a.loggedAt.toDate().getTime() : 0;
        const tb = b.loggedAt?.toDate ? b.loggedAt.toDate().getTime() : 0;
        return ta - tb;
      });

      const total = sumLogs(myLogs);
      const pct = kpi.target > 0 ? Math.min(100, (total / kpi.target) * 100) : 0;

      // Trend based on last 2 entries
      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (myLogs.length >= 2) {
        const last = myLogs[myLogs.length - 1].value ?? 0;
        const prev = myLogs[myLogs.length - 2].value ?? 0;
        if (last > prev) trend = 'up';
        else if (last < prev) trend = 'down';
      }

      return { kpi, myLogs, total, pct, trend };
    });
  }, [kpis, logs, periodFilter, username]);

  if (kpis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Target className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No KPIs configured yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {myData.map(({ kpi, myLogs, total, pct, trend }) => {
        const clampedPct = Math.min(100, Math.max(0, pct));
        const colorText = getProgressTextColor(clampedPct);
        const TrendIcon =
          trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
        const trendColor =
          trend === 'up'
            ? 'text-green-400'
            : trend === 'down'
            ? 'text-red-400'
            : 'text-muted-foreground';

        return (
          <div
            key={kpi.id}
            className="rounded-xl border border-border/40 bg-background/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendIcon className={cn('h-4 w-4', trendColor)} />
                <p className="text-sm font-semibold">{kpi.name}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {getPeriodLabel(kpi.period)}
                </Badge>
              </div>
              <div className="text-right">
                <span className={cn('text-lg font-bold tabular-nums', colorText)}>
                  {total.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">{kpi.unit}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>{clampedPct.toFixed(0)}% of target</span>
                <span>Target: {kpi.target.toLocaleString()} {kpi.unit}</span>
              </div>
              <KpiProgressBar value={clampedPct} />
            </div>

            {myLogs.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Recent entries
                </p>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {[...myLogs].reverse().slice(0, 10).map((log) => {
                    const ts = log.loggedAt?.toDate
                      ? log.loggedAt.toDate()
                      : new Date(log.loggedAt ?? 0);
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span className="tabular-nums font-medium text-foreground">
                          +{(log.value ?? 0).toLocaleString()} {kpi.unit}
                        </span>
                        <span>
                          {ts
                            ? ts.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {myLogs.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60 text-center py-1">
                No entries for this period.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dialog
// ─────────────────────────────────────────────────────────────────────────────

type PerformanceAnalyticsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

export function PerformanceAnalyticsDialog({
  open,
  onOpenChange,
  client,
  activeUser,
}: PerformanceAnalyticsDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const isManager = activeUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [loggingKpi, setLoggingKpi] = useState<Kpi | null>(null);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ── Firestore refs ───────────────────────────────────────────────────────

  const kpisRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'kpis');
  }, [firestore, client.path]);

  const kpisQuery = useMemoFirebase(() => {
    if (!kpisRef) return null;
    return query(kpisRef, orderBy('order', 'asc'));
  }, [kpisRef]);

  const kpiLogsRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'kpiLogs');
  }, [firestore, client.path]);

  const kpiLogsQuery = useMemoFirebase(() => {
    if (!kpiLogsRef) return null;
    return query(kpiLogsRef, orderBy('loggedAt', 'desc'));
  }, [kpiLogsRef]);

  const { data: kpis, isLoading: kpisLoading } = useCollection<Kpi>(kpisQuery);
  const { data: kpiLogs, isLoading: logsLoading } = useCollection<KpiLog>(kpiLogsQuery);

  const isLoading = kpisLoading || logsLoading;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreateKpi = async (
    data: Omit<Kpi, 'id' | 'createdAt' | 'createdBy'>
  ) => {
    if (!kpisRef || !activeUser) return;
    try {
      await addDoc(kpisRef, {
        ...data,
        order: (kpis?.length ?? 0),
        createdBy: activeUser.username,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'KPI Created', description: `"${data.name}" has been added.` });
      setShowCreateForm(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to create KPI.', variant: 'destructive' });
    }
  };

  const handleEditKpi = async (
    data: Omit<Kpi, 'id' | 'createdAt' | 'createdBy'>
  ) => {
    if (!kpisRef || !editingKpi) return;
    try {
      await updateDoc(doc(kpisRef, editingKpi.id), {
        name: data.name,
        target: data.target,
        unit: data.unit,
        period: data.period,
      });
      toast({ title: 'KPI Updated', description: `"${data.name}" has been updated.` });
      setEditingKpi(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to update KPI.', variant: 'destructive' });
    }
  };

  const handleDeleteKpi = async (kpi: Kpi) => {
    if (!kpisRef) return;
    try {
      await deleteDoc(doc(kpisRef, kpi.id));
      toast({ title: 'KPI Deleted', description: `"${kpi.name}" has been removed.`, variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete KPI.', variant: 'destructive' });
    }
  };

  // ── Period filter label ───────────────────────────────────────────────────

  const periodLabel = periodFilter === 'all' ? 'All Time' : periodFilter === 'week' ? 'This Week' : 'This Month';

  // ── Summary stats ─────────────────────────────────────────────────────────

  const summaryStats = useMemo(() => {
    if (!kpis || !kpiLogs) return { total: 0, onTrack: 0, offTrack: 0 };
    const total = kpis.length;
    let onTrack = 0;
    for (const kpi of kpis) {
      const logs = filterLogsByPeriod(
        kpiLogs.filter((l) => l.kpiId === kpi.id),
        periodFilter
      );
      const sum = sumLogs(logs);
      const pct = kpi.target > 0 ? (sum / kpi.target) * 100 : 0;
      if (pct >= 80) onTrack++;
    }
    return { total, onTrack, offTrack: total - onTrack };
  }, [kpis, kpiLogs, periodFilter]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden glass-card-strong border-border/50">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-headline text-lg">Performance Analytics</DialogTitle>
                <DialogDescription className="text-xs">
                  Track KPIs and team performance for {client.firmName}
                </DialogDescription>
              </div>
            </div>

            {/* Summary pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 rounded-full border border-border/40 bg-background/30 px-2.5 py-1 text-[10px] font-bold">
                <Target className="h-3 w-3" />
                {summaryStats.total} KPIs
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-400">
                ● {summaryStats.onTrack} on track
              </span>
              {summaryStats.offTrack > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400">
                  ● {summaryStats.offTrack} off track
                </span>
              )}
            </div>
          </div>

          {/* Tab bar + Period filter */}
          <div className="flex items-center justify-between gap-3 pt-3 flex-wrap">
            <div className="flex rounded-lg border border-border/40 bg-background/30 p-0.5 gap-0.5">
              {(
                [
                  { id: 'overview' as ActiveTab, label: 'Overview', icon: BarChart2 },
                  { id: 'leaderboard' as ActiveTab, label: 'Leaderboard', icon: Trophy },
                  { id: 'my-progress' as ActiveTab, label: 'My Progress', icon: TrendingUp },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                    activeTab === id
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/30 p-0.5">
              {(
                [
                  { id: 'all' as PeriodFilter, label: 'All Time' },
                  { id: 'week' as PeriodFilter, label: 'This Week' },
                  { id: 'month' as PeriodFilter, label: 'This Month' },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setPeriodFilter(id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
                    periodFilter === id
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── Overview Tab ──────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Manager controls */}
                  {isManager && (
                    <div className="space-y-3">
                      {showCreateForm ? (
                        <KpiForm
                          onSave={handleCreateKpi}
                          onCancel={() => setShowCreateForm(false)}
                        />
                      ) : editingKpi ? (
                        <KpiForm
                          initial={editingKpi}
                          onSave={handleEditKpi}
                          onCancel={() => setEditingKpi(null)}
                        />
                      ) : (
                        <Button
                          size="sm"
                          className="btn-gradient h-8 text-xs"
                          onClick={() => setShowCreateForm(true)}
                        >
                          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                          Add KPI
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Log value panel */}
                  {loggingKpi && activeUser && kpiLogsRef && (
                    <LogValuePanel
                      kpi={loggingKpi}
                      activeUser={activeUser}
                      kpiLogsRef={kpiLogsRef}
                      onDone={() => setLoggingKpi(null)}
                      toast={toast}
                    />
                  )}

                  {/* KPI cards */}
                  {!kpis || kpis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <BarChart2 className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {isManager
                          ? 'No KPIs yet. Create one to get started.'
                          : 'No KPIs have been configured yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {kpis.map((kpi) => (
                        <KpiCard
                          key={kpi.id}
                          kpi={kpi}
                          logsForKpi={kpiLogs?.filter((l) => l.kpiId === kpi.id) ?? []}
                          periodFilter={periodFilter}
                          isManager={isManager}
                          onLogValue={(k) => {
                            setLoggingKpi(k);
                            setShowCreateForm(false);
                            setEditingKpi(null);
                          }}
                          onEditKpi={(k) => {
                            setEditingKpi(k);
                            setShowCreateForm(false);
                            setLoggingKpi(null);
                          }}
                          onDeleteKpi={handleDeleteKpi}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Leaderboard Tab ───────────────────────────────────────── */}
              {activeTab === 'leaderboard' && (
                <LeaderboardTab
                  kpis={kpis ?? []}
                  logs={kpiLogs ?? []}
                  periodFilter={periodFilter}
                />
              )}

              {/* ── My Progress Tab ───────────────────────────────────────── */}
              {activeTab === 'my-progress' && activeUser && (
                <MyProgressTab
                  kpis={kpis ?? []}
                  logs={kpiLogs ?? []}
                  periodFilter={periodFilter}
                  username={activeUser.username}
                />
              )}

              {activeTab === 'my-progress' && !activeUser && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Target className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Sign in to see your progress.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/30 shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-[11px] text-muted-foreground">
              Showing: <span className="font-semibold text-foreground">{periodLabel}</span>
              {activeUser && (
                <span className="ml-2">
                  · Logged in as <span className="font-semibold">{activeUser.displayName}</span>
                  {isManager && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 text-yellow-400 border-yellow-500/40">
                      Manager
                    </Badge>
                  )}
                </span>
              )}
            </p>
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="border-border/50">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
