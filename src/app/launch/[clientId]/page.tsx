
'use client';

import { useState } from 'react';
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Client } from '@/types/client';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export default function ClientLaunchPage({ params }: { params: { clientId: string } }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useUser();
  const firestore = useFirestore();

  const clientQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'clients'),
      where('displayId', '==', params.clientId)
    );
  }, [firestore, user, params.clientId]);

  const { data: clients, isLoading } = useCollection<Client>(clientQuery);
  const client = clients?.[0];

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would be a more secure check
    if (password === 'password') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  if (isLoading || !user) {
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
    )
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dot p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to {client?.firmName}'s Portal</CardTitle>
          <CardDescription>
            AI Trainer ready for launch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Firm/Rep Name
            </p>
            <p className="text-sm">{client?.firmName}</p>

            <p className="text-sm font-medium text-muted-foreground">
              Legal Name
            </p>
            <p className="text-sm">
              {client?.legalFirstName} {client?.legalLastName}
            </p>

            <p className="text-sm font-medium text-muted-foreground">
              Contact Email
            </p>
            <p className="text-sm">{client?.contactEmail}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className='w-full'>Launch AI Trainer</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
