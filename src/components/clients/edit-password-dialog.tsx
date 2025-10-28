
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
import { useToast } from '@/hooks/use-toast';

type EditPasswordDialogProps = {
  children: ReactNode;
  client: Client;
  onUpdatePassword: (clientId: string, password: string) => void;
};

export function EditPasswordDialog({
  children,
  client,
  onUpdatePassword,
}: EditPasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();

  const handleUpdate = () => {
    if (newPassword.trim().length < 4) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 4 characters long.',
        variant: 'destructive',
      });
      return;
    }
    onUpdatePassword(client.id, newPassword);
    toast({
      title: 'Password Updated',
      description: `Password for ${client.firmName} has been updated.`,
    });
    setIsOpen(false);
    setNewPassword('');
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setNewPassword(client.launchPassword || '');
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Launch Password</DialogTitle>
          <DialogDescription>
            Change the launch password for {client.firmName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleUpdate}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
