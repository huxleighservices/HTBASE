
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
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
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
import type { OpaCustomer, Client, ActivityLogEntry } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Send, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import type { AccessKey } from '@/types/session';

const formSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
  followUps: z.array(z.object({
    value: z.coerce.number().min(1, "Must be at least 1"),
    unit: z.enum(['minutes', 'hours', 'days']),
  })).max(5, "You can add a maximum of 5 follow-ups."),
});

type FormValues = z.infer<typeof formSchema>;
type TextCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: OpaCustomer;
  client: Client;
  activeUser: AccessKey | null;
};

const delayToMs = (value: number, unit: 'minutes' | 'hours' | 'days'): number => {
    switch (unit) {
        case 'minutes': return value * 60 * 1000;
        case 'hours': return value * 60 * 60 * 1000;
        case 'days': return value * 24 * 60 * 60 * 1000;
    }
};

export function TextCustomerDialog({
  open,
  onOpenChange,
  customer,
  client,
  activeUser,
}: TextCustomerDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSending, setIsSending] = useState(false);

  const customerName = `${customer.firstName} ${customer.lastName}`;
  const senderName = activeUser?.displayName || 'your representative';
  const senderPhone = activeUser?.phoneNumber || '[Your Phone Number]';

  const defaultMessage = `Hello ${customerName}, this is ${senderName} from Globe Life. I am reaching out today regarding your recent exit from your place of employment. If you would like to continue receiving your Globe Life benefits or make any changes, please reach out to me directly at ${senderPhone}. Thank you!`;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: defaultMessage,
      followUps: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "followUps",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        message: defaultMessage,
        followUps: [],
      });
    }
  }, [open, customer, form, defaultMessage]);
  
  const addActivityLogEntry = (logEntry: Omit<ActivityLogEntry, 'user'>) => {
    if (!firestore || !client.path) return;
    const customerDocRef = doc(firestore, client.path, 'opacCustomers', customer.id);
    const completeLogEntry: ActivityLogEntry = {
        ...logEntry,
        user: activeUser?.displayName || 'Unknown User'
    };
    updateDocumentNonBlocking(customerDocRef, {
        activityLog: arrayUnion(completeLogEntry)
    });
  };

  const sendSmsRequest = async (message: string) => {
    const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: customer.phoneNumber,
          message: message,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'A network error occurred.');
      }
      return response.json();
  };

  const handleSendNow = async () => {
    const message = form.getValues("message");
    if (!message) {
      form.setError("message", { type: "manual", message: "Message cannot be empty." });
      return;
    }
    
    setIsSending(true);
    try {
      await sendSmsRequest(message);
      addActivityLogEntry({
          timestamp: new Date(),
          activity: 'Initial message sent.'
      });
      toast({ title: "Success", description: "Message sent successfully!" });
      onOpenChange(false);
    } catch (error: any) {
        console.error("Error sending SMS:", error);
        toast({ 
          title: "Sending Failed", 
          description: error.message || "An unexpected error occurred.", 
          variant: "destructive" 
        });
    } finally {
        setIsSending(false);
    }
  };

  const handleSchedule: SubmitHandler<FormValues> = (data) => {
    setIsSending(true);

    const message = data.message;
    const followUps = data.followUps;
    let scheduledCount = 0;

    followUps.forEach(followUp => {
        const delayMs = delayToMs(followUp.value, followUp.unit);
        const scheduledSendTime = new Date(Date.now() + delayMs);
        
        setTimeout(() => {
            sendSmsRequest(message)
              .then(() => {
                addActivityLogEntry({
                    timestamp: new Date(),
                    activity: `Sent scheduled follow-up.`
                });
              })
              .catch(err => console.error(`Failed to send scheduled message to ${customer.phoneNumber}:`, err));
        }, delayMs);

        addActivityLogEntry({
            timestamp: scheduledSendTime,
            activity: `Follow-up scheduled for ${followUp.value} ${followUp.unit} from now.`
        });
        scheduledCount++;
    });

    toast({
        title: "Messages Scheduled!",
        description: `${scheduledCount} follow-up message(s) have been scheduled.`
    });

    setIsSending(false);
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Text Customer: {customer.firstName} {customer.lastName}</DialogTitle>
          <DialogDescription>
            Compose a message to send to {customer.phoneNumber}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSchedule)} className="space-y-6">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={6} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <FormLabel>Scheduled Follow-ups</FormLabel>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => append({ value: 1, unit: 'days' })}
                        disabled={fields.length >= 5 || isSending}
                    >
                        <Plus className="mr-2 h-4 w-4"/> Add Follow-up
                    </Button>
                </div>
                {fields.length > 0 && (
                    <div className="space-y-3 rounded-md border p-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <FormField
                                    control={form.control}
                                    name={`followUps.${index}.value`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <Input type="number" {...field} disabled={isSending} min={1}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`followUps.${index}.unit`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSending}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select unit" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="minutes">Minutes</SelectItem>
                                                    <SelectItem value="hours">Hours</SelectItem>
                                                    <SelectItem value="days">Days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isSending}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                 {form.formState.errors.followUps?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.followUps.root.message}</p>}
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost" disabled={isSending}>Cancel</Button>
                </DialogClose>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button type="button" variant="secondary" onClick={handleSendNow} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                        Send Now
                    </Button>
                     {fields.length > 0 && (
                        <Button type="submit" disabled={isSending}>
                             {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CalendarIcon className="mr-2 h-4 w-4" />}
                            Schedule All
                        </Button>
                     )}
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
