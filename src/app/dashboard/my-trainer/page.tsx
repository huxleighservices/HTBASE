
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
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types/user';

export default function MyTrainerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // Redirect non-managers away if they land here
    if (!isProfileLoading && userProfile && userProfile.role !== 'manager') {
      router.push('/dashboard');
    }
  }, [userProfile, isProfileLoading, router]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading || (!userProfile && !isProfileLoading)) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your trainer...</p>
        </div>
      </div>
    );
  }

  // If user is not a manager, show access denied message.
  if (!userProfile || userProfile.role !== 'manager') {
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
              You are not a manager or have not been assigned a trainer. Please contact an administrator for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Blank slate for managers
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          My Trainer
        </h1>
        <p className="text-muted-foreground">
          This is your dedicated training portal. Content to be added.
        </p>
      </div>
    </div>
  );
}
