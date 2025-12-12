
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
import { useState, useMemo } from 'react';
import type { Build, Lead } from '@/types/client';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, ChevronsRight } from 'lucide-react';
import { Card } from '../ui/card';

const formSchema = z.object({
  buildName: z.string().min(1, 'Build name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  buildStage: z.string().optional(),
  projectManager: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  budget: z.string().optional(),
  companyCam: z.boolean().default(false),
  pendingNotes: z.string().optional(),
  cityPermitRegistration: z.boolean().default(false),
  inspectionDate: z.string().optional(),
  contractDate: z.string().optional(),
  buildDate: z.string().optional(),
});


type FormValues = z.infer<typeof formSchema>;
type AddBuildDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBuild: (build: Omit<Build, 'id' | 'notes' | 'activityLog' | 'createdAt'>) => void;
  clientPath: string | null;
};

const buildStageOptions = [
    'Planning',
    'In Progress',
    'On Hold',
    'Completed',
    'Cancelled',
];

export function AddBuildDialog({
  open,
  onOpenChange,
  onAddBuild,
  clientPath,
}: AddBuildDialogProps) {
  const [step, setStep] = useState(0); // 0: choice, 1: manual entry, 2: details, 3: import
  const [searchQuery, setSearchQuery] = useState('');
  const firestore = useFirestore();

  const leadsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return collection(firestore, clientPath, 'leads');
  }, [firestore, clientPath]);
  
  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsCollectionRef);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => 
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.homeAddress?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, searchQuery]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buildName: '',
      clientName: '',
      buildStage: '',
      projectManager: '',
      phoneNumber: '',
      email: '',
      address: '',
      budget: '',
      companyCam: false,
      pendingNotes: '',
      cityPermitRegistration: false,
      inspectionDate: '',
      contractDate: '',
      buildDate: '',
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setStep(0);
      setSearchQuery('');
    }
    onOpenChange(isOpen);
  };
  
  const handleSelectLead = (lead: Lead) => {
    form.reset({
      buildName: `${lead.lastName} Build`,
      clientName: `${lead.firstName} ${lead.lastName}`,
      phoneNumber: lead.phoneNumber || '',
      email: lead.email || '',
      address: lead.homeAddress || '',
      budget: lead.projectedRevenue || '',
      buildStage: lead.currentStep || '',
      companyCam: lead.companyCam || false,
      pendingNotes: lead.pendingNotes || '',
    });
    setStep(2);
  }

  const handleNext = async () => {
    const fieldsToValidate: (keyof FormValues)[] = ['buildName', 'clientName', 'phoneNumber', 'email'];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = data => {
    onAddBuild(data as Omit<Build, 'id' | 'notes' | 'activityLog' | 'createdAt'>);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Build</DialogTitle>
          <DialogDescription>
            {step === 0 && "Choose how to add the new build."}
            {step === 1 && "Step 1 of 2: Enter the main build details."}
            {step === 2 && "Step 2 of 2: Enter additional project details."}
            {step === 3 && "Import from an existing lead."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" onClick={() => setStep(1)}>Enter Manually</Button>
            <Button onClick={() => setStep(3)}>Import from Lead</Button>
          </div>
        )}
        
        {step === 3 && (
            <div className='space-y-4'>
                <Input 
                    placeholder="Search leads by name or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-64">
                    <div className="space-y-2">
                        {areLeadsLoading && <div className="flex justify-center items-center"><Loader2 className="animate-spin" /></div>}
                        {!areLeadsLoading && filteredLeads.map(lead => (
                            <Card key={lead.id} className="p-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{lead.firstName} {lead.lastName}</p>
                                        <p className="text-sm text-muted-foreground">{lead.homeAddress}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleSelectLead(lead)}>
                                        Select <ChevronsRight className="ml-2 h-4 w-4"/>
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                </DialogFooter>
            </div>
        )}

        {(step === 1 || step === 2) && (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {step === 1 && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="buildName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Build Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="clientName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Client Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
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
                     <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Project Address</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a stage..." /></SelectTrigger>
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
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="contractDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contract Date</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="buildDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Build Date</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="inspectionDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Inspection Date</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="budget" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Budget</FormLabel>
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
                    <div className="flex gap-4">
                        <FormField control={form.control} name="companyCam" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none"><FormLabel>CompanyCam?</FormLabel></div>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="cityPermitRegistration" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none"><FormLabel>City Permit & Registration</FormLabel></div>
                            </FormItem>
                        )}/>
                    </div>
                </>
                )}

                <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                {step === 1 ? (
                    <Button type="button" onClick={handleNext}>Next</Button>
                ) : (
                    <>
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit">Add Build</Button>
                    </>
                )}
                </DialogFooter>
            </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
