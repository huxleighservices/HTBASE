
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
import type { Project } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { CollectionReference } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import { serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  columns: z.array(z.object({ value: z.string().min(1, "Column name can't be empty") })).min(1, 'At least one column is required'),
});

type FormValues = z.infer<typeof formSchema>;
type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionRef: CollectionReference | null;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  collectionRef
}: CreateProjectDialogProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      columns: [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "columns"
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!collectionRef) return;
    
    const projectData = {
      name: data.name,
      columns: data.columns.map(c => c.value),
      createdAt: serverTimestamp(),
    }

    addDocumentNonBlocking(collectionRef, projectData);

    toast({
      title: 'Project Created',
      description: `Project "${data.name}" has been created.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Give your project a name and define the column headers for your data.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Q3 Marketing Leads" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Column Headers</FormLabel>
              <div className="mt-2 space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`columns.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input {...field} placeholder={`Column ${index + 1}`} />
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
               {form.formState.errors.columns?.root && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.columns.root.message}</p>}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
              <PlusCircle className="mr-2" /> Add Column
            </Button>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
