'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { FileEdit, PlusCircle, Loader2, Lock, Trash2, User } from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Client, AccessKey as ClientAccessKey } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { logActivity } from '@/lib/activity-log';
import type { BaseDoc } from './types';
import { BaseDocEditor } from './base-doc-editor';

type BaseDocDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

export function BaseDocDialog({ open, onOpenChange, client, activeUser }: BaseDocDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const isManager = activeUser?.role === 'admin';

  const docsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'baseDocs');
  }, [firestore, client.path]);

  const accessKeysCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'accessKeys');
  }, [firestore, client.path]);

  const { data: allDocs, isLoading } = useCollection<BaseDoc>(docsCollectionRef);
  const { data: accessKeys } = useCollection<ClientAccessKey>(accessKeysCollectionRef);

  const visibleDocs = useMemo(() => {
    if (!allDocs) return [];
    return allDocs
      .filter((d) => {
        if (isManager) return true;
        if (!activeUser) return false;
        return d.createdBy === activeUser.username || d.allowedUsers?.includes(activeUser.username);
      })
      .sort((a, b) => {
        const ta = (a.updatedAt ?? a.createdAt)?.toDate?.()?.getTime?.() ?? 0;
        const tb = (b.updatedAt ?? b.createdAt)?.toDate?.()?.getTime?.() ?? 0;
        return tb - ta;
      });
  }, [allDocs, isManager, activeUser]);

  const selectedDoc = visibleDocs.find((d) => d.id === selectedDocId) ?? null;

  const handleCreate = () => {
    if (!docsCollectionRef || !firestore || !activeUser) return;
    const newDocRef = doc(docsCollectionRef);
    setDocumentNonBlocking(newDocRef, {
      title: 'Untitled Document',
      content: '',
      allowedUsers: [],
      createdBy: activeUser.username,
      createdByDisplay: activeUser.displayName,
      createdAt: serverTimestamp(),
    }, {});
    toast({ title: 'Document created' });
    if (client.path) {
      logActivity(firestore, client.path, 'base-doc', 'New Base Doc created: Untitled Document');
    }
    setSelectedDocId(newDocRef.id);
  };

  const handleDelete = (docId: string, title: string) => {
    if (!docsCollectionRef) return;
    deleteDocumentNonBlocking(doc(docsCollectionRef, docId));
    toast({ title: 'Document deleted', variant: 'destructive' });
    if (selectedDocId === docId) setSelectedDocId(null);
    if (firestore && client.path) {
      logActivity(firestore, client.path, 'base-doc', `"${title}" was deleted`);
    }
  };

  const canDelete = (d: BaseDoc) => isManager || activeUser?.username === d.createdBy;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSelectedDocId(null); }}>
      <DialogContent className="max-w-[90vw] w-full h-[88vh] flex flex-col p-0 overflow-hidden glass-card-strong border-border/50">
        {!selectedDoc ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30 shrink-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <FileEdit className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="font-headline text-lg">Base Doc</DialogTitle>
                    <DialogDescription className="text-xs">{client.firmName}</DialogDescription>
                  </div>
                </div>
                <Button size="sm" className="h-8 gap-1.5 text-xs btn-gradient" onClick={handleCreate}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Document
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : visibleDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <FileEdit className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No documents yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleDocs.map((d) => {
                    const isCreator = activeUser?.username === d.createdBy;
                    const updated = (d.updatedAt ?? d.createdAt)?.toDate?.();
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDocId(d.id)}
                        className="group relative rounded-xl border border-border/40 bg-background/30 hover:bg-background/50 transition-all cursor-pointer p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight flex-1 min-w-0 break-words">{d.title}</p>
                          {!isCreator && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          {canDelete(d) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete document?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete &ldquo;{d.title}&rdquo;.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(d.id, d.title)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {d.createdByDisplay}
                          </span>
                          {updated && <span>{formatDistanceToNow(updated, { addSuffix: true })}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          firestore && (
            <BaseDocEditor
              firestore={firestore}
              client={client}
              doc={selectedDoc}
              accessKeys={accessKeys ?? []}
              activeUser={activeUser}
              onBack={() => setSelectedDocId(null)}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
