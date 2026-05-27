'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, CheckSquare, Square, Minus, ExternalLink } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import type { Department } from '@/lib/departments';
import { STATUS_LABELS } from '@/lib/departments';
import type { ERPPerson, ERPDeptEntry } from '@/types/erp';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const WIDGET_CHIP_DEFS: Record<string, { label: string; color: string; rgb: string }> = {
  leads:                  { label: 'Leads',       color: '#42A5F5', rgb: '66,165,245' },
  builds:                 { label: 'Builds',      color: '#C1440E', rgb: '193,68,14' },
  arCustomers:            { label: 'A/R',         color: '#5DBF8A', rgb: '93,191,138' },
  opacCustomers:          { label: 'OPAC',        color: '#8B5CF6', rgb: '139,92,246' },
  completionCertificates: { label: 'Certificate', color: '#00BCD4', rgb: '0,188,212' },
  supplementalAddendums:  { label: 'Addendum',    color: '#AB47BC', rgb: '171,71,188' },
  deals:                  { label: 'Deal',        color: '#FF7043', rgb: '255,112,67' },
  knockPins:              { label: 'Knock Pro',   color: '#EC4899', rgb: '236,72,153' },
};

export const COLLECTION_TO_WIDGET: Record<string, string> = {
  leads:                  'leads',
  builds:                 'builds',
  arCustomers:            'ar-collections',
  opacCustomers:          'opac',
  completionCertificates: 'completion-certificate',
  supplementalAddendums:  'supplemental-addendum',
  deals:                  'deal-tracker',
  knockPins:              'knock-pro',
};

export const DEFAULT_WIDGET_DEPTS: Record<string, string> = {
  leads:                  'sales',
  builds:                 'operations',
  arCustomers:            'accounting',
  opacCustomers:          'sales',
  completionCertificates: 'operations',
  supplementalAddendums:  'operations',
  deals:                  'sales',
  knockPins:              'sales',
};

const HEADER_BG = 'rgba(8,8,18,0.97)';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(val: any): string {
  const d = toDate(val);
  return d ? format(d, 'MMM d, yyyy') : '—';
}

function fmtAgo(val: any): string {
  const d = toDate(val);
  if (!d) return '—';
  try { return formatDistanceToNow(d, { addSuffix: true }); } catch { return '—'; }
}

function fmtCurrency(val: any): string {
  const n = parseFloat(String(val ?? '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? String(val ?? '—') : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny shared UI
// ─────────────────────────────────────────────────────────────────────────────

function SRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex items-start gap-2 text-[11px] leading-snug">
      <span className="w-20 shrink-0 text-white/40 font-medium">{label}</span>
      <span className="text-white/85 break-words min-w-0 flex-1">{value}</span>
    </div>
  );
}

function StatusPill({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide leading-none"
      style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
    >
      {label}
    </span>
  );
}

function Divider() {
  return <div className="border-t border-white/8 my-2" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-widget summary content
// ─────────────────────────────────────────────────────────────────────────────

function LeadSummaryContent({ d }: { d: any }) {
  const step = d.currentStep ?? '';
  const stepColor =
    /signed|build date|permit|in progress|collections/i.test(step) ? '#4CAF50'
    : /archived/i.test(step) ? '#ef4444'
    : /paid.*done/i.test(step) ? '#9e9e9e'
    : '#F4C430';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white/90">
          {d.firstName ?? ''} {d.lastName ?? ''}
        </span>
        {step && <StatusPill label={step} color={stepColor} />}
      </div>
      <Divider />
      <SRow label="Agent" value={d.agent} />
      <SRow label="Job Type" value={d.jobType} />
      <SRow label="Revenue" value={d.revenue ? fmtCurrency(d.revenue) : null} />
      <SRow label="Next Due" value={d.nextStepDueDate} />
      <SRow label="Contact" value={d.contactDate} />
      {d.pendingNotes && (
        <>
          <Divider />
          <p className="text-[11px] text-white/50 italic leading-snug line-clamp-3">
            {d.pendingNotes}
          </p>
        </>
      )}
    </div>
  );
}

function BuildSummaryContent({ d }: { d: any }) {
  const stage = d.buildStage ?? '';
  const stageColor =
    /done|complete/i.test(stage) ? '#4CAF50'
    : /in progress/i.test(stage) ? '#42A5F5'
    : /archived|cancelled/i.test(stage) ? '#ef4444'
    : '#F4C430';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white/90 truncate">{d.buildName ?? '—'}</span>
        {stage && <StatusPill label={stage} color={stageColor} />}
      </div>
      <Divider />
      <SRow label="Client" value={d.clientName} />
      <SRow label="PM" value={d.projectManager} />
      <SRow label="Revenue" value={d.projectedRevenue ? fmtCurrency(d.projectedRevenue) : null} />
      <SRow label="Build Date" value={d.buildDate} />
      <SRow label="Inspection" value={d.inspectionDate} />
      <SRow label="Contract" value={d.contractDate} />
      {d.pendingNotes && (
        <>
          <Divider />
          <p className="text-[11px] text-white/50 italic leading-snug line-clamp-3">
            {d.pendingNotes}
          </p>
        </>
      )}
    </div>
  );
}

