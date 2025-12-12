
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
import { PlusCircle, Trash2, Loader2, Wrench, Activity, Edit, ArrowUpDown } from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { AddBuildDialog } from '@/components/builds/add-build-dialog';
import type { Client, Build, ActivityLogEntry } from '@/types/client';
import { BuildNotesDialog } from '@/components/builds/build-notes-dialog';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle as BuildsDialogTitle, DialogDescription } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { EditBuildDialog } from './edit-build-dialog';
import type { AccessKey } from '@/types/session';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';

type BuildsTrackerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client;
    activeUser: AccessKey | null;
};

type SortKey = keyof Build | 'createdAt' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

const ActivityLogTooltip = ({ build }: { build: Build }) => {
    if (!build.activityLog || build.activityLog.length === 0) {
        return null;
    }
    const sortedLog = [...build.activityLog].sort((a, b) => {
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

export function BuildsTrackerDialog({ open, onOpenChange, client }: BuildsTrackerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddBuildOpen, setIsAddBuildOpen] = useState(false);
  const [buildForNotes, setBuildForNotes] = useState<Build | null>(null);
  const [buildToEdit, setBuildToEdit] = useState<Build | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');


  const buildsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'builds');
  }, [firestore, client.path]);

  const { data: builds, isLoading } = useCollection<Build>(buildsCollectionRef);

  const sortedBuilds = useMemo(() => {
    if (!builds) return [];
    
    return [...builds].sort((a, b) => {
        let valA: any, valB: any;

        if (sortKey === 'lastActivity') {
            valA = a.activityLog?.[a.activityLog.length - 1]?.timestamp?.toDate() || new Date(0);
            valB = b.activityLog?.[b.activityLog.length - 1]?.timestamp?.toDate() || new Date(0);
        } else if (sortKey === 'createdAt') {
            valA = a.createdAt?.toDate() || new Date(0);
            valB = b.createdAt?.toDate() || new Date(0);
        } else {
            valA = a[sortKey as keyof Build] || '';
            valB = b[sortKey as keyof Build] || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [builds, sortKey, sortDirection]);

  const handleAddBuild = (build: Omit<Build, 'id' | 'notes' | 'activityLog'>) => {
    if (!buildsCollectionRef) return;
    addDocumentNonBlocking(buildsCollectionRef, {...build, activityLog: [], createdAt: serverTimestamp()});
    toast({ title: 'Build Added', description: `${build.buildName} has been added.` });
  };

  const handleDeleteBuild = (buildId: string) => {
    if (!buildsCollectionRef) return;
    const buildDocRef = doc(buildsCollectionRef, buildId);
    deleteDocumentNonBlocking(buildDocRef);
    toast({ title: 'Build Deleted', variant: 'destructive' });
  };
  
  const handleEditClick = (e: React.MouseEvent, build: Build) => {
    e.stopPropagation();
    setBuildToEdit(build);
  }

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
            <BuildsDialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <Wrench /> Builds Tracker
            </BuildsDialogTitle>
            <DialogDescription>
                A tool to keep track of build projects for {client.firmName}.
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
                            <SelectItem value="buildName">Build Name</SelectItem>
                            <SelectItem value="clientName">Client Name</SelectItem>
                            <SelectItem value="startDate">Start Date</SelectItem>
                            <SelectItem value="budget">Budget</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={toggleSortDirection}>
                        <ArrowUpDown className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsAddBuildOpen(true)}>
                    <PlusCircle className="mr-2"/>
                    Add Build
                  </Button>
                </div>
            </div>

            <Card className='flex-grow flex flex-col min-h-0'>
                <CardHeader>
                <CardTitle>Builds List</CardTitle>
                <CardDescription>
                    All tracked builds are listed below. Click on a row to view or edit notes.
                </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow relative">
                  <div className="absolute inset-0 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : !sortedBuilds || sortedBuilds.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                        <p>No builds found. Click "Add Build" to get started.</p>
                        </div>
                    ) : (
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Build Name</TableHead>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Project Manager</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Budget</TableHead>
                                <TableHead>CompanyCam</TableHead>
                                <TableHead>Pending Notes</TableHead>
                                <TableHead>Activity</TableHead>
                                <TableHead className="text-right sticky right-0 bg-card">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedBuilds.map(build => (
                                <TableRow key={build.id} onClick={() => setBuildForNotes(build)} className="cursor-pointer">
                                    <TableCell className="font-medium">{build.buildName}</TableCell>
                                    <TableCell>{build.clientName}</TableCell>
                                    <TableCell>{build.startDate}</TableCell>
                                    <TableCell><Badge variant="secondary">{build.status}</Badge></TableCell>
                                    <TableCell>{build.projectManager}</TableCell>
                                    <TableCell>{build.phoneNumber}</TableCell>
                                    <TableCell>{build.email}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{build.address}</TableCell>
                                    <TableCell>{build.budget}</TableCell>
                                    <TableCell><Checkbox checked={build.companyCam} disabled /></TableCell>
                                    <TableCell className="max-w-[200px] truncate">{build.pendingNotes}</TableCell>
                                    <TableCell>
                                        <ActivityLogTooltip build={build} />
                                    </TableCell>
                                    <TableCell className="text-right space-x-1 sticky right-0 bg-card">
                                        <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(e, build)}>
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
                                                    This will permanently delete the record for {build.buildName}.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteBuild(build.id)}
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
    
     <AddBuildDialog
        open={isAddBuildOpen}
        onOpenChange={setIsAddBuildOpen}
        onAddBuild={handleAddBuild}
    />

    {buildForNotes && (
        <BuildNotesDialog
            key={`notes-${buildForNotes.id}`}
            open={!!buildForNotes}
            onOpenChange={(isOpen) => !isOpen && setBuildForNotes(null)}
            build={buildForNotes}
            clientPath={client.path || null}
        />
    )}
    {buildToEdit && client.path && (
        <EditBuildDialog
            key={`edit-${buildToEdit.id}`}
            open={!!buildToEdit}
            onOpenChange={(isOpen) => !isOpen && setBuildToEdit(null)}
            build={buildToEdit}
            clientPath={client.path}
        />
    )}
    </>
  );
}
