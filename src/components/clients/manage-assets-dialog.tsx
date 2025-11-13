
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, type ReactNode } from 'react';
import type { Client, Asset } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2, Trash2 } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
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
  } from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';

type ManageAssetsDialogProps = {
  children: ReactNode;
  client: Client;
};

export function ManageAssetsDialog({
  children,
  client,
}: ManageAssetsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const assetsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'assets');
  }, [firestore, client.path]);

  const { data: assets, isLoading: areAssetsLoading } = useCollection<Asset>(assetsCollectionRef);

  const handleDelete = (asset: Asset) => {
    if (!firestore || !client.path) return;
    const assetDocRef = doc(firestore, client.path, 'assets', asset.id);
    deleteDocumentNonBlocking(assetDocRef);
    toast({
      title: 'Asset Deleted',
      description: `"${asset.title}" has been removed.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Assets for {client.firmName}</DialogTitle>
          <DialogDescription>
            View and remove custom assets for this client.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {areAssetsLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="animate-spin" />
            </div>
          ) : !assets || assets.length === 0 ? (
            <p className="text-center text-muted-foreground">No assets found for this client.</p>
          ) : (
            <div className="space-y-4">
              {assets.map((asset) => (
                <Card key={asset.id}>
                  <CardHeader className='flex-row items-center justify-between'>
                    <div>
                      <CardTitle className="text-base">{asset.title}</CardTitle>
                      <CardDescription>{asset.description}</CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently delete the asset "{asset.title}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(asset)}
                            className={cn(
                                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            )}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
