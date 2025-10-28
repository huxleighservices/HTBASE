
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
  useFirestore,
  addDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, collectionGroup, getDocs } from 'firebase/firestore';
import type { Client } from '@/types/client';
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
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
import { Textarea } from '@/components/ui/textarea';

const sessionFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  companyName: z.string().min(1, 'Company name is required'),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function ClientLaunchPage({
  params,
}: {
  params: { clientId: string };
}) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [sessionCreated, setSessionCreated] = useState(false);
  const [links, setLinks] = useState<string[]>(['']);
  
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firestore = useFirestore();

  useEffect(() => {
    const fetchClient = async () => {
      if (!firestore || !params.clientId) {
        return;
      }
      setIsLoading(true);
      try {
        const clientQuery = query(
          collectionGroup(firestore, 'clients'),
          where('displayId', '==', params.clientId)
        );
        const querySnapshot = await getDocs(clientQuery);
        if (!querySnapshot.empty) {
          const clientDoc = querySnapshot.docs[0];
          setClient({ ...clientDoc.data(), id: clientDoc.id, path: clientDoc.ref.path } as Client);
        } else {
          setClient(null);
        }
      } catch (e) {
        console.error("Error fetching client:", e);
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [firestore, params.clientId]);


  const getClientDocPath = (client: Client | undefined | null) => {
    if (!client || !client.path) return null;
    return client.path;
  }

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
    if (password === 'JAXON') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleSessionSubmit: SubmitHandler<SessionFormValues> = data => {
    const clientDocPath = getClientDocPath(client);
    if (!clientDocPath || !firestore) return;
    const sessionCollectionRef = collection(
      firestore,
      clientDocPath,
      'sessions'
    );
    addDocumentNonBlocking(sessionCollectionRef, data);
    setSessionCreated(true);
  };

  const handleAddLink = () => {
    setLinks([...links, '']);
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
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
            <Logo className="h-12 w-12 text-primary" />
            <CardTitle className="font-headline text-2xl">
              {client?.firmName || 'Client Portal'}
            </CardTitle>
            <CardDescription>
              This portal is password protected.
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
            <CardTitle>Create New Session for {client?.firmName}</CardTitle>
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
    <main className="min-h-screen bg-dot p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">
              AI Trainer for {client?.firmName}
            </CardTitle>
            <CardDescription>
              Begin by providing documents and links to train the AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 rounded-lg border bg-background p-4">
              <h3 className="font-semibold">Sourcing Documents</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <Label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or
                        drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOCX, TXT, etc.
                      </p>
                    </div>
                    <Input id="file-upload" type="file" className="hidden" multiple />
                  </Label>
                </div>
                <div className="relative flex items-center">
                  <div className="flex-grow border-t"></div>
                  <span className="flex-shrink mx-4 text-muted-foreground text-sm">OR</span>
                  <div className="flex-grow border-t"></div>
                </div>
                <div className="space-y-2">
                  <Label>Add Links to Documents</Label>
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="https://example.com/document.pdf"
                        value={link}
                        onChange={(e) => handleLinkChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                   <Button variant="outline" size="sm" onClick={handleAddLink}>
                    Add Another Link
                  </Button>
                </div>
              </div>
            </div>
            
            <Textarea
              placeholder="You can also paste text directly here..."
              className="min-h-[150px]"
            />

          </CardContent>
          <CardFooter className="flex justify-end">
            <Button>Start Training AI</Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

    