
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
import { Loader2, MessageSquare, Phone } from 'lucide-react';
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
import { useFirestore, useUser } from '@/firebase';
import { useParams } from 'next/navigation';

const sessionFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  companyName: z.string().min(1, 'Company name is required'),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function ClientLaunchPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [sessionCreated, setSessionCreated] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [client, setClient] = useState<Client | null>(null);
  const [customization, setCustomization] =
    useState<BrandCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firestore = useFirestore();
  const { user } = useUser();

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

          // Fetch customization data
          const customizationRef = doc(
            firestore,
            fetchedClient.path,
            'customization',
            'config'
          );
          const customizationSnap = await getDoc(customizationRef);
          if (customizationSnap.exists()) {
            setCustomization(customizationSnap.data() as BrandCustomization);
          }
        } else {
          setClient(null);
          setCustomization(null);
        }
      } catch (e) {
        console.error('Error fetching client data:', e);
        setClient(null);
        setCustomization(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientAndCustomization();
  }, [firestore, clientId]);

  useEffect(() => {
    if (customization) {
      const root = document.documentElement;
      if (customization.primaryColor)
        root.style.setProperty('--primary', customization.primaryColor);
      if (customization.backgroundColor) {
        root.style.setProperty('--background', customization.backgroundColor);
        root.style.setProperty('--card', customization.backgroundColor);
      }
      if (customization.accentColor)
        root.style.setProperty('--accent', customization.accentColor);
      if (customization.foregroundColor)
        root.style.setProperty('--foreground', customization.foregroundColor);
       if (customization.fontFamily) {
        const fontName = customization.fontFamily.replace(/ /g, '+');
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        root.style.setProperty('--font-headline', `'${customization.fontFamily}', sans-serif`);
      }
    }
    // Cleanup function to reset styles when component unmounts or customization changes
    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--background');
      root.style.removeProperty('--card');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--font-headline');
    };
  }, [customization]);

  const getClientDocPath = (client: Client | undefined | null) => {
    if (!client || !client.path) return null;
    return client.path;
  };

  const sessionForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      companyName: '',
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === client?.launchPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleSessionSubmit: SubmitHandler<SessionFormValues> = async data => {
    const clientDocPath = getClientDocPath(client);
    if (!clientDocPath || !firestore) return;

    const newSessionId = `session_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setSessionCreated(true);
  };

  const logoSrc = customization?.logoUrl || '/logo.png';
  const tagline = customization?.tagline || client?.firmName || 'Client Portal';
  const title = customization?.tagline || 'Client Portal';
  const description = 'This portal is password protected.';


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
          <CardHeader>
            <CardTitle>Client Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested client could not be found.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <Image
              src={logoSrc}
              alt="Company Logo"
              width={120}
              height={120}
              className="mb-4"
              unoptimized
            />
            <CardTitle className="font-headline text-2xl">{title}</CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Unlock Portal
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    );
  }

  if (!sessionCreated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="font-headline">Create New Session for {client?.firmName}</CardTitle>
            <CardDescription>
              Enter the details below to start a new training session.
            </CardDescription>
          </CardHeader>
          <Form {...sessionForm}>
            <form onSubmit={sessionForm.handleSubmit(handleSessionSubmit)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={sessionForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sessionForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={sessionForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sessionForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Create Session & Launch Trainer
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-dot p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader className="items-center text-center">
              <Image
                src={logoSrc}
                alt="Company Logo"
                width={120}
                height={120}
                className="mb-4"
                unoptimized
              />
              <CardTitle className="font-headline text-2xl">
                {tagline}
              </CardTitle>
              <CardDescription>
                Select a training module to begin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MessageSquare className="size-6" />
                      </div>
                      <CardTitle className="font-headline text-lg">
                        Messenger Scenario Runner
                      </CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                      Practice real-world conversations with an AI-powered chat
                      simulator.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button onClick={() => setIsMessengerScenarioOpen(true)}>
                      Start Scenario
                    </Button>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Phone className="size-6" />
                      </div>
                      <CardTitle className="font-headline text-lg">
                        Cold Call Simulator
                      </CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                      Hone your sales skills by practicing cold calls with an AI
                      prospect.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button onClick={() => setIsColdCallOpen(true)}>
                      Start Simulation
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              <div className="pt-6">
                <SessionManager clientPath={getClientDocPath(client)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MessengerScenarioDialog
        open={isMessengerScenarioOpen}
        onOpenChange={setIsMessengerScenarioOpen}
        activeSessionId={activeSessionId}
        clientPath={getClientDocPath(client)}
        trainingData={client?.trainingData}
      />
      <ColdCallSimulatorDialog
        open={isColdCallOpen}
        onOpenChange={setIsColdCallOpen}
        activeSessionId={activeSessionId}
        clientPath={getClientDocPath(client)}
        trainingData={client?.trainingData}
      />
    </>
  );
}
