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
  triggerButton: ReactNode;
  action: 'activate' | 'view' | 'reactivate';
};

export function ReviewClientDialog({
  client,
  onActivate,
  onReject,
  triggerButton,
  action,
}: ReviewClientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initials, setInitials] = useState('');

  const handleAction = () => {
    if (action === 'activate' || action === 'reactivate') {
      onActivate();
    }
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
  
  const getDialogContent = () => {
    const titleMap = {
      activate: `Review Client: ${client.firmName}`,
      view: `Viewing Client: ${client.firmName}`,
      reactivate: `Re-activate Client: ${client.firmName}`,
    };
    
    const descriptionMap = {
      activate: "Review the client's information before activating or rejecting their account.",
      view: "Viewing the client's information.",
      reactivate: "Review and confirm to re-activate this client.",
    };
    
    const primaryActionTextMap = {
      activate: 'Activate Client',
      view: 'Close',
      reactivate: 'Re-activate Client',
    };

    return {
      title: titleMap[action],
      description: descriptionMap[action],
      primaryActionText: primaryActionTextMap[action],
    };
  };
  
  const { title, description, primaryActionText } = getDialogContent();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
          {(action === 'activate' || action === 'reactivate') && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="initials">
                  Enter Your Initials to Confirm
                </Label>
                <Input
                  id="initials"
                  value={initials}
                  onChange={e => setInitials(e.target.value)}
                  placeholder="Your Initials"
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {action === 'activate' ? (
            <Button type="button" variant="destructive" onClick={handleReject}>
              Reject Client
            </Button>
          ) : <div></div>}
          <div className="flex gap-2">
            {action !== 'view' && <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>}
            <Button
              type="button"
              onClick={handleAction}
              disabled={(action === 'activate' || action === 'reactivate') && initials.trim().length === 0}
            >
              {primaryActionText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
