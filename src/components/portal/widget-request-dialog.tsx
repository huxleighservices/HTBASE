'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Send } from 'lucide-react';

const schema = z.object({
  widgetName: z.string().min(2, 'Widget name is required').max(80),
  widgetDescription: z
    .string()
    .min(10, 'Please describe what this widget should do (10+ chars)')
    .max(500),
});
type FormValues = z.infer<typeof schema>;

interface WidgetRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onSubmit: (widgetName: string, widgetDescription: string) => Promise<void>;
}

export function WidgetRequestDialog({
  open,
  onOpenChange,
  clientName,
  onSubmit,
}: WidgetRequestDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { widgetName: '', widgetDescription: '' },
  });

  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values.widgetName, values.widgetDescription);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 text-secondary/80">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="font-headline text-lg">Request a New Widget</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Describe the widget you need and it will be reviewed by the{' '}
            <span className="text-primary/80 font-medium">HTBase admin team</span>. You&apos;ll
            be notified once it&apos;s been built and added to your portal.
          </DialogDescription>
        </DialogHeader>

        {/* Info banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-primary/80">Requesting for:</span>{' '}
          {clientName}
          <span className="mx-2 opacity-40">·</span>
          Request will be sent to{' '}
          <span className="font-mono text-primary/80">service@huxleigh.com</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="widgetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Widget Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Inventory Tracker, Schedule Manager..."
                      className="border-border/60 bg-background/50 backdrop-blur-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="widgetDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    What should it do?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Describe the functionality, data it should track, and how your team will use it..."
                      className="resize-none border-border/60 bg-background/50 backdrop-blur-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { form.reset(); onOpenChange(false); }}
                className="border border-border/40"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn-gradient"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
