'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Settings2, Bell, Mail } from 'lucide-react';
import {
  useFirestore,
  setDocumentNonBlocking,
  useDoc,
  useMemoFirebase,
  useUser,
  useCollection,
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  DEPARTMENTS,
  CORE_DEPARTMENTS,
  CUSTOM_DEPARTMENTS,
  DEFAULT_ENABLED,
} from '@/lib/departments';
import type { DepartmentId } from '@/lib/departments';
import type { Client } from '@/types/client';
import type { ERPConfig } from '@/types/erp';
import type { Widget } from '@/types/widget';
import { WIDGET_CATALOG_MAP } from '@/lib/widget-catalog';
import { WIDGET_CHIP_DEFS, DEFAULT_WIDGET_DEPTS } from './spreadsheet-view';

const WIDGET_ASSIGNMENT_DEFS: { key: string; label: string }[] = [
  { key: 'leads',                  label: 'Leads Tracker' },
  { key: 'builds',                 label: 'Builds Tracker' },
  { key: 'arCustomers',            label: 'A/R Collections' },
  { key: 'opacCustomers',          label: 'OPAC Tracker' },
  { key: 'completionCertificates', label: 'Completion Certificate' },
  { key: 'supplementalAddendums',  label: 'Supplemental Addendum' },
  { key: 'deals',                  label: 'Deal Tracker' },
  { key: 'knockPins',              label: 'Knock Pro' },
];

type NotificationConfig = {
  email: string;
  widgets: Record<string, boolean>;
  baseEnabled: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
};

