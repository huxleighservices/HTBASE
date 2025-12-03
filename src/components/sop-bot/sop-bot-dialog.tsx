
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '@/lib/utils';
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
  
  const conversationEndRef = useRef<HTMLDivElement>(null);

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
  
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [learnConversation, isAnswering]);

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
    setActiveTab('view');
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

  const cancelEdit = () => {
    setIsEditing(false);
    setSelectedSop(null);
    sopForm.reset();
    setActiveTab('view');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-headline tracking-tight flex items-center gap-3"><Bot /> SOP Bot</DialogTitle>
          <DialogDescription>Create, view, and ask questions about your Standard Operating Procedures.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="bg-transparent p-0 justify-start gap-2 shrink-0">
            <TabsTrigger
              value="view"
              className="rounded-full border data-[state=active]:bg-primary/10 data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <Eye className="mr-2" /> View
            </TabsTrigger>
            <TabsTrigger
              value="write"
              className="rounded-full border data-[state=active]:bg-primary/10 data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <PenSquare className="mr-2" /> {isEditing ? 'Edit' : 'Write'}
            </TabsTrigger>
            <TabsTrigger
              value="learn"
              className="rounded-full border data-[state=active]:bg-primary/10 data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <BrainCircuit className="mr-2" /> Learn
            </TabsTrigger>
          </TabsList>

          <div className="flex-grow mt-4 min-h-0">
            <TabsContent value="view" className="h-full m-0">
              <Card className="h-full flex flex-col">
                <CardHeader><CardTitle>All SOP Sections</CardTitle></CardHeader>
                <CardContent className="flex-grow overflow-y-auto min-h-0">
                  {areSopsLoading ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
                  ) : !sops || sops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 rounded-lg border-2 border-dashed">
                      <Book className="w-12 h-12 mb-4" />
                      <h3 className="font-semibold text-lg">No SOPs Found</h3>
                      <p>Go to "Write" mode to create your first SOP section.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sops.map(sop => (
                        <Card key={sop.id}>
                          <CardHeader>
                            <CardTitle className="flex justify-between items-center text-lg">
                              {sop.title}
                              <div className="space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => startEditing(sop)}><PenSquare className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>This action will permanently delete the "{sop.title}" section.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteSop(sop)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-80 rounded-md border p-4 bg-muted/20">
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

            <TabsContent value="write" className="h-full m-0">
              <Form {...sopForm}>
                <form onSubmit={sopForm.handleSubmit(isEditing ? handleUpdateSop : handleCreateSop)} className="h-full flex flex-col">
                  <Card className="flex-grow flex flex-col min-h-0">
                    <CardHeader>
                      <CardTitle>{isEditing ? `Editing: ${selectedSop?.title}` : 'Create New SOP Section'}</CardTitle>
                      <CardDescription>{isEditing ? 'Modify the details below and save your changes.' : 'Add a new titled section to your SOPs.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow flex flex-col min-h-0">
                      <FormField control={sopForm.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Title</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={sopForm.control} name="content" render={({ field }) => (
                        <FormItem className="flex-grow flex flex-col">
                          <FormLabel>Content</FormLabel>
                          <FormControl className="flex-grow">
                            <Textarea {...field} className="h-full resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="learn" className="h-full m-0">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Learn Mode</CardTitle>
                  <CardDescription>Ask the SOP Bot a question about your procedures.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto pr-4 min-h-0">
                  <div className="h-full space-y-4">
                    {learnConversation.map((msg, index) => (
                      <div key={index} className={cn("flex items-start gap-3 text-sm", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'assistant' && (
                          <Avatar className="w-8 h-8 border-2 border-primary">
                            <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("max-w-lg rounded-lg p-3", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        {msg.role === 'user' && (
                          <Avatar className="w-8 h-8 border-2 border-muted-foreground">
                            <AvatarFallback>You</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isAnswering && (
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8 border-2 border-primary">
                          <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="max-w-lg rounded-lg p-3 bg-muted flex items-center">
                          <Loader2 className="animate-spin h-5 w-5" />
                        </div>
                      </div>
                    )}
                    <div ref={conversationEndRef} />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-6">
                  <Form {...learnForm}>
                    <form onSubmit={learnForm.handleSubmit(handleAskQuestion)} className="flex items-center gap-2 w-full">
                      <FormField control={learnForm.control} name="question" render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input {...field} placeholder="e.g., What is the process for requesting time off?" disabled={isAnswering} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" disabled={isAnswering} size="icon">
                        {isAnswering ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </form>
                  </Form>
                </CardFooter>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter className="pt-4 shrink-0">
          {activeTab === 'write' && (
            <div className="flex w-full justify-between">
              {isEditing ? (
                <Button variant="secondary" onClick={cancelEdit}>Cancel Edit</Button>
              ) : <div></div>}
              <div className="flex gap-2">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button onClick={sopForm.handleSubmit(isEditing ? handleUpdateSop : handleCreateSop)}>
                  {isEditing ? 'Save Changes' : 'Create Section'}
                </Button>
              </div>
            </div>
          )}
          {(activeTab === 'view' || activeTab === 'learn') && (
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
