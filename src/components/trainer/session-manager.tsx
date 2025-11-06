
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BookUser, Loader2, ThumbsUp, Lightbulb, Bot, User, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { TrainingResult } from '@/types/sessions';
import { collection, query, orderBy, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { BrandCustomization } from '@/types/client';

export function SessionManager({ clientPath, customization, activeSessionId }: { clientPath: string | null; customization: BrandCustomization | null; activeSessionId: string | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const resultsDocRef = useMemoFirebase(() => {
    if (!firestore || !clientPath || !activeSessionId) return null;
    return doc(firestore, clientPath, 'sessions', activeSessionId);
  }, [firestore, clientPath, activeSessionId]);

  const { data: resultsDoc, isLoading } = useDoc<{results?: TrainingResult[]}>(resultsDocRef);

  const handleDeleteResult = async (resultToRemove: TrainingResult) => {
    if (!resultsDocRef) return;
    try {
      await updateDoc(resultsDocRef, {
        results: arrayRemove(resultToRemove)
      });
      toast({
        title: 'Result Deleted',
        description: 'The training result has been removed.',
      });
    } catch (error: any) {
       toast({
        title: 'Deletion Failed',
        description: error.message || 'Could not remove the result.',
        variant: 'destructive',
      });
    }
  };

  const results = resultsDoc?.results?.sort((a, b) => (b.createdAt as any) - (a.createdAt as any)) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookUser className="size-6" />
          </div>
          <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>Training Results</CardTitle>
        </div>
        <CardDescription className={cn("pt-2", customization?.foregroundColor && 'text-foreground opacity-70')}>
          Review past training simulations and performance feedback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && results.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground">
            <p>No saved training results found.</p>
          </div>
        )}
        {!isLoading && results.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            {results.map((result, index) => (
              <AccordionItem key={index} value={`result-${index}`}>
                <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-grow">
                        <div>
                            <p className="font-semibold text-left">{result.phase} Simulation</p>
                            <p className="text-sm text-muted-foreground">
                            {result.createdAt?.toDate ? format(result.createdAt.toDate(), 'PPP p') : 'Date not available'}
                            </p>
                        </div>
                    </AccordionTrigger>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-2 shrink-0">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this training result. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteResult(result)} className={cn(
                                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            )}>
                                Delete Result
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <AccordionContent>
                    <ResultCard result={result} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}


function ResultCard({ result }: { result: TrainingResult }) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="text-base flex justify-between items-center">
          <span>{result.phase} Simulation</span>
          <Badge variant="outline">Difficulty: {result.difficulty}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Feedback Section */}
          <div className="space-y-4">
             <h4 className="font-semibold">AI Coach Feedback</h4>
              <div>
                <h5 className="font-medium text-sm mb-1">Overall Assessment</h5>
                <p className="text-sm text-muted-foreground">{result.feedback.overallAssessment}</p>
              </div>
              <div>
                <h5 className="font-medium text-sm mb-1 flex items-center gap-2 text-green-500"><ThumbsUp className="h-4 w-4"/> What Went Well</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {result.feedback.positivePoints.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
            </div>
             <div>
                <h5 className="font-medium text-sm mb-1 flex items-center gap-2 text-amber-500"><Lightbulb className="h-4 w-4"/> Areas for Improvement</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {result.feedback.areasForImprovement.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
            </div>
          </div>
          {/* Transcript Section */}
          <div>
            <h4 className="font-semibold mb-2">Conversation Transcript</h4>
            <div className="border rounded-lg h-80 bg-background/50">
               <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                {result.conversation.map((msg, index) => (
                    <div key={index} className={cn("flex items-start gap-3 text-sm", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'assistant' && (
                            <Avatar className="w-6 h-6 border-2 border-primary">
                                <AvatarFallback className="text-xs"><Bot className="h-3 w-3"/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn("max-w-xs rounded-lg p-2", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            <p className="whitespace-pre-wrap">{msg.content || (msg as any).text}</p>
                        </div>
                        {msg.role === 'user' && (
                            <Avatar className="w-6 h-6 border-2 border-muted-foreground">
                                <AvatarFallback className="text-xs"><User className="h-3 w-3"/></AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                </div>
               </ScrollArea>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
