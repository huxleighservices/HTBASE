
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { Client, Lead, ARCustomer } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { DollarSign, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AddArCustomerDialog } from './add-ar-customer-dialog';
import { ManageArCustomerDialog } from './manage-ar-customer-dialog';
import { format, formatDistanceToNow } from 'date-fns';

type ARCollectionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

export function ARCollectionsDialog({ open, onOpenChange, client, activeUser }: ARCollectionsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ARCustomer | null>(null);

  const arCustomersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'arCustomers');
  }, [firestore, client.path]);

  const { data: arCustomers, isLoading } = useCollection<ARCustomer>(arCustomersCollectionRef);

  const leadsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'leads');
  }, [firestore, client.path]);

  const { data: leads } = useCollection<Lead>(leadsCollectionRef);
  
  const handleAddCustomer = (customerData: Omit<ARCustomer, 'id' | 'createdAt'>) => {
    if (!arCustomersCollectionRef) return;
    addDocumentNonBlocking(arCustomersCollectionRef, { ...customerData, createdAt: serverTimestamp() });
    toast({ title: 'A/R Customer Created', description: `${customerData.customerName} has been added to collections.` });
  };
  
  const handleDeleteCustomer = (customerId: string) => {
      if(!arCustomersCollectionRef) return;
      deleteDocumentNonBlocking(doc(arCustomersCollectionRef, customerId));
      toast({ title: 'Customer Removed', variant: 'destructive' });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-headline tracking-tight flex items-center gap-3"><DollarSign />A/R Collections Hub</DialogTitle>
            <DialogDescription>Manage accounts receivable for {client.firmName}.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow flex flex-col min-h-0 pt-4 gap-4">
            <div className="flex justify-end">
                <Button onClick={() => setIsAddCustomerOpen(true)}>
                    <PlusCircle className="mr-2"/> Add A/R Customer
                </Button>
            </div>
            <Card className="flex-grow flex flex-col">
                <CardHeader>
                    <CardTitle>Collections Accounts</CardTitle>
                    <CardDescription>Click a customer to manage their account.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow relative">
                    <div className="absolute inset-0 overflow-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin"/></div>
                        ) : !arCustomers || arCustomers.length === 0 ? (
                            <p className="text-center text-muted-foreground pt-12">No A/R customers found.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Build Complete</TableHead>
                                        <TableHead>Initial Balance</TableHead>
                                        <TableHead>Days Since Build</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {arCustomers.map(customer => (
                                        <TableRow key={customer.id} onClick={() => setSelectedCustomer(customer)} className="cursor-pointer">
                                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                                            <TableCell>{customer.buildCompleteDate ? format(customer.buildCompleteDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>${customer.initialBalance.toLocaleString()}</TableCell>
                                            <TableCell>{customer.buildCompleteDate ? formatDistanceToNow(customer.buildCompleteDate.toDate()) : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently remove {customer.customerName} from A/R.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteCustomer(customer.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddArCustomerDialog 
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onAddCustomer={handleAddCustomer}
        leads={leads || []}
        arCustomersCollectionRef={arCustomersCollectionRef}
      />
      
      {selectedCustomer && client.path && arCustomersCollectionRef && (
        <ManageArCustomerDialog 
            open={!!selectedCustomer}
            onOpenChange={(isOpen) => !isOpen && setSelectedCustomer(null)}
            customer={selectedCustomer}
            clientPath={client.path}
            activeUser={activeUser}
            arCustomersCollectionRef={arCustomersCollectionRef}
        />
      )}
    </>
  );
}
