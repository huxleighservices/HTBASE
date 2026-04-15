
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import {
  doc,
  collectionGroup,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { Loader2, Sparkles } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Client, BrandCustomization } from '@/types/client';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [logoUrl, setLogoUrl] = useState<string | null>('/HTBASELOGO.png');
  const [isDataLoading, setIsDataLoading] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchClientLogo = async () => {
      if (isUserLoading || isProfileLoading || !firestore) return;
      setIsDataLoading(true);

      if (userProfile?.role === 'manager' && userProfile.assignedClientId) {
        try {
          const clientsQuery = query(
            collectionGroup(firestore, 'clients'),
            where('displayId', '==', userProfile.assignedClientId)
          );
          const querySnapshot = await getDocs(clientsQuery);

          if (!querySnapshot.empty) {
            const clientDoc = querySnapshot.docs[0];
            const customizationRef = doc(
              firestore,
              clientDoc.ref.path,
              'customization',
              'config'
            );
            const customizationSnap = await getDoc(customizationRef);
            if (customizationSnap.exists()) {
              const data = customizationSnap.data() as BrandCustomization;
              if (data.logoUrl) setLogoUrl(data.logoUrl);
            }
          }
        } catch {
          // Keep default logo
        }
      } else {
        setLogoUrl('/HTBASELOGO.png');
      }
      setIsDataLoading(false);
    };

    fetchClientLogo();
  }, [user, isUserLoading, userProfile, isProfileLoading, firestore]);

  const isLoading = isUserLoading || isProfileLoading || isDataLoading;

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden">
      {/* Background orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="animate-float-1 absolute -top-20 right-0 h-[400px] w-[400px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(0,235,255,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="animate-float-2 absolute -bottom-20 left-0 h-[400px] w-[400px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl animate-pulse-glow" />
              <Loader2 className="relative z-10 h-14 w-14 animate-spin text-primary" />
            </div>
            <p className="animate-pulse text-sm text-muted-foreground">Loading your workspace...</p>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div className="animate-fade-up relative">
              <div className="absolute inset-0 scale-[2] rounded-3xl bg-primary/10 blur-3xl animate-pulse-glow" />
              {logoUrl ? (
                <div className="relative rounded-3xl border border-primary/15 bg-background/40 p-4 glass">
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={96}
                    height={96}
                    className="relative z-10 rounded-xl object-contain"
                    unoptimized={logoUrl !== '/HTBASELOGO.png'}
                  />
                </div>
              ) : (
                <div className="relative rounded-3xl border border-primary/15 bg-background/40 p-4 glass">
                  <Image
                    src="/HTBASELOGO.png"
                    alt="HTBase Logo"
                    width={96}
                    height={96}
                    className="relative z-10"
                  />
                </div>
              )}
            </div>

            {/* Welcome text */}
            <div className="animate-fade-up space-y-2" style={{ animationDelay: '80ms' }}>
              <h1 className="text-4xl font-extrabold font-headline tracking-tight">
                {userProfile?.firstName ? (
                  <>
                    <span className="text-muted-foreground font-medium text-2xl block mb-1">
                      Welcome back,
                    </span>
                    <span className="text-gradient">
                      {userProfile.firstName}
                    </span>
                  </>
                ) : (
                  <span className="text-gradient">Welcome</span>
                )}
              </h1>
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                Your AI-First ERP is ready
                <Sparkles className="h-3.5 w-3.5 text-secondary/60" />
              </p>
            </div>

            {/* Status pills */}
            <div
              className="animate-fade-up flex flex-wrap items-center justify-center gap-2"
              style={{ animationDelay: '160ms' }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Systems Operational
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary/80">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary/80" />
                AI Models Online
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
