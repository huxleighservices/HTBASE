'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Loader2,
  PlusCircle,
  Search,
  ChevronRight,
  ChevronLeft,
  Copy,
  Mail,
  Check,
  Link,
  ImageIcon,
  ExternalLink,
  ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'list' | 'step1' | 'step2' | 'step3' | 'step4';

interface CompanyCamContact {
  id?: string;
  name?: string;
  email_address?: string;
  phone_number?: string;
}

interface CompanyCamProject {
  id: string;
  name: string;
  status?: string;
  address?: {
    street_address_1?: string;
    city?: string;
    state?: string;
  };
  featured_image?: {
    uris?: { uri: string; size: string }[];
  };
  contacts?: CompanyCamContact[];
  primary_contact?: { name?: string; email?: string; phone_number?: string };
}

interface CompanyCamPhoto {
  id: string;
  uri: string;
  uris?: { uri: string; size: string }[];
  thumb_uri?: string;
}

interface AddendumRecord {
  id: string;
  projectName: string;
  customerName: string;
  status: 'pending' | 'authorized' | 'declined' | 'not-needed';
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  clientPath: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPhotoThumb(photo: CompanyCamPhoto): string {
  if (photo.uris) {
    const thumb = photo.uris.find((u) => u.size === 'thumb') ?? photo.uris[0];
    if (thumb) return thumb.uri;
  }
  return photo.thumb_uri ?? photo.uri;
}

function getPhotoFull(photo: CompanyCamPhoto): string {
  if (photo.uris) {
    const large = photo.uris.find((u) => u.size === 'large') ?? photo.uris[0];
    if (large) return large.uri;
  }
  return photo.uri;
}

function getProjectThumb(project: CompanyCamProject): string | null {
  const uris = project.featured_image?.uris;
  if (!uris || uris.length === 0) return null;
  const thumb = uris.find((u) => u.size === 'thumb') ?? uris[0];
  return thumb?.uri ?? null;
}

function toFirestoreDate(ts: any): Date | null { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SupplementalAddendumDialog({
  open,
  onOpenChange,
  client,
  activeUser,
}: Props) {
  const { toast } = useToast();
  const firestore = useFirestore();

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('list');

  // List view
  const [addendums, setAddendums] = useState<AddendumRecord[]>([]);
  const [isAddendumsLoading, setIsAddendumsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Step 1
  const [projects, setProjects] = useState<CompanyCamProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<CompanyCamProject | null>(null);

  // Step 2
  const [photos, setPhotos] = useState<CompanyCamPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Step 3 — details form
  const [propertyAddress, setPropertyAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [originalContractDate, setOriginalContractDate] = useState('');
  const [buildDate, setBuildDate] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [workReason, setWorkReason] = useState('');
  const [materialCostStr, setMaterialCostStr] = useState('');
  const [laborCostStr, setLaborCostStr] = useState('');
  const [isInsuranceJob, setIsInsuranceJob] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // "No addendum needed" PM signature
  const [noAddendumNeeded, setNoAddendumNeeded] = useState(false);
  const [pmSignatureDataUrl, setPmSignatureDataUrl] = useState<string | null>(null);
  const pmCanvasRef = useRef<HTMLCanvasElement>(null);
  const pmIsDrawingRef = useRef(false);

  // Step 4
  const [newAddendumId, setNewAddendumId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // ── Computed totals ─────────────────────────────────────────────────────────
  const materialCost = parseFloat(materialCostStr) || 0;
  const laborCost = parseFloat(laborCostStr) || 0;
  const totalCost = materialCost + laborCost;

  // ── Load addendums when list view opens ─────────────────────────────────────
  useEffect(() => {
    if (open && step === 'list') {
      loadAddendums();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  async function loadAddendums() {
    if (!client.path) return;
    setIsAddendumsLoading(true);
    try {
      const q = query(
        collection(firestore, 'supplementalAddendums'),
        where('clientPath', '==', client.path),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AddendumRecord, 'id'>),
      }));
      setAddendums(docs);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({
        title: 'Error',
        description: err.message ?? 'Failed to load addendums.',
        variant: 'destructive',
      });
    } finally {
      setIsAddendumsLoading(false);
    }
  }

  // ── Step 1: fetch projects ──────────────────────────────────────────────────
  async function fetchProjects() {
    setProjectsLoading(true);
    setProjects([]);
    try {
      const res = await fetch('/api/companycam/projects');
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : data.projects ?? []);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ title: 'Failed to load projects', description: err.message, variant: 'destructive' });
    } finally {
      setProjectsLoading(false);
    }
  }

  // ── Step 2: fetch photos ────────────────────────────────────────────────────
  async function fetchPhotos(projectId: string) {
    setPhotosLoading(true);
    setPhotos([]);
    setSelectedPhotoIds(new Set());
    try {
      const res = await fetch(`/api/companycam/photos?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setPhotos(Array.isArray(data) ? data : data.photos ?? []);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ title: 'Failed to load photos', description: err.message, variant: 'destructive' });
    } finally {
      setPhotosLoading(false);
    }
  }

  // ── Navigation helpers ──────────────────────────────────────────────────────
  function goToStep1() {
    setSelectedProject(null);
    setProjectSearch('');
    fetchProjects();
    setStep('step1');
  }

  async function goToStep2() {
    if (!selectedProject) return;

    // Auto-populate address from project
    const addr = [
      selectedProject.address?.street_address_1,
      selectedProject.address?.city,
      selectedProject.address?.state,
    ]
      .filter(Boolean)
      .join(', ');
    setPropertyAddress(addr);

    fetchPhotos(selectedProject.id);
    setStep('step2');

    // Fetch contacts and pre-populate Step 3 fields
    try {
      const res = await fetch(
        `/api/companycam/contacts?projectId=${encodeURIComponent(selectedProject.id)}`,
      );
      if (res.ok) {
        const contacts: CompanyCamContact[] = await res.json();
        const contact = contacts[0];
        if (contact) {
          if (contact.name)          setCustomerName(contact.name);
          if (contact.email_address) setCustomerEmail(contact.email_address);
          if (contact.phone_number)  setCustomerPhone(contact.phone_number);
        }
      }
    } catch {
      // silently ignore — user can fill in manually
    }
  }

  function goToStep3() {
    setStep('step3');
  }

  async function handleCreateAddendum() {
    if (!selectedProject) return;

    // ── "No Addendum Needed" path ──────────────────────────────────────────────
    if (noAddendumNeeded) {
      if (!pmSignatureDataUrl) {
        toast({ title: 'Validation', description: 'Project manager signature is required.', variant: 'destructive' });
        return;
      }
      setIsCreating(true);
      try {
        const pmName = activeUser?.displayName || activeUser?.username || 'Unknown PM';
        const payload = {
          clientPath: client.path ?? '',
          firmName: client.firmName,
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          propertyAddress: propertyAddress.trim() || undefined,
          customerName: customerName.trim() || selectedProject.name,
          customerEmail: customerEmail.trim() || undefined,
          pmSignatureDataUrl,
          pmDisplayName: activeUser?.displayName ?? undefined,
          pmUsername: activeUser?.username ?? undefined,
          pmPhone: activeUser?.phoneNumber ?? undefined,
          status: 'not-needed' as const,
          createdBy: activeUser?.username ?? 'unknown',
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(firestore, 'supplementalAddendums'), payload);
        setNewAddendumId(docRef.id);

        // Send notification email
        fetch('/api/send-addendum-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addendumId: docRef.id,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail ?? '',
            projectName: selectedProject.name,
            decision: 'not-needed',
            totalCost: 0,
            firmName: client.firmName,
            signedAt: new Date().toISOString(),
            pmName,
            pmPhone: activeUser?.phoneNumber ?? '',
          }),
        }).catch(() => { /* best-effort */ });

        setStep('step4');
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // ── Normal addendum path ───────────────────────────────────────────────────
    if (selectedPhotoIds.size === 0) return;
    if (!customerName.trim()) {
      toast({ title: 'Validation', description: 'Customer name is required.', variant: 'destructive' });
      return;
    }
    if (!customerEmail.trim()) {
      toast({ title: 'Validation', description: 'Customer email is required.', variant: 'destructive' });
      return;
    }
    if (!originalContractDate) {
      toast({ title: 'Validation', description: 'Original contract date is required.', variant: 'destructive' });
      return;
    }
    if (!buildDate) {
      toast({ title: 'Validation', description: 'Build date is required.', variant: 'destructive' });
      return;
    }
    if (!workDescription.trim()) {
      toast({ title: 'Validation', description: 'Description of additional work is required.', variant: 'destructive' });
      return;
    }
    if (!workReason.trim()) {
      toast({ title: 'Validation', description: 'Reason for recommendation is required.', variant: 'destructive' });
      return;
    }
    if (!materialCostStr || materialCost < 0) {
      toast({ title: 'Validation', description: 'Additional material cost is required.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const selectedPhotosData = photos
        .filter((p) => selectedPhotoIds.has(p.id))
        .map((p) => ({ id: p.id, uri: getPhotoFull(p), thumbUri: getPhotoThumb(p) }));

      const payload = {
        clientPath: client.path ?? '',
        firmName: client.firmName,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        propertyAddress: propertyAddress.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        originalContractDate,
        buildDate,
        workDescription: workDescription.trim(),
        workReason: workReason.trim(),
        materialCost,
        laborCost,
        totalCost,
        isInsuranceJob,
        photos: selectedPhotosData,
        status: 'pending' as const,
        createdBy: activeUser?.username ?? 'unknown',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(firestore, 'supplementalAddendums'),
        payload,
      );
      setNewAddendumId(docRef.id);
      setStep('step4');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({
        title: 'Failed to create addendum',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }

  // ── PM signature canvas handlers ────────────────────────────────────────────
  function getPmPoint(clientX: number, clientY: number) {
    const canvas = pmCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function handlePmMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = pmCanvasRef.current;
    if (!canvas) return;
    pmIsDrawingRef.current = true;
    const ctx = canvas.getContext('2d');
    const pt = getPmPoint(e.clientX, e.clientY);
    if (!ctx || !pt) return;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  }

  function handlePmMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!pmIsDrawingRef.current) return;
    const canvas = pmCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pt = getPmPoint(e.clientX, e.clientY);
    if (!ctx || !pt) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function handlePmMouseEnd() {
    if (!pmIsDrawingRef.current) return;
    pmIsDrawingRef.current = false;
    const canvas = pmCanvasRef.current;
    if (canvas) setPmSignatureDataUrl(canvas.toDataURL());
  }

  function handlePmTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = pmCanvasRef.current;
    if (!canvas) return;
    pmIsDrawingRef.current = true;
    const ctx = canvas.getContext('2d');
    const touch = e.touches[0];
    const pt = getPmPoint(touch.clientX, touch.clientY);
    if (!ctx || !pt) return;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  }

  function handlePmTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!pmIsDrawingRef.current) return;
    const canvas = pmCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const touch = e.touches[0];
    const pt = getPmPoint(touch.clientX, touch.clientY);
    if (!ctx || !pt) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function handlePmTouchEnd() {
    pmIsDrawingRef.current = false;
    const canvas = pmCanvasRef.current;
    if (canvas) setPmSignatureDataUrl(canvas.toDataURL());
  }

  function clearPmSignature() {
    const canvas = pmCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setPmSignatureDataUrl(null);
  }

  function resetForm() {
    setSelectedProject(null);
    setProjectSearch('');
    setSelectedPhotoIds(new Set());
    setPropertyAddress('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setOriginalContractDate('');
    setBuildDate('');
    setWorkDescription('');
    setWorkReason('');
    setMaterialCostStr('');
    setLaborCostStr('');
    setIsInsuranceJob(false);
    setNoAddendumNeeded(false);
    setPmSignatureDataUrl(null);
    clearPmSignature();
    setNewAddendumId(null);
    setIsCreating(false);
    setCopiedId(null);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setStep('list');
      resetForm();
    }, 200);
  }

  function handleDone() {
    setStep('list');
    resetForm();
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  }

  // ── Filtered projects ───────────────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.address?.street_address_1?.toLowerCase().includes(q) ||
        p.address?.city?.toLowerCase().includes(q) ||
        p.primary_contact?.name?.toLowerCase().includes(q),
    );
  }, [projects, projectSearch]);

  // ── Public addendum URL ─────────────────────────────────────────────────────
  function addendumUrl(id: string) {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/addendum/${id}`
      : `/addendum/${id}`;
  }

  // ── Toggle photo selection ──────────────────────────────────────────────────
  function togglePhoto(id: string) {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── Status badge helpers ────────────────────────────────────────────────────
  function statusBadgeClass(status: AddendumRecord['status']) {
    switch (status) {
      case 'authorized':  return 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10';
      case 'declined':    return 'border-red-500/50 text-red-400 bg-red-500/10';
      case 'not-needed':  return 'border-slate-500/50 text-slate-400 bg-slate-500/10';
      default:            return 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10';
    }
  }

  function statusLabel(status: AddendumRecord['status']) {
    switch (status) {
      case 'authorized':  return 'Authorized';
      case 'declined':    return 'Declined';
      case 'not-needed':  return 'Not Needed';
      default:            return 'Pending';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function renderList() {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Supplemental Work Addendums
          </DialogTitle>
          <DialogDescription>
            Addendums for {client.firmName}. Send signing links to customers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            {addendums.length} addendum{addendums.length !== 1 ? 's' : ''} found
          </p>
          <Button className="btn-gradient" size="sm" onClick={goToStep1}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Addendum
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {isAddendumsLoading ? (
            <div className="space-y-2 pr-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : addendums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="text-sm">No addendums yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {addendums.map((addendum) => {
                const created = toFirestoreDate(addendum.createdAt);
                const url = addendumUrl(addendum.id);
                const isCopied = copiedId === addendum.id;
                return (
                  <div
                    key={addendum.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{addendum.projectName}</p>
                      <p className="text-xs text-muted-foreground truncate">{addendum.customerName}</p>
                      {created && (
                        <p className="text-xs text-muted-foreground">
                          {format(created, 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('shrink-0 text-xs', statusBadgeClass(addendum.status))}
                    >
                      {statusLabel(addendum.status)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={() => copyToClipboard(url, addendum.id)}
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Link className="h-3.5 w-3.5" />
                      )}
                      {isCopied ? 'Copied' : 'View Link'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </>
    );
  }

  function renderStep1() {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              1
            </span>
            Select CompanyCam Project
          </DialogTitle>
          <DialogDescription>
            Choose the project for this supplemental addendum.
          </DialogDescription>
        </DialogHeader>

        <div className="relative py-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {projectsLoading ? (
            <div className="space-y-2 pr-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Search className="h-10 w-10 opacity-30" />
              <p className="text-sm">No projects found.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {filteredProjects.map((project) => {
                const thumb = getProjectThumb(project);
                const isSelected = selectedProject?.id === project.id;
                const addressLine = [
                  project.address?.street_address_1,
                  project.address?.city,
                  project.address?.state,
                ]
                  .filter(Boolean)
                  .join(', ');
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProject(project)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border/50 bg-background/40 hover:bg-background/60',
                    )}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={project.name}
                        className="h-12 w-12 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted/50 flex items-center justify-center shrink-0">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      {addressLine && (
                        <p className="text-xs text-muted-foreground truncate">{addressLine}</p>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => setStep('list')}>
            Cancel
          </Button>
          <Button
            className="btn-gradient"
            onClick={goToStep2}
            disabled={!selectedProject}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              2
            </span>
            Select Photos
          </DialogTitle>
          <DialogDescription>
            {selectedProject?.name} — select at least 1 photo to include.
            {selectedPhotoIds.size > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary font-medium">
                <Check className="h-3 w-3" />
                {selectedPhotoIds.size} selected
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          {photosLoading ? (
            <div className="grid grid-cols-3 gap-2 pr-4">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ImageIcon className="h-10 w-10 opacity-30" />
              <p className="text-sm">No photos found for this project.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pr-4">
              {photos.map((photo) => {
                const isSelected = selectedPhotoIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 transition-all"
                    style={{ borderColor: isSelected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)' }}
                  >
                    <img
                      src={getPhotoThumb(photo)}
                      alt="project photo"
                      className="h-full w-full object-contain bg-black/20"
                    />
                    <button
                      type="button"
                      onClick={() => togglePhoto(photo.id)}
                      className="absolute inset-0 focus:outline-none"
                      aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/30 pointer-events-none flex items-center justify-center">
                        <div className="rounded-full bg-primary p-1">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewSrc(getPhotoFull(photo)); }}
                      className="absolute top-1 right-1 rounded-md bg-black/60 p-1 text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                      aria-label="Preview photo"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => setStep('step1')}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            className="btn-gradient"
            onClick={goToStep3}
            disabled={selectedPhotoIds.size === 0}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderStep3() {
    const nameValid = customerName.trim().length > 0;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
    const canProceed = noAddendumNeeded
      ? !!pmSignatureDataUrl
      : (
        nameValid &&
        emailValid &&
        !!originalContractDate &&
        !!buildDate &&
        workDescription.trim().length > 0 &&
        workReason.trim().length > 0 &&
        materialCostStr !== ''
      );

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              3
            </span>
            Addendum Details
          </DialogTitle>
          <DialogDescription>
            Fill in the details for this supplemental work addendum.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-5 py-2 pr-4">
            {/* Summary */}
            <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
              <p className="text-sm font-semibold">{selectedProject?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedPhotoIds.size} photo{selectedPhotoIds.size !== 1 ? 's' : ''} selected
              </p>
            </div>

            {/* No Addendum Needed toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="add-no-addendum" className="text-sm font-medium cursor-pointer">
                  No Addendum Needed
                </Label>
                <p className="text-xs text-muted-foreground">
                  PM signs to confirm no supplemental work is required
                </p>
              </div>
              <Switch
                id="add-no-addendum"
                checked={noAddendumNeeded}
                onCheckedChange={(v) => {
                  setNoAddendumNeeded(v);
                  if (!v) clearPmSignature();
                }}
              />
            </div>

            {noAddendumNeeded ? (
              /* PM signature section */
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign below to confirm that no supplemental addendum is needed for{' '}
                  <span className="font-medium text-foreground">{selectedProject?.name}</span>.
                </p>
                <div
                  className="relative rounded-lg border-2 border-border overflow-hidden bg-white"
                  style={{ touchAction: 'none' }}
                >
                  <canvas
                    ref={pmCanvasRef}
                    width={560}
                    height={160}
                    className="w-full block cursor-crosshair"
                    onMouseDown={handlePmMouseDown}
                    onMouseMove={handlePmMouseMove}
                    onMouseUp={handlePmMouseEnd}
                    onMouseLeave={handlePmMouseEnd}
                    onTouchStart={handlePmTouchStart}
                    onTouchMove={handlePmTouchMove}
                    onTouchEnd={handlePmTouchEnd}
                  />
                  {!pmSignatureDataUrl && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-sm text-slate-400">Sign here</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={clearPmSignature}>
                    Clear
                  </Button>
                  {pmSignatureDataUrl && (
                    <span className="text-xs text-emerald-500 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Signature captured
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Property & Customer */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-property-address">Property Address</Label>
                    <Input
                      id="add-property-address"
                      placeholder="123 Main St, City, State"
                      value={propertyAddress}
                      onChange={(e) => setPropertyAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-customer-name">
                      Customer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="add-customer-name"
                      placeholder="Jane Smith"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-customer-email">
                      Customer Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="add-customer-email"
                      type="email"
                      placeholder="jane@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-customer-phone">Customer Phone (optional)</Label>
                    <Input
                      id="add-customer-phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-contract-date">
                      Original Contract Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="add-contract-date"
                      type="date"
                      value={originalContractDate}
                      onChange={(e) => setOriginalContractDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-build-date">
                      Build Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="add-build-date"
                      type="date"
                      value={buildDate}
                      onChange={(e) => setBuildDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Work description & reason */}
                <div className="space-y-1.5">
                  <Label htmlFor="add-work-description">
                    Description of Additional Work/Materials <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="add-work-description"
                    placeholder="Describe the additional work or materials required..."
                    rows={3}
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-work-reason">
                    Reason for Recommendation <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="add-work-reason"
                    placeholder="Explain why this supplemental work is recommended..."
                    rows={3}
                    value={workReason}
                    onChange={(e) => setWorkReason(e.target.value)}
                  />
                </div>

                {/* Costs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-material-cost">
                      Additional Material Cost <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        $
                      </span>
                      <Input
                        id="add-material-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={materialCostStr}
                        onChange={(e) => setMaterialCostStr(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-labor-cost">Additional Labor Cost (optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        $
                      </span>
                      <Input
                        id="add-labor-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={laborCostStr}
                        onChange={(e) => setLaborCostStr(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Total (read-only computed) */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Total Supplemental Cost</p>
                    <p className="text-xs text-muted-foreground">Material + Labor</p>
                  </div>
                  <p className="text-lg font-bold text-primary">{formatCurrency(totalCost)}</p>
                </div>

                {/* Insurance toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="add-insurance" className="text-sm font-medium cursor-pointer">
                      Insurance Job
                    </Label>
                    <p className="text-xs text-muted-foreground">This is an insurance claim job</p>
                  </div>
                  <Switch
                    id="add-insurance"
                    checked={isInsuranceJob}
                    onCheckedChange={setIsInsuranceJob}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => setStep('step2')}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            className="btn-gradient"
            onClick={handleCreateAddendum}
            disabled={!canProceed || isCreating}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {noAddendumNeeded ? 'Submit — No Addendum Needed' : 'Generate Addendum'}
            {!isCreating && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderStep4() {
    const url = newAddendumId ? addendumUrl(newAddendumId) : '';
    const isCopied = copiedId === (newAddendumId ?? '');

    if (noAddendumNeeded) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-400" />
              Logged — No Addendum Needed
            </DialogTitle>
            <DialogDescription>
              The PM signature has been saved confirming no supplemental work is required for{' '}
              {selectedProject?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
            <div className="w-full rounded-lg border border-border/50 bg-background/40 p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</p>
              <p className="text-sm font-semibold">{selectedProject?.name}</p>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              A notification email has been sent to the M&amp;T Roofing &amp; Restoration team.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button className="btn-gradient" onClick={handleDone}>
              Done
            </Button>
          </DialogFooter>
        </>
      );
    }

    const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      customerEmail,
    )}&su=${encodeURIComponent(
      `Supplemental Work Addendum — ${selectedProject?.name ?? 'Your Project'}`,
    )}&body=${encodeURIComponent(
      `Hi ${customerName},\n\nA supplemental work addendum has been prepared for your review and signature. Please click the link below to review and sign:\n\n${url}\n\nTotal Supplemental Cost: ${formatCurrency(totalCost)}\n\nThank you!`,
    )}`;

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            Addendum Ready!
          </DialogTitle>
          <DialogDescription>
            Share this link with {customerName} to collect their decision and signature.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6">
          {/* URL display */}
          <div className="w-full rounded-lg border border-border/50 bg-background/40 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Signing Link
            </p>
            <p className="text-sm font-mono break-all text-primary">{url}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              className="btn-gradient flex-1 gap-2"
              size="lg"
              onClick={() => copyToClipboard(url, newAddendumId ?? '')}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" className="flex-1 gap-2" asChild>
              <a href={gmailHref} target="_blank" rel="noreferrer">
                <Mail className="h-4 w-4" />
                Send via Gmail
              </a>
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open addendum page
            </a>
          </Button>
        </div>

        <DialogFooter className="pt-2">
          <Button className="btn-gradient" onClick={handleDone}>
            Done
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────────

  function renderContent() {
    switch (step) {
      case 'list':  return renderList();
      case 'step1': return renderStep1();
      case 'step2': return renderStep2();
      case 'step3': return renderStep3();
      case 'step4': return renderStep4();
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="glass-card-strong border-border/50 max-w-4xl h-[90vh] flex flex-col">
          {renderContent()}
        </DialogContent>
      </Dialog>

      {previewSrc && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-bold leading-none"
            onClick={() => setPreviewSrc(null)}
          >
            &times;
          </button>
          <img
            src={previewSrc}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
