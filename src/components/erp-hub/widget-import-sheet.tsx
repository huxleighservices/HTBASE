'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Users,
  Wrench,
  DollarSign,
  Database,
  Award,
  FileText,
  Loader2,
  CheckCircle2,
  ArrowDownToLine,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, getDocs, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/client';
import type { ERPPerson } from '@/types/erp';
import type { Widget } from '@/types/widget';
import type { DepartmentId } from '@/lib/departments';

// ─── Types ──────────────────────────────────────────────────────────────────

type MappedRecord = { name: string; email: string; phone: string };
type RecordAction = 'new' | 'update' | 'skip';
type ImportStep = 'source' | 'review' | 'done';

type ProposedRow = {
  sourceId: string;
  mapped: MappedRecord;
  action: RecordAction;
  existingId?: string;
  changes: { field: string; from: string; to: string }[];
  approved: boolean;
  invalid: boolean;
  alreadyLinked?: boolean;      // person already has a link to this exact collection
  otherWidgetLinks?: string[];  // other collection names they're already linked to
};

type WidgetSourceDef = {
  id: string;
  label: string;
  collectionName: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  rgb: string;
  widgetType: string; // matches Widget.type in the client's widgets collection
  isGlobal?: boolean; // top-level Firestore collection filtered by clientPath
  toMapped: (data: Record<string, any>) => MappedRecord;
};

// ─── Source definitions ──────────────────────────────────────────────────────

