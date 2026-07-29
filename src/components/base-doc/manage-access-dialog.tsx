'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Lock, Check } from 'lucide-react';
import type { AccessKey as ClientAccessKey } from '@/types/client';
import type { BaseDoc } from './types';

type ManageAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: BaseDoc;
  accessKeys: ClientAccessKey[];
  onSave: (allowedUsers: string[]) => Promise<void>;
};

export function ManageAccessDialog({ open, onOpenChange, doc, accessKeys, onSave }: ManageAccessDialogProps) {
  const [selected, setSelected] = useState<string[]>(doc.allowedUsers ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(doc.allowedUsers ?? []);
  }, [open, doc.allowedUsers]);

  const otherMembers = accessKeys.filter((k) => k.username !== doc.createdBy);

  const toggle = (username: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, username] : prev.filter((u) => u !== username)));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(selected);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" />
            Manage Access
          </DialogTitle>
          <DialogDescription>
            Choose who else can view and edit &ldquo;{doc.title}&rdquo;. Only you, as the creator, can change this list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-80 overflow-y-auto py-2">
          {otherMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No other team members yet.</p>
          ) : (
            otherMembers.map((k) => (
              <label
                key={k.username}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-background/40 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(k.username)}
                  onCheckedChange={(checked) => toggle(k.username, checked === true)}
                />
                <span className="text-sm">{k.displayName}</span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="btn-gradient gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
