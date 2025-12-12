
'use client';

import { useState, useMemo } from 'react';
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
import { PlusCircle, Trash2, Loader2, Users, Activity, Edit, ArrowUpDown } from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { AddLeadDialog } from '@/components/leads/add-lead-dialog';
import type { Client, Lead, ActivityLogEntry } from '@/types/client';
import { LeadNotesDialog } from '@/components/leads/lead-notes-dialog';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle as LeadsDialogTitle, DialogDescription } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { EditLeadDialog } from './edit-lead-dialog';
import type { AccessKey } from '@/types/session';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type LeadsTrackerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client;
    activeUser: AccessKey | null;
};

type SortKey = keyof Lead | 'createdAt' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

const ActivityLogTooltip = ({ lead }: { lead: Lead }) => {
    if (!lead.activityLog || lead.activityLog.length === 0) {
        return null;
    }
    const sortedLog = [...lead.activityLog].sort((a, b) => {
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

export function LeadsTrackerDialog({ open, onOpenChange, client }: LeadsTrackerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [leadForNotes, setLeadForNotes] = useState<Lead | null>(null);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');


  const leadsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'leads');
  }, [firestore, client.path]);

  const { data: leads, isLoading } = useCollection<Lead>(leadsCollectionRef);

  const sortedLeads = useMemo(() => {
    if (!leads) return [];
    
    return [...leads].sort((a, b) => {
        let valA: any, valB: any;

        if (sortKey === 'lastActivity') {
            valA = a.activityLog?.[a.activityLog.length - 1]?.timestamp?.toDate() || new Date(0);
            valB = b.activityLog?.[b.activityLog.length - 1]?.timestamp?.toDate() || new Date(0);
        } else if (sortKey === 'createdAt') {
            valA = a.createdAt?.toDate() || new Date(0);
            valB = b.createdAt?.toDate() || new Date(0);
        } else {
            valA = a[sortKey as keyof Lead] || '';
            valB = b[sortKey as keyof Lead] || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [leads, sortKey, sortDirection]);

  const handleAddLead = (lead: Omit<Lead, 'id' | 'notes' | 'activityLog'>) => {
    if (!leadsCollectionRef) return;
    addDocumentNonBlocking(leadsCollectionRef, {...lead, activityLog: [], createdAt: serverTimestamp()});
    toast({ title: 'Lead Added', description: `${lead.firstName} ${lead.lastName} has been added.` });
  };

  const handleDeleteLead = (leadId: string) => {
    if (!leadsCollectionRef) return;
    const leadDocRef = doc(leadsCollectionRef, leadId);
    deleteDocumentNonBlocking(leadDocRef);
    toast({ title: 'Lead Deleted', variant: 'destructive' });
  };
  
  const handleEditClick = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setLeadToEdit(lead);
  }

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
            <LeadsDialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <Users /> Leads Tracker
            </LeadsDialogTitle>
            <DialogDescription>
                A tool to keep track of leads for {client.firmName}.
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
                            <SelectItem value="source">Source</SelectItem>
                            <SelectItem value="contactDate">Contact Date</SelectItem>
                            <SelectItem value="projectedRevenue">Projected Revenue</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={toggleSortDirection}>
                        <ArrowUpDown className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsAddLeadOpen(true)}>
                    <PlusCircle className="mr-2"/>
                    Add Lead
                  </Button>
                </div>
            </div>

            <Card className='flex-grow flex flex-col min-h-0'>
                <CardHeader>
                <CardTitle>Lead List</CardTitle>
                <CardDescription>
                    All tracked leads are listed below. Click on a row to view or edit notes.
                </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow relative">
                  <div className="absolute inset-0 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : !sortedLeads || sortedLeads.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                        <p>No leads found. Click "Add Lead" to get started.</p>
                        </div>
                    ) : (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Contact Date</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Projected Revenue</TableHead>
                            <TableHead>Activity</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLeads.map(lead => (
                                <TableRow key={lead.id} onClick={() => setLeadForNotes(lead)} className="cursor-pointer">
                                    <TableCell className="font-medium">{lead.firstName} {lead.lastName}</TableCell>
                                    <TableCell>{lead.source}</TableCell>
                                    <TableCell>{lead.contactDate}</TableCell>
                                    <TableCell>{lead.phoneNumber}</TableCell>
                                    <TableCell>{lead.email}</TableCell>
                                    <TableCell>{lead.projectedRevenue}</TableCell>
                                    <TableCell>
                                        <ActivityLogTooltip lead={lead} />
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(e, lead)}>
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
                                                    This will permanently delete the record for {lead.firstName} {lead.lastName}.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteLead(lead.id)}
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
    
     <AddLeadDialog
        open={isAddLeadOpen}
        onOpenChange={setIsAddLeadOpen}
        onAddLead={handleAddLead}
    />

    {leadForNotes && (
        <LeadNotesDialog
            key={`notes-${leadForNotes.id}`}
            open={!!leadForNotes}
            onOpenChange={(isOpen) => !isOpen && setLeadForNotes(null)}
            lead={leadForNotes}
            clientPath={client.path || null}
        />
    )}
    {leadToEdit && client.path && (
        <EditLeadDialog
            key={`edit-${leadToEdit.id}`}
            open={!!leadToEdit}
            onOpenChange={(isOpen) => !isOpen && setLeadToEdit(null)}
            lead={leadToEdit}
            clientPath={client.path}
        />
    )}
    </>
  );
}
