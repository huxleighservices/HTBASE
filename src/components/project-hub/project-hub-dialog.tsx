
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
import { PlusCircle, Trash2, Loader2, Database, Upload } from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Client, Project, ProjectItem } from '@/types/client';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle as HubDialogTitle, DialogDescription } from '../ui/dialog';
import type { AccessKey } from '@/types/session';
import { CreateProjectDialog } from './create-project-dialog';
import { BulkAddItemsDialog } from './bulk-add-items-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';

type ProjectHubDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client;
    activeUser: AccessKey | null;
};

export function ProjectHubDialog({ open, onOpenChange, client, activeUser }: ProjectHubDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projectsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'projects');
  }, [firestore, client.path]);

  const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsCollectionRef);

  const itemsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path || !selectedProject) return null;
    return collection(firestore, client.path, 'projects', selectedProject.id, 'items');
  }, [firestore, client.path, selectedProject]);

  const { data: items, isLoading: areItemsLoading } = useCollection<ProjectItem>(itemsCollectionRef);
  
  const sortedProjects = projects?.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  const currentProject = selectedProject || sortedProjects?.[0];
  
  const handleSelectProject = (projectId: string) => {
    const project = projects?.find(p => p.id === projectId);
    setSelectedProject(project || null);
  }

  const handleDeleteProject = (projectId: string) => {
    if (!projectsCollectionRef) return;
    // NOTE: This does not delete subcollections. For a production app, a Cloud Function would be needed.
    const projectDocRef = doc(projectsCollectionRef, projectId);
    deleteDocumentNonBlocking(projectDocRef);
    toast({ title: 'Project Deleted', variant: 'destructive' });
    if(selectedProject?.id === projectId) {
        setSelectedProject(null);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
            <HubDialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <Database /> Project Hub
            </HubDialogTitle>
            <DialogDescription>
                Manage projects, custom data, and bulk imports for {client.firmName}.
            </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-8 pt-4 flex-grow min-h-0">
            <div className="flex justify-between items-center">
                <div className="w-72">
                    <Select onValueChange={handleSelectProject} value={currentProject?.id}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                            {areProjectsLoading && <div className="p-2">Loading...</div>}
                            {sortedProjects?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {currentProject && <p className="text-xs text-muted-foreground mt-1">Created: {format(currentProject.createdAt.toDate(), 'PPP')}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsBulkAddOpen(true)} disabled={!currentProject || !itemsCollectionRef}>
                    <Upload className="mr-2"/>
                    Bulk Import
                  </Button>
                  <Button onClick={() => setIsCreateProjectOpen(true)}>
                    <PlusCircle className="mr-2"/>
                    New Project
                  </Button>
                </div>
            </div>

            <Card className='flex-grow flex flex-col min-h-0'>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>{currentProject?.name || "No Project Selected"}</CardTitle>
                        <CardDescription>
                            {currentProject ? `${items?.length || 0} items found.` : "Select or create a project to get started."}
                        </CardDescription>
                    </div>
                    {currentProject && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2"/>
                                    Delete Project
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the project "{currentProject.name}" and all its data. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleDeleteProject(currentProject.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardHeader>
                <CardContent className="flex-grow relative">
                  <div className="absolute inset-0 overflow-auto">
                    {(areProjectsLoading || areItemsLoading) ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : !currentProject ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No project selected. Select one from the dropdown or create a new one.</p>
                        </div>
                    ) : !items || items.length === 0 ? (
                         <div className="text-center py-12 text-muted-foreground">
                            <p>No items in this project. Use "Bulk Import" to add data.</p>
                        </div>
                    ) : (
                        <Table>
                        <TableHeader>
                            <TableRow>
                                {currentProject.headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.id}>
                                    {currentProject.headers.map(header => <TableCell key={header}>{item.data[header] || ''}</TableCell>)}
                                    <TableCell className="text-right">
                                        {/* Actions like edit/delete item would go here */}
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
    
    <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        client={client}
    />
    
    {projectsCollectionRef && currentProject && itemsCollectionRef &&(
        <BulkAddItemsDialog
            open={isBulkAddOpen}
            onOpenChange={setIsBulkAddOpen}
            project={currentProject}
            itemsCollectionRef={itemsCollectionRef}
        />
    )}
    </>
  );
}
