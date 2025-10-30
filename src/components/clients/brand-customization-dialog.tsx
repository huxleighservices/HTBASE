
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
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';

const fontOptions = ["Space Grotesk", "Montserrat", "Arial", "Times New Roman", "Inter", "Georgia"];

const formSchema = z.object({
  primaryColor: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
  foregroundColor: z.string(),
  logoUrl: z.string().url().or(z.literal('')),
  tagline: z.string(),
  fontFamily: z.string(),
  passwordScreenDescription: z.string(),
  passwordScreenPasswordLabel: z.string(),
  passwordScreenUnlockButton: z.string(),
  sessionScreenTitle: z.string(),
  sessionScreenDescription: z.string(),
  sessionScreenFirstNameLabel: z.string(),
  sessionScreenLastNameLabel: z.string(),
  sessionScreenEmailLabel: z.string(),
  sessionScreenCompanyLabel: z.string(),
  sessionScreenLaunchButton: z.string(),
  trainerScreenDescription: z.string(),
  messengerTitle: z.string(),
  messengerDescription: z.string(),
  messengerButton: z.string(),
  coldCallTitle: z.string(),
  coldCallDescription: z.string(),
  coldCallButton: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
type BrandCustomizationDialogProps = {
  children: ReactNode;
  client: Client;
};

// --- Color Conversion Utilities ---
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (60 <= h && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (120 <= h && h < 180) { [r, g, b] = [0, c, x]; }
  else if (180 <= h && h < 240) { [r, g, b] = [0, x, c]; }
  else if (240 <= h && h < 300) { [r, g, b] = [x, 0, c]; }
  else if (300 <= h && h < 360) { [r, g, b] = [c, 0, x]; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return `${h} ${s}% ${l}%`;
}


const ColorPicker = ({
  value, // HSL string value
  onChange, // expects HSL string
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) => {
  const [h, s, l] = value ? value.split(' ').map(v => parseFloat(v.replace('%', ''))) : [NaN, NaN, NaN];

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    const newHsl = hexToHsl(newHex);
    if (newHsl) {
      onChange(newHsl);
    }
  };

  const handleHueChange = ([newH]: number[]) => { if (isNaN(s) || isNaN(l)) return; onChange(`${newH} ${s}% ${l}%`); };
  const handleSaturationChange = ([newS]: number[]) => { if (isNaN(h) || isNaN(l)) return; onChange(`${h} ${newS}% ${l}%`); };
  const handleLightnessChange = ([newL]: number[]) => { if (isNaN(h) || isNaN(s)) return; onChange(`${h} ${s}% ${newL}%`); };
  

  const hexValue = !isNaN(h) && !isNaN(s) && !isNaN(l) ? hslToHex(h, s, l) : '#000000';

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <FormLabel>{label}</FormLabel>
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: `hsl(${value})` }} />
           <Input
                value={hexValue}
                onChange={handleHexChange}
                className="w-24 font-mono text-sm"
                aria-label={`${label} Hex Code`}
            />
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <FormLabel className="text-xs text-muted-foreground">Hue</FormLabel>
          <Slider min={0} max={360} step={1} value={!isNaN(h) ? [h] : [0]} onValueChange={handleHueChange} />
        </div>
        <div>
          <FormLabel className="text-xs text-muted-foreground">Saturation</FormLabel>
          <Slider min={0} max={100} step={1} value={!isNaN(s) ? [s] : [0]} onValueChange={handleSaturationChange} />
        </div>
        <div>
          <FormLabel className="text-xs text-muted-foreground">Lightness</FormLabel>
          <Slider min={0} max={100} step={1} value={!isNaN(l) ? [l] : [0]} onValueChange={handleLightnessChange} />
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

  const defaultValues: FormValues = {
      primaryColor: '181 100% 74%',
      backgroundColor: '180 100% 97%',
      accentColor: '181 100% 74%',
      foregroundColor: '210 10% 23%',
      logoUrl: '',
      tagline: client.firmName,
      fontFamily: 'Space Grotesk',
      passwordScreenDescription: 'This portal is password protected.',
      passwordScreenPasswordLabel: 'Password',
      passwordScreenUnlockButton: 'Unlock Portal',
      sessionScreenTitle: `Create New Session for ${client.firmName}`,
      sessionScreenDescription: 'Enter the details below to start a new training session.',
      sessionScreenFirstNameLabel: 'First Name',
      sessionScreenLastNameLabel: 'Last Name',
      sessionScreenEmailLabel: 'Email Address',
      sessionScreenCompanyLabel: 'Company Name',
      sessionScreenLaunchButton: 'Create Session & Launch Trainer',
      trainerScreenDescription: 'Select a training module to begin.',
      messengerTitle: 'Messenger Scenario Runner',
      messengerDescription: 'Practice real-world conversations with an AI-powered chat simulator.',
      messengerButton: 'Start Scenario',
      coldCallTitle: 'Cold Call Simulator',
      coldCallDescription: 'Hone your sales skills by practicing cold calls with an AI prospect.',
      coldCallButton: 'Start Simulation',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (customization) {
      form.reset({
        ...defaultValues,
        ...customization
      });
    } else {
        form.reset(defaultValues)
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

  const renderTextField = (name: keyof FormValues, label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
          <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
              <Input {...field} disabled={isLoading} />
          </FormControl>
          <FormMessage />
          </FormItem>
      )}
    />
  );


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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
             <ScrollArea className="h-[60vh] flex-grow pr-6">
                <div className="space-y-6">
                    {renderTextField('logoUrl', 'Logo URL')}
                    {renderTextField('tagline', 'Tagline / Sub-heading')}
                    
                    <FormField
                      control={form.control}
                      name="fontFamily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Header Font</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger disabled={isLoading}>
                                <SelectValue placeholder="Select a font" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fontOptions.map(font => (
                                <SelectItem key={font} value={font} style={{ fontFamily: font }}>{font}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                          <ColorPicker
                          label="Button Color"
                          value={field.value}
                          onChange={field.onChange}
                          />
                      )}
                    />
                     <Controller
                      control={form.control}
                      name="foregroundColor"
                      render={({ field }) => (
                          <ColorPicker
                          label="Text Color"
                          value={field.value}
                          onChange={field.onChange}
                          />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="backgroundColor"
                      render={({ field }) => (
                          <ColorPicker
                          label="Window Background Color"
                          value={field.value}
                          onChange={field.onChange}
                          />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="accentColor"
                      render={({ field }) => (
                          <ColorPicker
                          label="Accent Color"
                          value={field.value}
                          onChange={field.onChange}
                          />
                      )}
                    />
                    
                    <Separator/>
                    <h4 className="text-lg font-semibold">Password Screen Text</h4>
                    {renderTextField('passwordScreenDescription', 'Description')}
                    {renderTextField('passwordScreenPasswordLabel', 'Password Input Label')}
                    {renderTextField('passwordScreenUnlockButton', 'Unlock Button Text')}

                    <Separator/>
                    <h4 className="text-lg font-semibold">Session Screen Text</h4>
                    {renderTextField('sessionScreenTitle', 'Title')}
                    {renderTextField('sessionScreenDescription', 'Description')}
                    {renderTextField('sessionScreenFirstNameLabel', 'First Name Label')}
                    {renderTextField('sessionScreenLastNameLabel', 'Last Name Label')}
                    {renderTextField('sessionScreenEmailLabel', 'Email Label')}
                    {renderTextField('sessionScreenCompanyLabel', 'Company Label')}
                    {renderTextField('sessionScreenLaunchButton', 'Launch Button Text')}
                    
                    <Separator/>
                    <h4 className="text-lg font-semibold">Trainer Screen Text</h4>
                    {renderTextField('trainerScreenDescription', 'Description')}
                    {renderTextField('messengerTitle', 'Messenger Card Title')}
                    {renderTextField('messengerDescription', 'Messenger Card Description')}
                    {renderTextField('messengerButton', 'Messenger Card Button Text')}
                    {renderTextField('coldCallTitle', 'Cold Call Card Title')}
                    {renderTextField('coldCallDescription', 'Cold Call Card Description')}
                    {renderTextField('coldCallButton', 'Cold Call Card Button Text')}

                </div>
            </ScrollArea>
            <DialogFooter className='pt-6'>
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
