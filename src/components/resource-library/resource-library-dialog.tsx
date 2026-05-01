'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ExternalLink,
  FileText,
  Video,
  Image,
  Wrench,
  Package,
  Search,
  PlusCircle,
  Trash2,
  Star,
  Copy,
  Loader2,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  X,
  Edit2,
  Check,
  BookOpen,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ResourceType = 'link' | 'document' | 'video' | 'image' | 'tool' | 'other';
type AccessLevel = 'everyone' | 'admin';

type ResourceFolder = {
  id: string;
  name: string;
  order: number;
  createdBy: string;
};

type Resource = {
  id: string;
  name: string;
  url: string;
  description?: string;
  type: ResourceType;
  folderId?: string;
  folderName?: string;
  tags: string[];
  accessLevel: AccessLevel;
  pinned: boolean;
  createdBy: string;
  createdByDisplay: string;
  createdAt: any;
};

type AddResourceForm = {
  name: string;
  url: string;
  description: string;
  type: ResourceType;
  folderId: string;
  tags: string;
  accessLevel: AccessLevel;
};

const EMPTY_FORM: AddResourceForm = {
  name: '',
  url: '',
  description: '',
  type: 'link',
  folderId: '',
  tags: '',
  accessLevel: 'everyone',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function detectType(url: string): ResourceType {
  const lower = url.toLowerCase();
  if (/\.(mp4|mov|avi|webm|mkv|youtube\.com|youtu\.be|vimeo\.com)/.test(lower)) return 'video';
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)/.test(lower)) return 'document';
  if (/\.(png|jpg|jpeg|gif|svg|webp|bmp)/.test(lower)) return 'image';
  return 'link';
}

const TYPE_META: Record<
  ResourceType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  link:     { label: 'Link',     icon: <ExternalLink className="h-4 w-4" />, color: 'text-blue-400' },
  document: { label: 'Document', icon: <FileText      className="h-4 w-4" />, color: 'text-amber-400' },
  video:    { label: 'Video',    icon: <Video         className="h-4 w-4" />, color: 'text-purple-400' },
  image:    { label: 'Image',    icon: <Image         className="h-4 w-4" />, color: 'text-green-400' },
  tool:     { label: 'Tool',     icon: <Wrench        className="h-4 w-4" />, color: 'text-orange-400' },
  other:    { label: 'Other',    icon: <Package       className="h-4 w-4" />, color: 'text-muted-foreground' },
};

function ResourceTypeIcon({ type, className }: { type: ResourceType; className?: string }) {
  const meta = TYPE_META[type];
  return (
    <span className={cn(meta.color, className)}>
      {meta.icon}
    </span>
  );
}

