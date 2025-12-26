
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
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
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
import { useState, useEffect } from 'react';
import type { Form as FormType } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { CollectionReference } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import { serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  title: z.string().min(1, 'Form title is required'),
  fields: z.array(z.object({ value: z.string().min(1, "Field name can't be empty") })).min(1, 'At least one field is required'),
});

type FormValues = z.infer<typeof formSchema>;
type CreateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionRef: CollectionReference | null;
};

export function CreateFormDialog({
  open,
  onOpenChange,
  collectionRef
}: CreateFormDialogProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      fields: [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields"
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!collectionRef) return;
    
    const formData = {
      title: data.title,
      fields: data.fields.map(c => c.value),
      createdAt: serverTimestamp(),
    }

    addDocumentNonBlocking(collectionRef, formData);

    toast({
      title: 'Form Created',
      description: `Form "${data.title}" has been created.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Public Form</DialogTitle>
          <DialogDescription>
            Give your form a title and define the fields for data entry.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., New Customer Inquiry" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Form Fields</FormLabel>
              <div className="mt-2 space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`fields.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input {...field} placeholder={`Field ${index + 1}`} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
               {form.formState.errors.fields?.root && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.fields.root.message}</p>}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
              <PlusCircle className="mr-2" /> Add Field
            </Button>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit">Create Form</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