const SOURCES: WidgetSourceDef[] = [
  {
    id: 'leads',
    label: 'Leads',
    collectionName: 'leads',
    description: 'Import contacts from the Leads Tracker',
    icon: <Users className="h-5 w-5" />,
    color: '#42A5F5',
    rgb: '66,165,245',
    widgetType: 'leads',
    toMapped: (d) => ({
      name:  [d.firstName, d.lastName].filter(Boolean).join(' '),
      email: d.email ?? '',
      phone: d.phoneNumber ?? '',
    }),
  },
  {
    id: 'builds',
    label: 'Builds',
    collectionName: 'builds',
    description: 'Import customers from the Builds Tracker',
    icon: <Wrench className="h-5 w-5" />,
    color: '#C1440E',
    rgb: '193,68,14',
    widgetType: 'builds',
    toMapped: (d) => ({
      name:  d.clientName ?? '',
      email: d.email ?? '',
      phone: d.phoneNumber ?? '',
    }),
  },
  {
    id: 'ar',
    label: 'A/R Collections',
    collectionName: 'arCustomers',
    description: 'Import customers from A/R Collections',
    icon: <DollarSign className="h-5 w-5" />,
    color: '#5DBF8A',
    rgb: '93,191,138',
    widgetType: 'ar-collections',
    toMapped: (d) => ({
      name:  d.customerName ?? '',
      email: d.email ?? '',
      phone: d.phone ?? '',
    }),
  },
  {
    id: 'opac',
    label: 'OPAC',
    collectionName: 'opacCustomers',
    description: 'Import from the OPAC Tracker',
    icon: <Database className="h-5 w-5" />,
    color: '#8B5CF6',
    rgb: '139,92,246',
    widgetType: 'opac',
    toMapped: (d) => ({
      name:  [d.firstName, d.lastName].filter(Boolean).join(' '),
      email: '',
      phone: d.phoneNumber ?? '',
    }),
  },
  {
    id: 'certificates',
    label: 'Certificates',
    collectionName: 'completionCertificates',
    description: 'Import customers from Completion Certificates',
    icon: <Award className="h-5 w-5" />,
    color: '#00BCD4',
    rgb: '0,188,212',
    widgetType: 'completion-certificate',
    isGlobal: true,
    toMapped: (d) => ({
      name:  d.customerName ?? '',
      email: d.customerEmail ?? '',
      phone: d.customerPhone ?? '',
    }),
  },
  {
    id: 'addendums',
    label: 'Addendums',
    collectionName: 'supplementalAddendums',
    description: 'Import customers from Supplemental Addendums',
    icon: <FileText className="h-5 w-5" />,
    color: '#AB47BC',
    rgb: '171,71,188',
    widgetType: 'supplemental-addendum',
    isGlobal: true,
    toMapped: (d) => ({
      name:  d.customerName ?? '',
      email: d.customerEmail ?? '',
      phone: d.customerPhone ?? '',
    }),
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProposed(
  records: { sourceId: string; mapped: MappedRecord }[],
  people: ERPPerson[],
  collectionName: string,
): ProposedRow[] {
  return records.map(({ sourceId, mapped }) => {
    const invalid = !mapped.name.trim();
    const nameLower = mapped.name.toLowerCase().trim();
    const existing = nameLower
      ? people.find(p => p.name.toLowerCase().trim() === nameLower)
      : undefined;

    let action: RecordAction = 'new';
    let changes: ProposedRow['changes'] = [];
    let alreadyLinked = false;
    let otherWidgetLinks: string[] = [];

    if (existing) {
      alreadyLinked = !!(existing.widgetLinks?.[collectionName]);
      otherWidgetLinks = existing.widgetLinks
        ? Object.keys(existing.widgetLinks).filter(k => k !== collectionName)
        : [];

      if (alreadyLinked) {
        action = 'skip';
      } else {
        const fields = ['email', 'phone'] as const;
        changes = fields
          .filter(f => mapped[f] && mapped[f] !== ((existing[f] as string) ?? ''))
          .map(f => ({ field: f, from: (existing[f] as string) ?? '', to: mapped[f] }));
        action = 'update'; // update fields + add new widget link
      }
    }

    return {
      sourceId, mapped, action, existingId: existing?.id, changes,
      approved: !invalid && action !== 'skip',
      invalid, alreadyLinked, otherWidgetLinks,
    };
  });
}

const ACTION_STYLE: Record<RecordAction, { label: string; color: string; bg: string; border: string }> = {
  new:    { label: 'NEW',    color: '#5DBF8A', bg: 'rgba(93,191,138,0.08)',  border: 'rgba(93,191,138,0.2)' },
  update: { label: 'UPDATE', color: '#FF8F00', bg: 'rgba(255,143,0,0.08)',   border: 'rgba(255,143,0,0.2)' },
  skip:   { label: 'SKIP',   color: '#78909C', bg: 'rgba(120,144,156,0.05)', border: 'rgba(120,144,156,0.15)' },
};

// ─── Component ───────────────────────────────────────────────────────────────

type WidgetImportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  people: ERPPerson[];
  peopleRef: any;
};

export function WidgetImportSheet({ open, onOpenChange, client, people, peopleRef }: WidgetImportSheetProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const widgetsRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'widgets');
  }, [firestore, client.path]);
  const { data: clientWidgets } = useCollection<Widget>(widgetsRef);

  const activeWidgetTypes = new Set(
    (clientWidgets ?? []).filter((w) => w.enabled).map((w) => w.type),
  );
  const availableSources = clientWidgets
    ? SOURCES.filter((s) => activeWidgetTypes.has(s.widgetType as any))
    : SOURCES;

  const [step, setStep] = useState<ImportStep>('source');
  const [activeSource, setActiveSource] = useState<WidgetSourceDef | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [proposed, setProposed] = useState<ProposedRow[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const handleSelectSource = async (source: WidgetSourceDef) => {
    if (!firestore || !client.path) return;
    setFetchingId(source.id);
    setFetchError('');
    try {
      const colRef = source.isGlobal
        ? query(collection(firestore, source.collectionName), where('clientPath', '==', client.path))
        : collection(firestore, client.path, source.collectionName);
      const snap = await getDocs(colRef);
      const records = snap.docs.map(d => ({
        sourceId: d.id,
        mapped: source.toMapped({ id: d.id, ...d.data() }),
      }));
      setActiveSource(source);
      setProposed(buildProposed(records, people, source.collectionName));
      setStep('review');
    } catch (e: any) {
      setFetchError(e?.message ?? 'Failed to fetch records.');
    } finally {
      setFetchingId(null);
    }
  };

  const handleApply = async () => {
    if (!peopleRef) return;
    setIsApplying(true);
    const toApply = proposed.filter(r => r.approved && !r.invalid && !r.alreadyLinked);
    let count = 0;
    for (const row of toApply) {
      if (row.action === 'new') {
        addDocumentNonBlocking(peopleRef, {
          name: row.mapped.name,
          email: row.mapped.email,
          phone: row.mapped.phone,
          departments: [] as DepartmentId[],
          deptData: {},
          widgetLinks: { [activeSource!.collectionName]: row.sourceId },
          createdAt: serverTimestamp(),
        });
        count++;
      } else if (row.action === 'update' && row.existingId) {
        const updates: Record<string, string> = {};
        row.changes.forEach(c => { updates[c.field] = c.to; });
        // Always merge the widget link for this collection
        updates[`widgetLinks.${activeSource!.collectionName}`] = row.sourceId;
        updateDocumentNonBlocking(doc(peopleRef, row.existingId), updates);
        count++;
      }
    }
    setAppliedCount(count);
    setIsApplying(false);
    setStep('done');
    toast({
      title: 'Import complete',
      description: `${count} record${count !== 1 ? 's' : ''} imported from ${activeSource?.label}.`,
    });
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setStep('source');
      setActiveSource(null);
      setFetchError('');
      setProposed([]);
    }
    onOpenChange(o);
  };

  const approvedCount = proposed.filter(r => r.approved && !r.invalid && !r.alreadyLinked).length;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
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
                background: 'linear-gradient(135deg, rgba(244,196,48,0.25) 0%, rgba(244,196,48,0.06) 100%)',
                border: '1px solid rgba(244,196,48,0.3)',
                boxShadow: '0 0 12px rgba(244,196,48,0.2)',
              }}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" style={{ color: '#F4C430' }} />
            </div>
            Import from Widget
          </SheetTitle>
          <SheetDescription>
            Pull existing contacts and customers from other portal widgets into the ERP.
          </SheetDescription>
        </SheetHeader>

        {/* ── Body ──────────────────────────────────────────────── */}
        <ScrollArea className="flex-grow">

          {/* Source picker */}
          {step === 'source' && (
            <div className="px-6 py-5 space-y-4">
              {fetchError && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{ background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.25)', color: '#EF5350' }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {fetchError}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Select a widget to pull from. Records are matched by name against existing ERP entries
                so duplicates are never created.
              </p>
              {availableSources.length === 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted-foreground)' }}
                >
                  No compatible widgets are active on this portal yet.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableSources.map((source) => {
                  const loading = fetchingId === source.id;
                  return (
                    <button
                      key={source.id}
                      onClick={() => handleSelectSource(source)}
                      disabled={fetchingId !== null}
                      className="flex flex-col items-start gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-wait"
                      style={{
                        background: `rgba(${source.rgb}, 0.05)`,
                        border: `1px solid rgba(${source.rgb}, 0.2)`,
                        boxShadow: loading ? `0 0 16px rgba(${source.rgb}, 0.25)` : 'none',
                      }}
                    >
                      <div
                        className="p-2 rounded-lg"
                        style={{ background: `rgba(${source.rgb}, 0.12)`, color: source.color }}
                      >
                        {loading
                          ? <Loader2 className="h-5 w-5 animate-spin" />
                          : source.icon
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: loading ? source.color : undefined }}>
                          {source.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                          {source.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review */}
          {step === 'review' && activeSource && (
            <div className="px-6 py-5 space-y-4">
              {/* Source badge + back */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setStep('source'); setFetchError(''); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Change source
                </button>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full ml-auto"
                  style={{
                    background: `rgba(${activeSource.rgb}, 0.12)`,
                    color: activeSource.color,
                    border: `1px solid rgba(${activeSource.rgb}, 0.25)`,
                  }}
                >
                  {activeSource.label}
                </span>
              </div>

              {/* Summary tiles */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'New',       count: proposed.filter(r => r.action === 'new' && !r.invalid).length,   color: '#5DBF8A' },
                  { label: 'Updates',   count: proposed.filter(r => r.action === 'update').length,              color: '#FF8F00' },
                  { label: 'No change', count: proposed.filter(r => r.action === 'skip' || r.invalid).length,  color: '#78909C' },
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
                  className="text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }}
                >
                  Approve all
                </button>
                <button
                  onClick={() => setProposed(prev => prev.map(r => ({ ...r, approved: false })))}
                  className="text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }}
                >
                  Clear all
                </button>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {approvedCount} approved
                </span>
              </div>

              {proposed.length === 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted-foreground)' }}
                >
                  No records found in {activeSource.label}. This widget may not have any data yet.
                </div>
              )}

              {/* Row list */}
              <div className="space-y-2">
                {proposed.map((row) => {
                  const isLinkOnly = row.action === 'update' && row.changes.length === 0;
                  const style = row.invalid
                    ? { label: 'INVALID', color: '#EF5350', bg: 'rgba(239,83,80,0.08)', border: 'rgba(239,83,80,0.2)' }
                    : row.alreadyLinked
                    ? { label: 'LINKED', color: '#78909C', bg: 'rgba(120,144,156,0.05)', border: 'rgba(120,144,156,0.15)' }
                    : isLinkOnly
                    ? { label: 'LINK', color: '#00BCD4', bg: 'rgba(0,188,212,0.06)', border: 'rgba(0,188,212,0.2)' }
                    : ACTION_STYLE[row.action];
                  return (
                    <div
                      key={row.sourceId}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: style.bg, border: `1px solid ${style.border}` }}
                    >
                      <Checkbox
                        checked={row.approved && !row.invalid}
                        onCheckedChange={(c) =>
                          setProposed(prev =>
                            prev.map(r => r.sourceId === row.sourceId ? { ...r, approved: !!c } : r)
                          )
                        }
                        disabled={row.invalid || row.alreadyLinked || row.action === 'skip'}
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
                            {style.label}
                          </span>
                          {/* Cross-widget duplicate badge */}
                          {(row.otherWidgetLinks?.length ?? 0) > 0 && (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: 'rgba(244,196,48,0.1)', border: '1px solid rgba(244,196,48,0.25)', color: '#F4C430' }}
                            >
                              Multi-widget
                            </span>
                          )}
                        </div>
                        {row.mapped.email && (
                          <p className="text-[10px] text-muted-foreground">{row.mapped.email}</p>
                        )}
                        {row.action === 'update' && row.changes.map(c => (
                          <p key={c.field} className="text-[10px]" style={{ color: '#FF8F00' }}>
                            {c.field}: &ldquo;{c.from || '—'}&rdquo; → &ldquo;{c.to}&rdquo;
                          </p>
                        ))}
                        {isLinkOnly && !row.alreadyLinked && (
                          <p className="text-[10px]" style={{ color: '#00BCD4' }}>
                            Will add {activeSource?.label} link to existing record
                          </p>
                        )}
                        {row.alreadyLinked && (
                          <p className="text-[10px]" style={{ color: '#78909C' }}>
                            Already linked to {activeSource?.label}
                          </p>
                        )}
                        {(row.otherWidgetLinks?.length ?? 0) > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Also in: {row.otherWidgetLinks!.join(', ')}
                          </p>
                        )}
                        {row.invalid && (
                          <p className="text-[10px]" style={{ color: '#EF5350' }}>
                            No name found — cannot import this record
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Done */}
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
                <h3 className="font-bold text-lg">Import Complete</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {appliedCount} record{appliedCount !== 1 ? 's' : ''} imported from {activeSource?.label}.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Departments can be assigned from the Card view.
              </p>
            </div>
          )}
        </ScrollArea>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div
          className="px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          {step === 'source' && (
            <p className="text-xs text-center text-muted-foreground">
              Select a source above to begin
            </p>
          )}

          {step === 'review' && (
            <Button
              onClick={handleApply}
              disabled={approvedCount === 0 || isApplying}
              className="w-full"
              style={{
                background: 'rgba(93,191,138,0.15)',
                border: '1px solid rgba(93,191,138,0.3)',
                color: '#5DBF8A',
              }}
            >
              {isApplying ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
              ) : (
                <>Import {approvedCount} Record{approvedCount !== 1 ? 's' : ''}</>
              )}
            </Button>
          )}

          {step === 'done' && (
            <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
