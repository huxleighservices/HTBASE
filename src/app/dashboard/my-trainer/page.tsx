
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Client } from '@/types/client';

export default function MyTrainerPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchClientAndRedirect = async () => {
      if (!isProfileLoading && userProfile) {
        if (userProfile.role !== 'manager' || !userProfile.assignedClientId) {
          // If not a manager or no client assigned, maybe redirect to dashboard
          // For now, we'll just stop loading and show a message.
           setIsLoading(false);
          return;
        }
        
        try {
            // This is a workaround to handle the case where the manager's client is not found
            // In a real app, you might want to show a more specific error message.
            router.push(`/launch/${userProfile.assignedClientId}`);

        } catch (error) {
            console.error("Error fetching manager's client:", error);
            setIsLoading(false);
        }

      }
    };
    fetchClientAndRedirect();
  }, [userProfile, isProfileLoading, firestore, router]);


  if (isLoading || isProfileLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your trainer...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          My Trainer
        </h1>
        <p className="text-muted-foreground">
          Access your assigned client training portal.
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>No Trainer Assigned</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You have not been assigned to a client trainer. Please contact an administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
