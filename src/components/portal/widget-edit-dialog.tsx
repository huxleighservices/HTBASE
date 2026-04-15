'use client';

import { useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Loader2, Pencil } from 'lucide-react';
import type { Widget } from '@/types/widget';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(60),
  description: z.string().min(1, 'Description is required').max(200),
  enabled: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface WidgetEditDialogProps {
  widget: Widget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: Pick<Widget, 'title' | 'description' | 'enabled'>) => Promise<void>;
}

export function WidgetEditDialog({
  widget,
  open,
  onOpenChange,
  onSave,
}: WidgetEditDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: widget.title,
      description: widget.description,
      enabled: widget.enabled,
    },
  });

  // Sync form when widget prop changes
  useEffect(() => {
    form.reset({
      title: widget.title,
      description: widget.description,
      enabled: widget.enabled,
    });
  }, [widget, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Pencil className="h-4 w-4" />
            </div>
            <DialogTitle className="font-headline text-lg">Edit Widget</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-sm">
            Customize how this widget appears in your portal.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Widget Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-border/60 bg-background/50 backdrop-blur-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      className="resize-none border-border/60 bg-background/50 backdrop-blur-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/40 bg-background/30 px-4 py-3">
                  <div>
                    <FormLabel className="text-sm font-medium cursor-pointer">
                      Widget Visible
                    </FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toggle off to hide this widget from the portal
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
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
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
