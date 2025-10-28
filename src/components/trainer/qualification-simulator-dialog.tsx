
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserCheck, Send, Loader2, Sparkles, ThumbsUp, Lightbulb, Trash2, Bot, User, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SimulationDifficulty, ConversationMessage, ProspectingSimulationOutput } from '@/types/trainer';
import { runQualificationSimulation } from '@/ai/flows/qualification-simulation-flow';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { addResultToSession, onSessionsUpdate } from '@/firebase/firestore';
import type { TrainingSession } from '@/types/sessions';


const USER_MESSAGE_LIMIT = 5;

export function QualificationSimulatorDialog({ open, onOpenChange, activeSessionId }: { open: boolean, onOpenChange: (open: boolean) => void, activeSessionId: string | null }) {
    const { toast } = useToast();
    const { user } = useUser();
    const [difficulty, setDifficulty] = useState<SimulationDifficulty>('Easy');
    const [conversation, setConversation] = useState<ConversationMessage[]>([]);
    const [isStarted, setIsStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [feedback, setFeedback] = useState<ProspectingSimulationOutput['feedback'] | null>(null);
    
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [sessionToSaveTo, setSessionToSaveTo] = useState<string | null>(activeSessionId);
    const [isSaving, setIsSaving] = useState(false);

    const userMessagesCount = conversation.filter(m => m.role === 'user').length;
    const isComplete = feedback !== null;

    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSessionsUpdate(user.uid, setSessions);
        return () => unsubscribe();
    }, [user]);

    const resetSimulation = () => {
        setConversation([]);
        setIsStarted(false);
        setCurrentMessage('');
        setFeedback(null);
        setIsLoading(false);
        setSessionToSaveTo(activeSessionId);
    };
    
    useEffect(() => {
        if (open) {
            resetSimulation();
        }
    }, [open, activeSessionId]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentMessage.trim() || isLoading || isComplete) return;

        const newUserMessage: ConversationMessage = { role: 'user', content: currentMessage.trim() };
        
        const updatedConversationWithUser = [...conversation, newUserMessage];
        setConversation(updatedConversationWithUser);
        setCurrentMessage('');
        setIsLoading(true);
        if (!isStarted) setIsStarted(true);

        try {
            const result = await runQualificationSimulation({
                difficulty,
                conversationHistory: updatedConversationWithUser,
            });

            let finalConversation = [...updatedConversationWithUser];
            
            if (result.response) {
                const aiMessage = { role: 'assistant' as const, content: result.response };
                finalConversation = [...finalConversation, aiMessage];
            }
            if (result.isComplete && result.feedback) {
                setFeedback(result.feedback);
            }
            
            setConversation(finalConversation);

        } catch (error: any) {
            toast({ title: "Simulation Error", description: error.message, variant: "destructive" });
            setConversation(conversation);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveResult = async () => {
        if (!user || !sessionToSaveTo || !feedback) {
            toast({ title: "Cannot Save", description: "No session selected or feedback not generated.", variant: "destructive"});
            return;
        }
        setIsSaving(true);
        try {
            await addResultToSession(user.uid, sessionToSaveTo, {
                phase: "Qualification",
                difficulty: difficulty,
                conversation: conversation,
                feedback: feedback,
            });
            toast({ title: "Result Saved", description: "Your training result has been saved to the session."});
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Save Failed", description: error.message, variant: "destructive"});
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
              className="sm:max-w-4xl h-[90vh] flex flex-col"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <UserCheck className="h-8 w-8 text-primary"/>
                        Tr/AI/ner: Qualification Simulation
                    </DialogTitle>
                    <DialogDescription>
                        Practice qualifying a lead. Your goal is to determine if they are a good fit by assessing their needs, budget, and authority. You have {USER_MESSAGE_LIMIT} messages.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                    {/* Left Panel: Controls & Feedback */}
                    <div className="md:col-span-1 flex flex-col gap-4 p-1 min-h-0">
                        <div className="space-y-2">
                            <Label htmlFor="difficulty-select">Difficulty Level</Label>
                            <Select 
                                value={difficulty} 
                                onValueChange={(val) => setDifficulty(val as SimulationDifficulty)}
                                disabled={isStarted}
                            >
                                <SelectTrigger id="difficulty-select" className="bg-background/70">
                                    <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Easy">Easy (Good Fit) 😊</SelectItem>
                                    <SelectItem value="Medium">Medium (Uncertain) 🤔</SelectItem>
                                    <SelectItem value="Hard">Hard (Poor Fit) 😠</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-muted/30 flex-grow flex flex-col min-h-0">
                             <h3 className="font-semibold mb-3 flex items-center gap-2 shrink-0"><Sparkles className="h-5 w-5 text-yellow-400"/> AI Feedback</h3>
                             <div className="flex-grow min-h-0">
                                <ScrollArea className="h-full pr-3 -mr-3">
                                    {!feedback ? (
                                        <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                            <p>Complete the simulation to receive feedback on your qualification skills.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 text-sm animate-in fade-in-50">
                                            <div>
                                                <h4 className="font-semibold mb-1">Overall Assessment</h4>
                                                <p className="text-muted-foreground">{feedback.overallAssessment}</p>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-1 flex items-center gap-2 text-green-500"><ThumbsUp className="h-4 w-4"/> What Went Well</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {feedback.positivePoints.map((point, i) => <li key={i}>{point}</li>)}
                                                </ul>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-1 flex items-center gap-2 text-amber-500"><Lightbulb className="h-4 w-4"/> Areas for Improvement</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {feedback.areasForImprovement.map((point, i) => <li key={i}>{point}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                 </ScrollArea>
                             </div>
                        </div>

                    </div>

                    {/* Right Panel: Chat */}
                     <div className="md:col-span-2 flex flex-col h-full bg-muted/20 rounded-lg min-h-0">
                        <div className="flex-grow min-h-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-6 p-4">
                                {conversation.map((msg, index) => (
                                        <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                            {msg.role === 'assistant' && (
                                                <Avatar className="w-8 h-8 border-2 border-primary">
                                                    <AvatarFallback><Bot className="h-4 w-4"/></AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn("max-w-md rounded-lg p-3 text-sm", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background')}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                            {msg.role === 'user' && (
                                                <Avatar className="w-8 h-8 border-2 border-muted-foreground">
                                                    <AvatarFallback><User className="h-4 w-4"/></AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                ))}
                                {isLoading && (
                                        <div className="flex items-start gap-3 justify-start">
                                            <Avatar className="w-8 h-8 border-2 border-primary">
                                                <AvatarFallback><Bot className="h-4 w-4"/></AvatarFallback>
                                            </Avatar>
                                            <div className="max-w-md rounded-lg p-3 bg-background flex items-center">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                            </div>
                                        </div>
                                )}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="p-4 border-t border-border shrink-0">
                             {isComplete ? (
                                <div className="text-center p-4 bg-green-500/10 text-green-500 rounded-lg space-y-3">
                                    <h4 className="font-bold">Simulation Complete!</h4>
                                    <p className="text-sm">Review your feedback on the left. You can now save this result to a session.</p>
                                     <div className="flex items-center justify-center gap-2">
                                        <Select onValueChange={setSessionToSaveTo} defaultValue={sessionToSaveTo || ''}>
                                            <SelectTrigger className="w-[250px] bg-background/70">
                                                <SelectValue placeholder="Select session to save..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button onClick={handleSaveResult} disabled={isSaving || !sessionToSaveTo}>
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                            {isSaving ? 'Saving...' : 'Save Result'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex gap-3 items-start">
                                    <Textarea
                                        placeholder={`Your message (${userMessagesCount}/${USER_MESSAGE_LIMIT})...`}
                                        value={currentMessage}
                                        onChange={(e) => setCurrentMessage(e.target.value)}
                                        className="bg-background/70"
                                        rows={2}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        disabled={isLoading}
                                    />
                                    <Button type="submit" size="icon" disabled={isLoading || !currentMessage.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetSimulation}><Trash2 className="mr-2 h-4 w-4"/> Start Over</Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close Simulator</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