function ARSummaryContent({ d }: { d: any }) {
  const buildDate = toDate(d.buildCompleteDate);
  const daysSince = buildDate ? differenceInDays(new Date(), buildDate) : null;

  // activityLog stored as array field (via arrayUnion updates)
  const activityLog: any[] = d.activityLog ?? [];
  const sortedLog = [...activityLog].sort((a, b) => {
    const ta = toDate(a.date)?.getTime() ?? 0;
    const tb = toDate(b.date)?.getTime() ?? 0;
    return tb - ta;
  });
  const latestActivity = sortedLog[0];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white/90 truncate">{d.customerName ?? '—'}</span>
        {daysSince !== null && (
          <span className="text-[10px] text-white/40 shrink-0">{daysSince}d since build</span>
        )}
      </div>
      <Divider />
      <SRow label="Balance" value={d.initialBalance != null ? fmtCurrency(d.initialBalance) : null} />
      <SRow label="Build Done" value={buildDate ? fmtDate(d.buildCompleteDate) : null} />
      <SRow label="Email" value={d.email} />
      <SRow label="Phone" value={d.phone} />
      {latestActivity && (
        <>
          <Divider />
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                Latest Activity
              </span>
              <span className="text-[10px] text-white/35">{fmtAgo(latestActivity.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(93,191,138,0.18)', border: '1px solid rgba(93,191,138,0.35)', color: '#5DBF8A' }}
              >
                {latestActivity.type}
              </span>
              {latestActivity.user && (
                <span className="text-[10px] text-white/35">by {latestActivity.user}</span>
              )}
            </div>
            {latestActivity.note && (
              <p className="text-[11px] text-white/55 italic leading-snug line-clamp-2 mt-0.5">
                "{latestActivity.note}"
              </p>
            )}
          </div>
          {sortedLog.length > 1 && (
            <p className="text-[10px] text-white/30">{sortedLog.length} total activity entries</p>
          )}
        </>
      )}
      {activityLog.length === 0 && (
        <>
          <Divider />
          <p className="text-[10px] text-white/30 italic">No activity logged yet</p>
        </>
      )}
    </div>
  );
}

function OPACSummaryContent({ d }: { d: any }) {
  const activityLog: any[] = d.activityLog ?? [];
  const sortedLog = [...activityLog].sort((a, b) => {
    const ta = toDate(a.timestamp)?.getTime() ?? 0;
    const tb = toDate(b.timestamp)?.getTime() ?? 0;
    return tb - ta;
  });
  const latest = sortedLog[0];

  return (
    <div className="space-y-1">
      <div className="text-xs font-bold text-white/90">
        {d.firstName ?? ''} {d.lastName ?? ''}
      </div>
      <Divider />
      <SRow label="Franchise" value={d.franchise} />
      <SRow label="Agent" value={d.writingAgent} />
      <SRow label="Plan" value={[d.planCode, d.planType].filter(Boolean).join(' · ')} />
      <SRow label="Face Amt" value={d.policyFaceAmount} />
      {d.extraInfo && <SRow label="Notes" value={d.extraInfo} />}
      {latest && (
        <>
          <Divider />
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Latest Activity</span>
              <span className="text-[10px] text-white/35">{fmtAgo(latest.timestamp)}</span>
            </div>
            <p className="text-[11px] text-white/55 italic leading-snug line-clamp-2">"{latest.activity}"</p>
            {latest.user && <p className="text-[10px] text-white/35">by {latest.user}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function CertSummaryContent({ d }: { d: any }) {
  const statusColor = d.status === 'signed' ? '#4CAF50' : d.status === 'pending' ? '#F4C430' : '#ef4444';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white/90 truncate">{d.projectName ?? '—'}</span>
        <StatusPill
          label={d.status ?? 'unknown'}
          color={statusColor}
        />
      </div>
      <Divider />
      <SRow label="Customer" value={d.customerName} />
      <SRow label="Email" value={d.customerEmail} />
      <SRow label="Created" value={fmtDate(d.createdAt)} />
      {d.signedAt && <SRow label="Signed" value={fmtDate(d.signedAt)} />}
    </div>
  );
}

function AddendumSummaryContent({ d }: { d: any }) {
  const statusColor =
    d.status === 'authorized' ? '#4CAF50'
    : d.status === 'declined' ? '#ef4444'
    : d.status === 'not-needed' ? '#9e9e9e'
    : '#F4C430';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white/90 truncate">{d.projectName ?? '—'}</span>
        <StatusPill label={d.status ?? 'unknown'} color={statusColor} />
      </div>
      <Divider />
      <SRow label="Customer" value={d.customerName} />
      <SRow label="Created" value={fmtDate(d.createdAt)} />
      {d.changes && (
        <>
          <Divider />
          <p className="text-[11px] text-white/50 italic leading-snug line-clamp-3">{d.changes}</p>
        </>
      )}
    </div>
  );
}

function DealSummaryContent({ d }: { d: any }) {
  const stageColor =
    /closed|won/i.test(d.stage ?? '') ? '#4CAF50'
    : /lost|dead/i.test(d.stage ?? '') ? '#ef4444'
    : '#F4C430';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white/90 truncate">{d.title ?? '—'}</span>
        {d.stage && <StatusPill label={d.stage} color={stageColor} />}
      </div>
      <Divider />
      <SRow label="Contact" value={d.contactName} />
      <SRow label="Phone" value={d.contactPhone} />
      <SRow label="Value" value={d.value != null ? fmtCurrency(d.value) : null} />
      <SRow label="Probability" value={d.probability != null ? `${d.probability}%` : null} />
      <SRow label="Assignee" value={d.assignee} />
      {d.notes && (
        <>
          <Divider />
          <p className="text-[11px] text-white/50 italic leading-snug line-clamp-3">{d.notes}</p>
        </>
      )}
    </div>
  );
}

function KnockPinSummaryContent({ d }: { d: any }) {
  const statusColor =
    d.status === 'accepted' ? '#4CAF50'
    : d.status === 'rejected' ? '#ef4444'
    : '#F4C430';
  const statusLabel = (d.status ?? '').replace(/-/g, ' ');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white/90 truncate">{d.personName ?? '—'}</span>
        {d.status && <StatusPill label={statusLabel} color={statusColor} />}
      </div>
      <Divider />
      <SRow label="Phone" value={d.phone} />
      <SRow label="Address" value={d.address} />
      <SRow label="Agent" value={d.knockedByDisplayName || d.knockedBy} />
      <SRow label="Date" value={fmtDate(d.date)} />
      {(d.salesInfo || d.notes) && (
        <>
          <Divider />
          <p className="text-[11px] text-white/50 italic leading-snug line-clamp-3">
            {d.salesInfo || d.notes}
          </p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget chip with hover popover
// ─────────────────────────────────────────────────────────────────────────────

export function WidgetChip({ colKey }: { colKey: string }) {
  const cfg = WIDGET_CHIP_DEFS[colKey];
  if (!cfg) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none whitespace-nowrap"
      style={{
        background: `rgba(${cfg.rgb}, 0.14)`,
        border: `1px solid rgba(${cfg.rgb}, 0.35)`,
        color: cfg.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }}
      />
      {cfg.label}
    </span>
  );
}

export function WidgetChipWithPopover({
  colKey,
  docId,
  clientPath,
  onJumpToWidget,
}: {
  colKey: string;
  docId: string;
  clientPath: string;
  onJumpToWidget?: (widgetType: string) => void;
}) {
  const cfg = WIDGET_CHIP_DEFS[colKey];
  const firestore = useFirestore();
  const [docData, setDocData] = useState<any>(null);
  const [fetched, setFetched] = useState(false);
  const [jumpPending, setJumpPending] = useState(false);
  const widgetType = COLLECTION_TO_WIDGET[colKey];

  const handleOpen = useCallback(async (open: boolean) => {
    if (!open || fetched || !firestore || !docId) return;
    try {
      // Certs and addendums live at the Firestore root; all others are under clientPath
      const isRootCollection =
        colKey === 'completionCertificates' || colKey === 'supplementalAddendums';
      const docRef = isRootCollection
        ? doc(firestore, colKey, docId)
        : doc(firestore, clientPath, colKey, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) setDocData({ ...snap.data(), id: snap.id });
    } catch { /* ignore */ }
    setFetched(true);
  }, [firestore, clientPath, colKey, docId, fetched]);

  if (!cfg) return null;

  const triggerEl = (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none whitespace-nowrap cursor-pointer transition-all hover:brightness-125"
      style={{
        background: `rgba(${cfg.rgb}, 0.14)`,
        border: `1px solid rgba(${cfg.rgb}, 0.35)`,
        color: cfg.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }}
      />
      {cfg.label}
    </span>
  );

  if (!clientPath || !docId) return triggerEl;

  return (
    <>
    <TooltipProvider delayDuration={350} skipDelayDuration={200}>
      <Tooltip onOpenChange={handleOpen}>
        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
          {triggerEl}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="w-72 p-0 overflow-hidden border-0"
          style={{
            background: 'rgba(10,10,24,0.97)',
            backdropFilter: 'blur(20px)',
            border: `1px solid rgba(${cfg.rgb}, 0.3)`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(${cfg.rgb},0.15)`,
          }}
        >
          {/* Colored header bar */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              background: `rgba(${cfg.rgb}, 0.12)`,
              borderBottom: `1px solid rgba(${cfg.rgb}, 0.2)`,
            }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
            />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          </div>

          {/* Body */}
          <div className="px-3 py-2.5">
            {!fetched ? (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="h-3 w-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                Loading…
              </div>
            ) : !docData ? (
              <p className="text-xs text-white/30 italic">Record not found</p>
            ) : colKey === 'leads' ? (
              <LeadSummaryContent d={docData} />
            ) : colKey === 'builds' ? (
              <BuildSummaryContent d={docData} />
            ) : colKey === 'arCustomers' ? (
              <ARSummaryContent d={docData} />
            ) : colKey === 'opacCustomers' ? (
              <OPACSummaryContent d={docData} />
            ) : colKey === 'completionCertificates' ? (
              <CertSummaryContent d={docData} />
            ) : colKey === 'supplementalAddendums' ? (
              <AddendumSummaryContent d={docData} />
            ) : colKey === 'deals' ? (
              <DealSummaryContent d={docData} />
            ) : colKey === 'knockPins' ? (
              <KnockPinSummaryContent d={docData} />
            ) : (
              <p className="text-xs text-white/50">No preview available</p>
            )}
          </div>

          {/* Jump footer */}
          {widgetType && onJumpToWidget && fetched && (
            <div
              className="px-3 py-2 border-t"
              style={{ borderColor: `rgba(${cfg.rgb}, 0.15)` }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setJumpPending(true); }}
                className="flex items-center gap-1.5 text-[10px] font-semibold w-full hover:opacity-80 transition-opacity"
                style={{ color: cfg.color }}
              >
                <ExternalLink className="h-3 w-3" />
                Open in {cfg.label}
              </button>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

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
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dept membership dot with popover (shows deptData: status, notes, fields)
// ─────────────────────────────────────────────────────────────────────────────

export function DeptDotWithPopover({
  dept,
  person,
}: {
  dept: Department;
  person: ERPPerson;
}) {
  const deptData: ERPDeptEntry | undefined = person.deptData?.[dept.id];

  const dot = (
    <span
      className="h-2 w-2 rounded-full cursor-pointer transition-all hover:scale-125"
      style={{ background: dept.color, boxShadow: `0 0 5px rgba(${dept.rgb},0.5)`, opacity: 0.8 }}
    />
  );

  if (!deptData) return dot;

  const statusColor =
    deptData.status === 'active' ? '#22c55e'
    : deptData.status === 'pending' ? '#f59e0b'
    : deptData.status === 'complete' ? '#3b82f6'
    : deptData.status === 'at-risk' ? '#ef4444'
    : '#6b7280';

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
          {dot}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="w-64 p-0 overflow-hidden border-0"
          style={{
            background: 'rgba(10,10,24,0.97)',
            backdropFilter: 'blur(20px)',
            border: `1px solid rgba(${dept.rgb}, 0.3)`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(${dept.rgb},0.1)`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between gap-2 px-3 py-2"
            style={{
              background: `rgba(${dept.rgb}, 0.1)`,
              borderBottom: `1px solid rgba(${dept.rgb}, 0.18)`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: dept.color, boxShadow: `0 0 6px ${dept.color}` }}
              />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: dept.color }}>
                {dept.label}
              </span>
            </div>
            {deptData.status && (
              <StatusPill label={STATUS_LABELS[deptData.status] ?? deptData.status} color={statusColor} />
            )}
          </div>

          {/* Body */}
          <div className="px-3 py-2.5 space-y-1.5">
            {deptData.notes && (
              <p className="text-[11px] text-white/60 italic leading-snug line-clamp-3">
                "{deptData.notes}"
              </p>
            )}
            {deptData.fields && deptData.fields.length > 0 && (
              <>
                {deptData.notes && <Divider />}
                <div className="space-y-1">
                  {deptData.fields.map((f) => (
                    <SRow key={f.key} label={f.label} value={f.value} />
                  ))}
                </div>
              </>
            )}
            {deptData.notesList && deptData.notesList.length > 0 && (
              <>
                {(deptData.notes || (deptData.fields && deptData.fields.length > 0)) && <Divider />}
                <div className="space-y-1.5">
                  {deptData.notesList.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-md px-2 py-1.5 space-y-0.5"
                      style={{
                        background: `rgba(${dept.rgb}, 0.08)`,
                        border: `1px solid rgba(${dept.rgb}, 0.18)`,
                      }}
                    >
                      <p className="text-[11px] text-white/80 leading-snug whitespace-pre-wrap">{note.text}</p>
                      <p className="text-[9px] text-white/35">
                        — {note.author}{note.createdAt ? ` · ${fmtDate(note.createdAt)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!deptData.notes && (!deptData.fields || deptData.fields.length === 0) && (!deptData.notesList || deptData.notesList.length === 0) && (
              <p className="text-[10px] text-white/30 italic">No notes or fields recorded</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SpreadsheetView
// ─────────────────────────────────────────────────────────────────────────────

type SpreadsheetViewProps = {
  people: ERPPerson[];
  enabledDepartments: Department[];
  clientPath: string;
  widgetDepts: Record<string, string>;
  onDeletePerson: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  onSelectPerson: (person: ERPPerson) => void;
  onJumpToWidget?: (widgetType: string) => void;
};

export function SpreadsheetView({
  people,
  enabledDepartments,
  clientPath,
  widgetDepts,
  onDeletePerson,
  onDeleteSelected,
  onSelectPerson,
  onJumpToWidget,
}: SpreadsheetViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const valid = new Set(people.map((p) => p.id));
    setSelectedIds((prev) => {
      const cleaned = new Set([...prev].filter((id) => valid.has(id)));
      return cleaned.size !== prev.size ? cleaned : prev;
    });
  }, [people]);

  const allSelected = people.length > 0 && selectedIds.size === people.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(people.map((p) => p.id)));

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    onDeleteSelected([...selectedIds]);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 gap-2">

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-xl shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#f87171' }}>
            {selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
          <div className="flex-grow" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                className="h-7 px-3 text-xs gap-1.5"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#f87171',
                }}
              >
                <Trash2 className="h-3 w-3" />
                Delete {selectedIds.size}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected records from the ERP. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleBulkDelete}
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Table */}
      <div
        className="flex flex-col flex-grow min-h-0 overflow-auto rounded-xl"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="min-w-max">

          {/* Sticky header */}
          <div
            className="flex sticky top-0 z-10"
            style={{
              background: HEADER_BG,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-10 shrink-0 px-2 py-2.5 border-r border-white/8 sticky left-0 z-20 flex items-center justify-center cursor-pointer"
              style={{ background: HEADER_BG }}
              onClick={toggleAll}
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4" style={{ color: '#F4C430' }} />
              ) : someSelected ? (
                <Minus className="h-4 w-4" style={{ color: '#F4C430' }} />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>

            <div
              className="w-52 shrink-0 px-3 py-2.5 border-r border-white/8 sticky left-10 z-20"
              style={{ background: HEADER_BG }}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</span>
            </div>

            {enabledDepartments.map((dept) => (
              <div
                key={dept.id}
                className="w-36 shrink-0 px-3 py-2.5 border-r border-white/8 relative overflow-hidden"
              >
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{
                    background: `linear-gradient(90deg, rgba(${dept.rgb},0.9), rgba(${dept.rgb},0.2))`,
                    boxShadow: `0 0 6px rgba(${dept.rgb},0.5)`,
                  }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: dept.color }}>
                  {dept.label}
                </span>
              </div>
            ))}

            <div className="w-12 shrink-0 border-r border-white/8" />
          </div>

          {/* Rows */}
          {people.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No records yet. Use the + Add button to add your first record.
            </div>
          ) : (
            people.map((person, rowIdx) => {
              const isSelected = selectedIds.has(person.id);
              const rowBg = isSelected
                ? 'rgba(244,196,48,0.07)'
                : rowIdx % 2 === 1
                ? 'rgba(255,255,255,0.015)'
                : 'transparent';
              const stickyBg = isSelected
                ? 'rgba(16,14,8,0.97)'
                : rowIdx % 2 === 1
                ? 'rgba(10,10,22,0.97)'
                : HEADER_BG;

              return (
                <div
                  key={person.id}
                  className="flex group cursor-pointer transition-colors hover:bg-white/[0.04]"
                  style={{ background: rowBg }}
                  onClick={() => onSelectPerson(person)}
                >
                  {/* Checkbox cell */}
                  <div
                    className="w-10 shrink-0 border-b border-r border-white/6 flex items-center justify-center sticky left-0 z-10"
                    style={{ background: stickyBg }}
                    onClick={(e) => toggleRow(person.id, e)}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-3.5 w-3.5" style={{ color: '#F4C430' }} />
                    ) : (
                      <Square className="h-3.5 w-3.5 opacity-0 group-hover:opacity-30 transition-opacity" />
                    )}
                  </div>

                  {/* Name cell */}
                  <div
                    className="w-52 shrink-0 px-3 py-2.5 border-b border-r border-white/6 flex flex-col justify-center sticky left-10 z-10"
                    style={{ background: stickyBg }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: isSelected ? 'rgba(244,196,48,0.25)' : 'rgba(244,196,48,0.15)',
                          border: `1px solid rgba(244,196,48,${isSelected ? '0.4' : '0.25'})`,
                          color: '#F4C430',
                        }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate">{person.name}</span>
                    </div>
                  </div>

                  {/* Dept cells */}
                  {enabledDepartments.map((dept) => {
                    const inDept = person.departments.includes(dept.id);
                    const chips = Object.keys(person.widgetLinks ?? {})
                      .filter((col) => widgetDepts[col] === dept.id)
                      .map((col) => ({ col, docId: (person.widgetLinks ?? {})[col] }));
                    const active = inDept || chips.length > 0;

                    return (
                      <div
                        key={dept.id}
                        className="w-36 shrink-0 px-3 py-2 border-b border-r border-white/6 flex flex-col justify-center gap-1"
                        style={active ? { background: `rgba(${dept.rgb}, 0.04)` } : {}}
                      >
                        {inDept && chips.length === 0 && (
                          <DeptDotWithPopover dept={dept} person={person} />
                        )}
                        {chips.map(({ col, docId }) => (
                          <WidgetChipWithPopover
                            key={col}
                            colKey={col}
                            docId={docId}
                            clientPath={clientPath}
                            onJumpToWidget={onJumpToWidget}
                          />
                        ))}
                        {!active && (
                          <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Delete cell */}
                  <div className="w-12 shrink-0 border-b border-white/6 flex items-center justify-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete record?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &ldquo;{person.name}&rdquo; from the ERP.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDeletePerson(person.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
