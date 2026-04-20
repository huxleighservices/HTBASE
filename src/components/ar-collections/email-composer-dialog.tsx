'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import type { ARCustomer, AREmailTemplate } from '@/types/client';
import { Mail, Plus, Trash2, Pencil, Send, ChevronLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SENDER_EMAIL = 'mt@mtroofingandrestoration.com';

const DEFAULT_TEMPLATES: Omit<AREmailTemplate, 'id' | 'createdAt'>[] = [
  {
    name: '7-Day Reminder',
    subject: 'Friendly Payment Reminder – {customerName}',
    body: `Hi {customerName},

We hope you're doing well! This is a friendly reminder that your balance of ${'{balance}'} with MT Roofing & Restoration is due.

Your build was completed recently and we want to make sure everything is in order. Please give us a call or reply to this email if you have any questions or would like to arrange payment.

Thank you for your business!

MT Roofing & Restoration
${SENDER_EMAIL}`,
  },
  {
    name: '15-Day Assertive Reminder',
    subject: 'Second Notice: Outstanding Balance – {customerName}',
    body: `Hi {customerName},

We are following up on your outstanding balance of ${'{balance}'} which was due following the completion of your build ${'{daysSinceBuild}'} days ago.

We have not yet received payment and would like to resolve this promptly. Please contact us immediately to arrange payment or discuss a payment plan.

Continued non-payment may result in additional fees.

MT Roofing & Restoration
${SENDER_EMAIL}`,
  },
  {
    name: '30-Day Keep Account in Good Standing',
    subject: 'Important: Keep Your Account in Good Standing – {customerName}',
    body: `Hi {customerName},

Your account currently carries an outstanding balance of ${'{balance}'}. It has been ${'{daysSinceBuild}'} days since your build was completed.

We want to work with you to keep your account in good standing and avoid any escalation. Please reach out to us today to arrange payment or discuss your options.

Failing to respond may result in your account being referred to our collections process.

MT Roofing & Restoration
${SENDER_EMAIL}`,
  },
  {
    name: '45-Day Intent to Lien',
    subject: 'Notice of Intent to File a Lien – {customerName}',
    body: `Hi {customerName},

Despite previous notices, your account balance of ${'{balance}'} remains unpaid. It has now been ${'{daysSinceBuild}'} days since the completion of your build.

Please be advised that MT Roofing & Restoration intends to file a mechanic's lien against your property if full payment is not received within 10 days of this notice.

To avoid legal action, please contact us immediately at ${SENDER_EMAIL} or call our office.

MT Roofing & Restoration
${SENDER_EMAIL}`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Template variable substitution
// ─────────────────────────────────────────────────────────────────────────────

function applyTemplate(text: string, customer: ARCustomer, balance: number, daysSinceBuild: number | null) {
  return text
    .replace(/\{customerName\}/g, customer.customerName)
    .replace(/\{balance\}/g, `$${balance.toLocaleString()}`)
    .replace(/\{daysSinceBuild\}/g, daysSinceBuild?.toString() ?? 'N/A');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dialog
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'list' | 'compose' | 'edit-template' | 'new-template';

type EmailComposerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: ARCustomer;
  clientPath: string;
  currentBalance: number;
  daysSinceBuild: number | null;
};

export function EmailComposerDialog({
  open,
  onOpenChange,
  customer,
  clientPath,
  currentBalance,
  daysSinceBuild,
}: EmailComposerDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [mode, setMode] = useState<Mode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<AREmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<AREmailTemplate> | null>(null);

  // Compose state
  const [composeTo, setComposeTo] = useState(customer.email ?? '');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const templatesRef = useMemoFirebase(() => {
    if (!firestore || !clientPath) return null;
    return collection(firestore, clientPath, 'arEmailTemplates');
  }, [firestore, clientPath]);

  const { data: templates, isLoading } = useCollection<AREmailTemplate>(templatesRef);

  // Seed default templates on first load
  useEffect(() => {
    if (!templatesRef || isLoading || !templates) return;
    if (templates.length === 0) {
      DEFAULT_TEMPLATES.forEach((t) => {
        addDocumentNonBlocking(templatesRef, { ...t, createdAt: serverTimestamp() });
      });
    }
  }, [templates, isLoading, templatesRef]);

  const sortedTemplates = useMemo(() => {
    if (!templates) return [];
    return [...templates].sort((a, b) => {
      const tA = a.createdAt?.toDate?.()?.getTime() ?? 0;
      const tB = b.createdAt?.toDate?.()?.getTime() ?? 0;
      return tA - tB;
    });
  }, [templates]);

  const handleSelectTemplate = (template: AREmailTemplate) => {
    setSelectedTemplate(template);
    setComposeTo(customer.email ?? '');
    setComposeSubject(applyTemplate(template.subject, customer, currentBalance, daysSinceBuild));
    setComposeBody(applyTemplate(template.body, customer, currentBalance, daysSinceBuild));
    setMode('compose');
  };

  const handleComposeBlank = () => {
    setSelectedTemplate(null);
    setComposeTo(customer.email ?? '');
    setComposeSubject('');
    setComposeBody('');
    setMode('compose');
  };

  const handleSend = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(composeTo)}&su=${encodeURIComponent(composeSubject)}&body=${encodeURIComponent(composeBody)}`;
    window.open(gmailUrl, '_blank');
    toast({ title: 'Gmail opened', description: `Make sure to send from ${SENDER_EMAIL}.` });
    onOpenChange(false);
  };

  const handleSaveTemplate = () => {
    if (!templatesRef || !editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.body) return;
    if (editingTemplate.id) {
      updateDocumentNonBlocking(doc(templatesRef, editingTemplate.id), {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
      });
      toast({ title: 'Template updated' });
    } else {
      addDocumentNonBlocking(templatesRef, {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Template created' });
    }
    setEditingTemplate(null);
    setMode('list');
  };

  const handleDeleteTemplate = (id: string) => {
    if (!templatesRef) return;
    deleteDocumentNonBlocking(doc(templatesRef, id));
    toast({ title: 'Template deleted', variant: 'destructive' });
  };

  const handleClose = () => {
    setMode('list');
    setEditingTemplate(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card-strong border-border/50 sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2">
            {mode !== 'list' && (
              <button
                onClick={() => { setMode('list'); setEditingTemplate(null); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <DialogTitle className="font-headline text-lg">
              {mode === 'list' && `Email ${customer.customerName}`}
              {mode === 'compose' && 'Compose Email'}
              {mode === 'edit-template' && 'Edit Template'}
              {mode === 'new-template' && 'New Template'}
            </DialogTitle>
          </div>
          {mode === 'list' && (
            <DialogDescription className="text-xs text-muted-foreground">
              Select a template or compose a blank email. Emails send from{' '}
              <span className="font-mono text-primary/80">{SENDER_EMAIL}</span>.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Template list ────────────────────────────────────────────────── */}
        {mode === 'list' && (
          <div className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 px-6 py-4">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-2">
                  {sortedTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/30 px-4 py-3 hover:border-primary/30 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{tmpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tmpl.subject}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingTemplate({ ...tmpl }); setMode('edit-template'); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete template?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{tmpl.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          size="sm"
                          className="h-7 px-3 btn-gradient text-xs ml-1"
                          onClick={() => handleSelectTemplate(tmpl)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="px-6 py-4 border-t border-border/30 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditingTemplate({ name: '', subject: '', body: '' }); setMode('new-template'); }}
                className="gap-1.5 border-border/50 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />New Template
              </Button>
              <Button size="sm" className="btn-gradient text-xs gap-1.5" onClick={handleComposeBlank}>
                <Mail className="h-3.5 w-3.5" />Blank Email
              </Button>
            </div>
          </div>
        )}

        {/* ── Compose ──────────────────────────────────────────────────────── */}
        {mode === 'compose' && (
          <div className="flex flex-col flex-1 min-h-0 px-6 py-4 gap-4 overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">To</Label>
              <Input
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="recipient@email.com"
                className="border-border/60 bg-background/50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="border-border/60 bg-background/50"
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Body</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="resize-none border-border/60 bg-background/50 min-h-[260px]"
              />
            </div>
            <div className="rounded-xl border border-border/30 bg-background/20 px-4 py-2 text-xs text-muted-foreground">
              Sending from: <span className="font-mono text-primary/80">{SENDER_EMAIL}</span>
              <span className="mx-2 opacity-40">·</span>
              Make sure you are logged into this Gmail account.
            </div>
            <DialogFooter className="pt-0">
              <Button variant="ghost" onClick={() => setMode('list')} className="border border-border/40">Back</Button>
              <Button
                className="btn-gradient gap-2"
                onClick={handleSend}
                disabled={!composeTo || !composeSubject}
              >
                <Send className="h-4 w-4" />Open in Gmail
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Edit / New Template ───────────────────────────────────────────── */}
        {(mode === 'edit-template' || mode === 'new-template') && editingTemplate && (
          <div className="flex flex-col flex-1 min-h-0 px-6 py-4 gap-4 overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Template Name</Label>
              <Input
                value={editingTemplate.name ?? ''}
                onChange={(e) => setEditingTemplate((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. 30-Day Follow-Up"
                className="border-border/60 bg-background/50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Subject</Label>
              <Input
                value={editingTemplate.subject ?? ''}
                onChange={(e) => setEditingTemplate((p) => ({ ...p, subject: e.target.value }))}
                className="border-border/60 bg-background/50"
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Body</Label>
              <Textarea
                value={editingTemplate.body ?? ''}
                onChange={(e) => setEditingTemplate((p) => ({ ...p, body: e.target.value }))}
                className="resize-none border-border/60 bg-background/50 min-h-[220px]"
              />
            </div>
            <div className="rounded-xl border border-border/30 bg-background/20 px-4 py-2 text-xs text-muted-foreground">
              Available variables:{' '}
              <span className="font-mono text-primary/70">{'{customerName}'}</span>
              {', '}
              <span className="font-mono text-primary/70">{'{balance}'}</span>
              {', '}
              <span className="font-mono text-primary/70">{'{daysSinceBuild}'}</span>
            </div>
            <DialogFooter className="pt-0">
              <Button variant="ghost" onClick={() => { setMode('list'); setEditingTemplate(null); }} className="border border-border/40">Cancel</Button>
              <Button
                className="btn-gradient"
                onClick={handleSaveTemplate}
                disabled={!editingTemplate.name || !editingTemplate.subject || !editingTemplate.body}
              >
                Save Template
              </Button>
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
