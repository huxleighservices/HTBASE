
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Phone, Mic, Loader2, Sparkles, ThumbsUp, Lightbulb, Trash2, Bot, User, Save, Circle, Radio } from 'lucide-react';
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
import type { CallSimulationInput, SimulationOutput, CallPersona } from '@/types/trainer';
import { runCallSimulation } from '@/ai/flows/call-simulation-flow';
import { transcribeAudio } from '@/ai/flows/transcribe-audio-flow';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { addResultToSession, onSessionsUpdate } from '@/firebase/firestore';
import type { TrainingSession } from '@/types/sessions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const USER_TURN_LIMIT = 5;

const defaultPersona: CallPersona = {
    role: 'Recruitment Chair',
    gender: 'Female',
    attitude: 'Friendly',
    qualification: 'Good Fit',
};

export function ColdCallSimulatorDialog({ open, onOpenChange, activeSessionId, trainingData }: { open: boolean, onOpenChange: (open: boolean) => void, activeSessionId: string | null, trainingData?: string }) {
    const { toast } = useToast();
    const { user } = useUser();

    // Simulation State
    const [persona, setPersona] = useState<CallPersona>(defaultPersona);
    const [conversation, setConversation] = useState<( { role: 'user' | 'assistant', text: string })[]>([]);
    const [isStarted, setIsStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<SimulationOutput['feedback'] | null>(null);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Session Saving State
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [sessionToSaveTo, setSessionToSaveTo] = useState<string | null>(activeSessionId);
    const [isSaving, setIsSaving] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const audioPlayerRef = useRef<HTMLAudioElement>(null);

    const userMessagesCount = conversation.filter(m => m.role === 'user').length;
    const isComplete = feedback !== null;

    // Permissions check
    useEffect(() => {
        if (open) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    setHasMicPermission(true);
                })
                .catch(err => {
                    setHasMicPermission(false);
                    console.error("Mic permission denied", err);
                });
        }
    }, [open]);
    
    // Fetch user's sessions for saving results
    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSessionsUpdate(user.uid, setSessions);
        return () => unsubscribe();
    }, [user]);

    // Reset simulation state when dialog is opened or session changes
    const resetSimulation = useCallback(() => {
        setPersona(defaultPersona);
        setConversation([]);
        setIsStarted(false);
        setIsLoading(false);
        setFeedback(null);
        setSessionToSaveTo(activeSessionId);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, [activeSessionId]);

    useEffect(() => {
        if (open) {
            resetSimulation();
        }
    }, [open, resetSimulation]);
    
    // Scroll to bottom of chat
    useEffect(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, [conversation]);


    const startRecording = async () => {
        if (isRecording || isLoading || isComplete) return;

        if (!hasMicPermission) {
            toast({ title: 'Microphone permission required.', variant: 'destructive' });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    await handleSendAudio(base64Audio);
                };
                 // Stop all tracks to turn off the mic indicator
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            toast({ title: 'Could not start recording', description: 'Please ensure microphone permissions are granted.', variant: 'destructive' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
    
    const handleSendAudio = async (audioDataUri: string) => {
        setIsLoading(true);
        if (!isStarted) setIsStarted(true);

        try {
            // 1. Transcribe audio
            const { text: transcribedText } = await transcribeAudio(audioDataUri);
            if (!transcribedText.trim()) {
                toast({ title: "No speech detected", description: "Please try speaking again.", variant: "destructive"});
                setIsLoading(false);
                return;
            }

            const newUserMessage = { role: 'user' as const, text: transcribedText };
            const updatedConversation = [...conversation, newUserMessage];
            setConversation(updatedConversation);
            
            // 2. Get AI response
            const result = await runCallSimulation({
                persona,
                conversationHistory: updatedConversation,
                trainingData,
            });

            let finalConversation = [...updatedConversation];
            
            if (result.response && result.audioUrl) {
                const aiMessage = { role: 'assistant' as const, text: result.response };
                finalConversation = [...finalConversation, aiMessage];
                
                // 3. Play AI audio response
                if (audioPlayerRef.current) {
                    audioPlayerRef.current.src = result.audioUrl;
                    audioPlayerRef.current.play().catch(e => console.error("Audio playback failed", e));
                }
            }

            if (result.isComplete && result.feedback) {
                setFeedback(result.feedback);
            }
            
            setConversation(finalConversation);

        } catch (error: any) {
            toast({ title: "Simulation Error", description: error.message, variant: "destructive" });
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
                phase: "Cold Call",
                difficulty: persona.attitude as any, //TODO: Map this better
                conversation: conversation.map(c => ({ role: c.role, content: c.text })),
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
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <Phone className="h-8 w-8 text-primary"/>
                        Tr/AI/ner: Cold Call Simulation
                    </DialogTitle>
                    <DialogDescription>
                        Practice your cold calling skills. Customize the prospect's persona, then press and hold the button to speak. You have {USER_TURN_LIMIT} turns.
                    </DialogDescription>
                </DialogHeader>
                
                 <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                    {/* Left Panel: Controls & Feedback */}
                    <div className="md:col-span-1 flex flex-col gap-4 p-1 min-h-0">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={persona.role} onValueChange={(v) => setPersona(p => ({...p, role: v as CallPersona['role']}))} disabled={isStarted}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Recruitment Chair">Recruitment</SelectItem>
                                        <SelectItem value="President">President</SelectItem>
                                        <SelectItem value="New Member">New Member</SelectItem>
                                        <SelectItem value="Treasurer">Treasurer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Attitude</Label>
                                <Select value={persona.attitude} onValueChange={(v) => setPersona(p => ({...p, attitude: v as CallPersona['attitude']}))} disabled={isStarted}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Friendly">Friendly</SelectItem>
                                        <SelectItem value="Skeptical">Skeptical</SelectItem>
                                        <SelectItem value="Busy">Busy</SelectItem>
                                        <SelectItem value="Hostile">Hostile</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-muted/30 flex-grow flex flex-col min-h-0">
                             <h3 className="font-semibold mb-3 flex items-center gap-2 shrink-0"><Sparkles className="h-5 w-5 text-yellow-400"/> AI Feedback</h3>
                             <div className="flex-grow min-h-0">
                                <ScrollArea className="h-full pr-3 -mr-3">
                                    {!feedback ? (
                                        <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                            <p>Complete the simulation to receive feedback.</p>
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

                    {/* Right Panel: Chat & Recording */}
                     <div className="md:col-span-2 flex flex-col h-full bg-muted/20 rounded-lg min-h-0">
                        <div className="flex-grow min-h-0" ref={scrollAreaRef}>
                            <ScrollArea className="h-full">
                                <div className="space-y-6 p-4">
                                    {conversation.length === 0 && !isLoading && (
                                        <div className="text-center text-muted-foreground pt-12">
                                            <p>Press the button below to start the call.</p>
                                        </div>
                                    )}
                                    {conversation.map((msg, index) => (
                                        <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                            {msg.role === 'assistant' && <Avatar className="w-8 h-8 border-2 border-primary"><AvatarFallback><Bot className="h-4 w-4"/></AvatarFallback></Avatar>}
                                            <div className={cn("max-w-md rounded-lg p-3 text-sm", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background')}><p className="whitespace-pre-wrap">{msg.text}</p></div>
                                            {msg.role === 'user' && <Avatar className="w-8 h-8 border-2 border-muted-foreground"><AvatarFallback><User className="h-4 w-4"/></AvatarFallback></Avatar>}
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex items-start gap-3 justify-start">
                                            <Avatar className="w-8 h-8 border-2 border-primary"><AvatarFallback><Bot className="h-4 w-4"/></AvatarFallback></Avatar>
                                            <div className="max-w-md rounded-lg p-3 bg-background flex items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                        
                        <div className="p-4 border-t border-border shrink-0 flex flex-col items-center justify-center gap-4">
                            {!hasMicPermission && open && (
                                <Alert variant="destructive">
                                    <AlertTitle>Microphone Access Required</AlertTitle>
                                    <AlertDescription>Please grant microphone permissions in your browser to start the simulation.</AlertDescription>
                                </Alert>
                            )}
                            {isComplete ? (
                                <div className="text-center p-4 bg-green-500/10 text-green-500 rounded-lg space-y-3 w-full">
                                    <h4 className="font-bold">Simulation Complete!</h4>
                                    <p className="text-sm">Review your feedback. You can now save this result.</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <Select onValueChange={setSessionToSaveTo} defaultValue={sessionToSaveTo || ''}><SelectTrigger className="w-[250px] bg-background/70"><SelectValue placeholder="Select session to save..." /></SelectTrigger><SelectContent>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                                        <Button onClick={handleSaveResult} disabled={isSaving || !sessionToSaveTo}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}{isSaving ? 'Saving...' : 'Save Result'}</Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                <Button
                                  onMouseDown={startRecording}
                                  onMouseUp={stopRecording}
                                  onTouchStart={startRecording}
                                  onTouchEnd={stopRecording}
                                  disabled={isLoading || !hasMicPermission}
                                  className={cn("w-24 h-24 rounded-full text-white transition-all duration-200 focus:ring-4 focus:ring-primary/50", 
                                    isRecording ? 'bg-red-500 hover:bg-red-600 scale-110' : 'bg-primary hover:bg-primary/90'
                                  )}
                                >
                                    {isLoading ? <Loader2 className="h-8 w-8 animate-spin"/> : <Mic className="h-8 w-8"/>}
                                </Button>
                                <div className='h-6 text-sm text-muted-foreground flex items-center gap-2'>
                                    {isRecording ? <><Radio className="h-4 w-4 text-red-500 animate-pulse" /> Recording...</> : `Press and hold to talk (${userMessagesCount}/${USER_TURN_LIMIT})`}
                                </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetSimulation}><Trash2 className="mr-2 h-4 w-4"/> Start Over</Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close Simulator</Button>
                </DialogFooter>
                <audio ref={audioPlayerRef} className="hidden" />
            </DialogContent>
        </Dialog>
    );
}
