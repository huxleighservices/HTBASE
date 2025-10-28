
'use client';

import { useRouter } from 'next/navigation';
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
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useAuth,
  useUser,
  useFirestore,
} from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { collectionGroup, query, where, limit, getDocs } from 'firebase/firestore';
import type { Client } from '@/types/client';
import { FirebaseError } from 'firebase/app';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Client[]>([]);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    const fetchClients = async () => {
      if (!firestore || debouncedSearchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearchLoading(true);
      try {
        const clientsQuery = query(
          collectionGroup(firestore, 'clients'),
          where('displayId', '>=', debouncedSearchQuery.toUpperCase()),
          where('displayId', '<=', debouncedSearchQuery.toUpperCase() + '\uf8ff'),
          where('status', '==', 'active'),
          limit(5)
        );

        const querySnapshot = await getDocs(clientsQuery);
        const clients = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          displayId: doc.data().displayId,
        })) as Client[];
        setSearchResults(clients);
      } catch (e) {
        console.error("Error searching clients:", e);
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    };

    fetchClients();
  }, [firestore, debouncedSearchQuery]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    initiateEmailSignIn(auth, email, password, (error) => {
      setIsLoading(false);
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
          case 'auth/invalid-email':
            setError('Invalid email or password. Please try again.');
            break;
          default:
            setError('An unexpected error occurred. Please try again later.');
            break;
        }
      } else {
        setError('An unexpected error occurred.');
      }
    });
  };

  const handleClientSelect = (displayId: string) => {
    router.push(`/launch/${displayId}`);
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Card className="border-2 border-primary/20 shadow-lg shadow-primary/10">
          <CardHeader className="items-center text-center">
            <Image src="/logo.png" alt="HTBase Logo" width={48} height={48} className="text-primary" />
            <CardTitle className="font-headline text-2xl">HTBase</CardTitle>
            <CardDescription>
              Access your white-label AI trainer.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@huxleigh.com"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
               {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Authenticating...' : 'Secure Sign In'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Find Your Company Portal</CardTitle>
            <CardDescription>
              Enter your 6-character company code to find your launch page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-code">Company Code</Label>
              <Input
                id="company-code"
                placeholder="e.g. ABC123"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {isSearchLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {!isSearchLoading && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(client => (
                  <Button
                    key={client.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleClientSelect(client.displayId)}
                  >
                    {client.firmName} ({client.displayId})
                  </Button>
                ))}
              </div>
            )}
            {!isSearchLoading && debouncedSearchQuery.length >= 3 && searchResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No active clients found for '{debouncedSearchQuery}'.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()}{' '}
          <a
            href="https://huxleigh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            Huxleigh LLC
          </a>
          . All Rights Reserved.
        </p>
      </footer>
    </main>
  );
}
