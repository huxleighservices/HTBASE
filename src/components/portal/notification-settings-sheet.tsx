'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Mail, Save, Loader2 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/client';
import type { Widget } from '@/types/widget';
import { WIDGET_CATALOG_MAP } from '@/lib/widget-catalog';

type NotificationConfig = {
  email: string;
  widgets: Record<string, boolean>;
  baseEnabled: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeWidgets: Widget[];
};

const DEFAULT_CLIENT_ID = '4WK21Y';

export function NotificationSettingsSheet({ open, onOpenChange, client, activeWidgets }: Props) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [widgetToggles, setWidgetToggles] = useState<Record<string, boolean>>({});
  const [baseEnabled, setBaseEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const configRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return doc(firestore, client.path, 'notificationSettings', 'config');
  }, [firestore, client.path]);

  const { data: config } = useDoc<NotificationConfig>(configRef);

  useEffect(() => {
    if (!open) { setLoaded(false); return; }
    if (config && !loaded) {
      setEmail(config.email ?? (client.displayId === DEFAULT_CLIENT_ID ? (client.contactEmail ?? '') : ''));
      setWidgetToggles(config.widgets ?? {});
      setBaseEnabled(config.baseEnabled ?? true);
      setLoaded(true);
    } else if (!config && !loaded && open) {
      setEmail(client.displayId === DEFAULT_CLIENT_ID ? (client.contactEmail ?? '') : '');
      setWidgetToggles({});
      setBaseEnabled(true);
      setLoaded(true);
    }
  }, [config, loaded, open, client]);

  const handleSave = async () => {
    if (!configRef) return;
    setSaving(true);
    try {
      setDocumentNonBlocking(configRef, {
        email: email.trim(),
        widgets: widgetToggles,
        baseEnabled,
      }, { merge: true });
      toast({ title: 'Notification settings saved' });
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const enabledWidgets = activeWidgets.filter((w) => w.enabled && w.type !== 'communications');

  const toggleWidget = (type: string, value: boolean) => {
    setWidgetToggles((prev) => ({ ...prev, [type]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold">Notification Settings</SheetTitle>
              <SheetDescription className="text-[11px]">
                Configure email alerts for {client.firmName}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">

            {/* Notification email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Notification Email
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Email address where alerts and notifications are sent.
              </p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="notifications@yourcompany.com"
                className="h-9 text-sm border-border/60 bg-background/40"
              />
            </div>

            {/* Base / ERP notifications */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Base (ERP Hub)
              </p>
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">ERP Base Alerts</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Notify on new records, status changes, and notes
                  </p>
                </div>
                <Switch
                  checked={baseEnabled}
                  onCheckedChange={setBaseEnabled}
                />
              </div>
            </div>

            {/* Per-widget toggles */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Widget Notifications
              </p>
              {enabledWidgets.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No active widgets found.</p>
              ) : (
                <div className="space-y-2">
                  {enabledWidgets.map((widget) => {
                    const def = WIDGET_CATALOG_MAP[widget.type];
                    const isOn = widgetToggles[widget.type] ?? false;
                    return (
                      <div
                        key={widget.type}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-background/20 px-4 py-3 gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{widget.title}</p>
                          {def?.defaultDescription && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {def.defaultDescription}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={isOn}
                          onCheckedChange={(v) => toggleWidget(widget.type, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border/30">
          <Button
            className="w-full btn-gradient gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Notification Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
