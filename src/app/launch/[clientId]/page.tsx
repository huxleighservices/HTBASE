
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
import { Label } from '@/components/ui/label';
import {
  collection,
  query,
  where,
  collectionGroup,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import type { Client, BrandCustomization } from '@/types/client';
import { Loader2, MessageSquare, Phone, KeyRound, LogIn } from 'lucide-react';
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
import { useFirestore, useAuth, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

type Stage = 'login' | 'trainer';

const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function ClientLaunchPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const [stage, setStage] = useState<Stage>('login');
  const [client, setClient] = useState<Client | null>(null);
  const [customization, setCustomization] = useState<BrandCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const firestore = useFirestore();

  const [isMessengerScenarioOpen, setIsMessengerScenarioOpen] = useState(false);
  const [isColdCallOpen, setIsColdCallOpen] = useState(false);
  
  // If a regular user is already logged in, redirect them away.
  useEffect(() => {
    if (user && !isUserLoading) {
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
  
  useEffect(() => {
    if (customization) {
      const root = document.documentElement;
      if (customization.primaryColor) root.style.setProperty('--primary', customization.primaryColor);
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
    defaultValues: { email: '', password: '' },
  });

  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    if (!auth) return;
    setIsLoggingIn(true);
    loginForm.clearErrors();
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // We don't need to fetch the access key doc, just logging in is enough.
      // The auth state change will be detected if needed, but for this flow we just need to proceed.
      setStage('trainer');
    } catch (error: any) {
        if (error instanceof FirebaseError) {
             loginForm.setError('root', { message: 'Invalid credentials. Please check the email and password.' });
        } else {
             loginForm.setError('root', { message: 'An unexpected error occurred.' });
        }
    } finally {
        setIsLoggingIn(false);
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>Email</FormLabel>
                      <FormControl><Input type="email" {...field} disabled={isLoggingIn} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')} /></FormControl>
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
                      <Button onClick={() => setIsMessengerScenarioOpen(true)}>Start Scenario</Button>
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
                      <Button onClick={() => setIsColdCallOpen(true)}>Start Simulation</Button>
                    </CardFooter>
                  </Card>
                </div>
                <div className="pt-6">
                  {/* The session concept is removed, so we pass null for activeSessionId */}
                  <SessionManager clientPath={getClientDocPath(client)} customization={customization} />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* We pass a temporary session ID "access-key-session" since results still need an association */}
          <MessengerScenarioDialog open={isMessengerScenarioOpen} onOpenChange={setIsMessengerScenarioOpen} activeSessionId="access-key-session" clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>
          <ColdCallSimulatorDialog open={isColdCallOpen} onOpenChange={setIsColdCallOpen} activeSessionId="access-key-session" clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>
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
    </main>
  );
}
