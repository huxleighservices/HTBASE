'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link2,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  useFirestore,
  useMemoFirebase,
  useDoc,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { fetchSheetData } from '@/actions/fetch-sheet';
import type { Client } from '@/types/client';
import type { ERPPerson } from '@/types/erp';
import type { DepartmentId } from '@/lib/departments';

// ─── Types ──────────────────────────────────────────────────────────────────

type ERPMappedField = 'name' | 'email' | 'phone' | 'ignore';
type ColumnMap = Record<string, ERPMappedField>;
type BridgeStep = 'config' | 'mapping' | 'review' | 'done';
type RecordAction = 'new' | 'update' | 'skip';

type BridgeConfig = {
  sheetUrl: string;
  columnMapping: ColumnMap;
  lastSyncAt: any;
  lastSyncCount: number;
};

type ProposedRow = {
  idx: number;
  cells: Record<string, string>;
  mapped: { name: string; email: string; phone: string };
  action: RecordAction;
  existingId?: string;
  changes: { field: string; from: string; to: string }[];
  approved: boolean;
  invalid: boolean;
};

// ─── Auto-detect helpers ─────────────────────────────────────────────────────

const FIELD_HINTS: Record<Exclude<ERPMappedField, 'ignore'>, string[]> = {
  name:  ['name', 'full name', 'fullname', 'employee', 'contact', 'person', 'client'],
  email: ['email', 'e-mail', 'mail'],
  phone: ['phone', 'mobile', 'cell', 'tel', 'telephone'],
};

function autoDetect(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const used = new Set<ERPMappedField>();
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    let detected: ERPMappedField = 'ignore';
    for (const [field, hints] of Object.entries(FIELD_HINTS) as [Exclude<ERPMappedField, 'ignore'>, string[]][]) {
      if (used.has(field)) continue;
      if (hints.some(hint => lower.includes(hint))) {
        detected = field;
        break;
      }
    }
    if (detected !== 'ignore') used.add(detected);
    map[h] = detected;
  }
  return map;
}

function buildMapped(cells: Record<string, string>, colMap: ColumnMap) {
  const result = { name: '', email: '', phone: '' };
  for (const [col, field] of Object.entries(colMap)) {
    if (field === 'ignore') continue;
    if (cells[col]) result[field as keyof typeof result] = cells[col];
  }
  return result;
}

