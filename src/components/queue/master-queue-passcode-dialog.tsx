'use client';

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

const MASTER_PASSCODE = "440CR$";

type MasterQueuePasscodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function MasterQueuePasscodeDialog({
  open,
  onOpenChange,
  onSuccess,
}: MasterQueuePasscodeDialogProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleVerify = () => {
    if (passcode === MASTER_PASSCODE) {
      toast({ title: 'Access Granted' });
      setError('');
      setPasscode('');
      onSuccess();
      onOpenChange(false);
    } else {
      setError('Incorrect passcode.');
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPasscode('');
      setError('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Master Queue Access</DialogTitle>
          <DialogDescription>
            Please enter the master passcode to view all agent queues.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="passcode">Passcode</Label>
            <Input 
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleVerify}>
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
