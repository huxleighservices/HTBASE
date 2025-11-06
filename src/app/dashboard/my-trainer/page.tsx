
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, KeyRound, PlusCircle } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Client } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MyTrainerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [isClientLoading, setIsClientLoading] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!firestore || !userProfile || userProfile.role !== 'manager' || !userProfile.assignedClientId) {
        setIsClientLoading(false);
        setClient(null); // Explicitly set client to null
        return;
      }

      setIsClientLoading(true);
      try {
        const clientsQuery = query(
          collectionGroup(firestore, 'clients'),
          where('displayId', '==', userProfile.assignedClientId)
        );

        const querySnapshot = await getDocs(clientsQuery);
        if (!querySnapshot.empty) {
          const clientDoc = querySnapshot.docs[0];
          setClient({ ...clientDoc.data(), id: clientDoc.id } as Client);
        } else {
          setClient(null);
        }
      } catch (error) {
        console.error('Error fetching assigned client:', error);
        setClient(null);
      } finally {
        setIsClientLoading(false);
      }
    };

    if (userProfile) {
      fetchClientData();
    } else if (!isProfileLoading) {
        // If profile isn't loading and is null, we can stop client loading
        setIsClientLoading(false);
    }
  }, [firestore, userProfile, isProfileLoading]);

  const isLoading = isUserLoading || isProfileLoading || isClientLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your trainer...</p>
        </div>
      </div>
    );
  }

  if (userProfile?.role !== 'manager' || !client) {
    return (
       <div className="flex flex-col gap-8 items-center text-center mt-16">
        <div className="max-w-md p-8 border rounded-lg bg-card">
            <h1 className="text-2xl font-bold font-headline tracking-tight">
            No Trainer Assigned
            </h1>
            <p className="text-muted-foreground mt-2">
            You are not assigned to a client trainer. Please contact an administrator for assistance.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          My Trainer: {client.firmName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Managing Client:</p>
            <Badge variant="secondary" className="font-mono">{client.displayId}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle>Access Keys</CardTitle>
                <CardDescription>
                    Manage API and access keys for this client.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle />
                Add New Key
            </Button>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg bg-muted/50">
                <KeyRound className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold">No Access Keys Found</p>
                <p className="text-muted-foreground text-sm">Click "Add New Key" to create the first access key for this client.</p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
