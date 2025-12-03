
'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import type { Client, Sop } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { Loader2, Bot, Book, PenSquare, Eye, BrainCircuit, Trash2, Send, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { answerSopQuestion } from '@/ai/flows/sop-bot-flow';

type SopBotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

const sopFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});
type SopFormValues = z.infer<typeof sopFormSchema>;

const learnFormSchema = z.object({
  question: z.string().min(1, 'Please enter a question.'),
});
type LearnFormValues = z.infer<typeof learnFormSchema>;

export function SopBotDialog({ open, onOpenChange, client }: SopBotDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState('view');
  const [selectedSop, setSelectedSop] = useState<Sop | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [isAnswering, setIsAnswering] = useState(false);
  const [learnConversation, setLearnConversation] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  const sopsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'sops');
  }, [firestore, client.path]);

  const { data: sops, isLoading: areSopsLoading } = useCollection<Sop>(sopsCollectionRef);

  const sopForm = useForm<SopFormValues>({
    resolver: zodResolver(sopFormSchema),
    defaultValues: { title: '', content: '' },
  });

  const learnForm = useForm<LearnFormValues>({
    resolver: zodResolver(learnFormSchema),
    defaultValues: { question: '' },
  });

  const handleCreateSop: SubmitHandler<SopFormValues> = (data) => {
    if (!sopsCollectionRef) return;
    addDocumentNonBlocking(sopsCollectionRef, { ...data, createdAt: serverTimestamp() });
    toast({ title: 'SOP Section Created', description: `"${data.title}" has been added.` });
    sopForm.reset();
    setActiveTab('view');
  };

  const handleUpdateSop: SubmitHandler<SopFormValues> = (data) => {
    if (!sopsCollectionRef || !selectedSop) return;
    const sopDocRef = doc(sopsCollectionRef, selectedSop.id);
    updateDocumentNonBlocking(sopDocRef, data);
    toast({ title: 'SOP Section Updated', description: `"${data.title}" has been saved.` });
    setSelectedSop(null);
    setIsEditing(false);
    sopForm.reset();
  };

  const handleDeleteSop = (sop: Sop) => {
    if (!sopsCollectionRef) return;
    const sopDocRef = doc(sopsCollectionRef, sop.id);
    deleteDocumentNonBlocking(sopDocRef);
    toast({ title: 'SOP Section Deleted', variant: 'destructive' });
    if (selectedSop?.id === sop.id) {
      setSelectedSop(null);
      setIsEditing(false);
    }
  };
  
  const handleAskQuestion: SubmitHandler<LearnFormValues> = async (data) => {
    if (!sops || sops.length === 0) {
        toast({ title: "No SOPs found", description: "Please add SOPs in Write mode before asking questions.", variant: "destructive" });
        return;
    }
    
    setIsAnswering(true);
    setLearnConversation(prev => [...prev, { role: 'user', text: data.question }]);

    const sopContent = sops.map(sop => `## ${sop.title}\n\n${sop.content}`).join('\n\n---\n\n');

    try {
        const result = await answerSopQuestion({ question: data.question, sopContent });
        setLearnConversation(prev => [...prev, { role: 'assistant', text: result.answer }]);
        learnForm.reset();
    } catch(error: any) {
        toast({ title: 'Error', description: error.message || "Could not get an answer.", variant: 'destructive' });
        setLearnConversation(prev => prev.slice(0, -1)); // Remove the user's question if it failed
    } finally {
        setIsAnswering(false);
    }
  };

  const startEditing = (sop: Sop) => {
    setSelectedSop(sop);
    sopForm.reset(sop);
    setIsEditing(true);
    setActiveTab('write');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-headline tracking-tight flex items-center gap-3"><Bot /> SOP Bot</DialogTitle>
          <DialogDescription>Create, view, and ask questions about your Standard Operating Procedures.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view"><Eye className="mr-2" /> View</TabsTrigger>
            <TabsTrigger value="write"><PenSquare className="mr-2" /> {isEditing ? 'Edit' : 'Write'}</TabsTrigger>
            <TabsTrigger value="learn"><BrainCircuit className="mr-2" /> Learn</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="flex-grow mt-4 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader><CardTitle>All SOP Sections</CardTitle></CardHeader>
              <CardContent className="flex-grow overflow-y-auto">
                {areSopsLoading ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
                ) : !sops || sops.length === 0 ? (
                    <p className="text-muted-foreground text-center">No SOPs found. Go to "Write" mode to create one.</p>
                ) : (
                    <div className="space-y-4">
                        {sops.map(sop => (
                            <Card key={sop.id}>
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        {sop.title}
                                        <div className="space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => startEditing(sop)}><PenSquare className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSop(sop)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-40 rounded-md border p-4 bg-muted/20">
                                        <p className="whitespace-pre-wrap text-sm">{sop.content}</p>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="write" className="flex-grow mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>{isEditing ? `Editing: ${selectedSop?.title}` : 'Create New SOP Section'}</CardTitle>
                    <CardDescription>{isEditing ? 'Modify the details below and save your changes.' : 'Add a new titled section to your SOPs.'}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...sopForm}>
                        <form onSubmit={sopForm.handleSubmit(isEditing ? handleUpdateSop : handleCreateSop)} className="space-y-4">
                            <FormField control={sopForm.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Section Title</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={sopForm.control} name="content" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content</FormLabel>
                                    <FormControl><Textarea {...field} rows={12} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex justify-end gap-2">
                                {isEditing && <Button type="button" variant="ghost" onClick={() => {setIsEditing(false); setSelectedSop(null); sopForm.reset(); setActiveTab('view'); }}>Cancel Edit</Button>}
                                <Button type="submit">{isEditing ? 'Save Changes' : 'Create Section'}</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="learn" className="flex-grow mt-4 flex flex-col h-full overflow-hidden">
             <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Learn Mode</CardTitle>
                    <CardDescription>Ask the SOP Bot a question about your procedures.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                    <div className="space-y-4">
                        {learnConversation.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'assistant' && <div className="p-2 rounded-full bg-primary/20 text-primary"><Bot className="h-5 w-5" /></div>}
                                <div className={`max-w-lg rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                         {isAnswering && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-full bg-primary/20 text-primary"><Bot className="h-5 w-5" /></div>
                                <div className="max-w-lg rounded-lg p-3 bg-muted flex items-center">
                                    <Loader2 className="animate-spin h-5 w-5"/>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardContent className="border-t pt-6">
                    <Form {...learnForm}>
                        <form onSubmit={learnForm.handleSubmit(handleAskQuestion)} className="flex items-center gap-2">
                            <FormField control={learnForm.control} name="question" render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input {...field} placeholder="e.g., What is the process for requesting time off?" disabled={isAnswering} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" disabled={isAnswering}>
                                {isAnswering ? <Loader2 className="animate-spin" /> : <Send />}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
