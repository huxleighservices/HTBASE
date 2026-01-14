
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
import { useEffect, useState } from 'react';
import type { Lead, Client } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useFirestore, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type LeadNotesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  client: Client | null;
};

export function LeadNotesDialog({
  open,
  onOpenChange,
  lead,
  client
}: LeadNotesDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const clientPath = client?.path || null;
  const is4WK21Y = client?.displayId === '4WK21Y';

  const leadDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return doc(firestore, clientPath, 'leads', lead.id);
  }, [firestore, clientPath, lead.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: lead.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ notes: lead.notes || '' });
    }
  }, [open, lead, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!leadDocRef) return;
    setIsSaving(true);
    updateDocumentNonBlocking(leadDocRef, { notes: data.notes });
    
    setTimeout(() => {
        toast({ title: 'Notes Saved' });
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };
  
  const LeadDetail = ({ label, value }: { label: string; value?: string | boolean }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value === true ? 'Yes' : value === false ? 'No' : value || 'N/A'}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Details for {lead.firstName} {lead.lastName}</DialogTitle>
          <DialogDescription>
            View lead details and manage notes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 py-4">
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <LeadDetail label="Agent" value={lead.agent} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <LeadDetail label="F. Name" value={lead.firstName} />
                    <LeadDetail label="L. Name" value={lead.lastName} />
                </div>
                <LeadDetail label="Source" value={lead.source} />
                <LeadDetail label="Contact Date" value={lead.contactDate} />
                 <div className="grid grid-cols-2 gap-4">
                    <LeadDetail label="Current Step" value={lead.currentStep} />
                    <LeadDetail label="Job Type" value={lead.jobType} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <LeadDetail label="Inspection Date" value={lead.contractPresentationDate} />
                    {!is4WK21Y && <LeadDetail label="Next Step Due" value={lead.nextStepDueDate} />}
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <LeadDetail label="Phone Number" value={lead.phoneNumber} />
                    <LeadDetail label="Email" value={lead.email} />
                </div>
                <LeadDetail label="Home Address" value={lead.homeAddress} />
                <LeadDetail label="Projected Revenue" value={lead.projectedRevenue} />
                <LeadDetail label="CompanyCam?" value={lead.companyCam} />
                <div>
                     <p className="text-sm font-medium text-muted-foreground">Pending Notes</p>
                     <div className="text-base p-2 border rounded-md min-h-20 bg-muted/50 whitespace-pre-wrap">{lead.pendingNotes || 'N/A'}</div>
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

    