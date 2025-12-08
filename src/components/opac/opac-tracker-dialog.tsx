
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { PlusCircle, Trash2, Loader2, Database, Activity, Edit, Upload, ArrowUpDown } from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { AddOpaCustomerDialog } from '@/components/opac/add-customer-dialog';
import type { Client, OpaCustomer, ActivityLogEntry } from '@/types/client';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle as OpacDialogTitle, DialogDescription } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { TextCustomerDialog } from './text-customer-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { EditOpaCustomerDialog } from './edit-customer-dialog';
import type { AccessKey } from '@/types/session';
import { BulkAddCustomersDialog } from './bulk-add-customers-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type OpacTrackerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client;
    activeUser: AccessKey | null;
};

type SortKey = keyof OpaCustomer | 'createdAt' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

const ActivityLogTooltip = ({ customer }: { customer: OpaCustomer }) => {
    if (!customer.activityLog || customer.activityLog.length === 0) {
        return null;
    }
    const sortedLog = [...customer.activityLog].sort((a, b) => {
        const dateA = (a.timestamp as any)?.toDate ? (a.timestamp as any).toDate() : new Date(a.timestamp);
        const dateB = (b.timestamp as any)?.toDate ? (b.timestamp as any).toDate() : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
    });

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Activity className="h-4 w-4 text-blue-500 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className='max-w-xs'>
                    <p className="font-bold mb-2">Activity Log</p>
                    <ul className='space-y-2'>
                        {sortedLog.map((log, index) => {
                             const date = (log.timestamp as any)?.toDate ? (log.timestamp as any).toDate() : new Date(log.timestamp);
                             return (
                                <li key={index} className='text-xs'>
                                    <p className='font-medium'>
                                        <span className="font-bold">{log.user || 'System'}:</span> {log.activity}
                                    </p>
                                    <p className='text-muted-foreground'>
                                        {formatDistanceToNow(date, { addSuffix: true })}
                                    </p>
                                </li>
                             )
                        })}
                    </ul>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export function OpacTrackerDialog({ open, onOpenChange, client, activeUser }: OpacTrackerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [customerForNotes, setCustomerForNotes] = useState<OpaCustomer | null>(null);
  const [customerForText, setCustomerForText] = useState<OpaCustomer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<OpaCustomer | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');


  const customersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'opacCustomers');
  }, [firestore, client.path]);

  const { data: customers, isLoading } = useCollection<OpaCustomer>(customersCollectionRef);

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];
    
    return [...customers].sort((a, b) => {
        let valA: any, valB: any;

        if (sortKey === 'lastActivity') {
            valA = a.activityLog?.[a.activityLog.length - 1]?.timestamp?.toDate() || new Date(0);
            valB = b.activityLog?.[b.activityLog.length - 1]?.timestamp?.toDate() || new Date(0);
        } else if (sortKey === 'createdAt') {
            valA = a.createdAt?.toDate() || new Date(0);
            valB = b.createdAt?.toDate() || new Date(0);
        } else {
            valA = a[sortKey as keyof OpaCustomer] || '';
            valB = b[sortKey as keyof OpaCustomer] || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [customers, sortKey, sortDirection]);

  const handleAddCustomer = (customer: Omit<OpaCustomer, 'id' | 'notes' | 'activityLog'>) => {
    if (!customersCollectionRef) return;
    addDocumentNonBlocking(customersCollectionRef, {...customer, activityLog: [], createdAt: serverTimestamp()});
    toast({ title: 'Customer Added', description: `${customer.firstName} ${customer.lastName} has been added.` });
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (!customersCollectionRef) return;
    const customerDocRef = doc(customersCollectionRef, customerId);
    deleteDocumentNonBlocking(customerDocRef);
    toast({ title: 'Customer Deleted', variant: 'destructive' });
  };
  
  const handleTextClick = (e: React.MouseEvent, customer: OpaCustomer) => {
    e.stopPropagation();
    setCustomerForText(customer);
  }

  const handleEditClick = (e: React.MouseEvent, customer: OpaCustomer) => {
    e.stopPropagation();
    setCustomerToEdit(customer);
  }

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
            <OpacDialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <Database /> OPAC Tracker
            </OpacDialogTitle>
            <DialogDescription>
                A tool to keep track of certain customers for {client.firmName}.
            </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-4 flex-grow min-h-0">
            <div className="flex justify-between items-center">
                <div className='flex items-center gap-2'>
                   <Select value={sortKey} onValueChange={(val) => setSortKey(val as SortKey)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="createdAt">Date Added</SelectItem>
                            <SelectItem value="lastActivity">Last Activity</SelectItem>
                            <SelectItem value="lastName">Name</SelectItem>
                            <SelectItem value="franchise">Franchise</SelectItem>
                            <SelectItem value="writingAgent">Writing Agent</SelectItem>
                            <SelectItem value="planCode">Plan Code</SelectItem>
                            <SelectItem value="planType">Plan Type</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={toggleSortDirection}>
                        <ArrowUpDown className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
                    <Upload className="mr-2"/>
                    Bulk Add
                  </Button>
                  <Button onClick={() => setIsAddCustomerOpen(true)}>
                    <PlusCircle className="mr-2"/>
                    Add Customer
                  </Button>
                </div>
            </div>

            <Card className='flex-grow flex flex-col min-h-0'>
                <CardHeader>
                <CardTitle>Customer List</CardTitle>
                <CardDescription>
                    All tracked customers are listed below. Click on a row to view or edit notes.
                </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow relative">
                  <div className="absolute inset-0 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : !sortedCustomers || sortedCustomers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                        <p>No customers found. Click "Add Customer" to get started.</p>
                        </div>
                    ) : (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Franchise</TableHead>
                            <TableHead>Writing Agent</TableHead>
                            <TableHead>Plan Code</TableHead>
                            <TableHead>Plan Type</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Policy Face $</TableHead>
                            <TableHead>Activity</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedCustomers.map(customer => (
                                <TableRow key={customer.id} onClick={() => setCustomerForNotes(customer)} className="cursor-pointer">
                                    <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell>
                                    <TableCell>{customer.franchise}</TableCell>
                                    <TableCell>{customer.writingAgent}</TableCell>
                                    <TableCell>{customer.planCode}</TableCell>
                                    <TableCell>{customer.planType}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                          <span>{customer.phoneNumber}</span>
                                          {customer.phoneNumber && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => handleTextClick(e, customer)}
                                                className="bg-green-500 hover:bg-green-600 text-white"
                                            >
                                                Text
                                            </Button>
                                          )}
                                      </div>
                                    </TableCell>
                                    <TableCell>{customer.policyFaceAmount}</TableCell>
                                    <TableCell>
                                        <ActivityLogTooltip customer={customer} />
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(e, customer)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
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
                            ))}
                        </TableBody>
                        </Table>
                    )}
                  </div>
                </CardContent>
            </Card>
        </div>
      </DialogContent>
    </Dialog>
    
     <AddOpaCustomerDialog
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onAddCustomer={handleAddCustomer}
    />

    {customersCollectionRef && 
        <BulkAddCustomersDialog
            open={isBulkAddOpen}
            onOpenChange={setIsBulkAddOpen}
            collectionRef={customersCollectionRef}
        />
    }

    {customerForNotes && (
        <NotesDialog
            key={`notes-${customerForNotes.id}`}
            open={!!customerForNotes}
            onOpenChange={(isOpen) => !isOpen && setCustomerForNotes(null)}
            customer={customerForNotes}
            clientPath={client.path || null}
        />
    )}
     {customerForText && (
        <TextCustomerDialog
            key={`text-${customerForText.id}`}
            open={!!customerForText}
            onOpenChange={(isOpen) => !isOpen && setCustomerForText(null)}
            customer={customerForText}
            client={client}
            activeUser={activeUser}
        />
    )}
    {customerToEdit && client.path && (
        <EditOpaCustomerDialog
            key={`edit-${customerToEdit.id}`}
            open={!!customerToEdit}
            onOpenChange={(isOpen) => !isOpen && setCustomerToEdit(null)}
            customer={customerToEdit}
            clientPath={client.path}
        />
    )}
    </>
  );
}
