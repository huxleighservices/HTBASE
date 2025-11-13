
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
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Client, BrandCustomization } from '@/types/client';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [logoUrl, setLogoUrl] = useState<string | null>('/logo.png');
  const [isDataLoading, setIsDataLoading] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchClientLogo = async () => {
      if (isUserLoading || isProfileLoading) return;
      
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
            const clientPath = clientDoc.ref.path;
            
            const customizationRef = doc(firestore, clientPath, 'customization', 'config');
            const customizationSnap = await getDoc(customizationRef);

            if (customizationSnap.exists()) {
              const customizationData = customizationSnap.data() as BrandCustomization;
              if (customizationData.logoUrl) {
                setLogoUrl(customizationData.logoUrl);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching client's logo:", error);
          // Keep the default logo on error
        }
      }
      
      setIsDataLoading(false);
    };

    fetchClientLogo();
  }, [user, isUserLoading, userProfile, isProfileLoading, firestore]);

  const isLoading = isUserLoading || isProfileLoading || isDataLoading;

  return (
    <div className="flex flex-col gap-8 items-center text-center mt-16">
      {isLoading ? (
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      ) : (
        <>
          <div className="mb-4">
             {logoUrl ? (
                <Image
                    src={logoUrl}
                    alt="Logo"
                    width={128}
                    height={128}
                    className="rounded-md object-contain"
                    unoptimized={logoUrl !== '/logo.png'} // Unoptimize for external client logos
                />
            ) : (
                 <Image src="/logo.png" alt="HTBase Logo" width={128} height={128} />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              Welcome{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}
            </h1>
            <p className="text-muted-foreground">
              Your central hub for managing your AI-powered training.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
