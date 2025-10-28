
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading } = useDoc(userDocRef);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };
  
  const displayedEmail = userProfile?.email || user?.email;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          My Profile
        </h1>
        <p className="text-muted-foreground">
          View your account information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            This is your profile information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-2 h-5 w-64" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-2 border-primary/50">
                <AvatarFallback className="text-3xl bg-background">
                  {userProfile?.firstName || userProfile?.lastName ? (
                    getInitials(userProfile?.firstName, userProfile?.lastName)
                  ) : (
                    <User className="h-12 w-12" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold">
                  {userProfile?.firstName} {userProfile?.lastName}
                </h2>
                <p className="text-muted-foreground">{displayedEmail}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-7 w-full" />
              </div>
              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-7 w-full" />
              </div>
              <div className="md:col-span-2">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-7 w-full" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  First Name
                </p>
                <p className="text-lg">{userProfile?.firstName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Name
                </p>
                <p className="text-lg">{userProfile?.lastName}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Email Address
                </p>
                <p className="text-lg">{displayedEmail}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
