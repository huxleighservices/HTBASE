
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import type { Client, Lead, ARCustomer, ARPayment, ARPenalty, ARActivityLog } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { DollarSign, PlusCircle, Trash2, Loader2, Edit, ArrowUpDown, Search, Activity } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AddArCustomerDialog } from './add-ar-customer-dialog';
import { ManageArCustomerDialog } from './manage-ar-customer-dialog';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { AiCollectionsAssistant } from './ai-collections-assistant';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type EnrichedARCustomer = ARCustomer & {
    totalPaid: number;
    totalOwed: number;
    currentBalance: number;
    progress: number;
    daysSinceBuild: number | null;
};
type SortKey = 'customerName' | 'daysSinceBuild' | 'currentBalance' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

const ActivityLogTooltip = ({ log }: { log?: ARActivityLog[] }) => {
    if (!log || log.length === 0) {
        return <span className="text-muted-foreground text-xs">No activity</span>;
    }
    const sortedLog = [...log].sort((a, b) => {
        const dateA = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(0);
        const dateB = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
    const latestLog = sortedLog[0];
    const latestDate = (latestLog.date as any)?.toDate ? (latestLog.date as any).toDate() : null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                        <Activity className="h-4 w-4 text-blue-500" />
                        {latestDate && <span className="text-xs text-muted-foreground">{formatDistanceToNow(latestDate, { addSuffix: true })}</span>}
                    </div>
                </TooltipTrigger>
                <TooltipContent className='max-w-xs'>
                    <p className="font-bold mb-2">Activity Log</p>
                    <ul className='space-y-2'>
                        {sortedLog.slice(0, 5).map((log, index) => {
                             const date = (log.date as any)?.toDate ? (log.date as any).toDate() : new Date(log.date as any);
                             return (
                                <li key={index} className='text-xs'>
                                    <p className='font-medium'>
                                        <span className="font-bold">{log.user || 'System'}:</span> {log.note}
                                    </p>
                                    <p className='text-muted-foreground'>
                                        {formatDistanceToNow(date, { addSuffix: true })} ({log.type})
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


const ArCustomerRow = ({
  customer,
  onSelectCustomer,
  onDeleteCustomer,
}: {
  customer: EnrichedARCustomer;
  onSelectCustomer: (customer: ARCustomer) => void;
  onDeleteCustomer: (customerId: string) => void;
}) => {
  const { 
    id, 
    customerName, 
    buildCompleteDate, 
    initialBalance, 
    totalPaid, 
    totalOwed, 
    progress, 
    daysSinceBuild,
    activityLog
  } = customer;

  return (
     <TableRow>
        <TableCell className="font-medium">{customerName}</TableCell>
        <TableCell>{buildCompleteDate?.toDate ? format(buildCompleteDate.toDate(), 'PPP') : 'N/A'}</TableCell>
        <TableCell>${initialBalance.toLocaleString()}</TableCell>
        <TableCell className="w-[200px]">
            <Progress value={progress} className={progress >= 100 ? 'bg-green-500' : ''}/>
            <span className="text-xs text-muted-foreground">${totalPaid.toLocaleString()} of ${totalOwed.toLocaleString()}</span>
        </TableCell>
        <TableCell>{daysSinceBuild !== null ? `${daysSinceBuild} days` : 'N/A'}</TableCell>
        <TableCell>
            <ActivityLogTooltip log={activityLog} />
        </TableCell>
        <TableCell className="text-right">
             <Button variant="ghost" size="icon" onClick={() => onSelectCustomer(customer)}>
                <Edit className="h-4 w-4" />
             </Button>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove {customerName} from A/R.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => onDeleteCustomer(id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TableCell>
    </TableRow>
  );
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastActivity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [enrichedCustomers, setEnrichedCustomers] = useState<EnrichedARCustomer[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const arCustomersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'arCustomers');
  }, [firestore, client.path]);

  const { data: arCustomers, isLoading: areCustomersLoading } = useCollection<ARCustomer>(arCustomersCollectionRef);

  useEffect(() => {
    if (areCustomersLoading || !arCustomers || !firestore || !client.path) {
        if (!areCustomersLoading) setIsProcessing(false);
        return;
    }

    const processCustomers = async () => {
        setIsProcessing(true);
        const enriched = await Promise.all(arCustomers.map(async customer => {
            const paymentsRef = collection(firestore, client.path!, 'arCustomers', customer.id, 'payments');
            const penaltiesRef = collection(firestore, client.path!, 'arCustomers', customer.id, 'penalties');
            
            const paymentsSnap = await getDocs(paymentsRef);
            const penaltiesSnap = await getDocs(penaltiesRef);
            
            const payments = paymentsSnap.docs.map(d => d.data() as ARPayment);
            const penalties = penaltiesSnap.docs.map(d => d.data() as ARPenalty);
            
            const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
            const totalPenalties = penalties.reduce((acc, p) => acc + p.amount, 0);
            
            const totalOwed = customer.initialBalance + totalPenalties;
            const currentBalance = totalOwed - totalPaid;
            const progress = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;
            const daysSinceBuild = customer.buildCompleteDate?.toDate ? differenceInDays(new Date(), customer.buildCompleteDate.toDate()) : null;

            return {
                ...customer,
                totalPaid,
                totalOwed,
                currentBalance,
                progress,
                daysSinceBuild
            };
        }));
        setEnrichedCustomers(enriched);
        setIsProcessing(false);
    };

    processCustomers();
  }, [arCustomers, firestore, client.path, areCustomersLoading]);


  const filteredAndSortedCustomers = useMemo(() => {
      if (!enrichedCustomers) return [];

      const filtered = enrichedCustomers.filter(c =>
          c.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return filtered.sort((a, b) => {
          let valA: any, valB: any;

          if (sortKey === 'lastActivity') {
            valA = a.lastActivity?.toDate() || new Date(0);
            valB = b.lastActivity?.toDate() || new Date(0);
          } else {
            valA = a[sortKey as keyof EnrichedARCustomer];
            valB = b[sortKey as keyof EnrichedARCustomer];
          }

          if (valA === null) valA = sortDirection === 'asc' ? Infinity : -Infinity;
          if (valB === null) valB = sortDirection === 'asc' ? Infinity : -Infinity;

          if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
          if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
      });
  }, [enrichedCustomers, searchQuery, sortKey, sortDirection]);

  const totalProgress = useMemo(() => {
      if (!enrichedCustomers) return { totalPaid: 0, totalOwed: 0, progress: 0 };
      
      const totalPaid = enrichedCustomers.reduce((acc, c) => acc + c.totalPaid, 0);
      const totalOwed = enrichedCustomers.reduce((acc, c) => acc + c.totalOwed, 0);
      const progress = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;

      return { totalPaid, totalOwed, progress };
  }, [enrichedCustomers]);
  
  const handleSort = (key: SortKey) => {
      if (sortKey === key) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection(key === 'lastActivity' ? 'desc' : 'asc');
      }
  };


  const leadsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'leads');
  }, [firestore, client.path]);

  const { data: leads } = useCollection<Lead>(leadsCollectionRef);
  
  const handleAddCustomer = (customerData: Omit<ARCustomer, 'id' | 'createdAt'>) => {
    if (!arCustomersCollectionRef) return;
    addDocumentNonBlocking(arCustomersCollectionRef, { ...customerData, createdAt: serverTimestamp(), activityLog: [] });
    toast({ title: 'A/R Customer Created', description: `${customerData.customerName} has been added to collections.` });
  };
  
  const handleDeleteCustomer = (customerId: string) => {
      if(!arCustomersCollectionRef) return;
      deleteDocumentNonBlocking(doc(arCustomersCollectionRef, customerId));
      toast({ title: 'Customer Removed', variant: 'destructive' });
  }
  
  const isLoading = areCustomersLoading || isProcessing;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-headline tracking-tight flex items-center gap-3"><DollarSign />A/R Collections Hub</DialogTitle>
            <DialogDescription>Manage accounts receivable for {client.firmName}.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow flex flex-col min-h-0 pt-4 gap-4">
            
            <AiCollectionsAssistant customers={enrichedCustomers} />
            
             <Card>
                <CardHeader>
                    <CardTitle>Total Collections Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={totalProgress.progress} className={totalProgress.progress >= 100 ? 'bg-green-500' : ''}/>
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>${totalProgress.totalPaid.toLocaleString()} Paid</span>
                        <span>Total Owed: ${totalProgress.totalOwed.toLocaleString()}</span>
                    </div>
                </CardContent>
             </Card>

            <div className="flex justify-between items-center">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search customers..."
                        className="pl-8 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsAddCustomerOpen(true)}>
                    <PlusCircle className="mr-2"/> Add A/R Customer
                </Button>
            </div>
            <Card className="flex-grow flex flex-col">
                <CardContent className="flex-grow relative p-0">
                    <div className="absolute inset-0 overflow-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin"/></div>
                        ) : !filteredAndSortedCustomers || filteredAndSortedCustomers.length === 0 ? (
                            <p className="text-center text-muted-foreground pt-12">No A/R customers found.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                             <Button variant="ghost" onClick={() => handleSort('customerName')}>
                                                Customer <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Build Complete</TableHead>
                                        <TableHead>
                                             <Button variant="ghost" onClick={() => handleSort('currentBalance')}>
                                                Initial Balance <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>
                                            <Button variant="ghost" onClick={() => handleSort('daysSinceBuild')}>
                                                Days Since Build <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                             <Button variant="ghost" onClick={() => handleSort('lastActivity')}>
                                                Last Activity <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedCustomers.map(customer => (
                                         <ArCustomerRow 
                                            key={customer.id} 
                                            customer={customer}
                                            onSelectCustomer={setSelectedCustomer}
                                            onDeleteCustomer={handleDeleteCustomer}
                                        />
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
