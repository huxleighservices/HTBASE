'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  FolderPlus,
  Loader2,
  Minus,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
  useDoc,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client, InventoryCollection, InventoryItem, InventoryPreferences } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { AddCollectionDialog } from './add-collection-dialog';
import { AddItemDialog } from './add-item-dialog';
import { sendEmail } from '@/app/actions/send-email';

type InventoryManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

export function InventoryManagerDialog({ open, onOpenChange, client, activeUser }: InventoryManagerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const collectionsRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'inventoryCollections');
  }, [firestore, client.path]);

  const itemsRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'inventoryItems');
  }, [firestore, client.path]);

  const prefsDocRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return doc(firestore, client.path, 'inventoryPreferences', 'config');
  }, [firestore, client.path]);

  const { data: collections, isLoading: collectionsLoading } = useCollection<InventoryCollection>(collectionsRef);
  const { data: allItems, isLoading: itemsLoading } = useCollection<InventoryItem>(itemsRef);
  const { data: prefs } = useDoc<InventoryPreferences>(prefsDocRef);

  useEffect(() => {
    if (prefs && !prefsLoaded) {
      setAlertsEnabled(prefs.lowStockAlertsEnabled ?? false);
      setAlertEmail(prefs.alertEmail ?? '');
      setThreshold(String(prefs.lowStockThreshold ?? 5));
      setPrefsLoaded(true);
    }
  }, [prefs, prefsLoaded]);

  useEffect(() => {
    if (!open) setPrefsLoaded(false);
  }, [open]);

  const selectedCollection = useMemo(
    () => collections?.find((c) => c.id === selectedCollectionId) ?? collections?.[0] ?? null,
    [collections, selectedCollectionId],
  );

  const filteredItems = useMemo(
    () => (allItems ?? []).filter((item) => item.collectionId === selectedCollection?.id),
    [allItems, selectedCollection],
  );

  const handleAddCollection = (name: string) => {
    if (!collectionsRef) return;
    addDocumentNonBlocking(collectionsRef, { name, createdAt: serverTimestamp() });
    toast({ title: 'Collection created', description: `"${name}" is ready.` });
  };

  const handleAddItem = (data: { name: string; descriptor: string; quantity: number }) => {
    if (!itemsRef || !selectedCollection) return;
    addDocumentNonBlocking(itemsRef, {
      ...data,
      collectionId: selectedCollection.id,
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Item added', description: `${data.name} added to ${selectedCollection.name}.` });
  };

  const handleUpdateQuantity = (item: InventoryItem, delta: number) => {
    if (!itemsRef) return;
    const newQty = Math.max(0, item.quantity + delta);
    updateDocumentNonBlocking(doc(itemsRef, item.id), { quantity: newQty });

    if (prefs?.lowStockAlertsEnabled && prefs.alertEmail && delta < 0) {
      const limit = prefs.lowStockThreshold ?? 5;
      if (item.quantity > limit && newQty <= limit) {
        sendEmail({
          to: prefs.alertEmail,
          subject: `Low Stock Alert: ${item.name}`,
          html: `<p>The item <strong>${item.name}</strong>${item.descriptor ? ` (${item.descriptor})` : ''} in the collection <strong>${selectedCollection?.name}</strong> has reached a low stock level of <strong>${newQty}</strong>.</p><p>Your low stock threshold is set to <strong>${limit}</strong>.</p><p>— HTBase Inventory Manager</p>`,
        });
        toast({ title: 'Low stock alert sent', description: `Alert emailed to ${prefs.alertEmail}.` });
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!itemsRef) return;
    deleteDocumentNonBlocking(doc(itemsRef, itemId));
    toast({ title: 'Item deleted', variant: 'destructive' });
  };

  const handleDeleteCollection = (col: InventoryCollection) => {
    if (!collectionsRef || !itemsRef) return;
    (allItems ?? [])
      .filter((item) => item.collectionId === col.id)
      .forEach((item) => deleteDocumentNonBlocking(doc(itemsRef, item.id)));
    deleteDocumentNonBlocking(doc(collectionsRef, col.id));
    if (selectedCollectionId === col.id) setSelectedCollectionId(null);
    toast({ title: 'Collection deleted', variant: 'destructive' });
  };

  const handleSavePrefs = () => {
    if (!prefsDocRef) return;
    setDocumentNonBlocking(
      prefsDocRef,
      {
        id: 'config',
        lowStockAlertsEnabled: alertsEnabled,
        alertEmail,
        lowStockThreshold: Math.max(0, parseInt(threshold) || 0),
      },
      { merge: true },
    );
    toast({ title: 'Preferences saved' });
  };

  const activeCollectionId = selectedCollection?.id ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[90dvh] sm:h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl sm:text-3xl font-bold font-headline tracking-tight flex items-center gap-2 sm:gap-3">
              <Package className="h-5 w-5 sm:h-7 sm:w-7 shrink-0" />
              Inventory Manager
            </DialogTitle>
            <DialogDescription>
              Collections and stock levels for {client.firmName}.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="inventory" className="flex flex-col flex-grow min-h-0 pt-1 sm:pt-2">
            <TabsList className="w-fit shrink-0">
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* ── Inventory tab ──────────────────────────────────────────── */}
            <TabsContent value="inventory" className="flex flex-col flex-grow min-h-0 gap-3 mt-3 overflow-hidden">

              {/* Mobile: horizontal scrollable collection chips */}
              <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8 px-3 text-xs"
                  onClick={() => setIsAddCollectionOpen(true)}
                >
                  <FolderPlus className="h-3.5 w-3.5 mr-1" />
                  New
                </Button>
                {collectionsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-muted-foreground" />
                ) : (
                  collections?.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setSelectedCollectionId(col.id)}
                      className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                        activeCollectionId === col.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {col.name}
                    </button>
                  ))
                )}
              </div>

              {/* Main area: desktop sidebar + items panel */}
              <div className="flex flex-grow min-h-0 gap-4 overflow-hidden">

                {/* Desktop sidebar */}
                <div className="hidden md:flex w-52 shrink-0 flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsAddCollectionOpen(true)}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Collection
                  </Button>
                  <ScrollArea className="flex-grow">
                    {collectionsLoading ? (
                      <div className="flex justify-center pt-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : !collections || collections.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center pt-4 px-2">
                        No collections yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1 pr-1">
                        {collections.map((col) => (
                          <div
                            key={col.id}
                            onClick={() => setSelectedCollectionId(col.id)}
                            className={`flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer text-sm group transition-colors ${
                              activeCollectionId === col.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <span className="truncate">{col.name}</span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 ml-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete collection?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete &ldquo;{col.name}&rdquo; and all its items.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteCollection(col)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <Separator orientation="vertical" className="hidden md:block" />

                {/* Items panel */}
                <div className="flex flex-col flex-grow min-h-0 gap-3">
                  {!selectedCollection ? (
                    <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground gap-2">
                      <Package className="h-10 w-10 opacity-20" />
                      <p className="text-sm">
                        {collections && collections.length > 0
                          ? 'Select a collection above.'
                          : 'Create a collection to get started.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between shrink-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate mr-2">
                          {selectedCollection.name}
                        </h3>
                        <Button size="sm" onClick={() => setIsAddItemOpen(true)} className="shrink-0">
                          <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                          Add Item
                        </Button>
                      </div>

                      <ScrollArea className="flex-grow">
                        {itemsLoading ? (
                          <div className="flex justify-center pt-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : filteredItems.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground text-sm">
                            No items yet. Tap &ldquo;Add Item&rdquo; to get started.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 pr-1">
                            {filteredItems.map((item) => {
                              const isLow =
                                prefs?.lowStockAlertsEnabled &&
                                item.quantity <= (prefs.lowStockThreshold ?? 5);
                              return (
                                <div key={item.id} className="p-3 rounded-lg border bg-card">
                                  {/* Name + badge row */}
                                  <div className="flex items-start justify-between gap-2 mb-2.5">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium leading-tight truncate">{item.name}</p>
                                      {item.descriptor && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                          {item.descriptor}
                                        </p>
                                      )}
                                    </div>
                                    {isLow && (
                                      <Badge variant="destructive" className="shrink-0 text-xs">
                                        Low Stock
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Controls row */}
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9"
                                      disabled={item.quantity <= 0}
                                      onClick={() => handleUpdateQuantity(item, -1)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-12 text-center font-mono font-semibold tabular-nums text-base">
                                      {item.quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9"
                                      onClick={() => handleUpdateQuantity(item, 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <div className="flex-1" />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete item?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently delete &ldquo;{item.name}&rdquo;.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => handleDeleteItem(item.id)}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Preferences tab ────────────────────────────────────────── */}
            <TabsContent value="preferences" className="flex-grow overflow-auto mt-4">
              <div className="max-w-md space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Receive an email when an item drops to or below your threshold.
                    </p>
                  </div>
                  <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                </div>

                {alertsEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="alert-email">Alert Email</Label>
                      <Input
                        id="alert-email"
                        type="email"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold">Low Stock Threshold</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min="0"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        className="w-32"
                      />
                      <p className="text-sm text-muted-foreground">
                        Items at or below this quantity will be flagged and trigger an alert.
                      </p>
                    </div>
                  </>
                )}

                <Button onClick={handleSavePrefs} className="w-full sm:w-auto">
                  Save Preferences
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddCollectionDialog
        open={isAddCollectionOpen}
        onOpenChange={setIsAddCollectionOpen}
        onAdd={handleAddCollection}
      />

      {selectedCollection && (
        <AddItemDialog
          open={isAddItemOpen}
          onOpenChange={setIsAddItemOpen}
          collection={selectedCollection}
          onAdd={handleAddItem}
        />
      )}
    </>
  );
}
