
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, ChevronsRight, Loader2, UserPlus, FilePlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { CollectionReference } from 'firebase/firestore';
import type { ARCustomer, Lead } from '@/types/client';

const formSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  buildCompleteDate: z.string().min(1, 'Date is required'),
  initialBalance: z.coerce.number().min(0, 'Balance must be a positive number'),
  leadId: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

type AddArCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCustomer: (customer: Omit<ARCustomer, 'id' | 'createdAt'>) => void;
  leads: Lead[];
  arCustomersCollectionRef: CollectionReference | null;
};

export function AddArCustomerDialog({ open, onOpenChange, onAddCustomer, leads }: AddArCustomerDialogProps) {
  const [step, setStep] = useState(0); // 0: choice, 1: manual, 2: import from lead
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerName: '', email: '', phone: '', buildCompleteDate: '', initialBalance: 0, leadId: '' },
  });

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead =>
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, searchQuery]);

  const handleSelectLead = (lead: Lead) => {
    form.setValue('customerName', `${lead.firstName} ${lead.lastName}`);
    form.setValue('leadId', lead.id);
    setStep(1); // Go to the final form step
  };

  const handleManualEntry = () => {
    form.reset(); // Clear any lead data
    setStep(1);
  };
  
  const handleBack = () => {
      form.reset();
      setStep(0);
  }

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const finalData = {
        ...data,
        buildCompleteDate: new Date(data.buildCompleteDate),
    };
    onAddCustomer(finalData as Omit<ARCustomer, 'id' | 'createdAt'>);
    onOpenChange(false);
    form.reset();
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { form.reset(); setStep(0); } onOpenChange(isOpen); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New A/R Customer</DialogTitle>
          <DialogDescription>
            {step === 0 && "Choose how to create the new A/R account."}
            {step === 1 && "Enter the customer and balance details."}
            {step === 2 && "Select a lead to import customer data from."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" onClick={handleManualEntry}><UserPlus className="mr-2"/>Enter Manually</Button>
            <Button onClick={() => setStep(2)}><FilePlus className="mr-2"/>Import from Lead</Button>
          </div>
        )}
        
        {step === 2 && (
             <div className='space-y-4 py-4'>
                <Input 
                    placeholder="Search leads by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-64">
                    <div className="space-y-2">
                        {leads.length === 0 && <div className="text-center text-muted-foreground p-4">No leads found.</div>}
                        {filteredLeads.map(lead => (
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
        
        {step === 1 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl><Input type="email" placeholder="customer@email.com" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl><Input type="tel" placeholder="(555) 000-0000" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>
                <FormField
                    control={form.control}
                    name="buildCompleteDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Build Complete Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="initialBalance"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Initial Balance ($)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleBack}>Back</Button>
                <Button type="submit">Create Customer</Button>
              </DialogFooter>
            </form>
          </Form>
        )}

      </DialogContent>
    </Dialog>
  );
}
