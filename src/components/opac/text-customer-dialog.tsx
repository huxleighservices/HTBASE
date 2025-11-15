
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
import type { OpaCustomer } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Send, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { useFirestore, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const formSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
  followUps: z.array(z.object({
    date: z.date({ required_error: "A date is required." }),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  })).max(5, "You can add a maximum of 5 follow-ups."),
});

type FormValues = z.infer<typeof formSchema>;
type TextCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: OpaCustomer;
};

export function TextCustomerDialog({
  open,
  onOpenChange,
  customer,
}: TextCustomerDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSending, setIsSending] = useState(false);

  const messagesCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'messages');
  }, [firestore]);

  const defaultMessage = `Hello ${customer.firstName} ${customer.lastName}, due to recent changes in your employment, your insurance with Globe Life is no longer covered and is now billed out-of-pocket. If you would like to make changes to this, please contact us at Globe Life at (412) 507-3454.`;

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
  
  const handleSendNow = () => {
    const message = form.getValues("message");
    if (!message) {
      form.setError("message", { type: "manual", message: "Message cannot be empty." });
      return;
    }
    if (!messagesCollectionRef) {
        toast({ title: "Error", description: "Could not connect to messaging service.", variant: "destructive"});
        return;
    }

    setIsSending(true);

    addDocumentNonBlocking(messagesCollectionRef, {
        to: customer.phoneNumber,
        body: message,
    });

    // Optimistic UI update
    toast({ title: "Message Sent!", description: "Your message has been queued for sending." });
    onOpenChange(false);
    setIsSending(false);
  };

  const handleSchedule: SubmitHandler<FormValues> = (data) => {
    setIsSending(true);
    // This is a placeholder. A real implementation would use a backend service
    // like Cloud Functions with a scheduler to create these documents at the specified times.
    console.log("Scheduling messages:", data);
    setTimeout(() => {
        toast({
            title: "Messages Scheduled!",
            description: `${data.followUps.length} follow-up message(s) have been scheduled.`
        });
        setIsSending(false);
        onOpenChange(false);
    }, 1000);
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
                        onClick={() => append({ date: new Date(), time: '09:00' })}
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
                                    name={`followUps.${index}.date`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                             <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`followUps.${index}.time`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl><Input type="time" {...field} className="w-[120px]" disabled={isSending} /></FormControl>
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
