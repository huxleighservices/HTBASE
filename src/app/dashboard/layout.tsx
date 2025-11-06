
"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/common/header";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
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
  
  if (user.email === 'service@huxleigh.com' && !userProfile) {
    // Special case to bootstrap the admin user
    const { setDocumentNonBlocking } = require('@/firebase/non-blocking-updates');
    if (userDocRef) {
      setDocumentNonBlocking(userDocRef, {
        id: user.uid,
        email: user.email,
        role: 'admin',
        firstName: 'Service',
        lastName: 'Account',
      }, { merge: true });
    }
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