function toDateSafe(val: any): Date | null {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  try { return new Date(val); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource card
// ─────────────────────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  isManager,
  activeUser,
  onDelete,
  onTogglePin,
}: {
  resource: Resource;
  isManager: boolean;
  activeUser: AccessKey | null;
  onDelete: (id: string) => void;
  onTogglePin: (resource: Resource) => void;
}) {
  const { toast } = useToast();
  const isOwner = activeUser?.username === resource.createdBy;
  const canDelete = isManager || isOwner;
  const date = toDateSafe(resource.createdAt);

  const copyLink = () => {
    navigator.clipboard.writeText(resource.url);
    toast({ title: 'Link copied!', description: resource.url });
  };

  const openLink = () => {
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border bg-background/30 p-4 transition-all hover:bg-background/50 hover:border-border cursor-pointer',
        resource.pinned ? 'border-primary/40' : 'border-border/40'
      )}
      onClick={openLink}
    >
      {/* Pinned badge */}
      {resource.pinned && (
        <span className="absolute top-2.5 right-2.5 text-yellow-400">
          <Star className="h-3.5 w-3.5 fill-yellow-400" />
        </span>
      )}

      {/* Header row */}
      <div className="flex items-start gap-2.5 pr-6">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'bg-background/60 border border-border/40'
          )}
        >
          <ResourceTypeIcon type={resource.type} className="!h-4 !w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{resource.name}</p>
          {resource.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{resource.description}</p>
          )}
        </div>
      </div>

      {/* Tags + folder */}
      <div className="flex flex-wrap gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
        {resource.folderName && (
          <Badge variant="outline" className="text-[10px] h-5 border-border/50 text-muted-foreground gap-1">
            <Folder className="h-2.5 w-2.5" />{resource.folderName}
          </Badge>
        )}
        {resource.accessLevel === 'admin' && (
          <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-400 bg-amber-500/10">
            Admin Only
          </Badge>
        )}
        {resource.tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-[10px] h-5 cursor-default"
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/20">
        <p className="text-[10px] text-muted-foreground">
          {resource.createdByDisplay}
          {date ? ` · ${format(date, 'MMM d, yyyy')}` : ''}
        </p>

        {/* Action buttons */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Copy link"
            onClick={copyLink}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          {isManager && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title={resource.pinned ? 'Unpin' : 'Pin to top'}
              onClick={() => onTogglePin(resource)}
            >
              <Star className={cn('h-3.5 w-3.5', resource.pinned ? 'fill-yellow-400 text-yellow-400' : '')} />
            </Button>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete resource?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{resource.name}</strong>. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(resource.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add resource panel
// ─────────────────────────────────────────────────────────────────────────────

function AddResourcePanel({
  folders,
  isManager,
  onSave,
  onClose,
}: {
  folders: ResourceFolder[];
  isManager: boolean;
  onSave: (form: AddResourceForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AddResourceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AddResourceForm>(key: K, value: AddResourceForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleUrlBlur = () => {
    if (form.url && form.type === 'link') {
      set('type', detectType(form.url));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Add Resource</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-3.5">

          {/* Name */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Resource name"
              className="h-8 text-sm border-border/60 bg-background/50"
            />
          </div>

          {/* URL */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://..."
              type="url"
              className="h-8 text-sm border-border/60 bg-background/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description of this resource..."
              rows={2}
              className="resize-none text-sm border-border/60 bg-background/50"
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Type
            </Label>
            <Select value={form.type} onValueChange={(v) => set('type', v as ResourceType)}>
              <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as ResourceType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <span className={TYPE_META[t].color}>{TYPE_META[t].icon}</span>
                      {TYPE_META[t].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folder */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Folder
            </Label>
            <Select value={form.folderId || '__none__'} onValueChange={(v) => set('folderId', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
                <SelectValue placeholder="No folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No folder</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tags <span className="text-muted-foreground/60 normal-case font-normal">(comma-separated)</span>
            </Label>
            <Input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="onboarding, sales, training"
              className="h-8 text-sm border-border/60 bg-background/50"
            />
          </div>

          {/* Access Level (admin only) */}
          {isManager && (
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Access
              </Label>
              <Select value={form.accessLevel} onValueChange={(v) => set('accessLevel', v as AccessLevel)}>
                <SelectTrigger className="h-8 text-sm border-border/60 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border/30 space-y-2 shrink-0">
        <Button
          className="w-full btn-gradient"
          onClick={handleSubmit}
          disabled={saving || !form.name.trim() || !form.url.trim()}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save Resource
        </Button>
        <Button variant="ghost" size="sm" className="w-full border border-border/40 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dialog
// ─────────────────────────────────────────────────────────────────────────────

type ResourceLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
  tagFilter?: string;
};

export function ResourceLibraryDialog({
  open,
  onOpenChange,
  client,
  activeUser,
  tagFilter,
}: ResourceLibraryDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const isManager = activeUser?.role === 'admin';

  // UI state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = All
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(tagFilter ?? null);

  useEffect(() => { setActiveTagFilter(tagFilter ?? null); }, [tagFilter]);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Folder management state
  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  // ── Firestore refs ────────────────────────────────────────────────────────

  const foldersRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'resourceFolders');
  }, [firestore, client.path]);

  const resourcesRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'resources');
  }, [firestore, client.path]);

  const { data: folders, isLoading: foldersLoading } = useCollection<ResourceFolder>(foldersRef);
  const { data: allResources, isLoading: resourcesLoading } = useCollection<Resource>(resourcesRef);

  // ── Derived data ──────────────────────────────────────────────────────────

  const sortedFolders = useMemo(() => {
    if (!folders) return [];
    return [...folders].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [folders]);

  const visibleResources = useMemo(() => {
    if (!allResources) return [];
    return allResources.filter((r) => {
      if (r.accessLevel === 'admin' && !isManager) return false;
      return true;
    });
  }, [allResources, isManager]);

  const filteredResources = useMemo(() => {
    let list = visibleResources;

    // Folder filter
    if (selectedFolderId) {
      list = list.filter((r) => r.folderId === selectedFolderId);
    }

    // Tag filter
    if (activeTagFilter) {
      list = list.filter((r) => r.tags.includes(activeTagFilter));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort: pinned first, then by createdAt desc
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const da = toDateSafe(a.createdAt)?.getTime() ?? 0;
      const db = toDateSafe(b.createdAt)?.getTime() ?? 0;
      return db - da;
    });
  }, [visibleResources, selectedFolderId, activeTagFilter, searchQuery]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    visibleResources.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [visibleResources]);

  const isLoading = foldersLoading || resourcesLoading;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddResource = async (form: AddResourceForm) => {
    if (!resourcesRef || !client.path) return;
    const folder = sortedFolders.find((f) => f.id === form.folderId);
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await addDoc(resourcesRef, {
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim() || null,
      type: form.type,
      folderId: folder?.id ?? null,
      folderName: folder?.name ?? null,
      tags,
      accessLevel: form.accessLevel,
      pinned: false,
      createdBy: activeUser?.username ?? 'unknown',
      createdByDisplay: activeUser?.displayName ?? 'Unknown',
      createdAt: serverTimestamp(),
    });

    toast({ title: 'Resource added', description: `${form.name} has been added to the library.` });
    setShowAddPanel(false);
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!client.path) return;
    await deleteDoc(doc(firestore, client.path, 'resources', resourceId));
    toast({ title: 'Resource deleted', variant: 'destructive' });
  };

  const handleTogglePin = async (resource: Resource) => {
    if (!client.path) return;
    await updateDoc(doc(firestore, client.path, 'resources', resource.id), {
      pinned: !resource.pinned,
    });
    toast({
      title: resource.pinned ? 'Unpinned' : 'Pinned to top',
      description: resource.name,
    });
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim() || !foldersRef) return;
    setAddingFolder(true);
    await addDoc(foldersRef, {
      name: newFolderName.trim(),
      order: sortedFolders.length,
      createdBy: activeUser?.username ?? 'unknown',
    });
    setNewFolderName('');
    setAddingFolder(false);
    toast({ title: 'Folder created', description: newFolderName.trim() });
  };

  const handleRenameFolder = async (folder: ResourceFolder) => {
    if (!renamingValue.trim() || !client.path) return;
    await updateDoc(doc(firestore, client.path, 'resourceFolders', folder.id), {
      name: renamingValue.trim(),
    });
    // Also update folderName on resources in this folder
    const resourcesInFolder = allResources?.filter((r) => r.folderId === folder.id) ?? [];
    await Promise.all(
      resourcesInFolder.map((r) =>
        updateDoc(doc(firestore, client.path!, 'resources', r.id), {
          folderName: renamingValue.trim(),
        })
      )
    );
    setRenamingFolderId(null);
    setRenamingValue('');
    toast({ title: 'Folder renamed' });
  };

  const handleDeleteFolder = async (folder: ResourceFolder) => {
    if (!client.path) return;
    await deleteDoc(doc(firestore, client.path, 'resourceFolders', folder.id));
    // Unlink resources from this folder
    const resourcesInFolder = allResources?.filter((r) => r.folderId === folder.id) ?? [];
    await Promise.all(
      resourcesInFolder.map((r) =>
        updateDoc(doc(firestore, client.path!, 'resources', r.id), {
          folderId: null,
          folderName: null,
        })
      )
    );
    if (selectedFolderId === folder.id) setSelectedFolderId(null);
    toast({ title: 'Folder deleted', variant: 'destructive' });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden glass-card-strong border-border/50">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="font-headline text-lg">Resource Library</DialogTitle>
                <DialogDescription className="text-xs">
                  {client.firmName} · {visibleResources.length} resource{visibleResources.length !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>

            <Button
              className="btn-gradient h-8 text-xs gap-1.5"
              onClick={() => setShowAddPanel((v) => !v)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Resource
            </Button>
          </div>

          {/* Search + tag filters */}
          <div className="flex flex-col gap-2 pt-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search resources…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-border/50 bg-background/50"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all',
                      activeTagFilter === tag
                        ? 'border-primary/60 bg-primary/20 text-primary'
                        : 'border-border/40 bg-background/30 text-muted-foreground hover:text-foreground hover:border-border'
                    )}
                  >
                    {tag}
                  </button>
                ))}
                {activeTagFilter && (
                  <button
                    onClick={() => setActiveTagFilter(null)}
                    className="flex items-center gap-1 rounded-full border border-border/40 bg-background/30 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" /> Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ── Body: sidebar + grid + add-panel ─────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-border/30 flex flex-col bg-background/20">
            <ScrollArea className="flex-1">
              <div className="py-2 px-2 space-y-0.5">

                {/* All Resources */}
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all text-left',
                    selectedFolderId === null
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">All Resources</span>
                  <span className="ml-auto text-[10px] opacity-60">{visibleResources.length}</span>
                </button>

                {/* Folder list */}
                {sortedFolders.map((folder) => {
                  const count = visibleResources.filter((r) => r.folderId === folder.id).length;
                  const isSelected = selectedFolderId === folder.id;
                  const isRenaming = renamingFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className={cn(
                        'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
                        isSelected
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      )}
                    >
                      {isSelected ? (
                        <FolderOpen className="h-4 w-4 shrink-0" />
                      ) : (
                        <Folder className="h-4 w-4 shrink-0" />
                      )}

                      {isRenaming ? (
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={renamingValue}
                            onChange={(e) => setRenamingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(folder);
                              if (e.key === 'Escape') { setRenamingFolderId(null); setRenamingValue(''); }
                            }}
                            className="h-6 text-xs px-1 border-border/60 bg-background/50"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => handleRenameFolder(folder)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="flex-1 flex items-center gap-1.5 text-left"
                          onClick={() => setSelectedFolderId(folder.id)}
                        >
                          <span className="truncate">{folder.name}</span>
                          <span className="ml-auto text-[10px] opacity-60">{count}</span>
                        </button>
                      )}

                      {/* Admin folder actions */}
                      {isManager && !isRenaming && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            title="Rename folder"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFolderId(folder.id);
                              setRenamingValue(folder.name);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                title="Delete folder"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete folder?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{folder.name}</strong> will be deleted. Resources inside will be moved to no folder.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFolder(folder)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Add folder (admin) */}
            {isManager && (
              <div className="border-t border-border/30 p-2 shrink-0">
                <div className="flex items-center gap-1">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                    placeholder="New folder…"
                    className="h-7 text-xs border-border/50 bg-background/40 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleAddFolder}
                    disabled={addingFolder || !newFolderName.trim()}
                    title="Add folder"
                  >
                    {addingFolder ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FolderPlus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Resource grid */}
          <div className="flex-1 min-w-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-4">
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className={cn(
                      'hover:text-foreground transition-colors',
                      !selectedFolderId ? 'text-foreground font-semibold' : ''
                    )}
                  >
                    All Resources
                  </button>
                  {selectedFolderId && (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      <span className="text-foreground font-semibold">
                        {sortedFolders.find((f) => f.id === selectedFolderId)?.name ?? 'Folder'}
                      </span>
                    </>
                  )}
                  {(searchQuery || activeTagFilter) && (
                    <span className="ml-2 text-muted-foreground/60">
                      — {filteredResources.length} result{filteredResources.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredResources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {searchQuery || activeTagFilter
                          ? 'No resources match your search.'
                          : 'No resources yet.'}
                      </p>
                      {!searchQuery && !activeTagFilter && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Click <strong>Add Resource</strong> to get started.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        isManager={isManager}
                        activeUser={activeUser}
                        onDelete={handleDeleteResource}
                        onTogglePin={handleTogglePin}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add panel (slides in from right) */}
          {showAddPanel && (
            <div className="w-72 shrink-0 border-l border-border/30 bg-background/40 backdrop-blur-sm flex flex-col">
              <AddResourcePanel
                folders={sortedFolders}
                isManager={isManager}
                onSave={handleAddResource}
                onClose={() => setShowAddPanel(false)}
              />
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <DialogFooter className="px-5 py-3 border-t border-border/30 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
