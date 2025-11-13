
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Database } from 'lucide-react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { AddOpaCustomerDialog } from '@/components/opac/add-customer-dialog';
import type { OpaCustomer } from '@/types/client';
import { NotesDialog } from '@/components/opac/notes-dialog';
import { useToast } from '@/hooks/use-toast';
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

export default function OpacTrackerPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const customersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'opacCustomers');
  }, [firestore, user]);

  const { data: customers, isLoading } = useCollection<OpaCustomer>(customersCollectionRef);

  const handleAddCustomer = (customer: Omit<OpaCustomer, 'id' | 'notes'>) => {
    if (!customersCollectionRef) return;
    addDocumentNonBlocking(customersCollectionRef, customer);
    toast({ title: 'Customer Added', description: `${customer.firstName} ${customer.lastName} has been added.` });
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (!customersCollectionRef) return;
    const customerDocRef = doc(customersCollectionRef, customerId);
    deleteDocumentNonBlocking(customerDocRef);
    toast({ title: 'Customer Deleted', variant: 'destructive' });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
             <Database /> OPAC Tracker
          </h1>
          <p className="text-muted-foreground">
            A tool to keep track of certain customers.
          </p>
        </div>
        <AddOpaCustomerDialog onAddCustomer={handleAddCustomer}>
          <Button>
            <PlusCircle />
            Add Customer
          </Button>
        </AddOpaCustomerDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>
            All tracked customers are listed below. Click on a row to view or edit notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !customers || customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No customers found. Click "Add Customer" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Former Company</TableHead>
                  <TableHead>Plan Details</TableHead>
                  <TableHead>Date Left</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map(customer => (
                  <NotesDialog key={customer.id} customer={customer}>
                    <TableRow className="cursor-pointer">
                      <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell>
                      <TableCell>{customer.formerCompany}</TableCell>
                      <TableCell>{customer.planDetails}</TableCell>
                      <TableCell>{customer.dateLeft}</TableCell>
                      <TableCell>{customer.phoneNumber}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog onOpenChange={(e) => e.stopPropagation()}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the record for {customer.firstName} {customer.lastName}.
                                </AlertDialogDescription>
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
                  </NotesDialog>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    