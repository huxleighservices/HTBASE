'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Layers,
  Table2,
  LayoutGrid,
  Settings2,
  Plus,
  Loader2,
  Building2,
  Link2,
  ArrowDownToLine,
  ArrowUpDown,
  ScanSearch,
} from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
  useDoc,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  DEPARTMENTS,
  CORE_DEPARTMENTS,
  CUSTOM_DEPARTMENTS,
  DEFAULT_ENABLED,
  deptPill,
} from '@/lib/departments';
import type { DepartmentId } from '@/lib/departments';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import type { ERPPerson, ERPConfig, ERPViewMode } from '@/types/erp';
import { logActivity } from '@/lib/activity-log';
import { CardView } from './card-view';
import { SpreadsheetView } from './spreadsheet-view';
import { HybridView } from './hybrid-view';
import { AddPersonDialog } from './add-person-dialog';
import { BridgeSheet } from './bridge-sheet';
import { WidgetImportSheet } from './widget-import-sheet';
import { DuplicateReviewSheet } from './duplicate-review-sheet';
import { WIDGET_CHIP_DEFS, DEFAULT_WIDGET_DEPTS } from './spreadsheet-view';

const WIDGET_ASSIGNMENT_DEFS: { key: string; label: string }[] = [
  { key: 'leads',                  label: 'Leads Tracker' },
  { key: 'builds',                 label: 'Builds Tracker' },
  { key: 'arCustomers',            label: 'A/R Collections' },
  { key: 'opacCustomers',          label: 'OPAC Tracker' },
  { key: 'completionCertificates', label: 'Completion Certificate' },
  { key: 'supplementalAddendums',  label: 'Supplemental Addendum' },
];

type ERPHubDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
  fullScreen?: boolean;
  onJumpToWidget?: (widgetType: string) => void;
};

type SortKey = 'name-asc' | 'name-desc' | 'widgets' | 'depts' | 'recent';

const VIEW_OPTIONS: { mode: ERPViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'card',        icon: <Layers className="h-4 w-4" />,     label: 'Card' },
  { mode: 'spreadsheet', icon: <Table2 className="h-4 w-4" />,     label: 'Sheet' },
  { mode: 'hybrid',      icon: <LayoutGrid className="h-4 w-4" />, label: 'Hybrid' },
];

