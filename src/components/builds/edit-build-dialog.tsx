
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
import type { Build } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { logActivity } from '@/lib/activity-log';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formSchema = z.object({
  buildName: z.string().min(1, 'Build name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  buildStage: z.string().optional(),
  projectManager: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  projectedRevenue: z.string().optional(),
  companyCam: z.boolean().default(false),
  pendingNotes: z.string().optional(),
  cityPermitRegistration: z.boolean().default(false),
  inspectionDate: z.string().optional(),
  contractDate: z.string().optional(),
  buildDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type EditBuildDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  build: Build;
  clientPath: string;
};

const buildStageOptions = [
    'Planning',
    'In Progress',
    'On Hold',
    'Completed',
    'Cancelled',
];

export function EditBuildDialog({
  open,
  onOpenChange,
  build,
  clientPath,
}: EditBuildDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

  const buildDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return doc(firestore, clientPath, 'builds', build.id);
  }, [firestore, clientPath, build.id]);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      form.reset({
        buildName: build.buildName || '',
        clientName: build.clientName || '',
        buildStage: build.buildStage || '',
        projectManager: build.projectManager || '',
        phoneNumber: build.phoneNumber || '',
        email: build.email || '',
        address: build.address || '',
        projectedRevenue: build.projectedRevenue || '',
        companyCam: build.companyCam || false,
        pendingNotes: build.pendingNotes || '',
        cityPermitRegistration: build.cityPermitRegistration || false,
        inspectionDate: build.inspectionDate || '',
        contractDate: build.contractDate || '',
        buildDate: build.buildDate || '',
      });
    }
  }, [open, build, form]);
  
  const handleNext = async () => {
    const fieldsToValidate: (keyof FormValues)[] = ['buildName', 'clientName', 'phoneNumber', 'email', 'address'];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!buildDocRef) return;
    setIsSaving(true);
    updateDocumentNonBlocking(buildDocRef, data);

    if (firestore && data.buildStage && data.buildStage !== build.buildStage) {
      logActivity(firestore, clientPath, 'builds', `${data.buildName}'s stage changed to ${data.buildStage}`);
    }

    setTimeout(() => {
        toast({ title: 'Build Updated', description: `${data.buildName}'s record has been updated.` });
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Build: {build.buildName}</DialogTitle>
          <DialogDescription>
            Step {step} of 2: Update the build project's details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {step === 1 && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="buildName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Build Name</FormLabel>
                                <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="clientName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Client Name</FormLabel>
                                <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
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
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project Address</FormLabel>
                            <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </>
             )}
             {step === 2 && (
                <>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="buildStage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Build Stage</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a stage..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {buildStageOptions.map(option => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="projectManager" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Project Manager</FormLabel>
                            <FormControl><Input {...field} disabled={isSaving}/></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="contractDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contract Date</FormLabel>
                                <FormControl><Input type="date" {...field} disabled={isSaving}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="buildDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Build Date</FormLabel>
                                <FormControl><Input type="date" {...field} disabled={isSaving}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="inspectionDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Inspection Date</FormLabel>
                                <FormControl><Input type="date" {...field} disabled={isSaving}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
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
                    <div className="flex gap-4">
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
                        <FormField control={form.control} name="cityPermitRegistration" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSaving}/>
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>City Permit & Registration</FormLabel>
                                </div>
                            </FormItem>
                        )}/>
                    </div>
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
