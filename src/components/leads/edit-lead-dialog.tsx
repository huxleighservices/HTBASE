
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
import type { Lead } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
type EditLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  clientPath: string;
};

const currentStepOptions = [
    'Initial Contact',
    'Inspection Scheduled',
    'Build Date Confirmed',
    'Permit/Logistics Confirmed',
    'Build in Progress',
    'Build Done | Collections in Progress',
    'Signed, Paid, Done',
    'Archived',
];

export function EditLeadDialog({
  open,
  onOpenChange,
  lead,
  clientPath,
}: EditLeadDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

  const leadDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return doc(firestore, clientPath, 'leads', lead.id);
  }, [firestore, clientPath, lead.id]);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      form.reset({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        source: lead.source || '',
        contactDate: lead.contactDate || '',
        currentStep: lead.currentStep || '',
        jobType: lead.jobType || '',
        phoneNumber: lead.phoneNumber || '',
        email: lead.email || '',
        homeAddress: lead.homeAddress || '',
        projectedRevenue: lead.projectedRevenue || '',
        companyCam: lead.companyCam || false,
        pendingNotes: lead.pendingNotes || '',
      });
    }
  }, [open, lead, form]);
  
  const handleNext = async () => {
    const fieldsToValidate: (keyof FormValues)[] = ['firstName', 'lastName', 'source', 'contactDate', 'phoneNumber', 'email'];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!leadDocRef) return;
    setIsSaving(true);
    updateDocumentNonBlocking(leadDocRef, data);
    
    setTimeout(() => {
        toast({ title: 'Lead Updated', description: `${data.firstName} ${data.lastName}'s record has been updated.` });
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Lead: {lead.firstName} {lead.lastName}</DialogTitle>
          <DialogDescription>
            Step {step} of 2: Update the lead's details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {step === 1 && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>F. Name</FormLabel>
                            <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>L. Name</FormLabel>
                            <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    </div>
                    <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Source</FormLabel>
                        <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <FormField control={form.control} name="contactDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contact Date</FormLabel>
                        <FormControl><Input type="date" {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl><Input type="tel" {...field} disabled={isSaving}/></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" {...field} disabled={isSaving}/></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                </>
             )}
             {step === 2 && (
                <>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="currentStep"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Current Step</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a step..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {currentStepOptions.map(option => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField control={form.control} name="jobType" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Job Type</FormLabel>
                        <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                    </div>
                    <FormField control={form.control} name="homeAddress" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Home Address</FormLabel>
                        <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="projectedRevenue" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Projected Revenue</FormLabel>
                        <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="pendingNotes" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Pending Notes</FormLabel>
                        <FormControl><Textarea {...field} disabled={isSaving}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="companyCam" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSaving}/>
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>CompanyCam?</FormLabel>
                            </div>
                        </FormItem>
                    )}/>
                </>
             )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSaving}>Cancel</Button>
              </DialogClose>
               {step === 1 ? (
                <Button type="button" onClick={handleNext}>Next</Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSaving}>Back</Button>
                  <Button type="submit" disabled={isSaving}>
                     {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
