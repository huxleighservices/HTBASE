
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
import { useState, type ReactNode, useEffect } from 'react';
import type { Client } from '@/types/client';

const formSchema = z.object({
  firmName: z.string().min(1, 'Firm or representative name is required'),
  legalFirstName: z.string().min(1, 'Legal first name is required'),
  legalLastName: z.string().min(1, 'Legal last name is required'),
  firmSize: z.string().min(1, 'Firm size is required'),
  firmEstYear: z.string().min(4, 'Enter a valid year'),
  industry: z.string().min(1, 'Industry is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhoneNumber: z.string().min(1, 'Contact phone number is required'),
  location: z.string().min(1, 'Location is required'),
});

type FormValues = z.infer<typeof formSchema>;
type AddClientDialogProps = {
  children: ReactNode;
  onAddClient?: (client: Omit<Client, 'id' | 'status' | 'displayId'>) => void;
  clientToEdit?: Client;
  onEditClient?: (
    clientId: string,
    client: Omit<Client, 'id' | 'status' | 'displayId'>
  ) => void;
};

export function AddClientDialog({
  children,
  onAddClient,
  clientToEdit,
  onEditClient,
}: AddClientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  const isEditMode = !!clientToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firmName: '',
      legalFirstName: '',
      legalLastName: '',
      firmSize: '',
      firmEstYear: '',
      industry: '',
      contactEmail: '',
      contactPhoneNumber: '',
      location: '',
    },
  });

  useEffect(() => {
    if (clientToEdit && isOpen) {
      form.reset(clientToEdit);
    } else if (!isEditMode && isOpen) {
      form.reset();
      setStep(1);
    }
  }, [isOpen, clientToEdit, form, isEditMode]);
  
  useEffect(() => {
    if (isEditMode) {
      setStep(1); // Start at step 1 for editing
    }
  }, [isEditMode]);

  const handleNext = async () => {
    const fieldsToValidate: (keyof FormValues)[] = [
      'firmName',
      'legalFirstName',
      'legalLastName',
      'firmSize',
      'firmEstYear',
    ];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setStep(1);
    }
    setIsOpen(open);
  };

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (isEditMode && onEditClient && clientToEdit) {
      onEditClient(clientToEdit.id, data);
    } else if (onAddClient) {
      onAddClient(data);
    }
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the client information below.'
              : `Enter the client information below. Step ${step} of 2.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="firmName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firm or Representative Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firmSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firm Size</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firmEstYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firm Est. Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              {!isEditMode && step === 1 && (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              )}
              {step === 2 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button type="submit">
                    {isEditMode ? 'Save Changes' : 'Add Client'}
                  </Button>
                </>
              )}
               {isEditMode && step === 1 && (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
