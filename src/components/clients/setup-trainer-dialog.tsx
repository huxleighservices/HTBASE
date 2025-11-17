
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
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
import { Loader2, Sparkles } from 'lucide-react';
import { generateRandomPrompt } from '@/ai/flows/generate-random-prompt-flow';
import { ScrollArea } from '../ui/scroll-area';

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
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

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

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);
    setGeneratedPrompt(null);
    try {
        const result = await generateRandomPrompt();
        setGeneratedPrompt(result.prompt);
        setShowPromptPreview(true);
    } catch (error: any) {
        toast({
            title: 'Generation Failed',
            description: error.message || 'Could not generate a new prompt.',
            variant: 'destructive',
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePastePrompt = () => {
    if (generatedPrompt) {
        const currentData = form.getValues('trainingData');
        const newData = currentData ? `${currentData}\n\n---\n\n${generatedPrompt}` : generatedPrompt;
        form.setValue('trainingData', newData);
    }
    setShowPromptPreview(false);
    setGeneratedPrompt(null);
  };

  const onSubmit: SubmitHandler<FormValues> = data => {
    setIsSaving(true);
    onUpdateTrainingData(client.id, data.trainingData);
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
    <>
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
                      disabled={isSaving || isGenerating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between">
                <div>
                    {client.isEdu && (
                        <Button type="button" variant="outline" onClick={handleGeneratePrompt} disabled={isGenerating || isSaving}>
                           {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                           {isGenerating ? 'Generating...' : 'Random Prompt'}
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isSaving || isGenerating}>
                        Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving || isGenerating}>
                        {isSaving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Training Data'}
                    </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showPromptPreview} onOpenChange={setShowPromptPreview}>
        <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Generated AI Sales Scenario</AlertDialogTitle>
                <AlertDialogDescription>
                    Review the generated prompt below. You can regenerate it or paste it into the editor.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-lg border bg-muted/50 max-h-[50vh]">
                <ScrollArea className="h-full">
                    <pre className="p-4 text-sm whitespace-pre-wrap font-sans">
                        {generatedPrompt || "Generating prompt..."}
                    </pre>
                </ScrollArea>
            </div>
            <AlertDialogFooter className="sm:justify-between">
                <Button variant="outline" onClick={handleGeneratePrompt} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                    Regenerate
                </Button>
                <div className="flex gap-2">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePastePrompt}>Paste It In</AlertDialogAction>
                </div>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
