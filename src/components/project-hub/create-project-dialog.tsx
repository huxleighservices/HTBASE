
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
import { useEffect, useState } from 'react';
import type { Client, Project } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  headers: z.array(
      z.object({ value: z.string().min(1, "Header can't be empty") })
  ).min(1, "You must have at least one header."),
});

type FormValues = z.infer<typeof formSchema>;
type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  client,
}: CreateProjectDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const projectsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'projects');
  }, [firestore, client.path]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', headers: [{ value: '' }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'headers',
  });

  useEffect(() => {
    if (!open) {
      form.reset({ name: '', headers: [{ value: '' }] });
    }
  }, [open, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!projectsCollectionRef) return;
    setIsSaving(true);
    
    const projectData = {
        name: data.name,
        headers: data.headers.map(h => h.value),
        createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(projectsCollectionRef, projectData);
    
    setTimeout(() => {
        toast({ title: 'Project Created', description: `Project "${data.name}" has been created.` });
        setIsSaving(false);
        onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Define a name and the custom column headers for your new project.
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
                    <Input {...field} placeholder="e.g., Q4 Marketing Leads" disabled={isSaving}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Column Headers</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`headers.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input {...field} placeholder={`Header ${index + 1}`} disabled={isSaving}/>
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1 || isSaving}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                </div>
              ))}
               {form.formState.errors.headers?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.headers.root.message}</p>}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
              <Plus className="mr-2 h-4 w-4"/> Add Header
            </Button>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    