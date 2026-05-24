'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collectionGroup,
  serverTimestamp,
} from 'firebase/firestore';
import type { Client, BrandCustomization } from '@/types/client';
import type { AccessKey } from '@/types/session';
import type { Widget, WidgetRequest } from '@/types/widget';
import type { WidgetType } from '@/lib/widget-catalog';
import { WIDGET_CATALOG, WIDGET_CATALOG_MAP, WIDGET_CATEGORIES } from '@/lib/widget-catalog';
import {
  Loader2, LogIn, LogOut, Settings2, LayoutGrid, Pencil,
  ShieldCheck, Sparkles, EyeOff, SlidersHorizontal, Tag, X, Building2,
} from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ColdCallSimulatorDialog } from '@/components/trainer/cold-call-simulator-dialog';
import Image from 'next/image';
import { MessengerScenarioDialog } from '@/components/trainer/messenger-scenario-dialog';
import { SessionManager } from '@/components/trainer/session-manager';
import { useFirestore, useUser, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { OpacTrackerDialog } from '@/components/opac/opac-tracker-dialog';
import { signInAnonymously, signOut } from 'firebase/auth';
import { ProjectHubDialog } from '@/components/project-hub/project-hub-dialog';
import { TimePunchDialog } from '@/components/time-punch/time-punch-dialog';
import { SopBotDialog } from '@/components/sop-bot/sop-bot-dialog';
import { LeadsTrackerDialog } from '@/components/leads/leads-tracker-dialog';
import { BuildsTrackerDialog } from '@/components/builds/builds-tracker-dialog';
import { FormManagementDialog } from '@/components/forms/form-management-dialog';
import { QueueDialog } from '@/components/queue/queue-dialog';
import { MasterQueuePasscodeDialog } from '@/components/queue/master-queue-passcode-dialog';
import { MasterQueueDialog } from '@/components/queue/master-queue-dialog';
import { ContractGeneratorDialog } from '@/components/contracts/contract-generator-dialog';
import { ManageTemplatesDialog } from '@/components/contracts/manage-templates-dialog';
import { ARCollectionsDialog } from '@/components/ar-collections/ar-collections-dialog';
import { KnockProDialog } from '@/components/knock-pro/knock-pro-dialog';
import { TaskPipelineDialog } from '@/components/task-pipeline/task-pipeline-dialog';
import { TeamOverviewDialog } from '@/components/team-overview/team-overview-dialog';
import { PerformanceAnalyticsDialog } from '@/components/performance-analytics/performance-analytics-dialog';
import { AiAssistantDialog } from '@/components/ai-assistant/ai-assistant-dialog';
import { DealTrackerDialog } from '@/components/deal-tracker/deal-tracker-dialog';
import { ScheduleDialog } from '@/components/schedule/schedule-dialog';
import { ResourceLibraryDialog } from '@/components/resource-library/resource-library-dialog';
import { CommunicationsDialog } from '@/components/communications/communications-dialog';
import { CompletionCertificateDialog } from '@/components/completion-certificate/completion-certificate-dialog';
import { SupplementalAddendumDialog } from '@/components/supplemental-addendum/supplemental-addendum-dialog';
import { InventoryManagerDialog } from '@/components/inventory-manager/inventory-manager-dialog';
import { ERPHubDialog } from '@/components/erp-hub/erp-hub-dialog';
import { ERPAdminSheet } from '@/components/erp-hub/erp-admin-sheet';
import { WidgetIcon } from '@/components/portal/widget-browser-dialog';
import { WidgetEditDialog } from '@/components/portal/widget-edit-dialog';
import { WidgetBrowserDialog } from '@/components/portal/widget-browser-dialog';
import { WidgetRequestDialog } from '@/components/portal/widget-request-dialog';
import { UserWidgetEditorSheet, type UserWidgetPrefs } from '@/components/portal/user-widget-editor-sheet';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import type { Asset } from '@/types/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

type Stage = 'login' | 'portal';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

/** Default widget list for any client that hasn't configured their widgets in
 *  Firestore yet. Returns every widget in the catalog so all portals start
 *  fully-featured — admins can then hide what they don't need via Edit Portal. */
function buildDefaultWidgets(): Widget[] {
  return WIDGET_CATALOG.map((def, i) => ({
    id: def.type,
    type: def.type,
    title: def.defaultTitle,
    description: def.defaultDescription,
    enabled: true,
    order: i,
    category: def.category,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientLaunchPage() {
  const params    = useParams();
  const router    = useRouter();
  const clientId  = params.clientId as string;
  const { user, isUserLoading } = useUser();
  const auth      = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [stage, setStage]           = useState<Stage>('login');
  const [client, setClient]         = useState<Client | null>(null);
  const [customization, setCustomization] = useState<BrandCustomization | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeUser, setActiveUser] = useState<AccessKey | null>(null);

  // ── Admin / edit-mode state ─────────────────────────────────────────────────
  const isPortalAdmin = activeUser?.role === 'admin';
  const [editMode, setEditMode]     = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isERPAdminOpen, setIsERPAdminOpen] = useState(false);

  // ── Global tag filter ────────────────────────────────────────────────────────
  const [globalTagFilter, setGlobalTagFilter] = useState('');

  // ── User personal widget preferences (localStorage, per user+client) ────────
  const [userWidgetPrefs, setUserWidgetPrefs] = useLocalStorage<UserWidgetPrefs>(
    `userWidgetPrefs-${clientId}-${activeUser?.username ?? 'guest'}`,
    { hidden: [] }
  );
  const [isUserEditorOpen, setIsUserEditorOpen] = useState(false);

  // ── Portal mode: widget grid vs full-screen ERP Base ──────────────────────
  const [portalMode, setPortalMode] = useLocalStorage<'widget' | 'base'>(
    `portalMode-${clientId}`,
    'widget',
  );

  // ── Widget dialog state (one boolean per widget type) ──────────────────────
  const [openDialog, setOpenDialog] = useState<WidgetType | null>(null);
  const [isMasterQueuePasscodeOpen, setIsMasterQueuePasscodeOpen] = useState(false);
  const [isMasterQueueOpen, setIsMasterQueueOpen]                 = useState(false);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen]         = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Redirect already-logged-in non-anonymous users
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !isUserLoading && !user.isAnonymous) router.push('/dashboard');
  }, [user, isUserLoading, router]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load client + customization
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      if (!firestore || !clientId) return;
      setIsLoading(true);
      try {
        const snap = await getDocs(
          query(collectionGroup(firestore, 'clients'), where('displayId', '==', clientId))
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          const fetched = { ...(d.data() as Omit<Client, 'id' | 'path'>), id: d.id, path: d.ref.path };
          setClient(fetched);

          const customSnap = await getDoc(doc(firestore, fetched.path, 'customization', 'config'));
          setCustomization(customSnap.exists() ? (customSnap.data() as BrandCustomization) : null);
        } else {
          setClient(null); setCustomization(null);
        }
      } catch (e) {
        console.error('Error fetching client data:', e);
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [firestore, clientId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Assets (legacy – used for default widget seeding)
  // ─────────────────────────────────────────────────────────────────────────────
  const assetsRef = useMemoFirebase(() => {
    if (!firestore || !client?.path) return null;
    return collection(firestore, client.path, 'assets');
  }, [firestore, client?.path]);
  const { data: assets } = useCollection<Asset>(assetsRef);

  // ─────────────────────────────────────────────────────────────────────────────
  // Widgets collection
  // ─────────────────────────────────────────────────────────────────────────────
  const widgetsRef = useMemoFirebase(() => {
    if (!firestore || !client?.path) return null;
    return collection(firestore, client.path, 'widgets');
  }, [firestore, client?.path]);
  const { data: firestoreWidgets } = useCollection<Widget>(widgetsRef);

  // Effective widgets: Firestore → fall back to full catalog defaults
  const effectiveWidgets = useMemo<Widget[]>(() => {
    if (firestoreWidgets && firestoreWidgets.length > 0) return firestoreWidgets;
    return buildDefaultWidgets();
  }, [firestoreWidgets]);

  // All widgets marked enabled by admin
  const adminEnabledWidgets = useMemo(
    () => effectiveWidgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order),
    [effectiveWidgets]
  );
  // Further filtered by user's personal hidden prefs
  const enabledWidgets = useMemo(
    () => adminEnabledWidgets.filter((w) => !userWidgetPrefs.hidden.includes(w.type)),
    [adminEnabledWidgets, userWidgetPrefs.hidden]
  );
  const activeWidgetIds = useMemo(() => effectiveWidgets.map((w) => w.type), [effectiveWidgets]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Apply brand customization to CSS vars
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!customization) return;
    const root = document.documentElement;
    if (customization.colorScheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
    }
    if (customization.primaryColor) {
      root.style.setProperty('--primary', customization.primaryColor);
      const l = parseFloat(customization.primaryColor.split(' ')[2]);
      root.style.setProperty('--primary-foreground', l < 40 ? 'var(--primary-foreground-light)' : '210 10% 23%');
    }
    if (customization.backgroundColor) {
      root.style.setProperty('--background', customization.backgroundColor);
      root.style.setProperty('--card', customization.backgroundColor);
    }
    if (customization.accentColor)    root.style.setProperty('--accent', customization.accentColor);
    if (customization.foregroundColor) {
      root.style.setProperty('--foreground', customization.foregroundColor);
      root.style.setProperty('--muted-foreground', customization.foregroundColor);
      root.style.setProperty('--card-foreground', customization.foregroundColor);
    }
    if (customization.fontFamily) {
      const name = customization.fontFamily.replace(/ /g, '+');
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${name}:wght@400;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      root.style.setProperty('--font-headline', `'${customization.fontFamily}', sans-serif`);
    }
    return () => {
      root.classList.remove('light');
      ['--primary','--primary-foreground','--background','--card','--accent',
       '--foreground','--muted-foreground','--card-foreground','--font-headline']
        .forEach((v) => root.style.removeProperty(v));
    };
  }, [customization]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────────────────────────
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    if (!firestore || !client?.path || !auth) return;
    setIsLoggingIn(true);
    loginForm.clearErrors();
    try {
      const q = query(
        collection(firestore, client.path, 'accessKeys'),
        where('username', '==', data.username),
        where('password', '==', data.password)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        loginForm.setError('root', { message: 'Invalid credentials. Please try again.' });
      } else {
        const keyData = { ...snap.docs[0].data(), id: snap.docs[0].id } as AccessKey;
        await signInAnonymously(auth);
        setActiveUser(keyData);
        setStage('portal');
      }
    } catch {
      loginForm.setError('root', { message: 'An unexpected error occurred during validation.' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try { await signOut(auth); } catch {}
    setStage('login');
    setActiveUser(null);
    setEditMode(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Widget Firestore helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Write (or overwrite) a widget document to Firestore */
  const saveWidget = useCallback(async (widget: Widget) => {
    if (!firestore || !client?.path) return;
    // If we're writing the first Firestore widget, seed the entire default set first
    if (!firestoreWidgets || firestoreWidgets.length === 0) {
      const defaults = buildDefaultWidgets();
      await Promise.all(
        defaults.map((w) => setDoc(doc(firestore, client.path!, 'widgets', w.id), w))
      );
    }
    await setDoc(doc(firestore, client.path, 'widgets', widget.id), widget);
  }, [firestore, client, firestoreWidgets]);

  const handleWidgetSave = useCallback(async (
    widget: Widget,
    updates: Pick<Widget, 'title' | 'description' | 'enabled' | 'tags'>
  ) => {
    await saveWidget({ ...widget, ...updates });
    toast({ title: 'Widget updated', description: `"${updates.title}" saved.` });
  }, [saveWidget, toast]);

  const handleWidgetToggle = useCallback(async (widget: Widget, enabled: boolean) => {
    await saveWidget({ ...widget, enabled });
  }, [saveWidget]);

  const handleAddWidget = useCallback(async (type: WidgetType) => {
    if (!firestore || !client?.path) return;
    const def = WIDGET_CATALOG_MAP[type];
    const newWidget: Widget = {
      id: type,
      type,
      title: def.defaultTitle,
      description: def.defaultDescription,
      enabled: true,
      order: effectiveWidgets.length,
      category: def.category,
    };
    await saveWidget(newWidget);
    toast({ title: 'Widget added', description: `"${def.defaultTitle}" added to your portal.` });
  }, [firestore, client, effectiveWidgets.length, saveWidget, toast]);

  const handleWidgetRequest = useCallback(async (widgetName: string, widgetDescription: string) => {
    if (!firestore || !client?.path) return;
    const request: Omit<WidgetRequest, 'id'> = {
      clientDisplayId: clientId,
      clientName: client.firmName,
      requestedByUsername: activeUser?.username ?? 'unknown',
      requestedByName: activeUser?.displayName ?? 'Unknown',
      widgetName,
      widgetDescription,
      status: 'pending',
      createdAt: serverTimestamp(),
    };
    // Store under client path (queryable by master admin via collectionGroup)
    await addDoc(collection(firestore, client.path, 'widgetRequests'), request);
    toast({
      title: 'Request sent!',
      description: `Your request for "${widgetName}" has been submitted to the HTBase admin team.`,
    });
  }, [firestore, client, clientId, activeUser, toast]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const getClientDocPath = () => client?.path ?? null;
  const logoSrc = customization?.logoUrl || '/HTBASELOGO.png';

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading / not-found screens
  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-hero bg-dot">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl animate-pulse-glow" />
            <Loader2 className="relative z-10 h-12 w-12 animate-spin text-primary" />
          </div>
          <p className="animate-pulse text-sm text-muted-foreground">Loading portal...</p>
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-hero bg-dot p-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-sm">
          <h2 className="font-headline text-xl font-bold mb-2">Portal Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The client portal <span className="font-mono text-primary">{clientId}</span> could not be located.
          </p>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN STAGE
  // ─────────────────────────────────────────────────────────────────────────────
  if (stage === 'login') {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-hero bg-dot p-4">
        {/* Background orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="animate-float-1 absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,235,255,0.14) 0%, transparent 70%)', filter: 'blur(60px)', opacity: 0.8 }}
          />
          <div
            className="animate-float-2 absolute -bottom-40 -left-32 h-[600px] w-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)', filter: 'blur(70px)', opacity: 0.7 }}
          />
        </div>

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5">
          {/* Logo + company name */}
          <div className="flex flex-col items-center gap-5 text-center animate-fade-up">
            <div className="relative">
              {/* Layered glow rings */}
              <div className="absolute inset-0 scale-[2.2] rounded-3xl bg-primary/15 blur-3xl animate-pulse-glow" />
              <div className="absolute inset-0 scale-[1.6] rounded-3xl bg-secondary/10 blur-2xl" />
              <div className="relative rounded-3xl border border-primary/25 bg-background/50 p-6 glass-card">
                <Image
                  src={logoSrc}
                  alt={`${client.firmName} Logo`}
                  width={140}
                  height={140}
                  className="relative z-10 object-contain"
                  unoptimized={!!customization?.logoUrl}
                />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight text-gradient leading-none">
                {client.firmName}
              </h1>
              {customization?.tagline && (
                <p className="text-sm text-muted-foreground">{customization.tagline}</p>
              )}
            </div>
          </div>

          {/* Login card */}
          <div className="w-full glass-card-strong rounded-2xl p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="mb-5 flex items-center gap-2">
              <LogIn className="h-3.5 w-3.5 text-primary/60" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Portal Access
              </span>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isLoggingIn}
                          className="border-border/60 bg-background/50 backdrop-blur-sm focus:border-primary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          disabled={isLoggingIn}
                          className="border-border/60 bg-background/50 backdrop-blur-sm focus:border-primary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {loginForm.formState.errors.root && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {loginForm.formState.errors.root.message}
                  </p>
                )}
                <Button type="submit" className="mt-1 h-11 w-full btn-gradient" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                  ) : (
                    <><LogIn className="mr-2 h-4 w-4" />Sign In</>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-xs text-muted-foreground/50 animate-fade-up" style={{ animationDelay: '200ms' }}>
            Powered by{' '}
            <span className="text-primary/70 font-medium">HTBase</span>
          </p>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PORTAL STAGE
  // ─────────────────────────────────────────────────────────────────────────────

  const widgetsByCategory = WIDGET_CATEGORIES.map((cat) => ({
    category: cat,
    widgets: enabledWidgets.filter((w) => w.category === cat),
  })).filter((g) => g.widgets.length > 0);

  // In edit mode also show disabled widgets so admin can toggle them back on
  const allWidgetsByCategory = WIDGET_CATEGORIES.map((cat) => ({
    category: cat,
    widgets: effectiveWidgets.filter((w) => w.category === cat).sort((a, b) => a.order - b.order),
  })).filter((g) => g.widgets.length > 0);

  const displayGroups = editMode ? allWidgetsByCategory : widgetsByCategory;

  // ── Mode toggle pill ────────────────────────────────────────────────────────
  const modePill = (
    <div
      className="flex items-center rounded-lg p-0.5 gap-0.5"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <button
        onClick={() => setPortalMode('widget')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
        style={
          portalMode === 'widget'
            ? { background: 'rgba(0,235,255,0.15)', color: 'var(--primary)', boxShadow: '0 0 8px rgba(0,235,255,0.2)' }
            : { color: 'var(--muted-foreground)' }
        }
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Widgets</span>
      </button>
      <button
        onClick={() => setPortalMode('base')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
        style={
          portalMode === 'base'
            ? { background: 'rgba(244,196,48,0.18)', color: '#F4C430', boxShadow: '0 0 8px rgba(244,196,48,0.2)' }
            : { color: 'var(--muted-foreground)' }
        }
      >
        <Building2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Base</span>
      </button>
    </div>
  );

  if (portalMode === 'base') {
    return (
      <div className="flex h-screen flex-col bg-hero bg-dot overflow-hidden">
        {/* ── Slim bar with mode toggle + logout ──────────────────────── */}
        <div
          className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 md:px-6"
          style={{
            background: 'rgba(8, 8, 18, 0.9)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Left: logo + firm name */}
          <div className="flex items-center gap-2.5">
            <div className="relative h-6 w-6 shrink-0 rounded-md overflow-hidden border border-primary/20 bg-background/40">
              <Image src={logoSrc} alt="" fill sizes="24px" className="object-contain p-0.5" unoptimized={!!customization?.logoUrl} />
            </div>
            <span className="text-xs font-bold font-headline text-gradient-cyan truncate max-w-[160px]">
              {client.firmName}
            </span>
            {isPortalAdmin && (
              <Badge variant="outline" className="items-center gap-0.5 border-primary/30 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0 hidden sm:flex">
                <ShieldCheck className="h-2.5 w-2.5" />Admin
              </Badge>
            )}
          </div>

          {/* Right: mode toggle + logout */}
          <div className="flex items-center gap-2">
            {modePill}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 gap-1.5 rounded-xl border border-border/60 text-xs font-semibold text-muted-foreground transition-all hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          </div>
        </div>

        {/* ── Full-screen ERP Hub ──────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 flex-col">
          {client && (
            <ERPHubDialog
              fullScreen
              open={true}
              onOpenChange={() => {}}
              client={client}
              activeUser={activeUser}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-hero bg-dot">

      {/* ── Sticky scroll-context nav (logo only, thin) ────────────────────────── */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 md:px-6">
          <div className="relative h-6 w-6 shrink-0 rounded-md overflow-hidden border border-primary/20 bg-background/40">
            <Image src={logoSrc} alt="" fill sizes="24px" className="object-contain p-0.5" unoptimized={!!customization?.logoUrl} />
          </div>
          <span className="text-xs font-bold font-headline text-gradient-cyan truncate max-w-[180px]">
            {client.firmName}
          </span>
          {isPortalAdmin && (
            <Badge variant="outline" className="ml-1 items-center gap-0.5 border-primary/30 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0 hidden sm:flex">
              <ShieldCheck className="h-2.5 w-2.5" />Admin
            </Badge>
          )}
        </div>
      </header>

      {/* ── Hero Banner ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/20">
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 110%, rgba(0,235,255,0.08) 0%, transparent 65%)' }}
        />
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-10 text-center md:px-6">
          {/* Logo — BIG */}
          <div className="relative">
            <div className="absolute inset-0 scale-[2.2] rounded-[2rem] bg-primary/12 blur-3xl animate-pulse-glow" />
            <div className="absolute inset-0 scale-[1.6] rounded-[2rem] bg-secondary/08 blur-2xl" />
            <div className="relative rounded-[1.75rem] border border-primary/20 bg-background/40 p-5 glass-card">
              <Image
                src={logoSrc}
                alt={`${client.firmName} Logo`}
                width={160}
                height={160}
                className="relative z-10 object-contain"
                unoptimized={!!customization?.logoUrl}
                priority
              />
            </div>
          </div>

          {/* Company name + tagline */}
          <div className="space-y-1.5">
            <h1 className="text-4xl font-extrabold font-headline tracking-tight text-gradient leading-none md:text-5xl">
              {client.firmName}
            </h1>
            {customization?.tagline && (
              <p className="text-sm text-muted-foreground md:text-base">{customization.tagline}</p>
            )}
            {activeUser?.displayName && (
              <p className="text-xs text-muted-foreground/60 pt-0.5">
                Welcome back, <span className="text-foreground/80 font-medium">{activeUser.displayName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Bar — always visible, all controls here ─────────────────────── */}
      <div className="border-b border-border/25 bg-background/30 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">

          {/* Left: label + global tag filter */}
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hidden sm:block">
              Your Portal
            </p>
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by tag…"
                value={globalTagFilter}
                onChange={(e) => setGlobalTagFilter(e.target.value)}
                className="h-8 w-36 rounded-xl border border-border/40 bg-background/30 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:bg-background/50 transition-all"
              />
              {globalTagFilter && (
                <button
                  onClick={() => setGlobalTagFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {globalTagFilter && (
              <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                #{globalTagFilter}
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            {modePill}

            {/* My Widgets — available to every user */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUserEditorOpen(true)}
              className={cn(
                'h-8 gap-2 rounded-xl border text-xs font-semibold transition-all',
                userWidgetPrefs.hidden.length > 0
                  ? 'border-secondary/50 bg-secondary/10 text-secondary/90 hover:bg-secondary/15'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              My Widgets
              {userWidgetPrefs.hidden.length > 0 && (
                <span className="rounded-full bg-secondary/30 px-1.5 text-[10px] font-bold">
                  {userWidgetPrefs.hidden.length} hidden
                </span>
              )}
            </Button>

            {/* Manage Widgets — ADMIN ONLY: edits shared portal config */}
            {isPortalAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode((v) => !v)}
                className={cn(
                  'h-8 gap-2 rounded-xl border text-xs font-semibold transition-all',
                  editMode
                    ? 'border-primary/50 bg-primary/15 text-primary hover:bg-primary/20'
                    : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary/80'
                )}
              >
                <Settings2 className="h-3.5 w-3.5" />
                {editMode ? 'Done Managing' : 'Manage Widgets'}
              </Button>
            )}

            {/* My ERP — ADMIN ONLY: configure ERP departments for this client */}
            {isPortalAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsERPAdminOpen(true)}
                className="h-8 gap-2 rounded-xl border border-border/60 text-xs font-semibold text-muted-foreground transition-all hover:border-yellow-500/40 hover:text-yellow-400"
              >
                <Building2 className="h-3.5 w-3.5" />
                My ERP
              </Button>
            )}

            {/* Log Out — always visible */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 gap-2 rounded-xl border border-border/60 text-xs font-semibold text-muted-foreground transition-all hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* ── Admin Widget Management Panel (admin only, when edit mode active) ───── */}
      {isPortalAdmin && editMode && (
        <div className="border-b border-primary/20 bg-primary/5 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-primary/80 uppercase tracking-wider">Widget Management Mode</span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Pencil icon = edit title &amp; description · Toggle = show/hide for all users
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBrowserOpen(true)}
                className="h-8 gap-1.5 rounded-xl border-border/60 text-xs font-semibold hover:border-primary/40"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Browse Catalog
              </Button>
              <Button
                size="sm"
                onClick={() => setIsRequestOpen(true)}
                className="h-8 gap-1.5 rounded-xl btn-gradient text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Request Widget
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Widget Grid ────────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        {displayGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-2xl border border-border/40 bg-background/30 p-6 glass">
              <LayoutGrid className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-semibold text-foreground">No widgets configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isPortalAdmin
                  ? 'Enable Edit Mode to browse and add widgets to this portal.'
                  : 'Contact your administrator to set up widgets.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {displayGroups.map(({ category, widgets }) => (
              <section key={category}>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {widgets.map((widget) => (
                    <WidgetCard
                      key={widget.id}
                      widget={widget}
                      editMode={editMode}
                      onEdit={() => setEditingWidget(widget)}
                      onToggle={(enabled) => handleWidgetToggle(widget, enabled)}
                      onAction={() => setOpenDialog(widget.type)}
                      onSecondaryAction={
                        widget.type === 'queue'     ? () => setIsMasterQueuePasscodeOpen(true)
                        : widget.type === 'contracts' ? () => setIsManageTemplatesOpen(true)
                        : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* ── All Dialogs ────────────────────────────────────────────────────────── */}
      {client && <MessengerScenarioDialog     open={openDialog === 'messenger'}       onOpenChange={(o) => !o && setOpenDialog(null)} activeSessionId={activeUser?.username ?? null} clientPath={getClientDocPath()} trainingData={client.trainingData} />}
      {client && <ColdCallSimulatorDialog     open={openDialog === 'cold-call'}       onOpenChange={(o) => !o && setOpenDialog(null)} activeSessionId={activeUser?.username ?? null} clientPath={getClientDocPath()} trainingData={client.trainingData} />}
      {client && <OpacTrackerDialog           open={openDialog === 'opac'}            onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && assets && <TimePunchDialog   open={openDialog === 'time-punch'}      onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} asset={assets.find((a) => a.title.includes('Time Punch'))} />}
      {client && <ProjectHubDialog           open={openDialog === 'project-hub'}     onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <SopBotDialog               open={openDialog === 'sop-bot'}         onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <LeadsTrackerDialog         open={openDialog === 'leads'}           onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <BuildsTrackerDialog        open={openDialog === 'builds'}          onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <FormManagementDialog       open={openDialog === 'forms'}           onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <QueueDialog                open={openDialog === 'queue'}           onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <ContractGeneratorDialog    open={openDialog === 'contracts'}       onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <ARCollectionsDialog        open={openDialog === 'ar-collections'}  onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <KnockProDialog             open={openDialog === 'knock-pro'}            onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <TaskPipelineDialog         open={openDialog === 'task-pipeline'}       onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} tagFilter={globalTagFilter || undefined} />}
      {client && <TeamOverviewDialog         open={openDialog === 'team-overview'}       onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <PerformanceAnalyticsDialog open={openDialog === 'performance-analytics'} onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <AiAssistantDialog          open={openDialog === 'ai-assistant'}        onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <DealTrackerDialog          open={openDialog === 'deal-tracker'}        onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <ScheduleDialog             open={openDialog === 'schedule'}            onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <ResourceLibraryDialog      open={openDialog === 'resource-library'}    onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} tagFilter={globalTagFilter || undefined} />}
      {client && <CommunicationsDialog       open={openDialog === 'communications'}      onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <CompletionCertificateDialog open={openDialog === 'completion-certificate'} onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <SupplementalAddendumDialog open={openDialog === 'supplemental-addendum'} onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {client && <InventoryManagerDialog     open={openDialog === 'inventory-manager'}    onOpenChange={(o) => !o && setOpenDialog(null)} client={client} activeUser={activeUser} />}
      {/* Session manager is rendered inline in Sales Training section for the session-manager widget */}

      {client && (
        <MasterQueuePasscodeDialog
          open={isMasterQueuePasscodeOpen}
          onOpenChange={setIsMasterQueuePasscodeOpen}
          onSuccess={() => setIsMasterQueueOpen(true)}
        />
      )}
      {client && (
        <MasterQueueDialog
          open={isMasterQueueOpen}
          onOpenChange={setIsMasterQueueOpen}
          client={client}
        />
      )}
      {client && (
        <ManageTemplatesDialog
          open={isManageTemplatesOpen}
          onOpenChange={setIsManageTemplatesOpen}
          client={client}
          activeUser={activeUser}
        />
      )}

      {/* Admin dialogs */}
      {editingWidget && (
        <WidgetEditDialog
          widget={editingWidget}
          open={!!editingWidget}
          onOpenChange={(o) => { if (!o) setEditingWidget(null); }}
          onSave={(updates) => handleWidgetSave(editingWidget, updates)}
        />
      )}
      <WidgetBrowserDialog
        open={isBrowserOpen}
        onOpenChange={setIsBrowserOpen}
        activeWidgetIds={activeWidgetIds}
        onAdd={handleAddWidget}
      />
      {isPortalAdmin && client && (
        <ERPAdminSheet
          open={isERPAdminOpen}
          onOpenChange={setIsERPAdminOpen}
          client={client}
        />
      )}
      <WidgetRequestDialog
        open={isRequestOpen}
        onOpenChange={setIsRequestOpen}
        clientName={client.firmName}
        onSubmit={handleWidgetRequest}
      />
      {/* User personal widget preferences */}
      <UserWidgetEditorSheet
        open={isUserEditorOpen}
        onOpenChange={setIsUserEditorOpen}
        widgets={adminEnabledWidgets}
        prefs={userWidgetPrefs}
        onPrefsChange={setUserWidgetPrefs}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WidgetCard sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface WidgetCardProps {
  widget: Widget;
  editMode: boolean;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onAction: () => void;
  onSecondaryAction?: () => void;
}

function WidgetCard({ widget, editMode, onEdit, onToggle, onAction, onSecondaryAction }: WidgetCardProps) {
  const def = WIDGET_CATALOG_MAP[widget.type];
  const isDisabled = !widget.enabled;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-200',
        isDisabled && editMode
          ? 'border-border/30 bg-background/20 opacity-60'
          : 'glass-card hover:border-primary/30 hover:shadow-[0_0_24px_rgba(0,235,255,0.07)]'
      )}
    >
      {/* Edit mode controls */}
      {editMode && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <Switch
            checked={widget.enabled}
            onCheckedChange={onToggle}
            className="scale-75 origin-right"
          />
          <button
            onClick={onEdit}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border/50 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Icon + title */}
      <div className="flex items-start gap-3 pr-16">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15">
          <WidgetIcon iconName={def?.iconName ?? 'Bot'} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold font-headline text-sm leading-tight">{widget.title}</h3>
          <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">
            {widget.category}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="flex-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {widget.description}
      </p>

      {/* Session manager rendered inline */}
      {widget.type === 'session-manager' ? (
        <div className="mt-auto">
          {/* Session manager is a special widget that renders inline — handled by portal */}
          <Button size="sm" className="w-full btn-gradient text-xs" onClick={onAction}>
            {def?.actionLabel ?? 'Open'}
          </Button>
        </div>
      ) : (
        /* Action button(s) */
        <div className={cn('mt-auto flex gap-2', onSecondaryAction ? 'flex-col sm:flex-row' : '')}>
          {onSecondaryAction && def?.secondaryActionLabel && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-border/50 text-xs hover:border-primary/40"
              onClick={onSecondaryAction}
              disabled={isDisabled && !editMode}
            >
              {def.secondaryActionLabel}
            </Button>
          )}
          <Button
            size="sm"
            className={cn('text-xs', onSecondaryAction ? 'flex-1' : 'w-full', 'btn-gradient')}
            onClick={onAction}
            disabled={isDisabled && !editMode}
          >
            {def?.actionLabel ?? 'Open'}
          </Button>
        </div>
      )}

      {/* Hidden badge when disabled */}
      {isDisabled && editMode && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none">
          <span className="flex items-center gap-1 rounded-full border border-border/50 bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
            <EyeOff className="h-3 w-3" /> Hidden
          </span>
        </div>
      )}
    </div>
  );
}
