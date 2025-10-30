
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
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
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
import type { Client, BrandCustomization } from '@/types/client';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  primaryColor: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
  logoUrl: z.string().url().or(z.literal('')),
  tagline: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
type BrandCustomizationDialogProps = {
  children: ReactNode;
  client: Client;
};

const HSLSlider = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) => {
  const [h, s, l] = value.split(' ').map(v => parseFloat(v.replace('%', '')));

  const handleHueChange = ([newH]: number[]) => {
    if (isNaN(newH)) return;
    onChange(`${newH} ${s}% ${l}%`);
  };
  const handleSaturationChange = ([newS]: number[]) => {
    if (isNaN(newS)) return;
    onChange(`${h} ${newS}% ${l}%`);
  };
  const handleLightnessChange = ([newL]: number[]) => {
    if (isNaN(newL)) return;
    onChange(`${h} ${s}% ${newL}%`);
  };

  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      <div className="flex gap-2 items-center">
        <div
          className="w-8 h-8 rounded-md border"
          style={{ backgroundColor: `hsl(${value})` }}
        />
        <div className="flex-grow space-y-1">
          <Slider
            min={0}
            max={360}
            step={1}
            value={!isNaN(h) ? [h] : [0]}
            onValueChange={handleHueChange}
          />
          <Slider
            min={0}
            max={100}
            step={1}
            value={!isNaN(s) ? [s] : [0]}
            onValueChange={handleSaturationChange}
          />
          <Slider
            min={0}
            max={100}
            step={1}
            value={!isNaN(l) ? [l] : [0]}
            onValueChange={handleLightnessChange}
          />
        </div>
      </div>
    </div>
  );
};

export function BrandCustomizationDialog({
  children,
  client,
}: BrandCustomizationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const customizationDocRef = useMemoFirebase(() => {
    if (!firestore || !user || !client) return null;
    return doc(
      firestore,
      'users',
      user.uid,
      'clients',
      client.id,
      'customization',
      'config'
    );
  }, [firestore, user, client]);

  const {
    data: customization,
    isLoading: isCustomizationLoading,
  } = useDoc<BrandCustomization>(customizationDocRef);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      primaryColor: '181 100% 74%',
      backgroundColor: '180 100% 97%',
      accentColor: '181 100% 74%',
      logoUrl: '',
      tagline: '',
    },
  });

  useEffect(() => {
    if (customization) {
      form.reset({
        primaryColor: customization.primaryColor || '181 100% 74%',
        backgroundColor: customization.backgroundColor || '180 100% 97%',
        accentColor: customization.accentColor || '181 100% 74%',
        logoUrl: customization.logoUrl || '',
        tagline: customization.tagline || '',
      });
    } else {
        form.reset({
            primaryColor: '181 100% 74%',
            backgroundColor: '180 100% 97%',
            accentColor: '181 100% 74%',
            logoUrl: '',
            tagline: client.firmName,
        })
    }
  }, [customization, client, form]);

  const onSubmit: SubmitHandler<FormValues> = data => {
    if (!customizationDocRef) return;
    setIsSaving(true);
    setDocumentNonBlocking(customizationDocRef, { id: 'config', ...data }, { merge: true });

    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: 'Branding Updated',
        description: 'The client portal has been customized.',
      });
      setIsOpen(false);
    }, 500);
  };
  
  const isLoading = isSaving || isCustomizationLoading;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Customize Portal for {client.firmName}</DialogTitle>
          <DialogDescription>
            Tailor the colors, logo, and tagline for this client's launch page.
          </DialogDescription>
        </DialogHeader>

        {isCustomizationLoading ? (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://example.com/logo.png"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tagline / Firm Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <HSLSlider
                  label="Primary Color"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="backgroundColor"
              render={({ field }) => (
                <HSLSlider
                  label="Background Color"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="accentColor"
              render={({ field }) => (
                <HSLSlider
                  label="Accent Color"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSaving ? 'Saving...' : 'Save Customization'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
