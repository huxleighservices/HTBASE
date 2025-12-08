
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
import type { OpaCustomer } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  franchise: z.string().optional(),
  writingAgent: z.string().optional(),
  planCode: z.string().optional(),
  planType: z.string().optional(),
  phoneNumber: z.string().optional().refine(val => !val || /^\d{10}$/.test(val), {
    message: "Phone number must be exactly 10 digits.",
  }),
  policyFaceAmount: z.string().optional(),
  extraInfo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type EditOpaCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: OpaCustomer;
  clientPath: string;
};

export function EditOpaCustomerDialog({
  open,
  onOpenChange,
  customer,
  clientPath,
}: EditOpaCustomerDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const customerDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return doc(firestore, clientPath, 'opacCustomers', customer.id);
  }, [firestore, clientPath, customer.id]);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (open) {
      form.reset({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        franchise: customer.franchise || '',
        writingAgent: customer.writingAgent || '',
        planCode: customer.planCode || '',
        planType: customer.planType || '',
        phoneNumber: customer.phoneNumber || '',
        policyFaceAmount: customer.policyFaceAmount || '',
        extraInfo: customer.extraInfo || '',
      });
    }
  }, [open, customer, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!customerDocRef) return;
    setIsSaving(true);
    updateDocumentNonBlocking(customerDocRef, data);
    
    setTimeout(() => {
        toast({ title: 'Customer Updated', description: `${data.firstName} ${data.lastName}'s record has been updated.` });
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Customer: {customer.firstName} {customer.lastName}</DialogTitle>
          <DialogDescription>
            Update the customer's details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="franchise"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Franchise</FormLabel>
                  <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="writingAgent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Writing Agent</FormLabel>
                  <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="planCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Plan Code</FormLabel>
                        <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="planType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Plan Type</FormLabel>
                        <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input type="tel" {...field} placeholder="10 digits only" disabled={isSaving}/></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="policyFaceAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Policy Face $</FormLabel>
                    <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="extraInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extra Info</FormLabel>
                  <FormControl><Textarea {...field} disabled={isSaving}/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
