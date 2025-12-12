
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
import type { Build } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useFirestore, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type BuildNotesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  build: Build;
  clientPath: string | null;
};

export function BuildNotesDialog({
  open,
  onOpenChange,
  build,
  clientPath
}: BuildNotesDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const buildDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return doc(firestore, clientPath, 'builds', build.id);
  }, [firestore, clientPath, build.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: build.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ notes: build.notes || '' });
    }
  }, [open, build, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!buildDocRef) return;
    setIsSaving(true);
    updateDocumentNonBlocking(buildDocRef, { notes: data.notes });
    
    setTimeout(() => {
        toast({ title: 'Notes Saved' });
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };
  
  const BuildDetail = ({ label, value }: { label: string; value?: string | boolean }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value === true ? 'Yes' : value === false ? 'No' : value || 'N/A'}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Details for {build.buildName}</DialogTitle>
          <DialogDescription>
            View build details and manage notes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 py-4">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <BuildDetail label="Build Name" value={build.buildName} />
                    <BuildDetail label="Client Name" value={build.clientName} />
                </div>
                <BuildDetail label="Start Date" value={build.startDate} />
                 <div className="grid grid-cols-2 gap-4">
                    <BuildDetail label="Status" value={build.status} />
                    <BuildDetail label="Project Manager" value={build.projectManager} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <BuildDetail label="Phone Number" value={build.phoneNumber} />
                    <BuildDetail label="Email" value={build.email} />
                </div>
                <BuildDetail label="Project Address" value={build.address} />
                <BuildDetail label="Budget" value={build.budget} />
                <BuildDetail label="CompanyCam?" value={build.companyCam} />
                <div>
                     <p className="text-sm font-medium text-muted-foreground">Pending Notes</p>
                     <div className="text-base p-2 border rounded-md min-h-20 bg-muted/50 whitespace-pre-wrap">{build.pendingNotes || 'N/A'}</div>
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
