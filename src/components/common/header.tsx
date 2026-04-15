"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc } from 'firebase/firestore';
import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";

export function Header() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userDocRef);

  const isManager = userProfile?.role === 'manager';
  const isAdmin = userProfile?.role === 'admin';

  const navLinks = useMemo(() => {
    const links = [{ href: "/dashboard", label: "Home" }];
    if (isAdmin) links.push({ href: "/dashboard/clients", label: "Clients" });
    if (isManager) links.push({ href: "/dashboard/my-trainer", label: "My ERP" });
    links.push({ href: "/dashboard/settings", label: "Settings" });
    return links;
  }, [isManager, isAdmin]);

  const handleLogout = () => {
    if (!auth) return;
    signOut(auth).then(() => router.push("/"));
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setIsMobileMenuOpen(false)}
        className={cn(
          "relative text-sm font-medium transition-all duration-200 px-1 py-0.5",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        {isActive && (
          <span
            className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, hsl(181,100%,58%), hsl(270,55%,58%))',
              boxShadow: '0 0 8px rgba(0,235,255,0.7)',
            }}
          />
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between px-4 md:px-6 glass-nav">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-7">
        <Link href="/dashboard" className="group flex items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
            <Image
              src="/HTBASELOGO.png"
              alt="HTBase Logo"
              width={72}
              height={72}
              className="relative z-10 transition-transform group-hover:scale-105"
            />
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </div>

      {/* Right: Mobile menu + Avatar */}
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-r border-border/50 glass-nav">
              <div className="flex flex-col gap-6 p-6">
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center"
                >
                  <Image src="/HTBASELOGO.png" alt="HTBase Logo" width={52} height={52} />
                </Link>
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <NavLink key={link.href} {...link} />
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full p-0 ring-1 ring-border/50 transition-all hover:ring-primary/40"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(181,100%,18%) 0%, hsl(270,55%,22%) 100%)',
                    color: 'hsl(181,100%,72%)',
                  }}
                >
                  {userProfile?.firstName || userProfile?.lastName ? (
                    getInitials(userProfile?.firstName, userProfile?.lastName)
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass-card border-border/50" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-semibold leading-none">
                  {userProfile
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : 'HTBase User'}
                </p>
                <p className="mt-1 text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
