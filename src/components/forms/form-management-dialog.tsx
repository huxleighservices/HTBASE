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
import { PlusCircle, Trash2, Loader2, FileSignature, Link, Clipboard, ClipboardCheck } from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { CreateFormDialog } from '@/components/forms/create-form-dialog';
import type { Client, Form, Lead } from '@/types/client';
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
import { format } from 'date-fns';
import type { AccessKey } from '@/types/session';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ViewSubmissionsDialog } from './view-submissions-dialog';

type FormManagementDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client;
    activeUser: AccessKey | null;
};

const FormLink = ({ formId }: { formId: string }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    
    // This assumes the base URL is the current window location's origin
    const formUrl = `${window.location.origin}/forms/${formId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(formUrl).then(() => {
            setIsCopied(true);
            toast({ title: 'Link Copied!', description: 'The public form link has been copied to your clipboard.' });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <Button variant="outline" size="sm" onClick={handleCopy}>
            {isCopied ? <ClipboardCheck className="mr-2" /> : <Clipboard className="mr-2" />}
            {isCopied ? 'Copied' : 'Copy Link'}
        </Button>
    );
};

export function FormManagementDialog({ open, onOpenChange, client, activeUser }: FormManagementDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  const formsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'forms');
  }, [firestore, client.path]);

  const formsQuery = useMemoFirebase(() => {
    if (!formsCollectionRef) return null;
    return query(formsCollectionRef, orderBy('createdAt', 'desc'));
  }, [formsCollectionRef]);

  const { data: forms, isLoading: areFormsLoading } = useCollection<Form>(formsQuery);
  
  const leadsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'leads');
  }, [firestore, client.path]);

  const { data: allLeads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsCollectionRef);

  const isLoading = areFormsLoading || areLeadsLoading;

  const handleDeleteForm = (form: Form) => {
    if (!formsCollectionRef) return;
    const formDocRef = doc(formsCollectionRef, form.id);
    deleteDocumentNonBlocking(formDocRef);
    toast({ title: `Form '${form.title}' Deleted`, variant: 'destructive' });
  };
  
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
            <HubDialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <FileSignature /> Form Management
            </HubDialogTitle>
            <DialogDescription>
                Create and manage public-facing forms for {client.firmName}.
            </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manager" className="flex-grow flex flex-col min-h-0">
          <div className="flex justify-between items-center pb-4">
              <TabsList>
                  <TabsTrigger value="manager">Form Manager</TabsTrigger>
                  <TabsTrigger value="viewer">Entry Viewer</TabsTrigger>
              </TabsList>
              <Button onClick={() => setIsCreateFormOpen(true)}>
                  <PlusCircle className="mr-2"/>
                  New Form
              </Button>
          </div>
          <TabsContent value="manager" className="flex-grow m-0">
            <Card className='h-full flex flex-col min-h-0'>
                <CardHeader>
                    <CardTitle>Your Forms</CardTitle>
                    <CardDescription>
                        All available forms are listed below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow relative">
                  <div className="absolute inset-0 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : !forms || forms.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No forms created yet. Click "New Form" to get started.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Fields</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forms.map(form => (
                                    <TableRow key={form.id}>
                                        <TableCell className="font-medium">{form.title}</TableCell>
                                        <TableCell>
                                            {form.createdAt?.toDate ? format(form.createdAt.toDate(), 'PPP') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate">{form.fields.join(', ')}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <FormLink formId={form.id} />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the form "{form.title}" and all its submissions.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteForm(form)}
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
          </TabsContent>
          <TabsContent value="viewer" className="flex-grow m-0">
            <ViewSubmissionsDialog 
                clientPath={client.path || null} 
                forms={forms || []} 
                isLoading={isLoading} 
                activeUser={activeUser}
                allLeads={allLeads}
                leadsCollectionRef={leadsCollectionRef}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    
     <CreateFormDialog
        open={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
        collectionRef={formsCollectionRef}
    />
    </>
  );
}
