
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
import {
  collection,
  query,
  where,
  collectionGroup,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import type { Client, BrandCustomization, Asset } from '@/types/client';
import { Loader2, MessageSquare, Phone, LogIn, Code, Database } from 'lucide-react';
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
import { ColdCallSimulatorDialog } from '@/components/trainer/cold-call-simulator-dialog';
import Image from 'next/image';
import { MessengerScenarioDialog } from '@/components/trainer/messenger-scenario-dialog';
import { SessionManager } from '@/components/trainer/session-manager';
import { useFirestore, useUser, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogClose,
  DialogContent as PasswordDialogContent,
  DialogDescription as PasswordDialogDescription,
  DialogFooter as PasswordDialogFooter,
  DialogHeader as PasswordDialogHeader,
  DialogTitle as PasswordDialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { OpacTrackerDialog } from '@/components/opac/opac-tracker-dialog';
import { signInAnonymously } from 'firebase/auth';

type Stage = 'login' | 'trainer';

const loginFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function ClientLaunchPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const [stage, setStage] = useState<Stage>('login');
  const [client, setClient] = useState<Client | null>(null);
  const [customization, setCustomization] = useState<BrandCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const firestore = useFirestore();

  const [isMessengerScenarioOpen, setIsMessengerScenarioOpen] = useState(false);
  const [isColdCallOpen, setIsColdCallOpen] = useState(false);
  const [isOpacTrackerOpen, setIsOpacTrackerOpen] = useState(false);

  // Temporary password state for SUNMMU
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [scenarioToOpen, setScenarioToOpen] = useState<'messenger' | 'coldcall' | null>(null);

  
  // If a regular user is already logged in, redirect them away.
  useEffect(() => {
    // If a non-anonymous user is logged in, they should not be on a launch page.
    if (user && !isUserLoading && !user.isAnonymous) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const fetchClientAndCustomization = async () => {
      if (!firestore || !clientId) return;
      setIsLoading(true);
      try {
        const clientQuery = query(
          collectionGroup(firestore, 'clients'),
          where('displayId', '==', clientId)
        );
        const querySnapshot = await getDocs(clientQuery);

        if (!querySnapshot.empty) {
          const clientDoc = querySnapshot.docs[0];
          const fetchedClient = {
            ...(clientDoc.data() as Omit<Client, 'id'>),
            id: clientDoc.id,
            path: clientDoc.ref.path,
          };
          setClient(fetchedClient);

          const customizationRef = doc(firestore, fetchedClient.path, 'customization', 'config');
          const customizationSnap = await getDoc(customizationRef);
          if (customizationSnap.exists()) {
            setCustomization(customizationSnap.data() as BrandCustomization);
          }
        } else {
          setClient(null);
        }
      } catch (e) {
        console.error('Error fetching client data:', e);
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientAndCustomization();
  }, [firestore, clientId]);
  
  const assetsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client?.path) return null;
    return collection(firestore, client.path, 'assets');
  }, [firestore, client?.path]);

  const { data: assets } = useCollection<Asset>(assetsCollectionRef);


  useEffect(() => {
    if (customization) {
      const root = document.documentElement;
      if (customization.primaryColor) {
        root.style.setProperty('--primary', customization.primaryColor);
        const lightness = parseFloat(customization.primaryColor.split(' ')[2]);
        if (lightness < 40) {
          root.style.setProperty('--primary-foreground', 'var(--primary-foreground-light)');
        } else {
          root.style.setProperty('--primary-foreground', '210 10% 23%');
        }
      }
      if (customization.backgroundColor) {
        root.style.setProperty('--background', customization.backgroundColor);
        root.style.setProperty('--card', customization.backgroundColor);
      }
      if (customization.accentColor) root.style.setProperty('--accent', customization.accentColor);
      if (customization.foregroundColor) {
        root.style.setProperty('--foreground', customization.foregroundColor);
        root.style.setProperty('--muted-foreground', customization.foregroundColor);
        root.style.setProperty('--card-foreground', customization.foregroundColor);
      }
      if (customization.fontFamily) {
        const fontName = customization.fontFamily.replace(/ /g, '+');
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        root.style.setProperty('--font-headline', `'${customization.fontFamily}', sans-serif`);
      }
    }
    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--background');
      root.style.removeProperty('--card');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--muted-foreground');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--font-headline');
    };
  }, [customization]);


  const getClientDocPath = (client: Client | undefined | null): string | null => {
    if (!client || !client.path) return null;
    return client.path;
  };

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: '', password: '' },
  });

  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    if (!firestore || !client?.path || !auth) return;
    setIsLoggingIn(true);
    loginForm.clearErrors();

    try {
      const accessKeysRef = collection(firestore, client.path, 'accessKeys');
      const q = query(
        accessKeysRef,
        where('username', '==', data.username),
        where('password', '==', data.password)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        loginForm.setError('root', { message: 'Invalid credentials. Please try again.' });
      } else {
        // Successful credential validation, now sign in anonymously.
        await signInAnonymously(auth);
        
        // The onAuthStateChanged listener in the provider will handle the user state update.
        // We can now proceed to the trainer stage.
        setStage('trainer');
        setActiveSessionId(data.username); // Use username as the session ID
      }
    } catch (error: any) {
        loginForm.setError('root', { message: 'An unexpected error occurred during validation.' });
        console.error("Error validating access key:", error);
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleScenarioClick = (scenario: 'messenger' | 'coldcall') => {
    if (clientId.toUpperCase() === 'SUNMMU') {
      setScenarioToOpen(scenario);
      setShowPasswordDialog(true);
    } else {
      if (scenario === 'messenger') setIsMessengerScenarioOpen(true);
      if (scenario === 'coldcall') setIsColdCallOpen(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordAttempt === 'CROME') {
      if (scenarioToOpen === 'messenger') setIsMessengerScenarioOpen(true);
      if (scenarioToOpen === 'coldcall') setIsColdCallOpen(true);
      setShowPasswordDialog(false);
      setPasswordAttempt('');
      setPasswordError('');
      setScenarioToOpen(null);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };


  const renderContent = () => {
    const commonCardClass = 'w-full max-w-sm';
    const logoSrc = customization?.logoUrl || '/logo.png';

    if (stage === 'login') {
      return (
        <Card className={commonCardClass}>
            <CardHeader className="items-center text-center">
              {customization?.logoUrl ? (
                <Image src={logoSrc} alt="Company Logo" width={120} height={120} className="mb-4" unoptimized/>
              ) : (
                <CardTitle className={cn("font-headline text-2xl", customization?.foregroundColor && 'text-foreground')}>{client?.firmName || 'Client Portal'}</CardTitle>
              )}
              <CardDescription className={cn(customization?.foregroundColor && 'text-foreground opacity-70')}>
                Enter your access key credentials to begin.
              </CardDescription>
            </CardHeader>
            <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <CardContent className="space-y-4">
                 <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>Username</FormLabel>
                      <FormControl><Input {...field} disabled={isLoggingIn} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>Password</FormLabel>
                      <FormControl><Input type="password" {...field} disabled={isLoggingIn} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {loginForm.formState.errors.root && <p className="text-sm text-destructive">{loginForm.formState.errors.root.message}</p>}
              </CardContent>
              <CardFooter>
                 <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogIn className="mr-2"/>}
                    {isLoggingIn ? 'Verifying...' : 'Sign In'}
                </Button>
              </CardFooter>
            </form>
            </Form>
          </Card>
      );
    }
          
    if (stage === 'trainer') {
      return (
        <>
          <div className="mx-auto max-w-4xl w-full">
            <Card>
              <CardHeader className="items-center text-center">
                <Image src={logoSrc} alt="Company Logo" width={120} height={120} className="mb-4" unoptimized />
                <CardTitle className={cn("font-headline text-2xl", customization?.foregroundColor && 'text-foreground')}>{customization?.tagline || 'Training Portal'}</CardTitle>
                <CardDescription className={cn(customization?.foregroundColor && 'text-foreground opacity-70')}>Select a training module to begin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="size-6" /></div>
                        <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>Messenger Scenario Runner</CardTitle>
                      </div>
                      <CardDescription className={cn('pt-2', customization?.foregroundColor && 'text-foreground opacity-70')}>Practice real-world conversations with an AI-powered chat simulator.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button onClick={() => handleScenarioClick('messenger')}>Start Scenario</Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Phone className="size-6" /></div>
                        <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>Cold Call Simulator</CardTitle>
                      </div>
                      <CardDescription className={cn('pt-2', customization?.foregroundColor && 'text-foreground opacity-70')}>Hone your sales skills by practicing cold calls with an AI prospect.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button onClick={() => handleScenarioClick('coldcall')}>Start Simulation</Button>
                    </CardFooter>
                  </Card>
                </div>

                {assets && assets.length > 0 && (
                    <div className="space-y-4 pt-6">
                         <h3 className={cn("font-headline text-lg text-center", customization?.foregroundColor && 'text-foreground')}>Custom Assets</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                        {assets.map(asset => {
                           const isOpac = asset.title.includes('OPAC');
                           const Icon = isOpac ? Database : Code;
                           const handleAssetClick = () => {
                             if (isOpac) {
                               setIsOpacTrackerOpen(true);
                             }
                           };

                           return (
                            <Card key={asset.id}>
                                <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-6" /></div>
                                    <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>{asset.title}</CardTitle>
                                </div>
                                <CardDescription className={cn('pt-2', customization?.foregroundColor && 'text-foreground opacity-70')}>{asset.description}</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={handleAssetClick} disabled={!isOpac}>
                                        {isOpac ? 'Open Tracker' : 'Coming Soon'}
                                    </Button>
                                </CardFooter>
                            </Card>
                           );
                        })}
                        </div>
                    </div>
                )}

                <div className="pt-6">
                  <SessionManager clientPath={getClientDocPath(client)} customization={customization} activeSessionId={activeSessionId} />
                </div>
              </CardContent>
            </Card>
          </div>
          <MessengerScenarioDialog open={isMessengerScenarioOpen} onOpenChange={setIsMessengerScenarioOpen} activeSessionId={activeSessionId} clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>
          <ColdCallSimulatorDialog open={isColdCallOpen} onOpenChange={setIsColdCallOpen} activeSessionId={activeSessionId} clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>
          {client && <OpacTrackerDialog open={isOpacTrackerOpen} onOpenChange={setIsOpacTrackerOpen} client={client} />}
        </>
      );
    }
      
    return null;
  };
  
    if (isLoading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    if (!client && !isLoading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
                <Card className="w-full max-w-sm text-center">
                    <CardHeader><CardTitle>Client Not Found</CardTitle></CardHeader>
                    <CardContent><p>The requested client could not be found.</p></CardContent>
                </Card>
            </main>
        );
    }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
      {renderContent()}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <PasswordDialogContent>
          <PasswordDialogHeader>
            <PasswordDialogTitle>Password Required</PasswordDialogTitle>
            <PasswordDialogDescription>
              This module is password protected. Please enter the password to continue.
            </PasswordDialogDescription>
          </PasswordDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password-attempt" className="text-right">
                Password
              </Label>
              <Input
                id="password-attempt"
                type="password"
                value={passwordAttempt}
                onChange={(e) => setPasswordAttempt(e.target.value)}
                className="col-span-3"
              />
            </div>
            {passwordError && <p className="text-sm text-destructive text-center col-span-4">{passwordError}</p>}
          </div>
          <PasswordDialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handlePasswordSubmit}>Unlock</Button>
          </PasswordDialogFooter>
        </PasswordDialogContent>
      </Dialog>
    </main>
  );
}
