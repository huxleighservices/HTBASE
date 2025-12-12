
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
import { useEffect } from 'react';
import type { Lead } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  source: z.string().optional(),
  contactDate: z.string().optional(),
  currentStep: z.string().optional(),
  jobType: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  homeAddress: z.string().optional(),
  projectedRevenue: z.string().optional(),
  companyCam: z.boolean().default(false),
  pendingNotes: z.string().optional(),
});


type FormValues = z.infer<typeof formSchema>;
type AddLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLead: (lead: Omit<Lead, 'id' | 'notes' | 'activityLog' | 'createdAt'>) => void;
};

export function AddLeadDialog({
  open,
  onOpenChange,
  onAddLead,
}: AddLeadDialogProps) {

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      source: '',
      contactDate: '',
      currentStep: '',
      jobType: '',
      phoneNumber: '',
      email: '',
      homeAddress: '',
      projectedRevenue: '',
      companyCam: false,
      pendingNotes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    onAddLead(data as Omit<Lead, 'id' | 'notes' | 'activityLog' | 'createdAt'>);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter the lead's details below to add them to the tracker.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>F. Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>L. Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="contactDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="currentStep" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Step</FormLabel>
                  <FormControl><Input {...field} placeholder="Dropdown later..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="jobType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Type</FormLabel>
                  <FormControl><Input {...field} placeholder="Dropdown later..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input type="tel" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                )}/>
            </div>
             <FormField control={form.control} name="homeAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            <FormField control={form.control} name="projectedRevenue" render={({ field }) => (
                <FormItem>
                  <FormLabel>Projected Revenue</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="pendingNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pending Notes</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="companyCam" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>CompanyCam?</FormLabel>
                    </div>
                </FormItem>
              )}/>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add Lead</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
