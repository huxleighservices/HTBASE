'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Bot,
  Send,
  Trash2,
  Settings2,
  X,
  Loader2,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';

// ─── Types ──────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

interface AiSettings {
  personaName: string;
  includeTasks: boolean;
  includeLeads: boolean;
  includeDeals: boolean;
  includeTeamStatus: boolean;
  customInstructions: string;
}

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PERSONA_NAME = 'ARIA';

const SUGGESTED_PROMPTS = [
  'What tasks are overdue?',
  'Summarize team activity',
  'Who has the most deals?',
  'Show me recent leads',
];

const DEFAULT_SETTINGS: AiSettings = {
  personaName: DEFAULT_PERSONA_NAME,
  includeTasks: true,
  includeLeads: true,
  includeDeals: true,
  includeTeamStatus: true,
  customInstructions: '',
};

// ─── Helper to safely convert Firestore Timestamp or string to a Date string ─

function safeFormatDate(value: any): string {
  if (!value) return 'unknown date';
  if (value?.toDate) return value.toDate().toLocaleDateString();
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AiAssistantDialog({
  open,
  onOpenChange,
  client,
  activeUser,
}: AiAssistantDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [contextData, setContextData] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<AiSettings>(DEFAULT_SETTINGS);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAdmin = activeUser?.role === 'admin';
  const username = activeUser?.username ?? 'guest';

  // ── Scroll to bottom whenever messages change ────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // ── Load conversation history + context data when dialog opens ───────────
  useEffect(() => {
    if (!open || !client.path) return;

    const loadData = async () => {
      setIsContextLoading(true);
      try {
        // 1. Load conversation history
        const convPath = `${client.path}/aiConversations`;
        const convRef = collection(firestore, convPath);
        const convQuery = query(convRef, orderBy('createdAt', 'desc'), limit(1));
        const convSnap = await getDocs(convQuery);

        let loadedMessages: ChatMessage[] = [];
        if (!convSnap.empty) {
          const doc = convSnap.docs[0];
          const data = doc.data();
          if (Array.isArray(data.messages)) {
            loadedMessages = data.messages.map((m: any) => ({
              role: m.role as MessageRole,
              content: m.content,
              timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : undefined,
            }));
          }
        }
        setMessages(loadedMessages);

        // 2. Fetch context data from Firestore
        const contextParts: string[] = [];

        if (settings.includeTasks) {
          try {
            const tasksRef = collection(firestore, `${client.path}/queueTasks`);
            const tasksQuery = query(tasksRef, orderBy('dueDate', 'desc'), limit(10));
            const tasksSnap = await getDocs(tasksQuery);
            if (!tasksSnap.empty) {
              const tasksList = tasksSnap.docs.map((d) => {
                const t = d.data();
                return `- ${t.leadName}: "${t.nextStep}" (due ${safeFormatDate(t.dueDate)}, status: ${t.status}, agent: ${t.agent})`;
              }).join('\n');
              contextParts.push(`RECENT TASKS (last 10):\n${tasksList}`);
            }
          } catch {
            // Permission or missing collection — skip silently
          }
        }

        if (settings.includeLeads) {
          try {
            const leadsRef = collection(firestore, `${client.path}/leads`);
            const leadsQuery = query(leadsRef, orderBy('createdAt', 'desc'), limit(10));
            const leadsSnap = await getDocs(leadsQuery);
            if (!leadsSnap.empty) {
              const leadsList = leadsSnap.docs.map((d) => {
                const l = d.data();
                return `- ${l.firstName} ${l.lastName} (agent: ${l.agent}, step: ${l.currentStep ?? 'n/a'}, revenue: ${l.projectedRevenue ?? 'n/a'})`;
              }).join('\n');
              contextParts.push(`RECENT LEADS (last 10):\n${leadsList}`);
            }
          } catch {
            // skip
          }
        }

        if (settings.includeDeals) {
          try {
            const buildsRef = collection(firestore, `${client.path}/builds`);
            const buildsQuery = query(buildsRef, orderBy('createdAt', 'desc'), limit(5));
            const buildsSnap = await getDocs(buildsQuery);
            if (!buildsSnap.empty) {
              const dealsList = buildsSnap.docs.map((d) => {
                const b = d.data();
                return `- ${b.buildName} for ${b.clientName} (stage: ${b.buildStage ?? 'n/a'}, PM: ${b.projectManager ?? 'n/a'}, revenue: ${b.projectedRevenue ?? 'n/a'})`;
              }).join('\n');
              contextParts.push(`RECENT DEALS/BUILDS (last 5):\n${dealsList}`);
            }
          } catch {
            // skip
          }
        }

        const builtContext = contextParts.length > 0
          ? `\n\nCURRENT BUSINESS DATA:\n${contextParts.join('\n\n')}`
          : '';

        setContextData(builtContext);
      } catch (error: any) {
        console.error('AiAssistantDialog: failed to load data', error);
      } finally {
        setIsContextLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client.path]);

  // ── Build system prompt ──────────────────────────────────────────────────
  const buildSystemPrompt = useCallback((): string => {
    const customPart = settings.customInstructions
      ? `\n\nAdditional instructions: ${settings.customInstructions}`
      : '';

    return (
      `You are ${settings.personaName}, an AI assistant for ${client.firmName}. ` +
      `You have access to their business data. Be concise, professional, and helpful. ` +
      `Answer questions about their data, surface insights, and flag anything that needs attention. ` +
      contextData +
      customPart
    );
  }, [settings, client.firmName, contextData]);

  // ── Save conversation to Firestore ───────────────────────────────────────
  const saveConversation = useCallback(
    async (updatedMessages: ChatMessage[]) => {
      if (!client.path || updatedMessages.length === 0) return;
      try {
        const convRef = collection(firestore, `${client.path}/aiConversations`);
        await addDoc(convRef, {
          username,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('AiAssistantDialog: failed to save conversation', error);
      }
    },
    [firestore, client.path, username]
  );

  // ── Send a message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/ai-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            systemPrompt: buildSystemPrompt(),
            clientPath: client.path,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error ?? `HTTP ${response.status}`);
        }

        const data = await response.json();
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };

        const finalMessages = [...updatedMessages, assistantMsg];
        setMessages(finalMessages);
        await saveConversation(finalMessages);
      } catch (error: any) {
        toast({
          title: 'ARIA Error',
          description: error.message ?? 'Failed to get a response.',
          variant: 'destructive',
        });
        // Remove the user message that failed
        setMessages(messages);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, buildSystemPrompt, client.path, saveConversation, toast]
  );

  // ── Keyboard handler ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Clear chat ───────────────────────────────────────────────────────────
  const handleClearChat = () => {
    setMessages([]);
  };

  // ── Settings panel ───────────────────────────────────────────────────────
  const handleOpenSettings = () => {
    setDraftSettings({ ...settings });
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    setSettings({ ...draftSettings });
    setShowSettings(false);
    toast({ title: 'Settings saved', description: 'ARIA settings have been updated.' });
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-card-strong border-border/50 flex flex-col p-0 gap-0 w-full max-w-2xl h-[85vh] max-h-[760px] overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showSettings ? (
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <>
                  <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border border-primary/25">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold leading-none">
                      <span className="text-gradient">{settings.personaName}</span>
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Adaptive Resource Intelligence Assistant
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!showSettings && (
                <>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleOpenSettings}
                      title="Settings"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  )}
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={handleClearChat}
                      title="Clear chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {showSettings && (
                <Button
                  size="sm"
                  className="btn-gradient h-8 px-4 text-xs"
                  onClick={handleSaveSettings}
                >
                  Save
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── Settings Panel ──────────────────────────────────────────────── */}
        {showSettings ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Persona</h3>
              <p className="text-xs text-muted-foreground">Customize the assistant's name and behavior.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="persona-name" className="text-xs">Assistant Name</Label>
              <Input
                id="persona-name"
                value={draftSettings.personaName}
                onChange={(e) =>
                  setDraftSettings((s) => ({ ...s, personaName: e.target.value }))
                }
                placeholder="e.g. ARIA"
                className="h-8 text-sm bg-background/50"
              />
            </div>

            <Separator className="border-border/40" />

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Data Sources</h3>
              <p className="text-xs text-muted-foreground">
                Choose which data to include as context for the AI.
              </p>
            </div>

            <div className="space-y-3">
              {(
                [
                  { key: 'includeTasks', label: 'Tasks & Queue' },
                  { key: 'includeLeads', label: 'Leads' },
                  { key: 'includeDeals', label: 'Deals / Builds' },
                  { key: 'includeTeamStatus', label: 'Team Status' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`toggle-${key}`} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                  <Switch
                    id={`toggle-${key}`}
                    checked={draftSettings[key]}
                    onCheckedChange={(checked) =>
                      setDraftSettings((s) => ({ ...s, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>

            <Separator className="border-border/40" />

            <div className="space-y-2">
              <Label htmlFor="custom-instructions" className="text-xs">
                Custom Instructions
              </Label>
              <Textarea
                id="custom-instructions"
                value={draftSettings.customInstructions}
                onChange={(e) =>
                  setDraftSettings((s) => ({ ...s, customInstructions: e.target.value }))
                }
                placeholder="Add any specific instructions or context for the assistant..."
                className="min-h-[100px] text-sm bg-background/50 resize-none"
              />
            </div>
          </div>
        ) : (
          <>
            {/* ── Chat Messages ──────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            >
              {isContextLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm">Loading your data...</p>
                </div>
              ) : messages.length === 0 ? (
                /* ── Empty state with suggested prompts ── */
                <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      Hi, I'm{' '}
                      <span className="text-gradient">{settings.personaName}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Ask me anything about {client.firmName}'s data. I can surface
                      insights, flag issues, and answer questions.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-left text-xs px-3 py-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Message bubbles ── */
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`shrink-0 flex items-end justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/20 border border-secondary/30 text-secondary'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          activeUser?.displayName?.[0]?.toUpperCase() ?? 'U'
                        ) : (
                          <Bot className="h-3.5 w-3.5" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted/60 text-foreground rounded-tl-sm border border-border/30'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div className="flex gap-2.5 flex-row">
                      <div className="shrink-0 flex items-end justify-center w-7 h-7 rounded-full bg-secondary/20 border border-secondary/30">
                        <Bot className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div className="bg-muted/60 border border-border/30 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Input Bar ──────────────────────────────────────────────── */}
            {!isContextLoading && (
              <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border/40">
                <div className="flex items-end gap-2 bg-muted/30 border border-border/40 rounded-xl px-3 py-2 focus-within:border-primary/40 transition-colors">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${settings.personaName} anything...`}
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 min-h-0 resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 disabled:opacity-60"
                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                  />
                  <Button
                    size="icon"
                    className="btn-gradient h-8 w-8 shrink-0 rounded-lg"
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/50 mt-1.5 text-center">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
