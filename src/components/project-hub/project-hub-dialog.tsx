
'use client';

import { useState, useEffect } from 'react';
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
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { CreateProjectDialog } from '@/components/project-hub/create-project-dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';
import { BulkAddItemsDialog } from './bulk-add-items-dialog';
import type { AccessKey } from '@/types/session';

type ProjectHubDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client;
    activeUser: AccessKey | null;
};

export function ProjectHubDialog({ open, onOpenChange, client }: ProjectHubDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projectsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'projects');
  }, [firestore, client.path]);

  const projectsQuery = useMemoFirebase(() => {
    if (!projectsCollectionRef) return null;
    return query(projectsCollectionRef, orderBy('createdAt', 'desc'));
  }, [projectsCollectionRef]);

  const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsQuery);

  const itemsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path || !selectedProject) return null;
    return collection(firestore, client.path, 'projects', selectedProject.id, 'items');
  }, [firestore, client.path, selectedProject]);

  const { data: items, isLoading: areItemsLoading } = useCollection<ProjectItem>(itemsCollectionRef);

  useEffect(() => {
    if (!areProjectsLoading && projects && projects.length > 0 && !selectedProject) {
        setSelectedProject(projects[0]);
    } else if (!areProjectsLoading && (!projects || projects.length === 0)) {
        setSelectedProject(null);
    }
  }, [projects, areProjectsLoading, selectedProject]);
  
  const handleProjectSelect = (projectId: string) => {
    const project = projects?.find(p => p.id === projectId) || null;
    setSelectedProject(project);
  }

  const handleDeleteProject = (project: Project) => {
    if (!projectsCollectionRef) return;
    const projectDocRef = doc(projectsCollectionRef, project.id);
    deleteDocumentNonBlocking(projectDocRef);
    toast({ title: `Project '${project.name}' Deleted`, variant: 'destructive' });
    if (selectedProject?.id === project.id) {
        setSelectedProject(projects && projects.length > 1 ? projects[1] : null);
    }
  };
  
  const handleDeleteItem = (item: ProjectItem) => {
    if (!itemsCollectionRef) return;
    const itemDocRef = doc(itemsCollectionRef, item.id);
    deleteDocumentNonBlocking(itemDocRef);
    toast({ title: 'Item Deleted' });
  }
  
  const currentProject = selectedProject;
  const isLoading = areProjectsLoading || (selectedProject && areItemsLoading);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
            <HubDialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <Database /> Project Hub
            </HubDialogTitle>
            <DialogDescription>
                Manage your custom data projects for {client.firmName}.
            </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-8 pt-4 flex-grow min-h-0">
            <div className="flex justify-between items-center">
                <div className='flex items-center gap-4'>
                    <Select onValueChange={handleProjectSelect} value={currentProject?.id}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                            {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {currentProject && currentProject.createdAt && 'toDate' in currentProject.createdAt && <p className="text-xs text-muted-foreground mt-1">Created: {format(currentProject.createdAt.toDate(), 'PPP')}</p>}
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
                <CardHeader>
                <CardTitle>{currentProject?.name || 'No Project Selected'}</CardTitle>
                <CardDescription>
                    {currentProject ? 'All items for this project are listed below.' : 'Select a project or create a new one to get started.'}
                </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow relative">
                  <div className="absolute inset-0 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : !currentProject ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No project selected.</p>
                        </div>
                    ) : !items || items.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No items found for this project. Click "Bulk Import" to add data.</p>
                        </div>
                    ) : (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            {currentProject.columns.map(col => <TableHead key={col}>{col}</TableHead>)}
                            <TableHead className="text-right w-[50px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.id}>
                                    {currentProject.columns.map(col => <TableCell key={col}>{item.data[col]}</TableCell>)}
                                    <TableCell className="text-right space-x-1">
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
                                                    This will permanently delete this item.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteItem(item)}
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
    
     <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        collectionRef={projectsCollectionRef}
    />

    {currentProject && itemsCollectionRef &&
        <BulkAddItemsDialog
            open={isBulkAddOpen}
            onOpenChange={setIsBulkAddOpen}
            collectionRef={itemsCollectionRef}
            project={currentProject}
        />
    }
    </>
  );
}
