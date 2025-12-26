'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Trash2, Send } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import type { Form, FormSubmission, Lead } from '@/types/client';
import { format } from 'date-fns';
import { Button } from '../ui/button';
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
import { useToast } from '@/hooks/use-toast';

type ViewSubmissionsDialogProps = {
  clientPath: string | null;
  forms: Form[];
  isLoading: boolean;
};

export function ViewSubmissionsDialog({ clientPath, forms, isLoading }: ViewSubmissionsDialogProps) {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const selectedForm = useMemo(() => forms.find(f => f.id === selectedFormId), [forms, selectedFormId]);

  const submissionsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !clientPath || !selectedFormId) return null;
    return collection(firestore, clientPath, 'forms', selectedFormId, 'submissions');
  }, [firestore, clientPath, selectedFormId]);

  const submissionsQuery = useMemoFirebase(() => {
    if (!submissionsCollectionRef) return null;
    return query(submissionsCollectionRef, orderBy('createdAt', 'desc'));
  }, [submissionsCollectionRef]);

  const { data: submissions, isLoading: areSubmissionsLoading } = useCollection<FormSubmission>(submissionsQuery);
  
  const handleDeleteSubmission = (submissionId: string) => {
    if (!submissionsCollectionRef) return;
    const submissionDocRef = doc(submissionsCollectionRef, submissionId);
    deleteDocumentNonBlocking(submissionDocRef);
    toast({ title: 'Submission Deleted', variant: 'destructive' });
  };
  
  const handleSendToLeads = (submission: FormSubmission) => {
    if (!firestore || !clientPath) return;

    const leadsCollectionRef = collection(firestore, clientPath, 'leads');
    
    const newLead: Omit<Lead, 'id' | 'notes' | 'activityLog' | 'createdAt'> = {
        firstName: submission.data['First Name'] || '',
        lastName: submission.data['Last Name'] || '',
        source: submission.data['How did you hear bout us?'] || '',
        phoneNumber: submission.data['Phone number'] || '',
        email: submission.data['Email'] || '',
        jobType: submission.data['What are we fixing?'] || '',
        homeAddress: submission.data['Address'] || '',
        currentStep: 'Initial Contact', // Default value
    };

    addDocumentNonBlocking(leadsCollectionRef, {...newLead, activityLog: [], createdAt: serverTimestamp()});

    // Mark the submission as sent
    if (submissionsCollectionRef) {
        const submissionDocRef = doc(submissionsCollectionRef, submission.id);
        updateDocumentNonBlocking(submissionDocRef, { sentToLeads: true });
    }

    toast({
        title: 'Lead Created',
        description: `A new lead has been created for ${newLead.firstName} ${newLead.lastName}.`
    });
  };

  return (
    <Card className='h-full flex flex-col min-h-0'>
      <CardHeader>
        <CardTitle>View Form Entries</CardTitle>
        <CardDescription>Select a form to view its submissions.</CardDescription>
        <Select onValueChange={setSelectedFormId} disabled={isLoading || forms.length === 0}>
          <SelectTrigger className="w-[300px] mt-2">
            <SelectValue placeholder="Select a form..." />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="loading" disabled>Loading forms...</SelectItem>
            ) : (
              forms.map(form => (
                <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-grow relative">
        <div className="absolute inset-0 overflow-auto">
          {areSubmissionsLoading ? (
            <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : !selectedFormId ? (
            <div className="text-center py-12 text-muted-foreground"><p>Please select a form to view entries.</p></div>
          ) : !submissions || submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><p>No entries found for this form yet.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted On</TableHead>
                  {selectedForm?.fields.map(field => <TableHead key={field}>{field}</TableHead>)}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map(submission => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {submission.createdAt?.toDate ? format(submission.createdAt.toDate(), 'Pp') : 'N/A'}
                    </TableCell>
                    {selectedForm?.fields.map(field => (
                      <TableCell key={field}>{submission.data[field] || 'N/A'}</TableCell>
                    ))}
                    <TableCell className="text-right space-x-1">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendToLeads(submission)}
                            disabled={submission.data.sentToLeads === true}
                        >
                           <Send className="mr-2 h-4 w-4"/>
                           {submission.data.sentToLeads ? 'Sent' : 'Send to Leads'}
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
                                    <AlertDialogDescription>
                                        This will permanently delete this submission.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDeleteSubmission(submission.id)}
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
  );
}