export function ERPAdminSheet({ open, onOpenChange, client }: Props) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const isEmailAdmin = !!user && !user.isAnonymous;

  // ── ERP config ────────────────────────────────────────────────────────────
  const [configLoaded, setConfigLoaded] = useState(false);
  const [enabledDepts, setEnabledDepts] = useState<DepartmentId[]>(DEFAULT_ENABLED);
  const [customLabels, setCustomLabels] = useState<Partial<Record<DepartmentId, string>>>({});
  const [widgetDepts, setWidgetDepts] = useState<Record<string, string>>(DEFAULT_WIDGET_DEPTS);

  const configDocRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return doc(firestore, client.path, 'erpConfig', 'settings');
  }, [firestore, client.path]);

  const { data: config } = useDoc<ERPConfig>(configDocRef);

  useEffect(() => {
    if (config && !configLoaded) {
      setEnabledDepts(config.enabledDepartments ?? DEFAULT_ENABLED);
      setCustomLabels(config.customLabels ?? {});
      setWidgetDepts(config.widgetDepts ?? DEFAULT_WIDGET_DEPTS);
      setConfigLoaded(true);
    }
  }, [config, configLoaded]);

  // ── Notification config (email/password admin only) ───────────────────────
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [notifEmail, setNotifEmail] = useState('');
  const [widgetToggles, setWidgetToggles] = useState<Record<string, boolean>>({});
  const [baseEnabled, setBaseEnabled] = useState(true);

  const notifConfigRef = useMemoFirebase(() => {
    if (!firestore || !client.path || !isEmailAdmin) return null;
    return doc(firestore, client.path, 'notificationSettings', 'config');
  }, [firestore, client.path, isEmailAdmin]);

  const { data: notifConfig } = useDoc<NotificationConfig>(notifConfigRef);

  const widgetsRef = useMemoFirebase(() => {
    if (!firestore || !client.path || !isEmailAdmin) return null;
    return collection(firestore, client.path, 'widgets');
  }, [firestore, client.path, isEmailAdmin]);

  const { data: firestoreWidgets } = useCollection<Widget>(widgetsRef);

  useEffect(() => {
    if (!open) { setConfigLoaded(false); setNotifLoaded(false); return; }
  }, [open]);

  useEffect(() => {
    if (notifConfig && !notifLoaded) {
      setNotifEmail(notifConfig.email ?? (client.displayId === '4WK21Y' ? (client.contactEmail ?? '') : ''));
      setWidgetToggles(notifConfig.widgets ?? {});
      setBaseEnabled(notifConfig.baseEnabled ?? true);
      setNotifLoaded(true);
    } else if (!notifConfig && !notifLoaded && open && isEmailAdmin) {
      setNotifEmail(client.displayId === '4WK21Y' ? (client.contactEmail ?? '') : '');
      setWidgetToggles({});
      setBaseEnabled(true);
      setNotifLoaded(true);
    }
  }, [notifConfig, notifLoaded, open, isEmailAdmin, client]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const resolvedDepts = useMemo(() =>
    enabledDepts.map((id) => {
      const base = DEPARTMENTS[id];
      const label = customLabels[id] ?? base.label;
      return { ...base, label };
    }),
    [enabledDepts, customLabels],
  );

  const activeWidgets = useMemo(() =>
    (firestoreWidgets ?? [])
      .filter((w) => w.enabled && w.type !== 'communications')
      .sort((a, b) => a.order - b.order),
    [firestoreWidgets],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleDept = (id: DepartmentId) =>
    setEnabledDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );

  const handleSaveERP = () => {
    if (!configDocRef) return;
    setDocumentNonBlocking(
      configDocRef,
      { id: 'settings', enabledDepartments: enabledDepts, customLabels, widgetDepts },
      { merge: true },
    );
    toast({ title: 'ERP settings saved' });
    onOpenChange(false);
  };

  const handleSaveNotifications = () => {
    if (!notifConfigRef) return;
    setDocumentNonBlocking(notifConfigRef, {
      email: notifEmail.trim(),
      widgets: widgetToggles,
      baseEnabled,
    }, { merge: true });
    toast({ title: 'Notification settings saved' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            My ERP — Department Setup
          </SheetTitle>
          <SheetDescription>
            Configure departments, custom labels, and widget assignments for {client.firmName}.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-grow px-6 py-4">
          <div className="space-y-6">

            {/* Core Departments */}
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

            {/* Custom Fields */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Custom Fields
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Enable up to 4 custom department slots and give them names.
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
                          placeholder={`Name for this custom field…`}
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

            {/* Widget Assignments */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Widget Assignments
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Choose which department column each widget appears in within the ERP.
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

            {/* ── Notification Settings — email/password admin only ─────────── */}
            {isEmailAdmin && (
              <div className="pt-2">
                <div className="border-t border-white/8 pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary/70" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Notification Settings
                    </p>
                  </div>

                  {/* Notification email */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Notification Email
                      </p>
                    </div>
                    <Input
                      type="email"
                      value={notifEmail}
                      onChange={(e) => setNotifEmail(e.target.value)}
                      placeholder="notifications@yourcompany.com"
                      className="h-8 text-sm border-border/60 bg-background/30"
                    />
                  </div>

                  {/* Base ERP toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">ERP Base Alerts</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">New records, status changes, notes</p>
                    </div>
                    <Switch checked={baseEnabled} onCheckedChange={setBaseEnabled} />
                  </div>

                  {/* Per-widget toggles */}
                  {activeWidgets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Widget Alerts
                      </p>
                      {activeWidgets.map((widget) => {
                        const def = WIDGET_CATALOG_MAP[widget.type];
                        return (
                          <div
                            key={widget.type}
                            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 gap-3"
                          >
                            <p className="text-sm font-medium truncate">{widget.title || def?.defaultTitle || widget.type}</p>
                            <Switch
                              checked={widgetToggles[widget.type] ?? false}
                              onCheckedChange={(v) => setWidgetToggles((prev) => ({ ...prev, [widget.type]: v }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    onClick={handleSaveNotifications}
                    size="sm"
                    className="w-full gap-2"
                    style={{
                      background: 'rgba(0,235,255,0.12)',
                      border: '1px solid rgba(0,235,255,0.25)',
                      color: 'var(--primary)',
                    }}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Save Notification Settings
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-white/8">
          <Button
            onClick={handleSaveERP}
            className="w-full"
            style={{
              background: 'rgba(244,196,48,0.15)',
              border: '1px solid rgba(244,196,48,0.3)',
              color: '#F4C430',
              boxShadow: '0 0 12px rgba(244,196,48,0.15)',
            }}
          >
            Save ERP Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
