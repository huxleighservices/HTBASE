'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  Award,
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
  updateDoc,
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

interface CertificateRecord {
  id: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'signed';
  createdAt: any;
  signedAt?: any;
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

function toFirestoreDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CompletionCertificateDialog({
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
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [isCertsLoading, setIsCertsLoading] = useState(false);
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

  // Step 3
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isInsuranceJob, setIsInsuranceJob] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Step 4
  const [newCertId, setNewCertId] = useState<string | null>(null);

  // Photo preview lightbox
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // ── Load certificates when list view opens ──────────────────────────────────
  useEffect(() => {
    if (open && step === 'list') {
      loadCertificates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  async function loadCertificates() {
    if (!client.path) return;
    setIsCertsLoading(true);
    try {
      const q = query(
        collection(firestore, 'completionCertificates'),
        where('clientPath', '==', client.path),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CertificateRecord, 'id'>) }));
      setCertificates(docs);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to load certificates.', variant: 'destructive' });
    } finally {
      setIsCertsLoading(false);
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    fetchPhotos(selectedProject.id);
    setStep('step2');

    // Fetch contacts for this project and pre-populate Step 3 fields
    try {
      const res = await fetch(`/api/companycam/contacts?projectId=${encodeURIComponent(selectedProject.id)}`);
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

  async function handleCreateCertificate() {
    if (!selectedProject || selectedPhotoIds.size === 0) return;
    if (!customerName.trim()) {
      toast({ title: 'Validation', description: 'Customer name is required.', variant: 'destructive' });
      return;
    }
    if (!customerEmail.trim()) {
      toast({ title: 'Validation', description: 'Customer email is required.', variant: 'destructive' });
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
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        isInsuranceJob,
        photos: selectedPhotosData,
        status: 'pending' as const,
        createdBy: activeUser?.username ?? 'unknown',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, 'completionCertificates'), payload);
      setNewCertId(docRef.id);
      setStep('step4');
    } catch (err: any) {
      toast({ title: 'Failed to create certificate', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setStep('list');
      setSelectedProject(null);
      setProjectSearch('');
      setSelectedPhotoIds(new Set());
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setIsInsuranceJob(false);
      setNewCertId(null);
      setIsCreating(false);
      setCopiedId(null);
    }, 200);
  }

  function handleDone() {
    setStep('list');
    setSelectedProject(null);
    setProjectSearch('');
    setSelectedPhotoIds(new Set());
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setIsInsuranceJob(false);
    setNewCertId(null);
    setIsCreating(false);
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the link manually.', variant: 'destructive' });
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

  // ── Public cert URL ─────────────────────────────────────────────────────────
  function certUrl(id: string) {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/sign/${id}`
      : `/sign/${id}`;
  }

  // ── Toggle photo selection ───────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function renderList() {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Completion Certificates
          </DialogTitle>
          <DialogDescription>
            Certificates for {client.firmName}. Send signing links to customers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} found
          </p>
          <Button className="btn-gradient" size="sm" onClick={goToStep1}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Certificate
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {isCertsLoading ? (
            <div className="space-y-2 pr-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
              <Award className="h-12 w-12 opacity-30" />
              <p className="text-sm">No certificates yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {certificates.map((cert) => {
                const created = toFirestoreDate(cert.createdAt);
                const signed = toFirestoreDate(cert.signedAt);
                const url = certUrl(cert.id);
                const isCopied = copiedId === cert.id;
                return (
                  <div
                    key={cert.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cert.projectName}</p>
                      <p className="text-xs text-muted-foreground truncate">{cert.customerName}</p>
                      {created && (
                        <p className="text-xs text-muted-foreground">
                          {format(created, 'MMM d, yyyy')}
                        </p>
                      )}
                      {cert.status === 'signed' && signed && (
                        <p className="text-xs text-emerald-400">
                          Signed {format(signed, 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-xs',
                        cert.status === 'signed'
                          ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                          : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10',
                      )}
                    >
                      {cert.status === 'signed' ? 'Signed' : 'Pending'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={() => copyToClipboard(url, cert.id)}
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
          <DialogDescription>Choose the project for this completion certificate.</DialogDescription>
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
                    {/* Selection overlay */}
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
                    {/* Preview button */}
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
    const canProceed = nameValid && emailValid;

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              3
            </span>
            Customer Info &amp; Options
          </DialogTitle>
          <DialogDescription>
            Enter the customer's details for this certificate.
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

            {/* Customer fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cert-customer-name">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cert-customer-name"
                  placeholder="Jane Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cert-customer-email">
                  Customer Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cert-customer-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cert-customer-phone">Customer Phone (optional)</Label>
                <Input
                  id="cert-customer-phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Insurance toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="cert-insurance" className="text-sm font-medium cursor-pointer">
                  Insurance Job
                </Label>
                <p className="text-xs text-muted-foreground">This is an insurance claim job</p>
              </div>
              <Switch
                id="cert-insurance"
                checked={isInsuranceJob}
                onCheckedChange={setIsInsuranceJob}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => setStep('step2')}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            className="btn-gradient"
            onClick={handleCreateCertificate}
            disabled={!canProceed || isCreating}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Certificate
            {!isCreating && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderStep4() {
    const url = newCertId ? certUrl(newCertId) : '';
    const isCopied = copiedId === (newCertId ?? '');
    const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customerEmail)}&su=${encodeURIComponent(
      `Completion Certificate — ${selectedProject?.name ?? 'Your Project'}`,
    )}&body=${encodeURIComponent(
      `Hi ${customerName},\n\nYour completion certificate is ready for signing. Please click the link below to review and sign:\n\n${url}\n\nThank you!`,
    )}`;

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-400" />
            Certificate Ready!
          </DialogTitle>
          <DialogDescription>
            Share this link with {customerName} to collect their signature.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6">
          {/* URL display */}
          <div className="w-full rounded-lg border border-border/50 bg-background/40 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signing Link</p>
            <p className="text-sm font-mono break-all text-primary">{url}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              className="btn-gradient flex-1 gap-2"
              size="lg"
              onClick={() => copyToClipboard(url, newCertId ?? '')}
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
                Send via Email
              </a>
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open signing page
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
      case 'list':   return renderList();
      case 'step1':  return renderStep1();
      case 'step2':  return renderStep2();
      case 'step3':  return renderStep3();
      case 'step4':  return renderStep4();
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="glass-card-strong border-border/50 max-w-4xl h-[90vh] flex flex-col">
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Photo preview lightbox */}
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
