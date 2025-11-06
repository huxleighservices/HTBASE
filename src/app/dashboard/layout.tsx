
"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/common/header";
import { useUser, useDoc, useFirestore, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { doc } from "firebase/firestore";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    // When profile is done loading and we have a user but no profile document
    if (!isProfileLoading && user && !userProfile) {
      if (userDocRef) {
        // Create a user profile document if it doesn't exist.
        // This ensures every authenticated user is represented in the admin panel.
        const email = user.email || 'no-email@example.com';
        setDocumentNonBlocking(userDocRef, {
          id: user.uid,
          email: email,
          role: email === 'service@huxleigh.com' ? 'admin' : 'user',
          firstName: email.split('@')[0] || 'New',
          lastName: 'User',
        }, { merge: true });
      }
    }
  }, [isProfileLoading, user, userProfile, userDocRef]);


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
