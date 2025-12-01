
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
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import type { Client, Asset, TimePunch } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';

type TimePunchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
  asset: Asset | undefined;
};

export function TimePunchDialog({ open, onOpenChange, client, activeUser, asset }: TimePunchDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPunching, setIsPunching] = useState(false);
  const [isPunchOutConfirmOpen, setIsPunchOutConfirmOpen] = useState(false);
  const [punchOutDescription, setPunchOutDescription] = useState('');

  const timePunchesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path || !asset) return null;
    return collection(firestore, client.path, 'assets', asset.id, 'timePunches');
  }, [firestore, client.path, asset]);

  const userPunchesQuery = useMemoFirebase(() => {
    if (!timePunchesCollectionRef || !activeUser) return null;
    return query(
        timePunchesCollectionRef, 
        where('accessKeyUsername', '==', activeUser.username),
        orderBy('timestamp', 'desc')
    );
  }, [timePunchesCollectionRef, activeUser]);
  
  const latestPunchQuery = useMemoFirebase(() => {
    if (!userPunchesQuery) return null;
    return query(userPunchesQuery, limit(1));
  }, [userPunchesQuery]);
  
  const { data: latestPunch, isLoading: isLatestPunchLoading } = useCollection<TimePunch>(latestPunchQuery);
  const { data: userPunches, isLoading: arePunchesLoading } = useCollection<TimePunch>(userPunchesQuery);

  const currentStatus = latestPunch?.[0]?.type === 'punch-in' ? 'in' : 'out';
  const isLoading = isLatestPunchLoading || arePunchesLoading;

  const handlePunchIn = async () => {
    if (!timePunchesCollectionRef || !activeUser) return;
    setIsPunching(true);

    const punchData: Omit<TimePunch, 'id'> = {
      accessKeyUsername: activeUser.username,
      timestamp: serverTimestamp(),
      type: 'punch-in',
    };

    addDocumentNonBlocking(timePunchesCollectionRef, punchData);

    setTimeout(() => {
        toast({ title: 'Punched In', description: 'Your time has started.' });
        setIsPunching(false);
    }, 500);
  };
  
  const handlePunchOut = async () => {
    if (!timePunchesCollectionRef || !activeUser || !punchOutDescription.trim()) {
        toast({ title: "Description Required", description: "Please describe what you worked on.", variant: "destructive" });
        return;
    };
    setIsPunching(true);
    setIsPunchOutConfirmOpen(false);

    const punchData: Omit<TimePunch, 'id'> = {
      accessKeyUsername: activeUser.username,
      timestamp: serverTimestamp(),
      type: 'punch-out',
      description: punchOutDescription.trim(),
    };
    
    addDocumentNonBlocking(timePunchesCollectionRef, punchData);

    setTimeout(() => {
        toast({ title: 'Punched Out', description: 'Your time has been logged.' });
        setIsPunching(false);
        setPunchOutDescription('');
    }, 500);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
            {asset?.title || 'Time Punch'}
          </DialogTitle>
          <DialogDescription>
            Clock in and out to track your work hours.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-6 flex-grow min-h-0">
            {/* Left Column: Actions */}
            <div className="md:col-span-1 space-y-4">
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        {isLoading ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                            <>
                                <Button 
                                    size="lg" 
                                    className="w-full"
                                    onClick={handlePunchIn}
                                    disabled={isPunching || currentStatus === 'in'}
                                >
                                    {isPunching && currentStatus === 'out' ? <Loader2 className="mr-2 animate-spin"/> : <LogIn className="mr-2" />}
                                    Punch In
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="destructive" 
                                    className="w-full"
                                    onClick={() => setIsPunchOutConfirmOpen(true)}
                                    disabled={isPunching || currentStatus === 'out'}
                                >
                                     {isPunching && currentStatus === 'in' ? <Loader2 className="mr-2 animate-spin"/> : <LogOut className="mr-2" />}
                                    Punch Out
                                </Button>
                            </>
                        )}
                         <Badge variant={currentStatus === 'in' ? 'default' : 'secondary'} className="capitalize bg-green-500 text-white">
                           Currently Punched: {currentStatus}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: History */}
            <div className="md:col-span-2 flex flex-col min-h-0">
                 <h3 className="font-semibold mb-2">Punch History</h3>
                 <Card className="flex-grow">
                    <CardContent className="p-0 h-full">
                        <div className="h-full overflow-y-auto">
                            {arePunchesLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : !userPunches || userPunches.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <p>No punch history found.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Description</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userPunches.map(punch => (
                                            <TableRow key={punch.id}>
                                                <TableCell>
                                                    <Badge variant={punch.type === 'punch-in' ? 'default' : 'secondary'} className={punch.type === 'punch-in' ? 'bg-green-500' : ''}>
                                                        {punch.type === 'punch-in' ? 'In' : 'Out'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {punch.timestamp?.toDate ? format(punch.timestamp.toDate(), 'Pp') : '...'}
                                                </TableCell>
                                                <TableCell className='max-w-xs whitespace-pre-wrap'>{punch.description || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                 </Card>
            </div>

        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

     <AlertDialog open={isPunchOutConfirmOpen} onOpenChange={setIsPunchOutConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Punch Out Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
                Please provide a brief description of the work you completed during this session.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea 
                placeholder="e.g., Completed Chapter 3 of training, worked on client follow-ups..."
                value={punchOutDescription}
                onChange={(e) => setPunchOutDescription(e.target.value)}
            />
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePunchOut} disabled={!punchOutDescription.trim()}>
                Confirm Punch Out
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
