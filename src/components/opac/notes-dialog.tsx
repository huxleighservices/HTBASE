
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
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { useState, type ReactNode, useEffect } from 'react';
import type { OpaCustomer } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useUser, useFirestore, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type NotesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: OpaCustomer;
  clientPath: string | null;
};

export function NotesDialog({
  open,
  onOpenChange,
  customer,
  clientPath
}: NotesDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const customerDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return doc(firestore, clientPath, 'opacCustomers', customer.id);
  }, [firestore, clientPath, customer.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: customer.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ notes: customer.notes || '' });
    }
  }, [open, customer, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!customerDocRef) return;
    setIsSaving(true);
    updateDocumentNonBlocking(customerDocRef, { notes: data.notes });
    
    // Optimistic UI update
    setTimeout(() => {
        toast({ title: 'Notes Saved' });
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };
  
  const CustomerDetail = ({ label, value }: { label: string; value?: string }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value || 'N/A'}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Details for {customer.firstName} {customer.lastName}</DialogTitle>
          <DialogDescription>
            View customer details and manage notes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
                <CustomerDetail label="First Name" value={customer.firstName} />
                <CustomerDetail label="Last Name" value={customer.lastName} />
                <CustomerDetail label="Franchise" value={customer.franchise} />
                <CustomerDetail label="Writing Agent" value={customer.writingAgent} />
                <CustomerDetail label="Plan Details / Code" value={customer.planDetails} />
                <CustomerDetail label="Phone Number" value={customer.phoneNumber} />
                <CustomerDetail label="Policy Face $" value={customer.policyFaceAmount} />
                <div>
                     <p className="text-sm font-medium text-muted-foreground">Extra Info</p>
                     <div className="text-base p-2 border rounded-md min-h-20 bg-muted/50 whitespace-pre-wrap">{customer.extraInfo || 'N/A'}</div>
                </div>
            </div>
            <div>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                        <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem className="h-full flex flex-col">
                            <FormLabel>Notepad</FormLabel>
                            <FormControl className="flex-grow">
                                <Textarea {...field} className="h-full resize-none" disabled={isSaving}/>
                            </FormControl>
                            </FormItem>
                        )}
                        />
                         <DialogFooter className='mt-4'>
                            <DialogClose asChild><Button type="button" variant="ghost" disabled={isSaving}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {isSaving ? "Saving..." : "Save Notes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
