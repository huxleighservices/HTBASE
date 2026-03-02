
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
  } from "@/components/ui/alert-dialog"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, orderBy, query, CollectionReference, doc, arrayUnion } from 'firebase/firestore';
import type { ARCustomer, ARPayment, ARPenalty, ARActivityLog } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, PlusCircle, MinusCircle, Phone, Mail, MessageSquare, MenuSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ManageArCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: ARCustomer;
  clientPath: string;
  activeUser: AccessKey | null;
  arCustomersCollectionRef: CollectionReference | null;
};

export function ManageArCustomerDialog({ open, onOpenChange, customer, clientPath, activeUser, arCustomersCollectionRef }: ManageArCustomerDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [activityType, setActivityType] = useState<'Phone Call' | 'Email' | 'Text Message' | 'Other'>('Phone Call');
  const [activityNote, setActivityNote] = useState('');

  const paymentsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !arCustomersCollectionRef) return null;
    return collection(arCustomersCollectionRef, customer.id, 'payments');
  }, [firestore, arCustomersCollectionRef, customer.id]);
  
  const penaltiesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !arCustomersCollectionRef) return null;
    return collection(arCustomersCollectionRef, customer.id, 'penalties');
  }, [firestore, arCustomersCollectionRef, customer.id]);
  

  const { data: payments, isLoading: arePaymentsLoading } = useCollection<ARPayment>(paymentsCollectionRef);
  const { data: penalties, isLoading: arePenaltiesLoading } = useCollection<ARPenalty>(penaltiesCollectionRef);
  
  const activityLog = useMemo(() => {
    if (!customer.activityLog) return [];
    return [...customer.activityLog].sort((a, b) => {
        const dateA = a.date ? (a.date as any).toDate ? (a.date as any).toDate().getTime() : new Date(a.date as any).getTime() : 0;
        const dateB = b.date ? (b.date as any).toDate ? (b.date as any).toDate().getTime() : new Date(b.date as any).getTime() : 0;
        return dateB - dateA;
    });
  }, [customer.activityLog]);

  const totalPaid = useMemo(() => payments?.reduce((acc, p) => acc + p.amount, 0) || 0, [payments]);
  const totalPenalties = useMemo(() => penalties?.reduce((acc, p) => acc + p.amount, 0) || 0, [penalties]);
  const initialBalance = customer.initialBalance;
  const totalOwed = initialBalance + totalPenalties;
  const currentBalance = totalOwed - totalPaid;
  const progress = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;
  
  const isLoading = arePaymentsLoading || arePenaltiesLoading;

  const handleAddPayment = () => {
    if (!paymentsCollectionRef || paymentAmount <= 0) return;
    addDocumentNonBlocking(paymentsCollectionRef, {
        amount: paymentAmount,
        date: serverTimestamp(),
        user: activeUser?.displayName || 'Unknown'
    });
    toast({ title: 'Payment Added' });
    setPaymentAmount(0);
  };
  
  const handleAddPenalty = () => {
    if (!penaltiesCollectionRef || penaltyAmount <= 0 || !penaltyReason.trim()) return;
    addDocumentNonBlocking(penaltiesCollectionRef, {
        amount: penaltyAmount,
        reason: penaltyReason,
        date: serverTimestamp(),
        user: activeUser?.displayName || 'Unknown'
    });
    toast({ title: 'Penalty Added' });
    setPenaltyAmount(0);
    setPenaltyReason('');
  };
  
  const handleLogActivity = () => {
    if (!arCustomersCollectionRef || !activityNote.trim()) return;
    const customerDocRef = doc(arCustomersCollectionRef, customer.id);
    
    const newActivity = {
        type: activityType,
        note: activityNote,
        date: new Date(),
        user: activeUser?.displayName || 'Unknown'
    };

    updateDocumentNonBlocking(customerDocRef, {
        activityLog: arrayUnion(newActivity),
        lastActivity: serverTimestamp(),
    });

    toast({ title: 'Activity Logged' });
    setActivityNote('');
  };

  const daysSinceCompletion = customer.buildCompleteDate?.toDate ? formatDistanceToNow(customer.buildCompleteDate.toDate(), { addSuffix: true }) : 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage A/R for {customer.customerName}</DialogTitle>
          <DialogDescription>Build completed {daysSinceCompletion}.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow grid md:grid-cols-2 gap-6 min-h-0 py-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Balance</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                <span>${totalPaid.toLocaleString()} Paid</span>
                                <span>Total Owed: ${totalOwed.toLocaleString()}</span>
                            </div>
                            <Progress value={progress} className={progress >= 100 ? 'bg-green-500' : ''}/>
                            <p className="text-right font-bold text-lg mt-2">Balance Due: ${currentBalance.toLocaleString()}</p>
                        </div>
                         {progress >= 100 && <p className="text-center text-green-500 font-bold">Paid in Full!</p>}
                    </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle>Add Payment</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                             <Label htmlFor="payment-amount">Amount</Label>
                             <Input id="payment-amount" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value))} />
                             <Button className="w-full" onClick={handleAddPayment} disabled={paymentAmount <= 0}><PlusCircle className="mr-2"/>Add Payment</Button>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Add Penalty</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                             <Label htmlFor="penalty-amount">Amount</Label>
                             <Input id="penalty-amount" type="number" value={penaltyAmount} onChange={(e) => setPenaltyAmount(parseFloat(e.target.value))} />
                              <Label htmlFor="penalty-reason">Reason</Label>
                             <Input id="penalty-reason" value={penaltyReason} onChange={(e) => setPenaltyReason(e.target.value)} />
                             <Button variant="destructive" className="w-full" onClick={handleAddPenalty} disabled={penaltyAmount <= 0 || !penaltyReason.trim()}><MinusCircle className="mr-2"/>Add Penalty</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className="flex flex-col gap-4 min-h-0">
                <Card className="flex-grow flex flex-col min-h-0">
                    <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
                    <CardContent className="flex-grow overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
                        ) : !activityLog || activityLog.length === 0 ? (
                            <p className="text-center text-muted-foreground pt-8">No activity yet.</p>
                        ) : (
                            <ul className="space-y-4">
                                {activityLog.map((log, index) => {
                                    const logDate = log.date ? ((log.date as any).toDate ? (log.date as any).toDate() : new Date(log.date as any)) : null;
                                    return (
                                    <li key={index} className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            {log.type === 'Phone Call' && <Phone className="h-4 w-4 text-muted-foreground"/>}
                                            {log.type === 'Email' && <Mail className="h-4 w-4 text-muted-foreground"/>}
                                            {log.type === 'Text Message' && <MessageSquare className="h-4 w-4 text-muted-foreground"/>}
                                            {log.type === 'Other' && <MenuSquare className="h-4 w-4 text-muted-foreground"/>}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm font-medium">{log.note}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.user} - {logDate && !isNaN(logDate.getTime()) ? formatDistanceToNow(logDate, { addSuffix: true }) : '...'}
                                            </p>
                                        </div>
                                    </li>
                                )})}
                            </ul>
                        )}
                    </CardContent>
                </Card>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Phone Call">Phone Call</SelectItem>
                                <SelectItem value="Email">Email</SelectItem>
                                <SelectItem value="Text Message">Text Message</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea 
                            placeholder={`Add a note for ${activityType}...`} 
                            value={activityNote}
                            onChange={(e) => setActivityNote(e.target.value)}
                            rows={1}
                        />
                    </div>
                     <Button className="w-full" onClick={handleLogActivity} disabled={!activityNote.trim()}>Log Activity</Button>
                </div>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
