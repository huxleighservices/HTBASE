
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
import type { Lead } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  shouldSend: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;
type NotificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
};

export function ContractSignedNotificationDialog({
  open,
  onOpenChange,
  lead,
}: NotificationDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'mt@mtroofingandrestoration.com',
      shouldSend: true,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!data.shouldSend) {
        onOpenChange(false);
        return;
    }

    setIsSending(true);
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: data.email,
                subject: `Contract Signed: ${lead.firstName} ${lead.lastName}`,
                text: `The contract for lead ${lead.firstName} ${lead.lastName} (Address: ${lead.homeAddress}) has been signed.`,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send email.');
        }
        
        toast({
            title: 'Notification Sent',
            description: `An email has been sent to ${data.email}.`,
        });
        onOpenChange(false);

    } catch (error: any) {
        toast({
            title: 'Sending Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contract Signed Notification</DialogTitle>
          <DialogDescription>
            Notify team members that the contract for {lead.firstName} {lead.lastName} has been signed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shouldSend"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSending}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send email notification</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSending}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
