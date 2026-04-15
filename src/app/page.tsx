'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Loader2, Zap, Building2, ChevronRight, Lock } from 'lucide-react';
import {
  useAuth,
  useUser,
  useFirestore,
  setDocumentNonBlocking,
} from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  collectionGroup,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import type { Client } from '@/types/client';
import { FirebaseError } from 'firebase/app';
import Image from 'next/image';
import type { UserProfile } from '@/types/user';
import { cn } from '@/lib/utils';

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
    if (user && !isUserLoading && user.email) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
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
        setSearchResults(
          querySnapshot.docs.map(d => ({
            ...d.data(),
            id: d.id,
            displayId: d.data().displayId,
          })) as Client[]
        );
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    };
    fetchClients();
  }, [firestore, debouncedSearchQuery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!auth || !firestore) {
      setError('Firebase is not initialized.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;
      const userDocRef = doc(firestore, 'users', loggedInUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const userEmail = loggedInUser.email || 'no-email@example.com';
        const newProfile: UserProfile = {
          id: loggedInUser.uid,
          email: userEmail,
          role: userEmail === 'service@huxleigh.com' ? 'admin' : 'user',
          firstName:
            loggedInUser.displayName?.split(' ')[0] ||
            userEmail.split('@')[0] ||
            'New',
          lastName: loggedInUser.displayName?.split(' ')[1] || 'User',
          assignedClientId: '',
        };
        setDocumentNonBlocking(userDocRef, newProfile, { merge: true });
      }
    } catch (error: any) {
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
        }
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  const handleClientSelect = (displayId: string) => {
    router.push(`/launch/${displayId}`);
  };

  if (isUserLoading || (user && user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse-glow scale-150" />
            <Loader2 className="relative z-10 h-10 w-10 animate-spin text-primary" />
          </div>
          <p className="animate-pulse text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-hero bg-dot p-4">

      {/* ── Animated background orbs ────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="animate-float-1 absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,235,255,0.16) 0%, transparent 70%)',
            filter: 'blur(60px)',
            opacity: 0.8,
          }}
        />
        <div
          className="animate-float-2 absolute -bottom-60 -left-40 h-[700px] w-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.16) 0%, transparent 70%)',
            filter: 'blur(70px)',
            opacity: 0.7,
          }}
        />
        <div
          className="animate-float-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.6,
          }}
        />
      </div>

      {/* ── Main content column ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5">

        {/* Hero brand block */}
        <div className="flex flex-col items-center gap-3 text-center animate-fade-up">
          <div className="relative mb-1">
            <div className="absolute inset-0 scale-150 rounded-3xl bg-primary/20 blur-3xl animate-pulse-glow" />
            <Image src="/HTBASELOGO.png" alt="HTBase Logo" width={220} height={220} className="relative z-10" />
          </div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            <span className="text-primary/90">AI-First ERP</span>
            <span className="mx-2 opacity-30">·</span>
            for any business
          </p>
        </div>

        {/* ── Login card ── */}
        <div
          className="w-full glass-card-strong rounded-2xl p-6 animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Secure Sign In
            </span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@huxleigh.com"
                required
                disabled={isLoading}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="border-border/60 bg-background/50 backdrop-blur-sm transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                disabled={isLoading}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="border-border/60 bg-background/50 backdrop-blur-sm transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="mt-1 h-11 w-full btn-gradient text-sm font-semibold tracking-wide"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </div>

        {/* ── Company portal card ── */}
        <div
          className="w-full glass-card rounded-2xl p-6 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-secondary/80" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Company Portal
            </span>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Enter your 6-character company code to access your team&apos;s portal.
          </p>
          <div className="space-y-2">
            <Input
              id="company-code"
              placeholder="e.g. ABC123"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-border/60 bg-background/50 font-mono tracking-[0.2em] uppercase backdrop-blur-sm transition-all focus:border-secondary/50"
            />
            {isSearchLoading && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-secondary/80" />
              </div>
            )}
            {!isSearchLoading && searchResults.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {searchResults.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client.displayId)}
                    className={cn(
                      'group flex w-full cursor-pointer items-center justify-between',
                      'rounded-xl border border-border/50 bg-background/40 px-4 py-3',
                      'text-sm transition-all duration-200',
                      'hover:border-primary/40 hover:bg-primary/5',
                      'hover:shadow-[0_0_20px_rgba(0,235,255,0.08)]'
                    )}
                  >
                    <span className="font-medium text-foreground">
                      {client.firmName}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        ({client.displayId})
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </button>
                ))}
              </div>
            )}
            {!isSearchLoading &&
              debouncedSearchQuery.length >= 3 &&
              searchResults.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No active portals found for &quot;{debouncedSearchQuery}&quot;
                </p>
              )}
          </div>
        </div>

        {/* Footer */}
        <p
          className="animate-fade-up text-center text-xs text-muted-foreground/50"
          style={{ animationDelay: '300ms' }}
        >
          &copy; {new Date().getFullYear()}{' '}
          <a
            href="https://huxleigh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-primary"
          >
            Huxleigh LLC
          </a>
          {' '}· All Rights Reserved
        </p>
      </div>
    </main>
  );
}
