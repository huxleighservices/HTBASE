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
import type { Client, Lead, SyncedLead, QueueTask, AccessKey } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, Timestamp, collection } from 'firebase/firestore';
import { Loader2, Info } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ContractSignedNotificationDialog } from './contract-signed-notification-dialog';

const formSchema = z.object({
  agent: z.string().min(1, "Agent is required."),
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
  contractPresentationDate: z.string().optional(),
  nextStepDueDate: z.string().optional(),
  reminderValue: z.number().optional(),
  reminderUnit: z.enum(['days', 'weeks']).optional(),
  bypassReminder: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;
type EditLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  client: Client;
};

const currentStepOptions = [
    'Initial Contact',
    'Inspection Scheduled',
    'Presentation Scheduled',
    'Pending Signature',
    'Contract Signed',
    'Build Date Confirmed',
    'Permit/Logistics Confirmed',
    'Build in Progress',
    'Build Done | Collections in Progress',
    'Paid & Done',
    'Archived',
];

export function EditLeadDialog({
  open,
  onOpenChange,
  lead,
  client,
}: EditLeadDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [updatedLeadData, setUpdatedLeadData] = useState<Lead | null>(null);
  
  const is4WK21Y = client?.displayId === '4WK21Y';
  const clientPath = client.path;

  const leadDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return doc(firestore, clientPath, 'leads', lead.id);
  }, [firestore, clientPath, lead.id]);
  
  const accessKeysCollectionRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return collection(firestore, clientPath, 'accessKeys');
  }, [firestore, clientPath]);

  const { data: accessKeys, isLoading: areKeysLoading } = useCollection<AccessKey>(accessKeysCollectionRef);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      form.reset({
        agent: lead.agent || '',
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        source: lead.source || '',
        contactDate: lead.contactDate || '',
        currentStep: lead.currentStep || 'Initial Contact',
        jobType: lead.jobType || '',
        phoneNumber: lead.phoneNumber || '',
        email: lead.email || '',
        homeAddress: lead.homeAddress || '',
        projectedRevenue: lead.projectedRevenue || '',
        companyCam: lead.companyCam || false,
        pendingNotes: lead.pendingNotes || '',
        contractPresentationDate: lead.contractPresentationDate || '',
        nextStepDueDate: lead.nextStepDueDate || '',
        reminderValue: 1,
        reminderUnit: 'days',
        bypassReminder: false,
      });
    }
  }, [open, lead, form]);
  
  const handleNext = async () => {
    const fieldsToValidate: (keyof FormValues)[] = ['agent', 'firstName', 'lastName', 'source', 'contactDate', 'phoneNumber', 'email'];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const handleNotificationDialogChange = (isOpen: boolean) => {
    setIsNotificationDialogOpen(isOpen);
    if (!isOpen) {
        onOpenChange(false);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!leadDocRef || !firestore) return;
    setIsSaving(true);
    
    const leadUpdateData = { ...data };
    
    updateDocumentNonBlocking(leadDocRef, leadUpdateData);
    
    const syncedLeadData: SyncedLead = {
        agent: data.agent,
        name: `${data.firstName} ${data.lastName}`,
        source: data.source || '',
        contactDate: data.contactDate || '',
        currentStep: data.currentStep || '',
        contractPres: data.contractPresentationDate || '',
        nextStepDue: data.nextStepDueDate || '',
        jobType: data.jobType || '',
        phone: data.phoneNumber || '',
        email: data.email || '',
        address: data.homeAddress || '',
        revenue: data.projectedRevenue || '',
        companyCam: data.companyCam || false,
        pendingNotes: data.pendingNotes || '',
    };
    const syncedLeadRef = doc(firestore, 'syncedLeads', lead.id);
    setDocumentNonBlocking(syncedLeadRef, syncedLeadData, { merge: true });

    // Handle Queue Task
    const currentIndex = currentStepOptions.findIndex(s => s === data.currentStep);
    const queueTaskRef = doc(firestore, 'queueTasks', lead.id);
    
    if (is4WK21Y && !data.bypassReminder && currentIndex >= 0 && currentIndex < currentStepOptions.length - 1) {
      const nextStep = currentStepOptions[currentIndex + 1];
      const dueDate = new Date();
      if (data.reminderValue && data.reminderUnit) {
        if (data.reminderUnit === 'days') {
            dueDate.setDate(dueDate.getDate() + data.reminderValue);
        } else if (data.reminderUnit === 'weeks') {
            dueDate.setDate(dueDate.getDate() + data.reminderValue * 7);
        }
      } else {
         dueDate.setHours(dueDate.getHours() + 24); // Default to 24 hours
      }

      const taskData: QueueTask = {
        id: lead.id,
        leadId: lead.id,
        leadName: `${data.firstName} ${data.lastName}`,
        currentStep: data.currentStep || '',
        nextStep: nextStep,
        dueDate: Timestamp.fromDate(dueDate),
        status: 'current',
        agent: data.agent,
        notes: [],
      };
      setDocumentNonBlocking(queueTaskRef, taskData, { merge: true });
    } else {
      // If bypassed, last step, or archived, delete the task
      deleteDocumentNonBlocking(queueTaskRef);
    }
    
    setTimeout(() => {
        toast({ title: 'Lead Updated', description: `${data.firstName} ${data.lastName}'s record has been updated.` });
        setIsSaving(false);
        
        if (data.currentStep === 'Contract Signed' && lead.currentStep !== 'Contract Signed') {
            setUpdatedLeadData({ ...lead, ...data });
            setIsNotificationDialogOpen(true);
        } else {
            onOpenChange(false);
        }

    }, 500);
  };

  return (
    <>
      <Dialog open={open && !isNotificationDialogOpen} onOpenChange={onOpenChange}>
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
                      <FormField
                          control={form.control}
                          name="agent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agent</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areKeysLoading || isSaving}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an agent..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {accessKeys?.map(key => (
                                    <SelectItem key={key.id} value={key.username}>{key.displayName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                      <div className="space-y-2">
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
                           {is4WK21Y && (
                            <div className="rounded-lg border p-4 space-y-3">
                                <FormLabel>Next Step Reminder</FormLabel>
                                <div className="flex items-center gap-2">
                                     <FormField
                                        control={form.control}
                                        name="reminderValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input type="number" min="1" max="10" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} disabled={isSaving || form.watch('bypassReminder')} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="reminderUnit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving || form.watch('bypassReminder')}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="days">Days</SelectItem>
                                                        <SelectItem value="weeks">Weeks</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="bypassReminder"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSaving}/></FormControl>
                                            <FormLabel className="font-normal">Bypass Reminder</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                {form.watch('bypassReminder') && (
                                     <p className="text-xs text-amber-600 flex items-center gap-1"><Info className="h-3 w-3"/> Bypassing is not recommended.</p>
                                )}
                            </div>
                          )}
                      </div>
                      <FormField control={form.control} name="jobType" render={({ field }) => (
                          <FormItem>
                          <FormLabel>Job Type</FormLabel>
                          <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                          <FormMessage />
                          </FormItem>
                      )}/>
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="contractPresentationDate" render={({ field }) => (
                              <FormItem>
                              <FormLabel>Contract Presentation</FormLabel>
                              <FormControl><Input type="date" {...field} disabled={isSaving}/></FormControl>
                              <FormMessage />
                              </FormItem>
                          )}/>
                          {!is4WK21Y && (
                            <FormField control={form.control} name="nextStepDueDate" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Next Step Due Date</FormLabel>
                                <FormControl><Input type="date" {...field} disabled={isSaving}/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                          )}
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
      
      {updatedLeadData && (
          <ContractSignedNotificationDialog
              open={isNotificationDialogOpen}
              onOpenChange={handleNotificationDialogChange}
              lead={updatedLeadData}
          />
      )}
    </>
  );
}
