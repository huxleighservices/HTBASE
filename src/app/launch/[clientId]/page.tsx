
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
  serverTimestamp,
  addDoc,
  getDocsFromServer,
} from 'firebase/firestore';
import type { Client, BrandCustomization } from '@/types/client';
import type { Session } from '@/types/session';
import { Loader2, MessageSquare, Phone, KeyRound, UserPlus } from 'lucide-react';
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
import { useFirestore } from '@/firebase';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Stage = 'password' | 'session_choice' | 'create_session' | 'join_session' | 'trainer';

const createSessionFormSchema = z.object({
  sessionName: z.string().min(1, 'Session name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  pin: z.string().length(4, 'PIN must be 4 digits'),
});
type CreateSessionFormValues = z.infer<typeof createSessionFormSchema>;

const joinSessionFormSchema = z.object({
    sessionName: z.string().min(1, 'Session name is required'),
    pin: z.string().length(4, 'PIN must be 4 digits'),
});
type JoinSessionFormValues = z.infer<typeof joinSessionFormSchema>;

export default function ClientLaunchPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>('password');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [customization, setCustomization] = useState<BrandCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firestore = useFirestore();

  const [isMessengerScenarioOpen, setIsMessengerScenarioOpen] = useState(false);
  const [isColdCallOpen, setIsColdCallOpen] = useState(false);

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

  const createSessionForm = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionFormSchema),
    defaultValues: { sessionName: '', companyName: '', pin: '' },
  });

  const joinSessionForm = useForm<JoinSessionFormValues>({
      resolver: zodResolver(joinSessionFormSchema),
      defaultValues: { sessionName: '', pin: '' },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === client?.launchPassword) {
      setStage('session_choice');
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };
  
  const handleCreateSessionSubmit: SubmitHandler<CreateSessionFormValues> = async (data) => {
    const clientDocPath = getClientDocPath(client);
    if (!clientDocPath || !firestore) return;
    setIsLoading(true);
    
    try {
        const sessionsRef = collection(firestore, clientDocPath, 'sessions');
        const newSessionDoc = await addDoc(sessionsRef, {
            ...data,
            createdAt: serverTimestamp()
        });
        
        const newSession: Session = { id: newSessionDoc.id, ...data, createdAt: new Date() };
        setActiveSession(newSession);
        setStage('trainer');
        setError('');
    } catch (e) {
        console.error("Error creating session:", e);
        setError("Could not create session. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleJoinSessionSubmit: SubmitHandler<JoinSessionFormValues> = async (data) => {
    const clientDocPath = getClientDocPath(client);
    if (!clientDocPath || !firestore) return;
    setIsLoading(true);
    setError('');

    try {
        const sessionsRef = collection(firestore, clientDocPath, 'sessions');
        const q = query(
            sessionsRef,
            where('sessionName', '==', data.sessionName),
            where('pin', '==', data.pin)
        );

        const querySnapshot = await getDocsFromServer(q);

        if (querySnapshot.empty) {
            setError('Invalid session name or PIN. Please try again.');
        } else {
            const sessionDoc = querySnapshot.docs[0];
            const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as Session;
            setActiveSession(sessionData);
            setStage('trainer');
        }
    } catch (e) {
        console.error("Error joining session:", e);
        setError("Could not join session. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const renderContent = () => {
    const commonCardClass = 'w-full max-w-sm';
    const logoSrc = customization?.logoUrl || '/logo.png';

    switch (stage) {
      case 'password':
        return (
          <Card className={commonCardClass}>
            <CardHeader className="items-center text-center">
              {customization?.logoUrl ? (
                <Image src={logoSrc} alt="Company Logo" width={120} height={120} className="mb-4" unoptimized/>
              ) : (
                <CardTitle className={cn("font-headline text-2xl", customization?.foregroundColor && 'text-foreground')}>{customization?.tagline || 'Client Portal'}</CardTitle>
              )}
              <CardDescription className={cn(customization?.foregroundColor && 'text-foreground opacity-70')}>This portal is password protected.</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className={cn(customization?.foregroundColor && 'text-foreground')}>Password</Label>
                  <Input id="password" type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')}/>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">Unlock Portal</Button>
              </CardFooter>
            </form>
          </Card>
        );

      case 'session_choice':
        return (
            <Card className={commonCardClass}>
                <CardHeader>
                    <CardTitle className={cn("font-headline", customization?.foregroundColor && 'text-foreground')}>Welcome to {client?.firmName}</CardTitle>
                    <CardDescription className={cn(customization?.foregroundColor && 'text-foreground opacity-70')}>Choose an option to continue.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Button variant="outline" size="lg" onClick={() => setStage('join_session')}>
                        <KeyRound className="mr-2 h-5 w-5"/>
                        Join a Session
                    </Button>
                    <Button size="lg" onClick={() => setStage('create_session')}>
                        <UserPlus className="mr-2 h-5 w-5"/>
                        Create a New Session
                    </Button>
                </CardContent>
            </Card>
        );

      case 'create_session':
          return (
             <Card className={commonCardClass}>
              <CardHeader>
                <CardTitle className={cn("font-headline", customization?.foregroundColor && 'text-foreground')}>Create New Session</CardTitle>
                <CardDescription className={cn(customization?.foregroundColor && 'text-foreground opacity-70')}>Enter the details below to start a new training session.</CardDescription>
              </CardHeader>
              <Form {...createSessionForm}>
                <form onSubmit={createSessionForm.handleSubmit(handleCreateSessionSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField control={createSessionForm.control} name="sessionName" render={({ field }) => (<FormItem><FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>Session Name</FormLabel><FormControl><Input {...field} disabled={isLoading} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={createSessionForm.control} name="companyName" render={({ field }) => (<FormItem><FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>Company Name</FormLabel><FormControl><Input {...field} disabled={isLoading} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={createSessionForm.control} name="pin" render={({ field }) => (<FormItem><FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>4-Digit PIN</FormLabel><FormControl><Input type="password" maxLength={4} {...field} disabled={isLoading} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')} /></FormControl><FormMessage /></FormItem>)}/>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create & Launch</Button>
                    <Button type="button" variant="ghost" onClick={() => setStage('session_choice')} disabled={isLoading}>Back</Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          );
      case 'join_session':
          return (
            <Card className={commonCardClass}>
              <CardHeader>
                <CardTitle className={cn("font-headline", customization?.foregroundColor && 'text-foreground')}>Join Session</CardTitle>
                <CardDescription className={cn(customization?.foregroundColor && 'text-foreground opacity-70')}>Enter the session details to continue your training.</CardDescription>
              </CardHeader>
              <Form {...joinSessionForm}>
                <form onSubmit={joinSessionForm.handleSubmit(handleJoinSessionSubmit)}>
                  <CardContent className="space-y-4">
                     <FormField control={joinSessionForm.control} name="sessionName" render={({ field }) => (<FormItem><FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>Session Name</FormLabel><FormControl><Input {...field} disabled={isLoading} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={joinSessionForm.control} name="pin" render={({ field }) => (<FormItem><FormLabel className={cn(customization?.foregroundColor && 'text-foreground')}>4-Digit PIN</FormLabel><FormControl><Input type="password" maxLength={4} {...field} disabled={isLoading} className={cn(customization?.foregroundColor && 'placeholder:text-foreground/50')} /></FormControl><FormMessage /></FormItem>)}/>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Join & Launch</Button>
                    <Button type="button" variant="ghost" onClick={() => setStage('session_choice')} disabled={isLoading}>Back</Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          );
          
      case 'trainer':
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
                    <SessionManager clientPath={getClientDocPath(client)} customization={customization} />
                  </div>
                </CardContent>
              </Card>
            </div>
            <MessengerScenarioDialog open={isMessengerScenarioOpen} onOpenChange={setIsMessengerScenarioOpen} activeSessionId={activeSession?.id || null} clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>
            <ColdCallSimulatorDialog open={isColdCallOpen} onOpenChange={setIsColdCallOpen} activeSessionId={activeSession?.id || null} clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>
          </>
        );

      default:
        return null;
    }
  };
  
    if (isLoading && stage !== 'trainer') {
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
