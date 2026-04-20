'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  doc,
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search, Plus, Check, Minus, Sparkles, Send, Loader2,
  ShieldCheck, Pencil, LayoutGrid, PackageOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WIDGET_CATALOG,
  WIDGET_CATEGORIES,
  WIDGET_CATALOG_MAP,
  type WidgetType,
  type WidgetCategory,
} from '@/lib/widget-catalog';
import { WidgetIcon } from '@/components/portal/widget-browser-dialog';
import type { Widget } from '@/types/widget';
import type { UserProfile } from '@/types/user';
import type { Client } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MarketplaceListing = {
  type: WidgetType;
  enabled: boolean;           // super admin toggle
  nameOverride?: string;
  descriptionOverride?: string;
};

const CATEGORY_COLORS: Record<WidgetCategory, string> = {
  'Sales Training': 'bg-primary/15 text-primary border-primary/30',
  'Operations':     'bg-secondary/15 text-secondary border-secondary/30',
  'Leads':          'bg-accent/15 text-accent border-accent/30',
};

// ─────────────────────────────────────────────────────────────────────────────
// Request dialog schema
// ─────────────────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  widgetName: z.string().min(2, 'Name is required').max(80),
  widgetDescription: z.string().min(10, 'Please describe what it should do (10+ chars)').max(500),
});
type RequestFormValues = z.infer<typeof requestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Edit listing dialog (super admin)
// ─────────────────────────────────────────────────────────────────────────────

