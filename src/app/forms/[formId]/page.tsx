
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import type { Form as FormType } from '@/types/client';
import { Loader2 } from 'lucide-react';
import { useForm, type SubmitHandler, FormProvider } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';

export default function PublicFormPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const formId = params.formId as string;
  
  const firestore = useFirestore();
  const [formSchema, setFormSchema] = useState<z.ZodObject<any> | null>(null);

  // This assumes forms are stored in a consistent, though hardcoded, client path for this public feature.
  // In a real multi-client public form system, you'd need a way to look up the client path from the formId.
  const clientPath = 'users/C35xM3u3gYPGnDSQZon3pZk3P9D3/clients/1j4JmJp5k3N8mJqgP3rX';

  const formDocRef = useMemoFirebase(() => {
    if (!firestore || !formId || !clientPath) return null;
    return doc(firestore, clientPath, 'forms', formId);
  }, [firestore, formId, clientPath]);

  const { data: formDef, isLoading: isFormLoading } = useDoc<FormType>(formDocRef);

  useEffect(() => {
    if (formDef) {
      const shape: { [key: string]: z.ZodString } = {};
      formDef.fields.forEach(field => {
        shape[field] = z.string().min(1, `${field} is required.`);
      });
      setFormSchema(z.object(shape));
    }
  }, [formDef]);

  const form = useForm({
    resolver: formSchema ? zodResolver(formSchema) : undefined,
  });

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    if (!formDocRef) return;
    const submissionsCollectionRef = collection(formDocRef, 'submissions');
    addDocumentNonBlocking(submissionsCollectionRef, { data, createdAt: serverTimestamp() });
    toast({
      title: 'Submission Received!',
      description: 'Thank you for your entry.',
    });
    form.reset();
  };

  const isLoading = isFormLoading || !formSchema;

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </main>
    );
  }

  if (!formDef && !isFormLoading) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
            <Card className="w-full max-w-sm text-center">
                <CardHeader><CardTitle>Form Not Found</CardTitle></CardHeader>
                <CardContent><p>The requested form could not be found or is no longer available.</p></CardContent>
            </Card>
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
            <Image src="/HTBASELOGO.png" alt="HTBase Logo" width={48} height={48} />
            <CardTitle className="font-headline text-2xl">{formDef?.title}</CardTitle>
            <CardDescription>
              Please fill out the details below.
            </CardDescription>
        </CardHeader>
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {formDef?.fields.map(field => (
                        <FormField
                            key={field}
                            control={form.control}
                            name={field}
                            render={({ field: formField }) => (
                                <FormItem>
                                    <FormLabel>{field}</FormLabel>
                                    <FormControl>
                                        <Input {...formField} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                    </Button>
                </CardFooter>
            </form>
        </FormProvider>
      </Card>
    </main>
  );
}
