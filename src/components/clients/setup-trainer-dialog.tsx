
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
import { Textarea } from '@/components/ui/textarea';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  trainingData: z.string().min(1, 'Training data cannot be empty.'),
});

type FormValues = z.infer<typeof formSchema>;
type SetupTrainerDialogProps = {
  children: ReactNode;
  client: Client;
  onUpdateTrainingData: (clientId: string, trainingData: string) => void;
};

export function SetupTrainerDialog({
  children,
  client,
  onUpdateTrainingData,
}: SetupTrainerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trainingData: client.trainingData || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        trainingData: client.trainingData || '',
      });
    }
  }, [isOpen, client, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    setIsSaving(true);
    onUpdateTrainingData(client.id, data.trainingData);
    // Optimistic toast
    setTimeout(() => {
      toast({
        title: 'Trainer Updated',
        description: `Custom training data for ${client.firmName} has been saved.`,
      });
      setIsSaving(false);
      setIsOpen(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Setup AI Trainer for {client.firmName}</DialogTitle>
          <DialogDescription>
            Paste the product information, sales scripts, or any other relevant
            text below to train the AI. This will customize the simulation
            prompts for this client.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="trainingData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Data</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={15}
                      placeholder="Paste your training material here..."
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isSaving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSaving ? 'Saving...' : 'Save Training Data'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    