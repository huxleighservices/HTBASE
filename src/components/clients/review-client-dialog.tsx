'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, type ReactNode } from 'react';
import type { Client } from '@/types/client';
import { Separator } from '../ui/separator';

type ReviewClientDialogProps = {
  client: Client;
  onActivate: () => void;
  onReject: () => void;
};

export function ReviewClientDialog({
  client,
  onActivate,
  onReject,
}: ReviewClientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initials, setInitials] = useState('');

  const handleActivate = () => {
    onActivate();
    setIsOpen(false);
    setInitials('');
  };

  const handleReject = () => {
    onReject();
    setIsOpen(false);
    setInitials('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setInitials('');
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        Review & Activate
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Client: {client.firmName}</DialogTitle>
          <DialogDescription>
            Review the client's information before activating or rejecting their
            account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Firm/Rep Name
            </p>
            <p className="text-sm">{client.firmName}</p>

            <p className="text-sm font-medium text-muted-foreground">
              Legal Name
            </p>
            <p className="text-sm">
              {client.legalFirstName} {client.legalLastName}
            </p>

            <p className="text-sm font-medium text-muted-foreground">
              Firm Size
            </p>
            <p className="text-sm">{client.firmSize}</p>

            <p className="text-sm font-medium text-muted-foreground">
              Est. Year
            </p>
            <p className="text-sm">{client.firmEstYear}</p>

            <p className="text-sm font-medium text-muted-foreground">
              Industry
            </p>
            <p className="text-sm">{client.industry}</p>

            <p className="text-sm font-medium text-muted-foreground">
              Contact Email
            </p>
            <p className="text-sm">{client.contactEmail}</p>

            <p className="text-sm font-medium text-muted-foreground">
              Contact Phone
            </p>
            <p className="text-sm">{client.contactPhoneNumber}</p>

            <p className="text-sm font-medium text-muted-foreground">
              Location
            </p>
            <p className="text-sm">{client.location}</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="initials">
              Enter Your Initials to Activate Client
            </Label>
            <Input
              id="initials"
              value={initials}
              onChange={e => setInitials(e.target.value)}
              placeholder="Your Initials"
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="destructive" onClick={handleReject}>
            Reject Client
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleActivate}
              disabled={initials.trim().length === 0}
            >
              Activate Client
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
