
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
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect, useState } from 'react';
import type { AccessKey } from '@/types/session';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

const editKeyFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type EditKeyFormValues = z.infer<typeof editKeyFormSchema>;

type EditAccessKeyDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessKey: AccessKey;
  onUpdateKey: (keyId: string, data: Partial<AccessKey>) => void;
};

export function EditAccessKeyDialog({
  isOpen,
  onOpenChange,
  accessKey,
  onUpdateKey,
}: EditAccessKeyDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<EditKeyFormValues>({
    resolver: zodResolver(editKeyFormSchema),
    defaultValues: {
      displayName: '',
      password: '',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    if (accessKey) {
      form.reset({
        displayName: accessKey.displayName,
        password: '', // Leave password blank for security
        phoneNumber: accessKey.phoneNumber || '',
      });
    }
  }, [accessKey, form]);

  const onSubmit: SubmitHandler<EditKeyFormValues> = data => {
    setIsSaving(true);
    
    const updateData: Partial<AccessKey> = {
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
    };

    if (data.password) {
        updateData.password = data.password;
    }

    onUpdateKey(accessKey.id, updateData);
    
    setTimeout(() => {
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Access Key: {accessKey.displayName}</DialogTitle>
          <DialogDescription>
            Update the details for this access key. The username cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
             <div className="space-y-2">
              <Label>Username</Label>
              <Input value={accessKey.username} disabled />
            </div>
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Trainee 1"
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      {...field}
                      placeholder="e.g., 1234567890"
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      placeholder="Leave blank to keep current password"
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
