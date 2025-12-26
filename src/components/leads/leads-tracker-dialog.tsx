
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
import { PlusCircle, Trash2, Loader2, Users, Edit, ArrowUpDown } from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { AddLeadDialog } from '@/components/leads/add-lead-dialog';
import type { Client, Lead } from '@/types/client';
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
import { EditLeadDialog } from './edit-lead-dialog';
import type { AccessKey } from '@/types/session';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

type LeadsTrackerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client;
    activeUser: AccessKey | null;
};

type SortKey = keyof Lead | 'createdAt';
type SortDirection = 'asc' | 'desc';

const getStepColorClass = (step?: string) => {
    if (!step) return 'bg-gray-400 text-gray-800';
    const s = step.toLowerCase();
    
    if (s.includes('initial') || s.includes('inspection') || s.includes('presentation')) {
        return 'bg-white text-gray-800 shadow-[0_0_10px_theme(colors.white)] ring-1 ring-white/50';
    }
    if (s.includes('archived')) {
        return 'bg-red-500 text-white shadow-[0_0_10px_theme(colors.red.500)] ring-1 ring-red-500/50';
    }
    if (s.includes('paid & done')) {
        return 'bg-gray-500 text-white shadow-[0_0_10px_theme(colors.gray.500)] ring-1 ring-gray-500/50';
    }
    if (s.includes('signed') || s.includes('build date') || s.includes('permit') || s.includes('in progress') || s.includes('build done')) {
        return 'bg-green-500 text-white shadow-[0_0_10px_theme(colors.green.500)] ring-1 ring-green-500/50';
    }
    return 'bg-secondary text-secondary-foreground';
};

const getIndicatorColorClass = (step?: string) => {
    if (!step) return 'bg-gray-400';
    const s = step.toLowerCase();

    if (s.includes('initial') || s.includes('inspection') || s.includes('presentation')) {
        return 'bg-white';
    }
    if (s.includes('archived')) {
        return 'bg-red-500';
    }
    if (s.includes('paid & done')) {
        return 'bg-gray-500';
    }
     if (s.includes('signed') || s.includes('build date') || s.includes('permit') || s.includes('in progress') || s.includes('build done')) {
        return 'bg-green-500';
    }
    return 'bg-gray-400';
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
        if (sortKey === 'createdAt') {
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

  const handleAddLead = (lead: Omit<Lead, 'id' | 'notes'>) => {
    if (!leadsCollectionRef) return;
    addDocumentNonBlocking(leadsCollectionRef, {...lead, createdAt: serverTimestamp()});
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
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
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
                                <TableHead className="w-4"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Contact Date</TableHead>
                                <TableHead>Current Step</TableHead>
                                <TableHead>Contract Pres.</TableHead>
                                <TableHead>Next Step Due</TableHead>
                                <TableHead>Job Type</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Revenue</TableHead>
                                <TableHead>CompanyCam</TableHead>
                                <TableHead>Pending Notes</TableHead>
                                <TableHead className="text-right sticky right-0 bg-card">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLeads.map(lead => (
                                <TableRow key={lead.id} onClick={() => setLeadForNotes(lead)} className="cursor-pointer">
                                    <TableCell>
                                        <div className={cn("w-2.5 h-2.5 rounded-full", getIndicatorColorClass(lead.currentStep))}></div>
                                    </TableCell>
                                    <TableCell className="font-medium">{lead.firstName} {lead.lastName}</TableCell>
                                    <TableCell>{lead.source}</TableCell>
                                    <TableCell>{lead.contactDate}</TableCell>
                                    <TableCell><Badge className={cn("transition-all", getStepColorClass(lead.currentStep))}>{lead.currentStep}</Badge></TableCell>
                                    <TableCell>{lead.contractPresentationDate}</TableCell>
                                    <TableCell>{lead.nextStepDueDate}</TableCell>
                                    <TableCell>{lead.jobType}</TableCell>
                                    <TableCell>{lead.phoneNumber}</TableCell>
                                    <TableCell>{lead.email}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{lead.homeAddress}</TableCell>
                                    <TableCell>{lead.projectedRevenue}</TableCell>
                                    <TableCell><Checkbox checked={lead.companyCam} disabled /></TableCell>
                                    <TableCell className="max-w-[200px] truncate">{lead.pendingNotes}</TableCell>
                                    <TableCell className="text-right space-x-1 sticky right-0 bg-card">
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
