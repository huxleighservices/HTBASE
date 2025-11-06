
"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/common/header";
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/types/user";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // This effect runs when the user is authenticated but their profile is not yet loaded or doesn't exist.
    // We explicitly check for `isProfileLoading === false` and `!userProfile` to be sure.
    // This ensures we only run this once after the initial data fetch attempt.
    if (user && !isProfileLoading && !userProfile) {
      const email = user.email || 'no-email@example.com';
      
      // Create a default user profile.
      // This is crucial for users who sign up but don't have a DB entry yet.
      const newProfile: UserProfile = {
        id: user.uid,
        email: email,
        // Default new users to 'user' role. Admins can elevate them later.
        role: email === 'service@huxleigh.com' ? 'admin' : 'user', 
        firstName: user.displayName?.split(' ')[0] || email.split('@')[0] || 'New',
        lastName: user.displayName?.split(' ')[1] || 'User',
        assignedClientId: '', // Ensure this field exists and is empty
      };
      
      // Save the new profile to Firestore. `merge: false` ensures we create a new doc
      // and don't accidentally merge with stale data.
      if (userDocRef) {
        setDocumentNonBlocking(userDocRef, newProfile, { merge: false });
      }
    }
  }, [user, isProfileLoading, userProfile, userDocRef]);


  const isLoading = isUserLoading || (user && isProfileLoading);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
