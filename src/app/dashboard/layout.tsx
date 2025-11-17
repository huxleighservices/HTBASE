
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
    // If the user is not loading and is either not logged in OR is an anonymous user,
    // they should not be on the dashboard. Redirect them to the root login page.
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || (user && isProfileLoading);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If the user is not a full user, or is an anonymous user, don't render the layout.
  // The redirect in the useEffect will handle navigation.
  if (!user || user.isAnonymous) {
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