const editSchema = z.object({
  nameOverride: z.string().max(80).optional(),
  descriptionOverride: z.string().max(300).optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [isClientLoading, setIsClientLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'All'>('All');
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [togglingType, setTogglingType] = useState<WidgetType | null>(null);
  const [addingType, setAddingType] = useState<WidgetType | null>(null);

  // ── Load user profile ──────────────────────────────────────────────────────
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isSuperAdmin = user?.email === 'service@huxleigh.com';

  // ── Load assigned client ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchClient = async () => {
      if (isProfileLoading || !firestore) return;
      if (!userProfile?.assignedClientId && !isSuperAdmin) {
        setIsClientLoading(false);
        return;
      }
      if (isSuperAdmin) { setIsClientLoading(false); return; }
      setIsClientLoading(true);
      try {
        const snap = await getDocs(
          query(collectionGroup(firestore, 'clients'), where('displayId', '==', userProfile!.assignedClientId))
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          setClient({ ...(d.data() as Client), id: d.id, path: d.ref.path });
        }
      } catch { /* keep null */ }
      finally { setIsClientLoading(false); }
    };
    fetchClient();
  }, [firestore, userProfile, isProfileLoading, isSuperAdmin]);

  // ── Marketplace listings (top-level Firestore collection) ──────────────────
  const marketplaceRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'widgetMarketplace');
  }, [firestore]);
  const { data: listings } = useCollection<MarketplaceListing>(marketplaceRef);

  // Build a map of type → listing for quick lookup
  const listingMap = useMemo(() => {
    const map: Partial<Record<WidgetType, MarketplaceListing>> = {};
    listings?.forEach((l) => { map[l.type] = l; });
    return map;
  }, [listings]);

  // ── Client's existing widgets ──────────────────────────────────────────────
  const clientWidgetsRef = useMemoFirebase(() => {
    if (!firestore || !client?.path) return null;
    return collection(firestore, client.path, 'widgets');
  }, [firestore, client?.path]);
  const { data: clientWidgets } = useCollection<Widget>(clientWidgetsRef);

  const clientWidgetTypes = useMemo(
    () => new Set(clientWidgets?.map((w) => w.type) ?? []),
    [clientWidgets]
  );

  // ── Filtered widget list ───────────────────────────────────────────────────
  const filteredWidgets = useMemo(() => {
    return WIDGET_CATALOG.filter((def) => {
      const listing = listingMap[def.type];
      // Non-super-admin only sees marketplace-enabled widgets
      // (if no listing exists yet, default to enabled)
      if (!isSuperAdmin && listing && !listing.enabled) return false;

      const name = listing?.nameOverride || def.defaultTitle;
      const desc = listing?.descriptionOverride || def.defaultDescription;
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        desc.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || def.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory, listingMap, isSuperAdmin]);

  // ── Add widget to client portal ────────────────────────────────────────────
  const handleAdd = useCallback(async (type: WidgetType) => {
    if (!firestore || !client?.path) return;
    setAddingType(type);
    try {
      const def = WIDGET_CATALOG_MAP[type];
      const listing = listingMap[type];
      const newWidget: Widget = {
        id: type,
        type,
        title: listing?.nameOverride || def.defaultTitle,
        description: listing?.descriptionOverride || def.defaultDescription,
        enabled: true,
        order: (clientWidgets?.length ?? 0),
        category: def.category,
      };
      await setDoc(doc(firestore, client.path, 'widgets', type), newWidget);
      toast({ title: 'Widget added', description: `"${newWidget.title}" added to your portal.` });
    } finally {
      setAddingType(null);
    }
  }, [firestore, client, clientWidgets, listingMap, toast]);

  // ── Remove widget from client portal ──────────────────────────────────────
  const handleRemove = useCallback(async (type: WidgetType) => {
    if (!firestore || !client?.path) return;
    setAddingType(type);
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(firestore, client.path, 'widgets', type));
      toast({ title: 'Widget removed', description: 'Widget removed from your portal.' });
    } finally {
      setAddingType(null);
    }
  }, [firestore, client, toast]);

  // ── Super admin: toggle marketplace enabled ────────────────────────────────
  const handleToggleMarketplace = useCallback(async (type: WidgetType, enabled: boolean) => {
    if (!firestore) return;
    setTogglingType(type);
    try {
      const existing = listingMap[type];
      await setDoc(doc(firestore, 'widgetMarketplace', type), {
        type,
        enabled,
        nameOverride: existing?.nameOverride ?? '',
        descriptionOverride: existing?.descriptionOverride ?? '',
      });
    } finally {
      setTogglingType(null);
    }
  }, [firestore, listingMap]);

  // ── Super admin: save listing edits ───────────────────────────────────────
  const handleSaveListing = useCallback(async (type: WidgetType, values: EditFormValues) => {
    if (!firestore) return;
    const existing = listingMap[type];
    await setDoc(doc(firestore, 'widgetMarketplace', type), {
      type,
      enabled: existing?.enabled ?? true,
      nameOverride: values.nameOverride ?? '',
      descriptionOverride: values.descriptionOverride ?? '',
    });
    toast({ title: 'Listing updated' });
    setEditingListing(null);
  }, [firestore, listingMap, toast]);

  // ── Guard: redirect if not logged in ──────────────────────────────────────
  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isProfileLoading || isClientLoading;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl animate-pulse-glow" />
            <Loader2 className="relative z-10 h-10 w-10 animate-spin text-primary" />
          </div>
          <p className="animate-pulse text-sm text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <h1 className="font-headline text-2xl font-extrabold text-gradient">
              Widget Marketplace
            </h1>
            {isSuperAdmin && (
              <Badge className="ml-1 gap-1 border-primary/30 bg-primary/10 text-primary text-[10px] font-bold px-2">
                <ShieldCheck className="h-3 w-3" />Super Admin
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? 'Manage which widgets are available to all clients.'
              : client
                ? `Adding widgets to ${client.firmName}'s portal`
                : 'Browse available widgets for your client portal.'}
          </p>
        </div>
        <Button
          onClick={() => setIsRequestOpen(true)}
          className="btn-gradient h-9 gap-2 shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Request a Widget
        </Button>
      </div>

      {/* ── Search + filter ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-border/50 bg-background/50"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', ...WIDGET_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold border transition-all',
                selectedCategory === cat
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{filteredWidgets.length}</span> widgets shown
        </span>
        {!isSuperAdmin && client && (
          <span>
            <span className="font-semibold text-primary">{clientWidgetTypes.size}</span> active on your portal
          </span>
        )}
      </div>

      {/* ── Widget grid ──────────────────────────────────────────────────────── */}
      {filteredWidgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <PackageOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-foreground">No widgets found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWidgets.map((def) => {
            const listing = listingMap[def.type];
            const isActive = clientWidgetTypes.has(def.type);
            const isMarketplaceEnabled = listing ? listing.enabled : true;
            const displayName = listing?.nameOverride || def.defaultTitle;
            const displayDesc = listing?.descriptionOverride || def.defaultDescription;
            const isWorking = addingType === def.type || togglingType === def.type;

            return (
              <div
                key={def.type}
                className={cn(
                  'relative flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-200',
                  !isMarketplaceEnabled && isSuperAdmin
                    ? 'border-border/20 bg-background/15 opacity-60'
                    : 'glass-card hover:border-primary/30 hover:shadow-[0_0_24px_rgba(0,235,255,0.06)]'
                )}
              >
                {/* Active badge */}
                {isActive && !isSuperAdmin && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Check className="h-2.5 w-2.5" />Active
                    </span>
                  </div>
                )}

                {/* Super admin controls */}
                {isSuperAdmin && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingListing(listing ?? { type: def.type, enabled: true })}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-border/50 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <Switch
                      checked={isMarketplaceEnabled}
                      disabled={togglingType === def.type}
                      onCheckedChange={(v) => handleToggleMarketplace(def.type, v)}
                      className="scale-75 origin-right"
                    />
                  </div>
                )}

                {/* Icon + title */}
                <div className={cn('flex items-start gap-3', isSuperAdmin ? 'pr-16' : isActive ? 'pr-16' : '')}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15">
                    <WidgetIcon iconName={def.iconName} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold font-headline text-sm leading-tight">{displayName}</h3>
                    <span className={cn(
                      'inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                      CATEGORY_COLORS[def.category]
                    )}>
                      {def.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="flex-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {displayDesc}
                </p>

                {/* Action button — hidden for super admin */}
                {!isSuperAdmin && (
                  <Button
                    size="sm"
                    variant={isActive ? 'outline' : 'default'}
                    className={cn(
                      'mt-auto w-full text-xs h-8',
                      isActive
                        ? 'border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:border-destructive/50'
                        : 'btn-gradient'
                    )}
                    onClick={() => isActive ? handleRemove(def.type) : handleAdd(def.type)}
                    disabled={isWorking || (!client && !isSuperAdmin)}
                  >
                    {isWorking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isActive ? (
                      <><Minus className="mr-1 h-3 w-3" />Remove from Portal</>
                    ) : (
                      <><Plus className="mr-1 h-3 w-3" />Add to Portal</>
                    )}
                  </Button>
                )}

                {/* Marketplace status for super admin */}
                {isSuperAdmin && (
                  <p className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider mt-auto',
                    isMarketplaceEnabled ? 'text-primary/60' : 'text-muted-foreground/40'
                  )}>
                    {isMarketplaceEnabled ? '● Available to clients' : '○ Hidden from clients'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── No client warning ────────────────────────────────────────────────── */}
      {!isSuperAdmin && !client && !isLoading && (
        <div className="rounded-2xl border border-secondary/20 bg-secondary/5 px-5 py-4 text-sm text-muted-foreground">
          <span className="font-semibold text-secondary/80">No client assigned.</span>{' '}
          Contact an administrator to assign you to a client before adding widgets.
        </div>
      )}

      {/* ── Request Widget Dialog ─────────────────────────────────────────────── */}
      <RequestWidgetDialog
        open={isRequestOpen}
        onOpenChange={setIsRequestOpen}
        clientName={client?.firmName ?? 'Unknown Client'}
        userEmail={user?.email ?? ''}
        onSubmit={async (name, desc) => {
          if (!firestore) return;
          await addDoc(collection(firestore, 'widgetRequests'), {
            widgetName: name,
            widgetDescription: desc,
            clientDisplayId: client?.displayId ?? 'N/A',
            clientName: client?.firmName ?? 'Unknown',
            requestedByEmail: user?.email ?? '',
            status: 'pending',
            createdAt: serverTimestamp(),
          });
          toast({
            title: 'Request sent!',
            description: 'Your widget request has been submitted to the HTBase team.',
          });
        }}
      />

      {/* ── Edit Listing Dialog (super admin) ─────────────────────────────────── */}
      {editingListing && (
        <EditListingDialog
          listing={editingListing}
          open={!!editingListing}
          onOpenChange={(o) => { if (!o) setEditingListing(null); }}
          onSave={(values) => handleSaveListing(editingListing.type, values)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Widget Dialog
// ─────────────────────────────────────────────────────────────────────────────

function RequestWidgetDialog({
  open, onOpenChange, clientName, userEmail, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientName: string;
  userEmail: string;
  onSubmit: (name: string, desc: string) => Promise<void>;
}) {
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { widgetName: '', widgetDescription: '' },
  });

  const handleSubmit = async (values: RequestFormValues) => {
    await onSubmit(values.widgetName, values.widgetDescription);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 text-secondary/80">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="font-headline text-lg">Request a New Widget</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Describe the widget you need. The{' '}
            <span className="text-primary/80 font-medium">HTBase team</span> will review it and
            notify you once it&apos;s available.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-primary/80">Requesting for:</span> {clientName}
          <span className="mx-2 opacity-40">·</span>
          Sent to <span className="font-mono text-primary/80">service@huxleigh.com</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="widgetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Widget Name
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Inventory Tracker, Schedule Manager..." className="border-border/60 bg-background/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="widgetDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    What should it do?
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Describe the functionality, data it should track, and how your team will use it..." className="resize-none border-border/60 bg-background/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => { form.reset(); onOpenChange(false); }} className="border border-border/40">
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Send className="mr-2 h-4 w-4" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Listing Dialog (super admin)
// ─────────────────────────────────────────────────────────────────────────────

function EditListingDialog({
  listing, open, onOpenChange, onSave,
}: {
  listing: MarketplaceListing;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (values: EditFormValues) => Promise<void>;
}) {
  const def = WIDGET_CATALOG_MAP[listing.type];
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nameOverride: listing.nameOverride || '',
      descriptionOverride: listing.descriptionOverride || '',
    },
  });

  useEffect(() => {
    form.reset({
      nameOverride: listing.nameOverride || '',
      descriptionOverride: listing.descriptionOverride || '',
    });
  }, [listing, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Pencil className="h-4 w-4" />
            </div>
            <DialogTitle className="font-headline text-lg">Edit Marketplace Listing</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Override the name and description shown to clients. Leave blank to use defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/30 bg-background/30 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/70">Widget:</span>{' '}
          {def.defaultTitle}
          <span className="mx-2 opacity-40">·</span>
          {def.category}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="nameOverride"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Name Override
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={def.defaultTitle} className="border-border/60 bg-background/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descriptionOverride"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Description Override
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={def.defaultDescription} className="resize-none border-border/60 bg-background/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="border border-border/40">
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
