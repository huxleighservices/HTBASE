'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw, GripVertical, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIDGET_CATALOG_MAP } from '@/lib/widget-catalog';
import { WidgetIcon } from '@/components/portal/widget-browser-dialog';
import type { Widget } from '@/types/widget';
import type { WidgetType } from '@/lib/widget-catalog';

export type UserWidgetPrefs = {
  hidden: WidgetType[];   // widget types the user has personally hidden
};

interface UserWidgetEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All widgets available in this portal (already filtered to enabled ones) */
  widgets: Widget[];
  prefs: UserWidgetPrefs;
  onPrefsChange: (prefs: UserWidgetPrefs) => void;
}

export function UserWidgetEditorSheet({
  open,
  onOpenChange,
  widgets,
  prefs,
  onPrefsChange,
}: UserWidgetEditorSheetProps) {
  const isHidden = (type: WidgetType) => prefs.hidden.includes(type);
  const visibleCount = widgets.filter((w) => !isHidden(w.type)).length;

  const toggleWidget = (type: WidgetType, show: boolean) => {
    if (show) {
      onPrefsChange({ hidden: prefs.hidden.filter((t) => t !== type) });
    } else {
      onPrefsChange({ hidden: [...prefs.hidden.filter((t) => t !== type), type] });
    }
  };

  const resetAll = () => onPrefsChange({ hidden: [] });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-sm border-l border-border/40 p-0"
        style={{
          background: 'rgba(10, 13, 26, 0.92)',
          backdropFilter: 'blur(28px)',
        }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-6 pb-4 border-b border-border/30">
          <SheetTitle className="font-headline text-lg flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Eye className="h-4 w-4" />
            </div>
            My Widgets
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Show or hide widgets for your personal view. Changes only affect you.
          </SheetDescription>
        </SheetHeader>

        {/* Stats row */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{visibleCount}</span> of {widgets.length} visible
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/40"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {widgets.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No widgets configured for this portal yet.
            </p>
          )}
          {widgets.map((widget) => {
            const def = WIDGET_CATALOG_MAP[widget.type];
            const hidden = isHidden(widget.type);
            return (
              <div
                key={widget.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-3 transition-all',
                  hidden
                    ? 'border-border/20 bg-background/10 opacity-50'
                    : 'border-border/40 bg-background/30'
                )}
              >
                {/* Drag handle visual (decorative) */}
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />

                {/* Icon */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all',
                    hidden
                      ? 'border-border/20 bg-background/20 text-muted-foreground/40'
                      : 'border-primary/20 bg-primary/10 text-primary/80'
                  )}
                >
                  <WidgetIcon iconName={def?.iconName ?? 'Bot'} className="h-4 w-4" />
                </div>

                {/* Title + category */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', hidden && 'line-through text-muted-foreground/50')}>
                    {widget.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                    {widget.category}
                  </p>
                </div>

                {/* Toggle */}
                <Switch
                  checked={!hidden}
                  onCheckedChange={(checked) => toggleWidget(widget.type, checked)}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/30 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
            Your preferences are saved locally on this device.
          </p>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="btn-gradient h-8 px-4 text-xs"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
