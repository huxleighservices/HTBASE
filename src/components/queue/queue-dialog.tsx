
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { GanttChartSquare } from 'lucide-react';

type QueueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

export function QueueDialog({ open, onOpenChange, client, activeUser }: QueueDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
            <GanttChartSquare /> Queue
          </DialogTitle>
          <DialogDescription>
            Automated lead follow-up reminders for {client.firmName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex items-center justify-center text-muted-foreground">
            <p>Queue functionality will be built here.</p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
