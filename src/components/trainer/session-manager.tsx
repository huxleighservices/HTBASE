
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { TrainingResult } from '@/types/sessions';
import type { Session } from '@/types/session';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { deleteSession } from '@/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { BrandCustomization } from '@/types/client';

export function SessionManager({ clientPath, customization }: { clientPath: string | null; customization: BrandCustomization | null; }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const sessionsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return query(collection(firestore, clientPath, 'sessions'), orderBy('createdAt', 'desc'));
  }, [firestore, clientPath]);

  const { data: sessions, isLoading } = useCollection<Session & { results?: TrainingResult[] }>(sessionsCollectionRef);

  const handleDeleteSession = (sessionId: string) => {
    if (!clientPath) return;
    deleteSession(clientPath, sessionId);
    toast({
      title: 'Session Deleted',
      description: 'The training session has been removed.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookUser className="size-6" />
          </div>
          <CardTitle className={cn("font-headline text-lg", customization?.foregroundColor && 'text-foreground')}>Session Manager</CardTitle>
        </div>
        <CardDescription className={cn("pt-2", customization?.foregroundColor && 'text-foreground opacity-70')}>
          Review your past training sessions and performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && (!sessions || sessions.length === 0) && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground">
            <p>No saved sessions found.</p>
          </div>
        )}
        {!isLoading && sessions && sessions.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            {sessions.map(session => (
              <AccordionItem key={session.id} value={session.id}>
                <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-grow">
                        <div>
                            <p className="font-semibold text-left">{session.sessionName}</p>
                            <p className="text-sm text-muted-foreground">
                            {session.createdAt?.toDate ? format(session.createdAt.toDate(), 'PPP') : 'Date not available'}
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
                                This will permanently delete the session "{session.sessionName}" and all its associated results. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSession(session.id)} className={cn(
                                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            )}>
                                Delete Session
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <AccordionContent>
                  {session.results && session.results.length > 0 ? (
                    <div className="space-y-4">
                      {session.results.map((result, index) => (
                        <ResultCard key={index} result={result} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm p-4 text-center">No results saved for this session.</p>
                  )}
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
