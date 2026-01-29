
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from '@/components/ui/textarea';
import type { Client, Lead, QueueTask } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { GanttChartSquare, CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, Timestamp, arrayUnion, serverTimestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

type QueueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

const Countdown = ({ dueDate }: { dueDate: any }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!dueDate?.toDate) return <span>Invalid date</span>;
    const due = dueDate.toDate();
    const isOverdue = now > due;
    const distance = formatDistanceToNowStrict(due, { addSuffix: true });
    const color = isOverdue ? 'text-red-500' : 'text-green-500';

    return <span className={color}>{distance}</span>;
}

const IncompleteNoteDialog = ({ open, onOpenChange, onSubmit }: { open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (note: string) => void }) => {
    const [note, setNote] = useState('');
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Task Incomplete</AlertDialogTitle>
                    <AlertDialogDescription>Please provide a reason why this follow-up task was not completed.</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Client did not answer the phone..." />
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onSubmit(note)} disabled={!note.trim()}>Save & Reset Clock</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


export function QueueDialog({ open, onOpenChange, client, activeUser }: QueueDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [now, setNow] = useState(new Date());
  const [taskForIncomplete, setTaskForIncomplete] = useState<QueueTask | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000); // Update 'now' every minute
    return () => clearInterval(interval);
  }, []);

  const queueCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'queueTasks');
  }, [firestore]);

  const agentQueueQuery = useMemoFirebase(() => {
    if (!queueCollectionRef || !activeUser) return null;
    return query(queueCollectionRef, where('agent', '==', activeUser.username));
  }, [queueCollectionRef, activeUser]);
  
  const { data: tasks, isLoading: areTasksLoading } = useCollection<QueueTask>(agentQueueQuery);

  const completedTasksCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path || !activeUser) return null;
    return collection(firestore, client.path, 'users', activeUser.username, 'completedTasks');
  }, [firestore, client.path, activeUser]);
  
  const completedTasksQuery = useMemoFirebase(() => {
      if (!completedTasksCollectionRef) return null;
      return query(completedTasksCollectionRef, orderBy('completedAt', 'desc'));
  }, [completedTasksCollectionRef]);

  const { data: completedTasks, isLoading: areCompletedTasksLoading } = useCollection<QueueTask & { completedAt: any }>(completedTasksQuery);


  const [currentTasks, overdueTasks] = useMemo(() => {
    if (!tasks) return [[], []];
    const overdue: QueueTask[] = [];
    const current: QueueTask[] = [];
    tasks.forEach(task => {
        if (task.dueDate.toDate() < now) {
            overdue.push(task);
        } else {
            current.push(task);
        }
    });
    return [current, overdue];
  }, [tasks, now]);

  const handleComplete = (task: QueueTask) => {
    if (!firestore || !completedTasksCollectionRef) return;

    if (!task.clientPath) {
        toast({
            title: "Task Error",
            description: `Cannot complete task for "${task.leadName}" because client information is missing.`,
            variant: "destructive",
        });
        return;
    }
    const leadRef = doc(firestore, task.clientPath, 'leads', task.leadId);
    updateDocumentNonBlocking(leadRef, { currentStep: task.nextStep });
    
    addDocumentNonBlocking(completedTasksCollectionRef, { ...task, completedAt: serverTimestamp() });

    const taskRef = doc(firestore, 'queueTasks', task.id);
    deleteDocumentNonBlocking(taskRef);

    toast({ title: "Task Completed!", description: `Lead "${task.leadName}" advanced to "${task.nextStep}".` });
  };
  
  const handleIncomplete = (task: QueueTask) => {
    setTaskForIncomplete(task);
  };

  const submitIncompleteNote = (note: string) => {
    if (!firestore || !taskForIncomplete) return;
    
    const newDueDate = new Date();
    newDueDate.setHours(newDueDate.getHours() + 24);

    const taskRef = doc(firestore, 'queueTasks', taskForIncomplete.id);
    updateDocumentNonBlocking(taskRef, {
        dueDate: Timestamp.fromDate(newDueDate),
        notes: arrayUnion(`[${new Date().toLocaleString()}] ${note}`),
    });

    toast({ title: "Timer Reset", description: "The 24-hour countdown has been reset for this task." });
    setTaskForIncomplete(null);
  };


  const renderTaskList = (taskList: QueueTask[]) => (
    <div className="space-y-3">
        {taskList.map(task => (
            <Card key={task.id}>
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Info className="h-5 w-5 text-muted-foreground cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-bold">Task Notes</p>
                                    {task.notes && task.notes.length > 0 ? (
                                        <ul className="list-disc pl-4 mt-2 text-xs space-y-1">
                                           {task.notes.map((n, i) => <li key={i}>{n}</li>)}
                                        </ul>
                                    ) : <p className="text-xs text-muted-foreground mt-1">No notes for this task.</p>}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <div>
                            <p className="font-semibold">{task.leadName}</p>
                            <p className="text-sm text-muted-foreground">Next Step: <span className="font-medium text-foreground">{task.nextStep}</span></p>
                            <p className="text-xs text-muted-foreground">Due: <Countdown dueDate={task.dueDate} /></p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700" onClick={() => handleIncomplete(task)}>
                            <XCircle className="mr-2" />
                            Incomplete
                        </Button>
                        <Button size="sm" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700" onClick={() => handleComplete(task)}>
                            <CheckCircle className="mr-2" />
                            Complete
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );
  
  const renderCompletedList = (taskList: (QueueTask & { completedAt: any })[]) => (
    <div className="space-y-3">
        {taskList.map(task => (
            <Card key={task.id}>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="font-semibold">{task.leadName}</p>
                        <p className="text-sm text-muted-foreground">Completed Step: <span className="font-medium text-foreground">{task.nextStep}</span></p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {task.completedAt?.toDate ? format(task.completedAt.toDate(), 'PPP p') : 'Just now'}
                    </p>
                </CardContent>
            </Card>
        ))}
    </div>
);


  const isLoading = areTasksLoading || areCompletedTasksLoading;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
            <GanttChartSquare /> Queue
          </DialogTitle>
          <DialogDescription>
            Automated lead follow-up reminders for {client.firmName}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="current" className="flex-grow flex flex-col min-h-0">
            <TabsList className="bg-transparent p-0">
                <TabsTrigger value="current" className="border data-[state=active]:bg-primary/10 data-[state=active]:border-primary data-[state=active]:shadow-none">Current ({currentTasks.length})</TabsTrigger>
                <TabsTrigger value="overdue" className="border data-[state=active]:bg-primary/10 data-[state=active]:border-primary data-[state=active]:shadow-none">Overdue ({overdueTasks.length})</TabsTrigger>
                <TabsTrigger value="completed" className="border data-[state=active]:bg-primary/10 data-[state=active]:border-primary data-[state=active]:shadow-none">Completed ({completedTasks?.length || 0})</TabsTrigger>
            </TabsList>
            <div className="flex-grow mt-4 min-h-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
                ) : (
                    <>
                    <TabsContent value="current" className="h-full m-0">
                        <ScrollArea className="h-full pr-4 -mr-4">
                            {currentTasks.length > 0 ? renderTaskList(currentTasks) : <p className="text-center text-muted-foreground py-12">No current tasks.</p>}
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="overdue" className="h-full m-0">
                        <ScrollArea className="h-full pr-4 -mr-4">
                            {overdueTasks.length > 0 ? renderTaskList(overdueTasks) : <p className="text-center text-muted-foreground py-12">No overdue tasks. Great job!</p>}
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="completed" className="h-full m-0">
                        <ScrollArea className="h-full pr-4 -mr-4">
                           {completedTasks && completedTasks.length > 0 ? renderCompletedList(completedTasks) : <p className="text-center text-muted-foreground py-12">No completed tasks yet.</p>}
                        </ScrollArea>
                    </TabsContent>
                    </>
                )}
            </div>
        </Tabs>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {taskForIncomplete && (
        <IncompleteNoteDialog 
            open={!!taskForIncomplete}
            onOpenChange={(isOpen) => !isOpen && setTaskForIncomplete(null)}
            onSubmit={submitIncompleteNote}
        />
    )}
    </>
  );
}
