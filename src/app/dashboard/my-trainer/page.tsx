
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types/user';

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
    const checkRoleAndRedirect = async () => {
      if (!isProfileLoading && userProfile) {
        if (userProfile.role === 'manager' && userProfile.assignedClientId) {
          // If a manager has an assigned client, redirect them to the launch page.
          router.push(`/launch/${userProfile.assignedClientId}`);
        } else {
          // For non-managers or managers without assignments, stop loading.
          setIsLoading(false);
        }
      } else if (!isProfileLoading && !userProfile) {
        // If profile loading is done but there's no profile, stop loading.
        setIsLoading(false);
      }
    };
    checkRoleAndRedirect();
  }, [userProfile, isProfileLoading, router]);


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

  // Fallback content for managers without an assignment or non-managers who somehow land here.
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
            You have not been assigned to a client trainer. Please contact an administrator for access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
