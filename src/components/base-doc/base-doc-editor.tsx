'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Lock,
  Loader2,
  Save,
  Download,
  Type,
  PenTool,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc as firestoreDoc, updateDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-log';
import type { AccessKey } from '@/types/session';
import type { AccessKey as ClientAccessKey, Client } from '@/types/client';
import type { BaseDoc } from './types';
import { RichTextEditor, type RichTextEditorHandle } from './rich-text-editor';
import { SketchCanvas, type SketchCanvasHandle } from './sketch-canvas';
import { ManageAccessDialog } from './manage-access-dialog';

type EditorTab = 'text' | 'sketch';

type BaseDocEditorProps = {
  firestore: Firestore;
  client: Client;
  doc: BaseDoc;
  accessKeys: ClientAccessKey[];
  activeUser: AccessKey | null;
  onBack: () => void;
};

export function BaseDocEditor({ firestore, client, doc, accessKeys, activeUser, onBack }: BaseDocEditorProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<EditorTab>('text');
  const [title, setTitle] = useState(doc.title);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const textRef = useRef<RichTextEditorHandle>(null);
  const sketchRef = useRef<SketchCanvasHandle>(null);

  const isCreator = !!activeUser && activeUser.username === doc.createdBy;
  const canAccess = isCreator || (activeUser ? doc.allowedUsers.includes(activeUser.username) : false);

  const docRef = firestoreDoc(firestore, client.path!, 'baseDocs', doc.id);

  const handleSave = async () => {
    if (!canAccess) return;
    setSaving(true);
    const content = textRef.current?.getHtml() ?? doc.content;
    const sketchDataUrl = sketchRef.current?.isBlank() ? undefined : sketchRef.current?.getDataUrl();
    await updateDoc(docRef, {
      title: title.trim() || 'Untitled Document',
      content,
      sketchDataUrl: sketchDataUrl ?? null,
      updatedAt: serverTimestamp(),
      updatedByDisplay: activeUser?.displayName ?? 'Unknown',
    });
    setSaving(false);
    toast({ title: 'Document saved' });
    if (client.path) {
      logActivity(firestore, client.path, 'base-doc', `"${title.trim() || 'Untitled Document'}" was updated`);
    }
  };

  const handleSaveAccess = async (allowedUsers: string[]) => {
    await updateDoc(docRef, { allowedUsers });
    toast({ title: 'Access updated' });
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const content = textRef.current?.getHtml() ?? doc.content;
      const sketchDataUrl = sketchRef.current?.isBlank() ? undefined : sketchRef.current?.getDataUrl();

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '-99999px';
      container.style.width = '650px';
      container.style.padding = '24px';
      container.style.fontFamily = 'Arial, Helvetica, sans-serif';
      container.style.color = '#111827';
      container.style.background = '#ffffff';

      const heading = document.createElement('h1');
      heading.textContent = title.trim() || 'Untitled Document';
      heading.style.fontSize = '22px';
      heading.style.marginBottom = '16px';
      container.appendChild(heading);

      const body = document.createElement('div');
      body.style.fontSize = '13px';
      body.style.lineHeight = '1.6';
      body.innerHTML = content;
      container.appendChild(body);

      if (sketchDataUrl) {
        const sketchHeading = document.createElement('h2');
        sketchHeading.textContent = 'Sketch';
        sketchHeading.style.fontSize = '16px';
        sketchHeading.style.margin = '20px 0 10px';
        container.appendChild(sketchHeading);

        const img = document.createElement('img');
        img.src = sketchDataUrl;
        img.style.width = '100%';
        img.style.border = '1px solid #e5e7eb';
        container.appendChild(img);
      }

      document.body.appendChild(container);

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      await new Promise<void>((resolve) => {
        pdf.html(container, {
          x: 20,
          y: 20,
          width: 555,
          windowWidth: 650,
          callback: () => resolve(),
        });
      });

      document.body.removeChild(container);
      pdf.save(`${(title.trim() || 'Untitled Document').replace(/[^\w\- ]+/g, '')}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      toast({ title: 'Export failed', description: 'Could not generate the PDF.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/30 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canAccess}
            className="h-8 text-sm font-semibold border-border/60 bg-background/50 max-w-xs"
            placeholder="Untitled Document"
          />
          {!canAccess && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Read-only
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCreator && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setIsAccessOpen(true)}>
              <Lock className="h-3.5 w-3.5" />
              Manage Access
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export PDF
          </Button>
          {canAccess && (
            <Button size="sm" className="h-8 gap-1.5 text-xs btn-gradient" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-border/30">
        <button
          onClick={() => setTab('text')}
          className={cn(
            'flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors',
            tab === 'text' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Type className="h-3.5 w-3.5" />
          Text
        </button>
        <button
          onClick={() => setTab('sketch')}
          className={cn(
            'flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors',
            tab === 'sketch' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <PenTool className="h-3.5 w-3.5" />
          Sketch
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <div className={cn('h-full', tab !== 'text' && 'hidden')}>
          <RichTextEditor ref={textRef} initialHtml={doc.content} editable={canAccess} />
        </div>
        <div className={cn('h-full', tab !== 'sketch' && 'hidden')}>
          <SketchCanvas ref={sketchRef} initialDataUrl={doc.sketchDataUrl} />
        </div>
      </div>

      {isCreator && (
        <ManageAccessDialog
          open={isAccessOpen}
          onOpenChange={setIsAccessOpen}
          doc={doc}
          accessKeys={accessKeys}
          onSave={handleSaveAccess}
        />
      )}
    </div>
  );
}
