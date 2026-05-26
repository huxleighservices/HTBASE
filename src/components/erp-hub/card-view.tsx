'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  User,
  Pencil,
  Check,
  X,
  Save,
  Plus,
  Trash2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { deptGlass, deptDivider, deptPill, statusColor, STATUS_LABELS } from '@/lib/departments';
import type { Department } from '@/lib/departments';
import type { ERPPerson, ERPNote, DepartmentId, DeptStatus } from '@/types/erp';
import type { AccessKey } from '@/types/session';
import { updateDocumentNonBlocking, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { WidgetChip, COLLECTION_TO_WIDGET } from './spreadsheet-view';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Widget chip config ───────────────────────────────────────────────────────

type ChipDetail = { label: string; value: string };
type WidgetChipConfig = {
  label: string;
  color: string;
  rgb: string;
  isGlobal?: boolean;
  getStatus: (d: any) => string;
  getDetails: (d: any) => ChipDetail[];
};

const WIDGET_CHIP_CONFIGS: Record<string, WidgetChipConfig> = {
  leads: {
    label: 'Leads',
    color: '#42A5F5',
    rgb: '66,165,245',
    getStatus: (d) => d.currentStep ?? 'Lead',
    getDetails: (d) => [
      { label: 'Agent',     value: d.agent ?? '—' },
      { label: 'Job Type',  value: d.jobType ?? '—' },
      { label: 'Revenue',   value: d.projectedRevenue ?? '—' },
      { label: 'Next Step', value: d.nextStepDueDate ?? '—' },
      { label: 'Notes',     value: d.pendingNotes || d.notes || '—' },
    ],
  },
  builds: {
    label: 'Builds',
    color: '#C1440E',
    rgb: '193,68,14',
    getStatus: (d) => d.buildStage ?? 'Build',
    getDetails: (d) => [
      { label: 'Proj. Manager', value: d.projectManager ?? '—' },
      { label: 'Revenue',       value: d.projectedRevenue ?? '—' },
      { label: 'Build Date',    value: d.buildDate ?? '—' },
      { label: 'Address',       value: d.address ?? '—' },
      { label: 'Notes',         value: d.pendingNotes || d.notes || '—' },
    ],
  },
  arCustomers: {
    label: 'A/R',
    color: '#5DBF8A',
    rgb: '93,191,138',
    getStatus: (d) => d.initialBalance != null ? `$${Number(d.initialBalance).toLocaleString()}` : 'A/R',
    getDetails: (d) => [
      { label: 'Balance', value: d.initialBalance != null ? `$${Number(d.initialBalance).toLocaleString()}` : '—' },
      { label: 'Email',   value: d.email ?? '—' },
      { label: 'Phone',   value: d.phone ?? '—' },
    ],
  },
  opacCustomers: {
    label: 'OPAC',
    color: '#8B5CF6',
    rgb: '139,92,246',
    getStatus: (d) => d.planType ?? 'OPAC',
    getDetails: (d) => [
      { label: 'Plan',          value: d.planType ?? '—' },
      { label: 'Plan Code',     value: d.planCode ?? '—' },
      { label: 'Face Amount',   value: d.policyFaceAmount ?? '—' },
      { label: 'Writing Agent', value: d.writingAgent ?? '—' },
    ],
  },
  completionCertificates: {
    label: 'Certificate',
    color: '#00BCD4',
    rgb: '0,188,212',
    isGlobal: true,
    getStatus: (d) => d.status ?? 'Certificate',
    getDetails: (d) => [
      { label: 'Project',    value: d.projectName ?? '—' },
      { label: 'Status',     value: d.status ?? '—' },
      { label: 'Created By', value: d.createdBy ?? '—' },
      { label: 'Insurance',  value: d.isInsuranceJob ? 'Yes' : 'No' },
    ],
  },
  supplementalAddendums: {
    label: 'Addendum',
    color: '#AB47BC',
    rgb: '171,71,188',
    isGlobal: true,
    getStatus: (d) => d.status ?? 'Addendum',
    getDetails: (d) => [
      { label: 'Project',    value: d.projectName ?? '—' },
      { label: 'Status',     value: d.status ?? '—' },
      { label: 'Address',    value: d.propertyAddress ?? '—' },
      { label: 'Created By', value: d.createdBy ?? '—' },
    ],
  },
};

// ─── LiveWidgetChip ───────────────────────────────────────────────────────────

type LeadForm = {
  firstName: string; lastName: string; phoneNumber: string; email: string;
  homeAddress: string; agent: string; source: string; jobType: string;
  currentStep: string; projectedRevenue: string; contactDate: string;
  nextStepDueDate: string; pendingNotes: string;
};

const EMPTY_LEAD_FORM: LeadForm = {
  firstName: '', lastName: '', phoneNumber: '', email: '',
  homeAddress: '', agent: '', source: '', jobType: '',
  currentStep: '', projectedRevenue: '', contactDate: '',
  nextStepDueDate: '', pendingNotes: '',
};

function LeadEditForm({
  data,
  docRef,
  color,
  rgb,
  onDone,
}: {
  data: Record<string, any>;
  docRef: any;
  color: string;
  rgb: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<LeadForm>({
    firstName:       data.firstName ?? '',
    lastName:        data.lastName ?? '',
    phoneNumber:     data.phoneNumber ?? '',
    email:           data.email ?? '',
    homeAddress:     data.homeAddress ?? '',
    agent:           data.agent ?? '',
    source:          data.source ?? '',
    jobType:         data.jobType ?? '',
    currentStep:     data.currentStep ?? '',
    projectedRevenue: data.projectedRevenue ?? '',
    contactDate:     data.contactDate ?? '',
    nextStepDueDate: data.nextStepDueDate ?? '',
    pendingNotes:    data.pendingNotes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof LeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!docRef) return;
    setSaving(true);
    try {
      await updateDoc(docRef, {
        firstName:        form.firstName,
        lastName:         form.lastName,
        phoneNumber:      form.phoneNumber,
        email:            form.email,
        homeAddress:      form.homeAddress,
        agent:            form.agent,
        source:           form.source,
        jobType:          form.jobType,
        currentStep:      form.currentStep,
        projectedRevenue: form.projectedRevenue,
        contactDate:      form.contactDate,
        nextStepDueDate:  form.nextStepDueDate,
        pendingNotes:     form.pendingNotes,
      });
      toast({ title: 'Lead updated', description: `${form.firstName} ${form.lastName} saved.` });
      onDone();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: `rgba(${rgb}, 0.06)`,
    border: `1px solid rgba(${rgb}, 0.2)`,
    color: 'var(--foreground)',
  } as React.CSSProperties;

  const labelCls = 'text-[9px] font-semibold uppercase tracking-wider mb-1 block';

  return (
    <div className="px-3 pb-3 space-y-3" style={{ borderTop: `1px solid rgba(${rgb}, 0.15)` }}>

      {/* Contact info */}
      <div className="pt-2.5">
        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color, opacity: 0.7 }}>
          Contact Info
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} style={{ color }}>First Name</label>
            <Input value={form.firstName} onChange={set('firstName')} className="h-7 text-xs" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color }}>Last Name</label>
            <Input value={form.lastName} onChange={set('lastName')} className="h-7 text-xs" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color }}>Phone</label>
            <Input value={form.phoneNumber} onChange={set('phoneNumber')} className="h-7 text-xs" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color }}>Email</label>
            <Input value={form.email} onChange={set('email')} className="h-7 text-xs" style={inputStyle} />
          </div>
        </div>
        <div className="mt-2">
          <label className={labelCls} style={{ color }}>Address</label>
          <Input value={form.homeAddress} onChange={set('homeAddress')} className="h-7 text-xs" style={inputStyle} />
        </div>
      </div>

      {/* Lead info */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color, opacity: 0.7 }}>
          Lead Info
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} style={{ color }}>Agent</label>
            <Input value={form.agent} onChange={set('agent')} className="h-7 text-xs" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color }}>Source</label>
            <Input value={form.source} onChange={set('source')} className="h-7 text-xs" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color }}>Job Type</label>
            <Input value={form.jobType} onChange={set('jobType')} className="h-7 text-xs" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color }}>Revenue</label>
            <Input value={form.projectedRevenue} onChange={set('projectedRevenue')} className="h-7 text-xs" style={inputStyle} />
          </div>
        </div>
        <div className="mt-2">
          <label className={labelCls} style={{ color }}>Current Step</label>
          <Input value={form.currentStep} onChange={set('currentStep')} className="h-7 text-xs" style={inputStyle} />
        </div>
      </div>

      {/* Dates */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color, opacity: 0.7 }}>
          Dates
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} style={{ color }}>Contact Date</label>
            <Input value={form.contactDate} onChange={set('contactDate')} className="h-7 text-xs" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color }}>Next Step Due</label>
            <Input value={form.nextStepDueDate} onChange={set('nextStepDueDate')} className="h-7 text-xs" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls} style={{ color }}>Notes</label>
        <Textarea
          value={form.pendingNotes}
          onChange={set('pendingNotes')}
          rows={2}
          className="text-xs resize-none"
          style={inputStyle}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onDone}
          className="flex-1 h-7 text-xs border"
          style={{ borderColor: `rgba(${rgb}, 0.2)`, color: 'var(--muted-foreground)' }}
        >
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-7 text-xs font-semibold"
          style={{
            background: `rgba(${rgb}, 0.2)`,
            border: `1px solid rgba(${rgb}, 0.4)`,
            color,
            boxShadow: `0 0 10px rgba(${rgb}, 0.15)`,
          }}
        >
          <Save className="h-3 w-3 mr-1" />{saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function LiveWidgetChip({
  clientPath,
  collectionName,
  docId,
  isExpanded,
  onToggle,
  onJumpToWidget,
}: {
  clientPath: string;
  collectionName: string;
  docId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onJumpToWidget?: (widgetType: string) => void;
}) {
  const firestore = useFirestore();
  const cfg = WIDGET_CHIP_CONFIGS[collectionName];
  const [isEditing, setIsEditing] = useState(false);
  const [jumpPending, setJumpPending] = useState(false);
  const widgetType = COLLECTION_TO_WIDGET[collectionName];

  // Reset edit mode whenever the chip collapses
  useEffect(() => {
    if (!isExpanded) setIsEditing(false);
  }, [isExpanded]);

  const ref = useMemoFirebase(() => {
    if (!firestore || !docId || !cfg) return null;
    return cfg.isGlobal
      ? doc(firestore, collectionName, docId)
      : doc(firestore, `${clientPath}/${collectionName}/${docId}`);
  }, [firestore, clientPath, collectionName, docId, cfg]);
  const { data } = useDoc<Record<string, any>>(ref);

  if (!cfg) return null;

  const status = data ? cfg.getStatus(data) : '…';
  const details = data ? cfg.getDetails(data).filter((d) => d.value !== '—') : [];
  const canEdit = collectionName === 'leads';

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: isExpanded ? `rgba(${cfg.rgb}, 0.1)` : `rgba(${cfg.rgb}, 0.05)`,
        border: `1px solid rgba(${cfg.rgb}, ${isExpanded ? '0.4' : '0.2'})`,
        boxShadow: isExpanded ? `0 0 16px rgba(${cfg.rgb}, 0.18)` : 'none',
      }}
    >
      {/* Always-visible header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
        />
        <span className="text-xs font-bold tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
        <div className="flex-grow h-px mx-1" style={{ background: `rgba(${cfg.rgb}, 0.2)` }} />
        <span className="text-xs font-semibold" style={{ color: cfg.color }}>{status}</span>
        {canEdit && !isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); if (!isExpanded) onToggle(); setIsEditing(true); }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all hover:opacity-80"
            style={{
              background: `rgba(${cfg.rgb}, 0.15)`,
              border: `1px solid rgba(${cfg.rgb}, 0.3)`,
              color: cfg.color,
            }}
          >
            <Pencil className="h-2.5 w-2.5" />Edit
          </button>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: cfg.color, opacity: 0.6 }}
        />
      </div>

      {/* Expandable content */}
      {isExpanded && (
        isEditing && canEdit && data ? (
          <LeadEditForm
            data={data}
            docRef={ref}
            color={cfg.color}
            rgb={cfg.rgb}
            onDone={() => setIsEditing(false)}
          />
        ) : (
          <div className="px-3 pb-3" style={{ borderTop: `1px solid rgba(${cfg.rgb}, 0.15)` }}>
            {details.length === 0 ? (
              <p className="text-[10px] text-muted-foreground pt-2">No details available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2.5">
                {details.map((d) => (
                  <div key={d.label} className="min-w-0">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{d.label}</p>
                    <p className="text-xs font-medium truncate" style={{ color: cfg.color }}>{d.value}</p>
                  </div>
                ))}
              </div>
            )}
            {widgetType && onJumpToWidget && (
              <button
                onClick={(e) => { e.stopPropagation(); setJumpPending(true); }}
                className="flex items-center gap-1.5 mt-2.5 text-[10px] font-semibold hover:opacity-80 transition-opacity"
                style={{ color: cfg.color }}
              >
                <ExternalLink className="h-3 w-3" />
                Open in {cfg.label}
              </button>
            )}
          </div>
        )
      )}

      {jumpPending && (
        <AlertDialog open={jumpPending} onOpenChange={setJumpPending}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch to {cfg.label}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will close Base and open {cfg.label}. You can return to Base at any time from the navigation bar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay in Base</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onJumpToWidget!(widgetType)}
                style={{ background: `rgba(${cfg.rgb}, 0.2)`, border: `1px solid rgba(${cfg.rgb}, 0.4)`, color: cfg.color }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open {cfg.label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Note helpers ─────────────────────────────────────────────────────────────

function fmtNoteDate(val: any): string {
  if (!val) return '';
  try {
    const d = typeof val === 'string' ? new Date(val) : val?.toDate?.() ?? new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function NoteChip({
  note,
  dept,
  onEdit,
  onDelete,
}: {
  note: ERPNote;
  dept: Department;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="relative group flex items-start gap-1.5 px-2 py-1.5 rounded-lg cursor-default w-full"
            style={{
              background: `rgba(${dept.rgb}, 0.07)`,
              border: `1px solid rgba(${dept.rgb}, 0.2)`,
            }}
          >
            <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" style={{ color: dept.color, opacity: 0.6 }} />
            <span className="flex-grow text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--foreground)' }}>
              {note.text}
            </span>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: dept.color }}
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-0.5 rounded hover:bg-red-500/20 transition-colors"
                style={{ color: '#ef4444' }}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs p-0 overflow-hidden"
          style={{
            background: 'rgba(8,8,18,0.97)',
            border: `1px solid rgba(${dept.rgb}, 0.35)`,
            boxShadow: `0 0 20px rgba(${dept.rgb}, 0.2)`,
          }}
        >
          <div
            className="px-2 py-0.5"
            style={{ background: `rgba(${dept.rgb}, 0.2)`, borderBottom: `1px solid rgba(${dept.rgb}, 0.2)` }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: dept.color }}>Note</span>
          </div>
          <div className="px-3 py-2 space-y-1.5">
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{note.text}</p>
            <p className="text-[10px] text-muted-foreground">
              — {note.author}{fmtNoteDate(note.createdAt) ? ` · ${fmtNoteDate(note.createdAt)}` : ''}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DeptSection({
  dept,
  entry,
  person,
  itemsRef,
  activeUserName,
}: {
  dept: Department;
  entry: any;
  person: ERPPerson;
  itemsRef: any;
  activeUserName: string;
}) {
  const status = entry?.status ?? 'inactive';
  const notesList: ERPNote[] = entry?.notesList ?? [];
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const saveNote = () => {
    if (!noteText.trim() || !itemsRef) return;
    const newNote: ERPNote = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      text: noteText.trim(),
      author: activeUserName,
      createdAt: new Date().toISOString(),
    };
    updateDocumentNonBlocking(doc(itemsRef, person.id), {
      [`deptData.${dept.id}.notesList`]: [...notesList, newNote],
    });
    setNoteText('');
    setAddingNote(false);
  };

  const saveEdit = (id: string) => {
    if (!editingText.trim() || !itemsRef) return;
    const updated = notesList.map((n) =>
      n.id === id ? { ...n, text: editingText.trim(), updatedAt: new Date().toISOString() } : n,
    );
    updateDocumentNonBlocking(doc(itemsRef, person.id), {
      [`deptData.${dept.id}.notesList`]: updated,
    });
    setEditingId(null);
  };

  const deleteNote = (id: string) => {
    if (!itemsRef) return;
    updateDocumentNonBlocking(doc(itemsRef, person.id), {
      [`deptData.${dept.id}.notesList`]: notesList.filter((n) => n.id !== id),
    });
  };

  const handleStatusChange = (status: DeptStatus) => {
    if (!itemsRef) return;
    updateDocumentNonBlocking(doc(itemsRef, person.id), {
      [`deptData.${dept.id}.status`]: status,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-grow" style={deptDivider(dept)} />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
          style={deptPill(dept)}
        >
          {dept.label}
        </span>
      </div>

      <div className="p-3 space-y-2" style={deptGlass(dept, 'low')}>
        {/* Status */}
        <div className="flex items-center justify-between gap-2">
          <Select value={status} onValueChange={(v) => handleStatusChange(v as DeptStatus)}>
            <SelectTrigger
              className="h-7 w-36 text-xs border-0 bg-transparent focus:ring-0"
              style={{ color: statusColor(status) }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: statusColor(status), boxShadow: `0 0 5px ${statusColor(status)}` }}
                />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Add note button */}
          <button
            onClick={() => { setAddingNote(true); setEditingId(null); }}
            className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-all hover:opacity-80"
            style={{
              background: `rgba(${dept.rgb}, 0.1)`,
              border: `1px solid rgba(${dept.rgb}, 0.25)`,
              color: dept.color,
            }}
          >
            <Plus className="h-2.5 w-2.5" />Note
          </button>
        </div>

        {/* Legacy string notes */}
        {entry?.notes && (
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.notes}</p>
        )}

        {/* Custom fields */}
        {entry?.fields && entry.fields.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {entry.fields.map((f: any) => (
              <div key={f.key} className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                <p className="text-xs font-medium">{f.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Notes list */}
        {notesList.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            {notesList.map((note) =>
              editingId === note.id ? (
                <div key={note.id} className="space-y-1.5">
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                    autoFocus
                    className="text-xs resize-none"
                    style={{
                      background: `rgba(${dept.rgb}, 0.07)`,
                      border: `1px solid rgba(${dept.rgb}, 0.3)`,
                      color: 'var(--foreground)',
                    }}
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-6 px-2 text-[10px] flex-1 border"
                      style={{ borderColor: `rgba(${dept.rgb}, 0.2)`, color: 'var(--muted-foreground)' }}
                    >
                      <X className="h-2.5 w-2.5 mr-1" />Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEdit(note.id)}
                      disabled={!editingText.trim()}
                      className="h-6 px-2 text-[10px] font-semibold flex-1"
                      style={{ background: `rgba(${dept.rgb}, 0.2)`, border: `1px solid rgba(${dept.rgb}, 0.4)`, color: dept.color }}
                    >
                      <Save className="h-2.5 w-2.5 mr-1" />Save
                    </Button>
                  </div>
                </div>
              ) : (
                <NoteChip
                  key={note.id}
                  note={note}
                  dept={dept}
                  onEdit={() => { setEditingId(note.id); setEditingText(note.text); setAddingNote(false); }}
                  onDelete={() => deleteNote(note.id)}
                />
              ),
            )}
          </div>
        )}

        {/* Add note form */}
        {addingNote && (
          <div className="space-y-1.5 pt-0.5">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              autoFocus
              className="text-xs resize-none"
              style={{
                background: `rgba(${dept.rgb}, 0.07)`,
                border: `1px solid rgba(${dept.rgb}, 0.3)`,
                color: 'var(--foreground)',
              }}
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAddingNote(false); setNoteText(''); }}
                className="h-6 px-2 text-[10px] flex-1 border"
                style={{ borderColor: `rgba(${dept.rgb}, 0.2)`, color: 'var(--muted-foreground)' }}
              >
                <X className="h-2.5 w-2.5 mr-1" />Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveNote}
                disabled={!noteText.trim()}
                className="h-6 px-2 text-[10px] font-semibold flex-1"
                style={{ background: `rgba(${dept.rgb}, 0.2)`, border: `1px solid rgba(${dept.rgb}, 0.4)`, color: dept.color }}
              >
                <Save className="h-2.5 w-2.5 mr-1" />Save Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CardView ─────────────────────────────────────────────────────────────────

type CardViewProps = {
  people: ERPPerson[];
  enabledDepartments: Department[];
  firmName: string;
  itemsRef: any;
  clientPath: string;
  widgetDepts: Record<string, string>;
  selectedPersonId?: string | null;
  activeUser: AccessKey | null;
  onJumpToWidget?: (widgetType: string) => void;
};

export function CardView({ people, enabledDepartments, itemsRef, clientPath, widgetDepts, selectedPersonId, activeUser, onJumpToWidget }: CardViewProps) {
  const [index, setIndex] = useState(0);
  const [isEditingDepts, setIsEditingDepts] = useState(false);
  const [localDepts, setLocalDepts] = useState<DepartmentId[]>([]);
  const [expandedChip, setExpandedChip] = useState<string | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: '', email: '', phone: '' });

  const person = people[index] ?? null;
  const total = people.length;

  // Jump to person selected from spreadsheet/hybrid
  useEffect(() => {
    if (!selectedPersonId) return;
    const idx = people.findIndex((p) => p.id === selectedPersonId);
    if (idx >= 0) setIndex(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId]);

  // Clamp index when list shrinks
  useEffect(() => {
    if (index >= total && total > 0) setIndex(total - 1);
  }, [total, index]);

  // Reset editor state on person change
  useEffect(() => {
    setIsEditingDepts(false);
    setIsEditingInfo(false);
    setLocalDepts(person?.departments ?? []);
    setExpandedChip(null);
  }, [person?.id]);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(total - 1, i + 1));

  const handleSaveDepts = () => {
    if (!itemsRef || !person) return;
    updateDocumentNonBlocking(doc(itemsRef, person.id), { departments: localDepts });
    setIsEditingDepts(false);
  };

  const toggleLocalDept = (id: DepartmentId) => {
    setLocalDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const personDepts = person
    ? enabledDepartments.filter((d) => person.departments.includes(d.id))
    : [];

  return (
    <div className="flex flex-col flex-grow min-h-0">
      <div className="flex flex-grow min-h-0 gap-0 relative">

        {/* Left nav */}
        <div className="flex items-center justify-center w-12 sm:w-16 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={index === 0 || total === 0}
            className="h-12 w-12 rounded-full transition-all duration-200 hover:bg-white/10 disabled:opacity-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>

        {/* Person card */}
        <div className="flex-grow min-w-0 flex flex-col min-h-0 py-2">
          {!person ? (
            <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground gap-3">
              <User className="h-12 w-12 opacity-20" />
              <p className="text-sm">No records yet. Add someone to get started.</p>
            </div>
          ) : (
            <div
              className="flex flex-col flex-grow min-h-0 rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 0 40px rgba(244,196,48,0.15), 0 0 80px rgba(244,196,48,0.06), inset 0 0 0 1px rgba(244,196,48,0.18)',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Identity header */}
              <div className="px-4 pt-4 pb-3 shrink-0 border-b border-white/8">
                <div className="flex items-start gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold"
                    style={{
                      background: 'linear-gradient(135deg, rgba(244,196,48,0.3) 0%, rgba(244,196,48,0.1) 100%)',
                      border: '1px solid rgba(244,196,48,0.35)',
                      boxShadow: '0 0 16px rgba(244,196,48,0.25)',
                      color: '#F4C430',
                    }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>

                  {isEditingInfo ? (
                    <div className="flex-grow min-w-0 space-y-2">
                      <Input
                        value={infoForm.name}
                        onChange={(e) => setInfoForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Full name"
                        className="h-7 text-sm font-bold"
                        style={{ background: 'rgba(244,196,48,0.06)', border: '1px solid rgba(244,196,48,0.25)', color: 'var(--foreground)' }}
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={infoForm.email}
                          onChange={(e) => setInfoForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="Email"
                          type="email"
                          className="h-7 text-xs"
                          style={{ background: 'rgba(244,196,48,0.06)', border: '1px solid rgba(244,196,48,0.25)', color: 'var(--foreground)' }}
                        />
                        <Input
                          value={infoForm.phone}
                          onChange={(e) => setInfoForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="Phone"
                          type="tel"
                          className="h-7 text-xs"
                          style={{ background: 'rgba(244,196,48,0.06)', border: '1px solid rgba(244,196,48,0.25)', color: 'var(--foreground)' }}
                        />
                      </div>
                      <div className="flex gap-2 pt-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingInfo(false)}
                          className="h-7 px-2.5 text-xs border flex-1"
                          style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }}
                        >
                          <X className="h-3 w-3 mr-1" />Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!infoForm.name.trim()}
                          onClick={() => {
                            if (!itemsRef || !person || !infoForm.name.trim()) return;
                            updateDocumentNonBlocking(doc(itemsRef, person.id), {
                              name: infoForm.name.trim(),
                              email: infoForm.email.trim(),
                              phone: infoForm.phone.trim(),
                            });
                            setIsEditingInfo(false);
                          }}
                          className="h-7 px-2.5 text-xs font-semibold flex-1"
                          style={{ background: 'rgba(244,196,48,0.18)', border: '1px solid rgba(244,196,48,0.35)', color: '#F4C430' }}
                        >
                          <Save className="h-3 w-3 mr-1" />Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow min-w-0">
                      <h2 className="font-bold text-lg leading-tight truncate">{person.name}</h2>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {person.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />{person.email}
                          </span>
                        )}
                        {person.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{person.phone}
                          </span>
                        )}
                      </div>

                      {/* Widget chips row */}
                      {person.widgetLinks && Object.keys(person.widgetLinks).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.keys(person.widgetLinks).map((col) => (
                            <WidgetChip key={col} colKey={col} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">{index + 1} / {total}</span>
                    <button
                      onClick={() => {
                        setInfoForm({ name: person.name ?? '', email: person.email ?? '', phone: person.phone ?? '' });
                        setIsEditingInfo((v) => !v);
                        setIsEditingDepts(false);
                      }}
                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-all"
                      style={
                        isEditingInfo
                          ? { background: 'rgba(244,196,48,0.18)', color: '#F4C430', border: '1px solid rgba(244,196,48,0.3)' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.1)' }
                      }
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setLocalDepts(person.departments ?? []);
                        setIsEditingDepts((v) => !v);
                        setIsEditingInfo(false);
                      }}
                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-all"
                      style={
                        isEditingDepts
                          ? { background: 'rgba(244,196,48,0.18)', color: '#F4C430', border: '1px solid rgba(244,196,48,0.3)' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.1)' }
                      }
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      Depts
                    </button>
                  </div>
                </div>
              </div>

              {/* Live widget status cards — sorted by dept order */}
              {person.widgetLinks && Object.keys(person.widgetLinks).length > 0 && (() => {
                const sorted = Object.entries(person.widgetLinks).sort(([colA], [colB]) => {
                  const ia = enabledDepartments.findIndex((d) => d.id === widgetDepts[colA]);
                  const ib = enabledDepartments.findIndex((d) => d.id === widgetDepts[colB]);
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                });
                return (
                  <div
                    className="px-3 py-2.5 shrink-0 space-y-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Live Widget Status
                    </p>
                    {sorted.map(([colName, docId]) => (
                      <LiveWidgetChip
                        key={colName}
                        clientPath={clientPath}
                        collectionName={colName}
                        docId={docId}
                        isExpanded={expandedChip === colName}
                        onToggle={() => setExpandedChip((prev) => (prev === colName ? null : colName))}
                        onJumpToWidget={onJumpToWidget}
                      />
                    ))}
                  </div>
                );
              })()}

              {/* Department sections */}
              <div className="flex-grow overflow-y-auto px-3 py-3 space-y-3">

                {/* Inline department editor */}
                {isEditingDepts && (
                  <div
                    className="rounded-xl p-3 space-y-2.5"
                    style={{ background: 'rgba(244,196,48,0.05)', border: '1px solid rgba(244,196,48,0.2)' }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#F4C430' }}>
                      Assign Departments
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {enabledDepartments.map((dept) => {
                        const active = localDepts.includes(dept.id);
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => toggleLocalDept(dept.id)}
                            className="rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150"
                            style={
                              active
                                ? { ...deptPill(dept), boxShadow: `0 0 8px rgba(${dept.rgb}, 0.4)` }
                                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--muted-foreground)' }
                            }
                          >
                            {dept.label}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveDepts}
                      className="h-7 px-3 text-xs gap-1.5"
                      style={{
                        background: 'rgba(244,196,48,0.15)',
                        border: '1px solid rgba(244,196,48,0.3)',
                        color: '#F4C430',
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </Button>
                  </div>
                )}

                {personDepts.length === 0 && !isEditingDepts ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No departments assigned. Press <span className="font-medium">Depts</span> to assign some.
                  </p>
                ) : (
                  personDepts.map((dept) => (
                    <DeptSection
                      key={dept.id}
                      dept={dept}
                      entry={person.deptData?.[dept.id]}
                      person={person}
                      itemsRef={itemsRef}
                      activeUserName={activeUser?.displayName ?? 'Unknown'}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right nav */}
        <div className="flex items-center justify-center w-12 sm:w-16 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={index >= total - 1 || total === 0}
            className="h-12 w-12 rounded-full transition-all duration-200 hover:bg-white/10 disabled:opacity-20"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
