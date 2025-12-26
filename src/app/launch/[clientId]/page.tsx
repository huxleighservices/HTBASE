
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
  getDocs,
  doc,
  getDoc,
  collectionGroup,
} from 'firebase/firestore';
import type { Client, BrandCustomization, Asset } from '@/types/client';
import { Loader2, MessageSquare, Phone, LogIn, Code, Database, LogOut, Timer, GanttChartSquare, Bot, Users, Wrench, Settings, FileSignature } from 'lucide-react';
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
import { OpacTrackerDialog } from '@/components/opac/opac-tracker-dialog';
import { signInAnonymously, signOut } from 'firebase/auth';
import type { AccessKey } from '@/types/session';
import { ProjectHubDialog } from '@/components/project-hub/project-hub-dialog';
import { TimePunchDialog } from '@/components/time-punch/time-punch-dialog';
import { SopBotDialog } from '@/components/sop-bot/sop-bot-dialog';
import { LeadsTrackerDialog } from '@/components/leads/leads-tracker-dialog';
import { BuildsTrackerDialog } from '@/components/builds/builds-tracker-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { FormManagementDialog } from '@/components/forms/form-management-dialog';

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
  const [cardVisibility, setCardVisibility] = useLocalStorage('cardVisibility-4WK21Y', {
    messenger: true,
    coldCall: true,
    builds: true,
    leads: true,
    trainingResults: true,
    forms: true,
  });

  const [stage, setStage] = useState<Stage>('login');
  const [client, setClient] = useState<Client | null>(null);
  const [customization, setCustomization] = useState<BrandCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeUser, setActiveUser] = useState<AccessKey | null>(null);

  const firestore = useFirestore();

  const [isMessengerScenarioOpen, setIsMessengerScenarioOpen] = useState(false);
  const [isColdCallOpen, setIsColdCallOpen] = useState(false);
  const [isOpacTrackerOpen, setIsOpacTrackerOpen] = useState(false);
  const [isTimePunchOpen, setIsTimePunchOpen] = useState(false);
  const [isProjectHubOpen, setIsProjectHubOpen] = useState(false);
  const [isSopBotOpen, setIsSopBotOpen] = useState(false);
  const [isLeadsTrackerOpen, setIsLeadsTrackerOpen] = useState(false);
  const [isBuildsTrackerOpen, setIsBuildsTrackerOpen] = useState(false);
  const [isFormManagementOpen, setIsFormManagementOpen] = useState(false);


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
            ...(clientDoc.data() as Omit<Client, 'id' | 'path'>),
            id: clientDoc.id,
            path: clientDoc.ref.path,
          };
          setClient(fetchedClient);

          const customizationRef = doc(firestore, fetchedClient.path, 'customization', 'config');
          const customizationSnap = await getDoc(customizationRef);

          if (customizationSnap.exists()) {
            setCustomization(customizationSnap.data() as BrandCustomization);
          } else {
            setCustomization(null); // Reset if no customization found
          }
        } else {
          setClient(null);
          setCustomization(null);
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
        const accessKeyDoc = querySnapshot.docs[0];
        const accessKeyData = { ...accessKeyDoc.data(), id: accessKeyDoc.id } as AccessKey;
        await signInAnonymously(auth);
        
        setActiveUser(accessKeyData);
        setStage('trainer');
      }
    } catch (error: any) {
        loginForm.setError('root', { message: 'An unexpected error occurred during validation.' });
        console.error("Error validating access key:", error);
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
        setStage('login');
        setActiveUser(null);
    } catch (error) {
        console.error("Error signing out: ", error);
    }
  };

  const renderContent = () => {
    const commonCardClass = 'w-full max-w-sm';
    const logoSrc = customization?.logoUrl || '/logo.png';
    const isSalesClient = client?.isEdu !== true;
    const hasAssets = assets && assets.length > 0;
    const is4WK21Y = clientId === '4WK21Y';
    
    const handleVisibilityChange = (card: keyof typeof cardVisibility, checked: boolean) => {
        setCardVisibility(prev => ({ ...prev, [card]: checked }));
    };


    const getAssetIcon = (title: string) => {
        if (title.includes('OPAC')) return <Database className="size-6" />;
        if (title.includes('Time Punch')) return <Timer className="size-6" />;
        if (title.includes('Project Hub')) return <GanttChartSquare className="size-6" />;
        if (title.includes('SOP Bot')) return <Bot className="size-6" />;
        return <Code className="size-6" />;
    };
    
    const getAssetAction = (asset: Asset) => {
        if (asset.title.includes('OPAC')) return () => setIsOpacTrackerOpen(true);
        if (asset.title.includes('Time Punch')) return () => setIsTimePunchOpen(true);
        if (asset.title.includes('Project Hub')) return () => setIsProjectHubOpen(true);
        if (asset.title.includes('SOP Bot')) return () => setIsSopBotOpen(true);
        return () => {};
    };

    const getAssetButtonText = (title: string) => {
        if (title.includes('OPAC')) return 'Open Tracker';
        if (title.includes('Time Punch')) return 'Open Time Punch';
        if (title.includes('Project Hub')) return 'Open Hub';
        if (title.includes('SOP Bot')) return 'Open SOP Bot';
        return 'Open';
    }


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
            <Card className="relative">
              <CardHeader className="items-center text-center">
                {is4WK21Y && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2">
                        <Settings className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Visible Modules</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem checked={cardVisibility.messenger} onCheckedChange={(c) => handleVisibilityChange('messenger', !!c)}>Messenger Scenario</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={cardVisibility.coldCall} onCheckedChange={(c) => handleVisibilityChange('coldCall', !!c)}>Cold Call Simulator</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={cardVisibility.trainingResults} onCheckedChange={(c) => handleVisibilityChange('trainingResults', !!c)}>Training Results</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={cardVisibility.builds} onCheckedChange={(c) => handleVisibilityChange('builds', !!c)}>Builds Tracker</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={cardVisibility.leads} onCheckedChange={(c) => handleVisibilityChange('leads', !!c)}>Leads Tracker</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={cardVisibility.forms} onCheckedChange={(c) => handleVisibilityChange('forms', !!c)}>Forms</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Image src={logoSrc} alt="Company Logo" width={120} height={120} className="mb-4" unoptimized />
                <CardTitle className={cn("font-headline text-2xl", customization?.foregroundColor && 'text-foreground')}>{customization?.tagline || 'Training Portal'}</CardTitle>
                <CardDescription className={cn(customization?.foregroundColor && 'text-foreground opacity-70')}>
                   {is4WK21Y ? 'Welcome to your portal.' : (isSalesClient ? 'Select a training module to begin.' : 'Welcome to your portal.')}
                </CardDescription>
                {activeUser?.displayName && (
                    <p className={cn("text-muted-foreground pt-2", customization?.foregroundColor && 'text-foreground opacity-90')}>Welcome, {activeUser.displayName}!</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                
                {(isSalesClient || is4WK21Y) && (
                    <div className="space-y-4">
                        <h3 className="font-headline text-xl font-semibold">Sales Training</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                            {cardVisibility.messenger && (
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
                            )}
                            {cardVisibility.coldCall && (
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
                            )}
                        </div>
                        {cardVisibility.trainingResults && (
                            <div className="pt-6">
                                <SessionManager clientPath={getClientDocPath(client)} customization={customization} activeSessionId={activeUser?.username || null} />
                            </div>
                        )}
                    </div>
                )}
                
                {(hasAssets || is4WK21Y) && (
                    <div className="space-y-4">
                        <h3 className="font-headline text-xl font-semibold">Operations</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                        {assets?.map(asset => (
                            <Card key={asset.id}>
                                <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        {getAssetIcon(asset.title)}
                                    </div>
                                    <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>{asset.title}</CardTitle>
                                </div>
                                <CardDescription className={cn('pt-2', customization?.foregroundColor && 'text-foreground opacity-70')}>{asset.description}</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={getAssetAction(asset)}>
                                        {getAssetButtonText(asset.title)}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                         {is4WK21Y && cardVisibility.builds && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wrench className="size-6" /></div>
                                        <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>Builds Tracker</CardTitle>
                                    </div>
                                    <CardDescription className={cn('pt-2', customization?.foregroundColor && 'text-foreground opacity-70')}>Manage and track your build projects.</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => setIsBuildsTrackerOpen(true)}>Open Builds</Button>
                                </CardFooter>
                            </Card>
                         )}
                         {is4WK21Y && cardVisibility.forms && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileSignature className="size-6" /></div>
                                        <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>Forms</CardTitle>
                                    </div>
                                    <CardDescription className={cn('pt-2', customization?.foregroundColor && 'text-foreground opacity-70')}>Manage public data entry forms.</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => setIsFormManagementOpen(true)}>Manage Forms</Button>
                                </CardFooter>
                            </Card>
                         )}
                        </div>
                    </div>
                )}

                {is4WK21Y && cardVisibility.leads && (
                    <div className="space-y-4">
                        <h3 className="font-headline text-xl font-semibold">Leads</h3>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="size-6" /></div>
                                    <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>Leads Tracker</CardTitle>
                                </div>
                                <CardDescription className={cn('pt-2', customization?.foregroundColor && 'text-foreground opacity-70')}>Manage and track your sales leads.</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button onClick={() => setIsLeadsTrackerOpen(true)}>Open Leads</Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
                
              </CardContent>
              <CardFooter className="justify-center">
                 <Button variant="link" onClick={handleLogout} className={cn(customization?.foregroundColor && 'text-foreground')}>
                     <LogOut className="mr-2 h-4 w-4"/>
                     Log Out
                 </Button>
              </CardFooter>
            </Card>
          </div>
          {isSalesClient && <MessengerScenarioDialog open={isMessengerScenarioOpen} onOpenChange={setIsMessengerScenarioOpen} activeSessionId={activeUser?.username || null} clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>}
          {isSalesClient && <ColdCallSimulatorDialog open={isColdCallOpen} onOpenChange={setIsColdCallOpen} activeSessionId={activeUser?.username || null} clientPath={getClientDocPath(client)} trainingData={client?.trainingData}/>}
          {client && <OpacTrackerDialog open={isOpacTrackerOpen} onOpenChange={setIsOpacTrackerOpen} client={client} activeUser={activeUser} />}
          {client && assets && <TimePunchDialog open={isTimePunchOpen} onOpenChange={setIsTimePunchOpen} client={client} activeUser={activeUser} asset={assets.find(a => a.title.includes('Time Punch'))} />}
          {client && <ProjectHubDialog open={isProjectHubOpen} onOpenChange={setIsProjectHubOpen} client={client} activeUser={activeUser} />}
          {client && <SopBotDialog open={isSopBotOpen} onOpenChange={setIsSopBotOpen} client={client} activeUser={activeUser} />}
          {client && <LeadsTrackerDialog open={isLeadsTrackerOpen} onOpenChange={setIsLeadsTrackerOpen} client={client} activeUser={activeUser} />}
          {client && <BuildsTrackerDialog open={isBuildsTrackerOpen} onOpenChange={setIsBuildsTrackerOpen} client={client} activeUser={activeUser} />}
          {client && <FormManagementDialog open={isFormManagementOpen} onOpenChange={setIsFormManagementOpen} client={client} activeUser={activeUser} />}
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