export function ERPHubDialog({ open, onOpenChange, client, activeUser, fullScreen = false, onJumpToWidget }: ERPHubDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isAdmin = activeUser?.role === 'admin';

  const [viewMode, setViewMode] = useState<ERPViewMode>('hybrid');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDupeReviewOpen, setIsDupeReviewOpen] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [enabledDepts, setEnabledDepts] = useState<DepartmentId[]>(DEFAULT_ENABLED);
  const [customLabels, setCustomLabels] = useState<Partial<Record<DepartmentId, string>>>({});
  const [widgetDepts, setWidgetDepts] = useState<Record<string, string>>(DEFAULT_WIDGET_DEPTS);

  const peopleRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'erpPeople');
  }, [firestore, client.path]);

  const configDocRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return doc(firestore, client.path, 'erpConfig', 'settings');
  }, [firestore, client.path]);

  const { data: people, isLoading: peopleLoading } = useCollection<ERPPerson>(peopleRef);
  const { data: config } = useDoc<ERPConfig>(configDocRef);

  useEffect(() => {
    if (config && !configLoaded) {
      setEnabledDepts(config.enabledDepartments ?? DEFAULT_ENABLED);
      setCustomLabels(config.customLabels ?? {});
      setWidgetDepts(config.widgetDepts ?? DEFAULT_WIDGET_DEPTS);
      setConfigLoaded(true);
    }
  }, [config, configLoaded]);

  useEffect(() => {
    if (!open && !fullScreen) setConfigLoaded(false);
  }, [open, fullScreen]);

  const resolvedDepts = useMemo(() =>
    enabledDepts.map((id) => {
      const base = DEPARTMENTS[id];
      const label = customLabels[id] ?? base.label;
      return { ...base, label };
    }),
    [enabledDepts, customLabels],
  );

  const sortedPeople = useMemo(() => {
    const arr = [...(people ?? [])];
    switch (sortKey) {
      case 'name-asc':  arr.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': arr.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'widgets':   arr.sort((a, b) => Object.keys(b.widgetLinks ?? {}).length - Object.keys(a.widgetLinks ?? {}).length); break;
      case 'depts':     arr.sort((a, b) => b.departments.length - a.departments.length); break;
      case 'recent':    arr.sort((a, b) => {
        const ta = (a.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
        const tb = (b.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
        return tb - ta;
      }); break;
    }
    return arr;
  }, [people, sortKey]);

  const handleAddPerson = (data: {
    name: string; email: string; phone: string; departments: DepartmentId[];
  }) => {
    if (!peopleRef) return;
    addDocumentNonBlocking(peopleRef, {
      ...data,
      deptData: {},
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Record added', description: `${data.name} was added to the ERP.` });
    if (firestore && client.path) {
      logActivity(firestore, client.path, 'base', `New record added: ${data.name}`);
    }
  };

  const handleDeletePerson = (id: string) => {
    if (!peopleRef) return;
    deleteDocumentNonBlocking(doc(peopleRef, id));
    toast({ title: 'Record deleted', variant: 'destructive' });
  };

  const handleMerge = (keepId: string, mergeFromId: string) => {
    if (!peopleRef) return;
    const keep = people?.find((p) => p.id === keepId);
    const from = people?.find((p) => p.id === mergeFromId);
    if (!keep || !from) return;
    updateDocumentNonBlocking(doc(peopleRef, keepId), {
      email: keep.email || from.email || '',
      phone: keep.phone || from.phone || '',
      departments: [...new Set([...keep.departments, ...from.departments])],
      deptData: { ...(from.deptData ?? {}), ...(keep.deptData ?? {}) },
      widgetLinks: { ...(from.widgetLinks ?? {}), ...(keep.widgetLinks ?? {}) },
    });
    deleteDocumentNonBlocking(doc(peopleRef, mergeFromId));
    toast({ title: 'Records merged', description: `"${from.name}" merged into "${keep.name}".` });
  };

  const handleDeleteSelected = (ids: string[]) => {
    if (!peopleRef || ids.length === 0) return;
    ids.forEach((id) => deleteDocumentNonBlocking(doc(peopleRef, id)));
    toast({ title: `${ids.length} record${ids.length !== 1 ? 's' : ''} deleted`, variant: 'destructive' });
  };

  const handleSaveConfig = () => {
    if (!configDocRef) return;
    setDocumentNonBlocking(
      configDocRef,
      { id: 'settings', enabledDepartments: enabledDepts, customLabels, widgetDepts },
      { merge: true },
    );
    toast({ title: 'Department settings saved' });
    setIsSettingsOpen(false);
  };

  const toggleDept = (id: DepartmentId) => {
    setEnabledDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const panelContent = (
    <>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 sm:px-6 py-3 shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(244,196,48,0.3) 0%, rgba(244,196,48,0.08) 100%)',
            border: '1px solid rgba(244,196,48,0.3)',
            boxShadow: '0 0 16px rgba(244,196,48,0.2)',
          }}
        >
          <Building2 className="h-4 w-4" style={{ color: '#F4C430' }} />
        </div>

        <div className="flex-grow min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight leading-tight">
            Base
          </h1>
          <p className="text-[11px] text-muted-foreground leading-none mt-0.5 hidden sm:block">
            {client.firmName} &mdash; AI-first enterprise resource planning
          </p>
        </div>

        {/* View mode toggles */}
        <div
          className="flex items-center rounded-lg p-0.5 gap-0.5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {VIEW_OPTIONS.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
              style={
                viewMode === mode
                  ? {
                      background: 'rgba(244,196,48,0.18)',
                      color: '#F4C430',
                      boxShadow: '0 0 10px rgba(244,196,48,0.2)',
                    }
                  : { color: 'var(--muted-foreground)' }
              }
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsImportOpen(true)}
            className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            style={{ border: '1px solid rgba(244,196,48,0.2)' }}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" style={{ color: '#F4C430' }} />
            <span className="hidden sm:inline" style={{ color: '#F4C430' }}>Import</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDupeReviewOpen(true)}
            className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            style={{ border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <ScanSearch className="h-3.5 w-3.5" style={{ color: '#8B5CF6' }} />
            <span className="hidden sm:inline" style={{ color: '#8B5CF6' }}>Dupes</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsBridgeOpen(true)}
            className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            style={{ border: '1px solid rgba(0,235,255,0.2)' }}
          >
            <Link2 className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
            <span className="hidden sm:inline" style={{ color: 'var(--primary)' }}>Bridge</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="h-8 px-3 text-xs"
            style={{
              background: 'rgba(244,196,48,0.15)',
              border: '1px solid rgba(244,196,48,0.3)',
              color: '#F4C430',
              boxShadow: '0 0 10px rgba(244,196,48,0.15)',
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
          {isAdmin && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Active department chips + sort ──────────────────────────── */}
      <div
        className="flex items-center gap-1.5 px-4 sm:px-6 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto flex-grow min-w-0">
          {resolvedDepts.map((dept) => (
            <span
              key={dept.id}
              className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={deptPill(dept)}
            >
              {dept.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-6 text-[10px] rounded-md bg-transparent outline-none cursor-pointer appearance-none"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)', padding: '0 6px' }}
          >
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="widgets">Most Linked</option>
            <option value="depts">Most Depts</option>
            <option value="recent">Recent</option>
          </select>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────── */}
      <div className="flex-grow min-h-0 px-3 sm:px-5 py-3 overflow-hidden flex flex-col">
        {peopleLoading ? (
          <div className="flex flex-col items-center justify-center flex-grow gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#F4C430' }} />
            <p className="text-sm">Loading ERP data…</p>
          </div>
        ) : viewMode === 'card' ? (
          <CardView
            people={sortedPeople}
            enabledDepartments={resolvedDepts}
            firmName={client.firmName}
            itemsRef={peopleRef}
            clientPath={client.path ?? ''}
            widgetDepts={widgetDepts}
            selectedPersonId={selectedPersonId}
            activeUser={activeUser}
            onJumpToWidget={onJumpToWidget}
          />
        ) : viewMode === 'spreadsheet' ? (
          <SpreadsheetView
            people={sortedPeople}
            enabledDepartments={resolvedDepts}
            widgetDepts={widgetDepts}
            onDeletePerson={handleDeletePerson}
            onDeleteSelected={handleDeleteSelected}
            clientPath={client.path ?? ''}
            onSelectPerson={(person) => { setSelectedPersonId(person.id); setViewMode('card'); }}
            onJumpToWidget={onJumpToWidget}
          />
        ) : (
          <HybridView
            people={sortedPeople}
            enabledDepartments={resolvedDepts}
            clientPath={client.path ?? ''}
            widgetDepts={widgetDepts}
            onSelectPerson={(person) => { setSelectedPersonId(person.id); setViewMode('card'); }}
            onJumpToWidget={onJumpToWidget}
          />
        )}
      </div>
    </>
  );

  const sharedOverlays = (
    <>
      {/* ── Department settings sheet ──────────────────────────────────── */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent
          className="w-full sm:max-w-md flex flex-col gap-0 p-0"
          style={{
            background: 'rgba(10, 10, 22, 0.97)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <SheetHeader className="px-6 py-5 border-b border-white/8">
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Department Setup
            </SheetTitle>
            <SheetDescription>
              Toggle departments, set custom names, and assign each widget to a department column.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-grow px-6 py-4">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Core Departments
                </p>
                <div className="space-y-3">
                  {CORE_DEPARTMENTS.map((id) => {
                    const dept = DEPARTMENTS[id];
                    const enabled = enabledDepts.includes(id);
                    return (
                      <div key={id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ background: dept.color, boxShadow: `0 0 6px rgba(${dept.rgb}, 0.7)` }}
                          />
                          <span className="text-sm font-medium">{dept.label}</span>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleDept(id)}
                          style={enabled ? { '--switch-bg': dept.color } as any : {}}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Custom Fields
                </p>
                <div className="space-y-3">
                  {CUSTOM_DEPARTMENTS.map((id) => {
                    const dept = DEPARTMENTS[id];
                    const enabled = enabledDepts.includes(id);
                    return (
                      <div key={id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ background: dept.color, boxShadow: `0 0 6px rgba(${dept.rgb}, 0.7)` }}
                            />
                            <span className="text-sm font-medium">{customLabels[id] ?? dept.label}</span>
                          </div>
                          <Switch checked={enabled} onCheckedChange={() => toggleDept(id)} />
                        </div>
                        {enabled && (
                          <Input
                            value={customLabels[id] ?? ''}
                            onChange={(e) =>
                              setCustomLabels((prev) => ({ ...prev, [id]: e.target.value }))
                            }
                            placeholder={`Label for ${dept.label}…`}
                            className="h-8 text-xs"
                            style={{
                              background: `rgba(${dept.rgb}, 0.06)`,
                              border: `1px solid rgba(${dept.rgb}, 0.2)`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Widget Assignments ────────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Widget Assignments
                </p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Choose which department column each widget appears in.
                </p>
                <div className="space-y-3">
                  {WIDGET_ASSIGNMENT_DEFS.map(({ key, label }) => {
                    const chip = WIDGET_CHIP_DEFS[key];
                    return (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: chip?.color ?? '#fff', boxShadow: `0 0 5px ${chip?.color ?? '#fff'}` }}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                        <select
                          value={widgetDepts[key] ?? ''}
                          onChange={(e) =>
                            setWidgetDepts((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="h-7 text-xs rounded-md outline-none cursor-pointer appearance-none"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'var(--foreground)',
                            padding: '0 8px',
                            minWidth: '120px',
                          }}
                        >
                          <option value="">Unassigned</option>
                          {resolvedDepts.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t border-white/8">
            <Button
              onClick={handleSaveConfig}
              className="w-full"
              style={{
                background: 'rgba(244,196,48,0.15)',
                border: '1px solid rgba(244,196,48,0.3)',
                color: '#F4C430',
                boxShadow: '0 0 12px rgba(244,196,48,0.15)',
              }}
            >
              Save Department Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Add person dialog ─────────────────────────────────────────── */}
      <AddPersonDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        enabledDepartments={resolvedDepts}
        onAdd={handleAddPerson}
      />

      {/* ── Bridge sheet ──────────────────────────────────────────────── */}
      <BridgeSheet
        open={isBridgeOpen}
        onOpenChange={setIsBridgeOpen}
        client={client}
        people={people ?? []}
        peopleRef={peopleRef}
      />

      {/* ── Widget import sheet ───────────────────────────────────────── */}
      <WidgetImportSheet
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        client={client}
        people={people ?? []}
        peopleRef={peopleRef}
      />

      {/* ── Duplicate review sheet ────────────────────────────────────── */}
      <DuplicateReviewSheet
        open={isDupeReviewOpen}
        onOpenChange={setIsDupeReviewOpen}
        people={people ?? []}
        onDeletePerson={handleDeletePerson}
        onMerge={handleMerge}
      />
    </>
  );

  if (fullScreen) {
    return (
      <>
        <div
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          style={{
            background: 'rgba(8, 8, 18, 0.97)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {panelContent}
        </div>
        {sharedOverlays}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-6xl h-[92dvh] sm:h-[88vh] flex flex-col p-0 overflow-hidden gap-0"
          style={{
            background: 'rgba(8, 8, 18, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {panelContent}
        </DialogContent>
      </Dialog>
      {sharedOverlays}
    </>
  );
}