function buildProposedRows(
  headers: string[],
  rawRows: string[][],
  colMap: ColumnMap,
  people: ERPPerson[],
): ProposedRow[] {
  return rawRows.map((row, idx) => {
    const cells: Record<string, string> = {};
    headers.forEach((h, i) => { cells[h] = row[i] ?? ''; });
    const mapped = buildMapped(cells, colMap);
    const invalid = !mapped.name.trim();

    const nameLower = mapped.name.toLowerCase().trim();
    const existing = nameLower
      ? people.find(p => p.name.toLowerCase().trim() === nameLower)
      : undefined;

    let action: RecordAction = 'new';
    let changes: ProposedRow['changes'] = [];

    if (existing) {
      const fields = ['email', 'phone'] as const;
      changes = fields
        .filter(f => mapped[f] && mapped[f] !== ((existing[f] as string) ?? ''))
        .map(f => ({ field: f, from: (existing[f] as string) ?? '', to: mapped[f] }));
      action = changes.length > 0 ? 'update' : 'skip';
    }

    return {
      idx,
      cells,
      mapped,
      action,
      existingId: existing?.id,
      changes,
      approved: !invalid && action !== 'skip',
      invalid,
    };
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELD_OPTIONS: { value: ERPMappedField; label: string }[] = [
  { value: 'name',   label: 'Name' },
  { value: 'email',  label: 'Email' },
  { value: 'phone',  label: 'Phone' },
  { value: 'ignore', label: 'Ignore' },
];

const ACTION_STYLE: Record<RecordAction, { label: string; color: string; bg: string; border: string }> = {
  new:    { label: 'NEW',    color: '#5DBF8A', bg: 'rgba(93,191,138,0.08)',  border: 'rgba(93,191,138,0.2)' },
  update: { label: 'UPDATE', color: '#FF8F00', bg: 'rgba(255,143,0,0.08)',   border: 'rgba(255,143,0,0.2)' },
  skip:   { label: 'SKIP',   color: '#78909C', bg: 'rgba(120,144,156,0.05)', border: 'rgba(120,144,156,0.15)' },
};

const STEPS: BridgeStep[] = ['config', 'mapping', 'review', 'done'];

// ─── Component ───────────────────────────────────────────────────────────────

type BridgeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  people: ERPPerson[];
  peopleRef: any;
};

export function BridgeSheet({ open, onOpenChange, client, people, peopleRef }: BridgeSheetProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const configRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return doc(firestore, client.path, 'erpBridgeConfig', 'settings');
  }, [firestore, client.path]);

  const { data: savedConfig } = useDoc<BridgeConfig>(configRef);

  const [step, setStep] = useState<BridgeStep>('config');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState<ColumnMap>({});
  const [proposed, setProposed] = useState<ProposedRow[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  // Pre-fill URL from saved config on open
  useEffect(() => {
    if (open && savedConfig?.sheetUrl && !sheetUrl) {
      setSheetUrl(savedConfig.sheetUrl);
    }
  }, [open, savedConfig]);

  // Reset step on close
  useEffect(() => {
    if (!open) {
      setStep('config');
      setFetchError('');
      setHeaders([]);
      setRawRows([]);
      setProposed([]);
    }
  }, [open]);

  const handleFetch = async () => {
    if (!sheetUrl.trim()) return;
    setIsFetching(true);
    setFetchError('');
    try {
      const result = await fetchSheetData(sheetUrl.trim());
      if (result.error) { setFetchError(result.error); return; }
      if (result.headers.length === 0) {
        setFetchError('No data found. Check that the sheet has content and is accessible.');
        return;
      }
      setHeaders(result.headers);
      setRawRows(result.rows);
      // Merge saved mapping with auto-detect for any new columns
      const detected = autoDetect(result.headers);
      const saved = savedConfig?.columnMapping ?? {};
      const merged: ColumnMap = {};
      result.headers.forEach(h => { merged[h] = saved[h] ?? detected[h] ?? 'ignore'; });
      setColMap(merged);
      setStep('mapping');
    } catch (e: any) {
      setFetchError(e?.message ?? 'Failed to fetch data.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleContinueToReview = () => {
    setProposed(buildProposedRows(headers, rawRows, colMap, people));
    setStep('review');
  };

  const handleApply = async () => {
    if (!peopleRef || !configRef) return;
    setIsApplying(true);
    const toApply = proposed.filter(r => r.approved && !r.invalid);
    let count = 0;
    for (const row of toApply) {
      if (row.action === 'new') {
        addDocumentNonBlocking(peopleRef, {
          name: row.mapped.name,
          email: row.mapped.email,
          phone: row.mapped.phone,
          departments: [] as DepartmentId[],
          deptData: {},
          createdAt: serverTimestamp(),
        });
        count++;
      } else if (row.action === 'update' && row.existingId) {
        const updates: Record<string, string> = {};
        row.changes.forEach(c => { updates[c.field] = c.to; });
        updateDocumentNonBlocking(doc(peopleRef, row.existingId), updates);
        count++;
      }
    }
    setDocumentNonBlocking(configRef, {
      sheetUrl,
      columnMapping: colMap,
      lastSyncAt: serverTimestamp(),
      lastSyncCount: count,
    }, { merge: true });

    setAppliedCount(count);
    setIsApplying(false);
    setStep('done');
    toast({ title: 'Bridge sync complete', description: `${count} record${count !== 1 ? 's' : ''} applied.` });
  };

  const approvedCount = proposed.filter(r => r.approved && !r.invalid).length;
  const hasNameMapped = Object.values(colMap).includes('name');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
        style={{
          background: 'rgba(8, 8, 18, 0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <SheetHeader
          className="px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <SheetTitle className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(0,235,255,0.25) 0%, rgba(0,235,255,0.06) 100%)',
                border: '1px solid rgba(0,235,255,0.3)',
                boxShadow: '0 0 12px rgba(0,235,255,0.2)',
              }}
            >
              <Link2 className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
            </div>
            Bridge
          </SheetTitle>
          <SheetDescription>
            Sync records from a Google Sheet or Excel Online spreadsheet into the ERP.
          </SheetDescription>

          {/* Step progress dots */}
          <div className="flex items-center gap-1.5 pt-1">
            {STEPS.map((s, i) => {
              const currentIdx = STEPS.indexOf(step);
              return (
                <div
                  key={s}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: step === s ? '24px' : '8px',
                    background: step === s
                      ? 'var(--primary)'
                      : currentIdx > i
                        ? 'rgba(0,235,255,0.4)'
                        : 'rgba(255,255,255,0.15)',
                  }}
                />
              );
            })}
            <span className="text-[10px] text-muted-foreground ml-1 capitalize">{step}</span>
          </div>
        </SheetHeader>

        {/* ── Scrollable body ────────────────────────────────────── */}
        <ScrollArea className="flex-grow">

          {/* ── Step: Config ──────────────────────────────────────── */}
          {step === 'config' && (
            <div className="px-6 py-5 space-y-5">
              {savedConfig?.lastSyncAt && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{ background: 'rgba(93,191,138,0.08)', border: '1px solid rgba(93,191,138,0.2)' }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: '#5DBF8A' }} />
                  <span style={{ color: '#5DBF8A' }}>
                    Last synced {savedConfig.lastSyncCount} record{savedConfig.lastSyncCount !== 1 ? 's' : ''} — column mapping saved
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Spreadsheet URL
                </label>
                <Input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isFetching && handleFetch()}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-foreground/60">Google Sheets:</span> File → Share → Publish to web → CSV, or share as Viewer with &ldquo;Anyone with the link.&rdquo;{' '}
                  <span className="text-foreground/60">Excel Online:</span> use a shareable download link.
                </p>
              </div>

              {fetchError && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{ background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.25)' }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: '#EF5350' }} />
                  <span style={{ color: '#EF5350' }}>{fetchError}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Mapping ─────────────────────────────────────── */}
          {step === 'mapping' && (
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Column Mapping
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Bridge auto-detected the column mappings below. Adjust any that are wrong, then continue.
                </p>

                <div className="space-y-2">
                  {headers.map((h) => {
                    const samples = rawRows
                      .slice(0, 3)
                      .map(r => r[headers.indexOf(h)] ?? '')
                      .filter(Boolean)
                      .slice(0, 2);
                    const mapped = colMap[h];
                    return (
                      <div
                        key={h}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
                        style={{
                          background: mapped !== 'ignore' ? 'rgba(0,235,255,0.04)' : 'rgba(255,255,255,0.02)',
                          border: mapped !== 'ignore' ? '1px solid rgba(0,235,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-medium truncate">{h}</p>
                          {samples.length > 0 && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {samples.join(' · ')}
                            </p>
                          )}
                        </div>
                        <Select
                          value={colMap[h] ?? 'ignore'}
                          onValueChange={(v) => setColMap(prev => ({ ...prev, [h]: v as ERPMappedField }))}
                        >
                          <SelectTrigger
                            className="h-7 w-32 text-xs shrink-0"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="px-3 py-2.5 rounded-xl text-xs text-muted-foreground"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {rawRows.length} row{rawRows.length !== 1 ? 's' : ''} detected
                {!hasNameMapped && (
                  <span className="ml-2" style={{ color: '#EF5350' }}>
                    — map at least one column to Name to continue
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Step: Review ──────────────────────────────────────── */}
          {step === 'review' && (
            <div className="px-6 py-5 space-y-4">
              {/* Summary tiles */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'New',     count: proposed.filter(r => r.action === 'new' && !r.invalid).length,   color: '#5DBF8A' },
                  { label: 'Updates', count: proposed.filter(r => r.action === 'update').length,               color: '#FF8F00' },
                  { label: 'No change', count: proposed.filter(r => r.action === 'skip' || r.invalid).length, color: '#78909C' },
                ] as const).map(({ label, count, color }) => (
                  <div
                    key={label}
                    className="text-center py-2.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-lg font-bold leading-none" style={{ color }}>{count}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Bulk controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProposed(prev => prev.map(r => r.invalid ? r : { ...r, approved: true }))}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }}
                >
                  Approve all
                </button>
                <button
                  onClick={() => setProposed(prev => prev.map(r => ({ ...r, approved: false })))}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }}
                >
                  Clear all
                </button>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {approvedCount} approved
                </span>
              </div>

              {/* Row list */}
              <div className="space-y-2">
                {proposed.map((row) => {
                  const style = row.invalid
                    ? { label: 'INVALID', color: '#EF5350', bg: 'rgba(239,83,80,0.08)', border: 'rgba(239,83,80,0.2)' }
                    : ACTION_STYLE[row.action];
                  return (
                    <div
                      key={row.idx}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: style.bg, border: `1px solid ${style.border}` }}
                    >
                      <Checkbox
                        checked={row.approved && !row.invalid}
                        onCheckedChange={(c) =>
                          setProposed(prev => prev.map(r =>
                            r.idx === row.idx ? { ...r, approved: !!c } : r
                          ))
                        }
                        disabled={row.invalid || row.action === 'skip'}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-grow min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold truncate">
                            {row.mapped.name || '(no name)'}
                          </span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ color: style.color, background: `${style.color}20` }}
                          >
                            {row.invalid ? 'INVALID' : style.label}
                          </span>
                        </div>
                        {row.mapped.email && (
                          <p className="text-[10px] text-muted-foreground">{row.mapped.email}</p>
                        )}
                        {row.action === 'update' && row.changes.map(c => (
                          <p key={c.field} className="text-[10px]" style={{ color: '#FF8F00' }}>
                            {c.field}: &ldquo;{c.from || '—'}&rdquo; → &ldquo;{c.to}&rdquo;
                          </p>
                        ))}
                        {row.invalid && (
                          <p className="text-[10px]" style={{ color: '#EF5350' }}>
                            Missing name — map the Name column to import this row
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step: Done ────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="px-6 py-12 flex flex-col items-center text-center gap-5">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(93,191,138,0.15)',
                  border: '1px solid rgba(93,191,138,0.35)',
                  boxShadow: '0 0 24px rgba(93,191,138,0.25)',
                }}
              >
                <CheckCircle2 className="h-8 w-8" style={{ color: '#5DBF8A' }} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Sync Complete</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {appliedCount} record{appliedCount !== 1 ? 's' : ''} applied to the ERP.
                </p>
              </div>
              <div
                className="w-full px-4 py-3 rounded-xl text-left space-y-1 text-xs text-muted-foreground"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p>Sheet URL and column mapping saved — Bridge will remember your settings next time.</p>
                <p>Run Bridge again any time to sync new rows or changes from the sheet.</p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* ── Footer actions ─────────────────────────────────────── */}
        <div
          className="px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          {step === 'config' && (
            <Button
              onClick={handleFetch}
              disabled={!sheetUrl.trim() || isFetching}
              className="w-full"
              style={{
                background: 'rgba(0,235,255,0.12)',
                border: '1px solid rgba(0,235,255,0.3)',
                color: 'var(--primary)',
                boxShadow: '0 0 12px rgba(0,235,255,0.1)',
              }}
            >
              {isFetching ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching…</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Fetch Data</>
              )}
            </Button>
          )}

          {step === 'mapping' && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep('config')} className="shrink-0">
                Back
              </Button>
              <Button
                onClick={handleContinueToReview}
                disabled={!hasNameMapped}
                className="flex-grow"
                style={{
                  background: 'rgba(244,196,48,0.15)',
                  border: '1px solid rgba(244,196,48,0.3)',
                  color: '#F4C430',
                }}
              >
                Review {rawRows.length} Records
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 'review' && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep('mapping')} className="shrink-0">
                Back
              </Button>
              <Button
                onClick={handleApply}
                disabled={approvedCount === 0 || isApplying}
                className="flex-grow"
                style={{
                  background: 'rgba(93,191,138,0.15)',
                  border: '1px solid rgba(93,191,138,0.3)',
                  color: '#5DBF8A',
                }}
              >
                {isApplying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying…</>
                ) : (
                  <>Apply {approvedCount} Record{approvedCount !== 1 ? 's' : ''}</>
                )}
              </Button>
            </div>
          )}

          {step === 'done' && (
            <Button
              onClick={() => { setStep('config'); onOpenChange(false); }}
              variant="outline"
              className="w-full"
            >
              Done
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
