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
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
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
import { useState, useMemo, useEffect } from 'react';
import type { Lead, Client, AccessKey, SyncedLead } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { writeBatch, doc, serverTimestamp, CollectionReference } from 'firebase/firestore';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { ScrollArea } from '../ui/scroll-area';

const leadSchema = z.object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    source: z.string().min(1, 'Required'),
    contactDate: z.string().min(1, 'Required'),
    jobType: z.string().min(1, 'Required'),
    phoneNumber: z.string().optional(),
    email: z.string().optional(),
    homeAddress: z.string().optional(),
    projectedRevenue: z.string().optional(),
});

const bulkAddSchema = z.object({
  leads: z.array(leadSchema),
});

type FormValues = z.infer<typeof bulkAddSchema>;

const applyAllState = {
    firstName: false,
    lastName: false,
    source: false,
    contactDate: false,
    jobType: false,
    phoneNumber: false,
    email: false,
    homeAddress: false,
    projectedRevenue: false,
};
type ApplyAllState = typeof applyAllState;


type BulkAddLeadsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
  leadsCollectionRef: CollectionReference | null;
};


export function BulkAddLeadsDialog({
  open,
  onOpenChange,
  client,
  activeUser,
  leadsCollectionRef,
}: BulkAddLeadsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [leadCount, setLeadCount] = useState(1);
  const [applyAll, setApplyAll] = useState<ApplyAllState>(applyAllState);

  const form = useForm<FormValues>({
    resolver: zodResolver(bulkAddSchema),
    defaultValues: {
      leads: Array.from({ length: 1 }, () => ({
        firstName: '', lastName: '', source: '', contactDate: '', jobType: '',
        phoneNumber: '', email: '', homeAddress: '', projectedRevenue: '',
      })),
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "leads"
  });

  useEffect(() => {
    if (open) {
      // Reset everything when dialog opens
      setStep(1);
      setLeadCount(1);
      form.reset({ leads: [] });
      setApplyAll(applyAllState);
    }
  }, [open, form]);

  const handleProceedToForm = () => {
    if (leadCount > 0 && leadCount <= 20) { // Limit to 20 for performance
        const defaultLead = { firstName: '', lastName: '', source: '', contactDate: '', jobType: '', phoneNumber: '', email: '', homeAddress: '', projectedRevenue: '' };
        replace(Array.from({ length: leadCount }, () => defaultLead));
        setStep(2);
    } else {
        toast({ title: "Invalid number", description: "Please enter a number between 1 and 20.", variant: "destructive"});
    }
  };

  const handleApplyToAllChange = (field: keyof ApplyAllState, checked: boolean) => {
    setApplyAll(prev => ({...prev, [field]: checked}));
    if (checked) {
        const firstValue = form.getValues(`leads.0.${field}`);
        fields.forEach((_, index) => {
            if (index > 0) {
                form.setValue(`leads.${index}.${field}`, firstValue);
            }
        });
    }
  }

  const handleFirstRowChange = (field: keyof ApplyAllState, value: string) => {
    if (applyAll[field]) {
        fields.forEach((_, index) => {
            if (index > 0) {
                form.setValue(`leads.${index}.${field}`, value);
            }
        });
    }
  }

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!leadsCollectionRef || !activeUser || !firestore) return;
    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);

    for (const lead of data.leads) {
        const newLeadRef = doc(leadsCollectionRef);
        const leadData = {
            ...lead,
            agent: activeUser.username,
            createdAt: serverTimestamp(),
            currentStep: 'Initial Contact'
        };
        batch.set(newLeadRef, leadData);

        const syncedLeadData: SyncedLead = {
            agent: leadData.agent,
            name: `${leadData.firstName} ${leadData.lastName}`,
            source: leadData.source || '',
            contactDate: leadData.contactDate || '',
            currentStep: leadData.currentStep || '',
            contractPres: '',
            nextStepDue: '',
            jobType: leadData.jobType || '',
            phone: leadData.phoneNumber || '',
            email: lead.email || '',
            address: lead.homeAddress || '',
            revenue: lead.projectedRevenue || '',
            companyCam: false,
            pendingNotes: '',
        };
        const syncedLeadRef = doc(firestore, 'syncedLeads', newLeadRef.id);
        batch.set(syncedLeadRef, syncedLeadData);
    }
    
    try {
        await batch.commit();
        toast({ title: "Success!", description: `${data.leads.length} leads have been created.` });
        onOpenChange(false);
    } catch(e: any) {
        toast({ title: "Error creating leads", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const renderField = (name: keyof Lead, label: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FormLabel>{label}</FormLabel>
        <div className="flex items-center space-x-2">
            <Checkbox
                id={`apply-all-${name}`}
                checked={applyAll[name as keyof ApplyAllState]}
                onCheckedChange={(checked) => handleApplyToAllChange(name as keyof ApplyAllState, !!checked)}
            />
            <label htmlFor={`apply-all-${name}`} className="text-xs font-medium leading-none">Apply to all</label>
        </div>
      </div>
      {fields.map((field, index) => (
         <FormField
            key={field.id}
            control={form.control}
            name={`leads.${index}.${name}`}
            render={({ field: formField }) => (
                <FormItem className={applyAll[name as keyof ApplyAllState] && index > 0 ? 'hidden' : ''}>
                    <FormControl>
                        <Input 
                            {...formField}
                            type={name === 'contactDate' ? 'date' : 'text'}
                            onChange={(e) => {
                                formField.onChange(e);
                                if(index === 0) handleFirstRowChange(name as keyof ApplyAllState, e.target.value);
                            }}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add Leads</DialogTitle>
          <DialogDescription>
            {step === 1 ? "How many leads would you like to create?" : "Fill out the details for the new leads."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
            <div className="flex-grow flex flex-col items-center justify-center gap-4">
                <Input 
                    type="number"
                    value={leadCount}
                    onChange={e => setLeadCount(parseInt(e.target.value, 10))}
                    min="1"
                    max="20"
                    className="w-48 text-center text-lg"
                />
                <Button onClick={handleProceedToForm}>
                    Next <ArrowRight className="ml-2" />
                </Button>
            </div>
        )}

        {step === 2 && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
                <ScrollArea className="flex-grow pr-6 -mr-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {renderField('firstName', 'First Name')}
                    {renderField('lastName', 'Last Name')}
                    {renderField('source', 'Source')}
                    {renderField('contactDate', 'Contact Date')}
                    {renderField('jobType', 'Job Type')}
                    {renderField('phoneNumber', 'Phone Number')}
                    {renderField('email', 'Email')}
                    {renderField('homeAddress', 'Home Address')}
                    {renderField('projectedRevenue', 'Projected Revenue')}
                  </div>
                </ScrollArea>
                <DialogFooter className="pt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>Back</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create {leadCount} Leads
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        )}
         {step === 1 && (
             <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
            </DialogFooter>
         )}
      </DialogContent>
    </Dialog>
  );
}
