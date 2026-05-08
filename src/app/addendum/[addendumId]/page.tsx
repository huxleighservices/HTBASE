'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Firebase initialisation (client-side, no auth required)
// ---------------------------------------------------------------------------
function getFirestoreDb() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AddendumData = {
  clientPath: string;
  firmName: string;
  projectId: string;
  projectName: string;
  propertyAddress?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  originalContractDate?: string;
  buildDate?: string;
  workDescription?: string;
  workReason?: string;
  materialCost?: number;
  laborCost?: number;
  totalCost?: number;
  isInsuranceJob?: boolean;
  photos?: Array<{ id: string; uri: string; thumbUri: string }>;
  status: 'pending' | 'authorized' | 'declined' | 'not-needed';
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  signedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  signatureDataUrl?: string;
  customerDecision?: 'authorized' | 'declined';
  pmSignatureDataUrl?: string;
  pmDisplayName?: string;
  pmUsername?: string;
  pmPhone?: string;
};

type PageState = 'loading' | 'not-found' | 'ready' | 'submitting' | 'complete' | 'already-signed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTimestamp(ts: any): string { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!ts) return '';
  try {
    const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return String(ts);
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    // dateStr is YYYY-MM-DD from the date input
    const [year, month, day] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Lightbox component
// ---------------------------------------------------------------------------
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-3xl leading-none font-bold"
        onClick={onClose}
        aria-label="Close"
      >
        &times;
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Full-size photo"
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signature canvas component
// ---------------------------------------------------------------------------
function SignatureCanvas({
  onHasDrawn,
  canvasRef,
}: {
  onHasDrawn: (drawn: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const getPos = (
    e: MouseEvent | TouchEvent,
    canvas: HTMLCanvasElement,
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as MouseEvent).clientX - rect.left,
      y: (e as MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if ('touches' in e) e.preventDefault();
      isDrawingRef.current = true;
      lastPosRef.current = getPos(e, canvas);
      onHasDrawn(true);
    },
    [canvasRef, onHasDrawn],
  );

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      if ('touches' in e) e.preventDefault();
      const ctx = canvas.getContext('2d');
      if (!ctx || !lastPosRef.current) return;
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastPosRef.current = pos;
    },
    [canvasRef],
  );

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width || 600;
    canvas.height = height || 200;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [canvasRef, startDrawing, draw, stopDrawing]);

  return null;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AddendumPage({
  params,
}: {
  params: Promise<{ addendumId: string }>;
}) {
  const { addendumId } = use(params);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [addendum, setAddendum] = useState<AddendumData | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [decision, setDecision] = useState<'authorized' | 'declined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // -------------------------------------------------------------------------
  // Load addendum from Firestore
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function loadAddendum() {
      try {
        const db = getFirestoreDb();
        const snap = await getDoc(doc(db, 'supplementalAddendums', addendumId));
        if (!snap.exists()) {
          setPageState('not-found');
          return;
        }
        const data = snap.data() as AddendumData;
        setAddendum(data);
        setPageState(
          data.status === 'authorized' || data.status === 'declined' || data.status === 'not-needed'
            ? 'already-signed'
            : 'ready',
        );
      } catch (err) {
        console.error('Failed to load addendum:', err);
        setError('Failed to load addendum. Please try again.');
        setPageState('not-found');
      }
    }

    loadAddendum();
  }, [addendumId]);

  // -------------------------------------------------------------------------
  // Clear canvas
  // -------------------------------------------------------------------------
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // -------------------------------------------------------------------------
  // Submit decision + signature
  // -------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!addendum || !hasDrawn || !decision) return;
    setPageState('submitting');
    setError(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available.');
      const signatureDataUrl = canvas.toDataURL('image/png');

      const db = getFirestoreDb();
      await updateDoc(doc(db, 'supplementalAddendums', addendumId), {
        status: decision,
        customerDecision: decision,
        signedAt: serverTimestamp(),
        signatureDataUrl,
      });

      await fetch('/api/send-addendum-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addendumId,
          customerName: addendum.customerName,
          customerEmail: addendum.customerEmail,
          projectName: addendum.projectName,
          decision,
          totalCost: addendum.totalCost,
          firmName: addendum.firmName,
          signedAt: new Date().toISOString(),
        }),
      });

      setPageState('complete');
    } catch (err) {
      console.error('Failed to submit decision:', err);
      setError('Something went wrong while submitting. Please try again.');
      setPageState('ready');
    }
  };

  // -------------------------------------------------------------------------
  // Shared read-only document renderer
  // -------------------------------------------------------------------------
  function renderReadOnlyDoc(data: AddendumData, showBanner: boolean) {
    const isNotNeeded = data.status === 'not-needed';
    const isAuthorized = data.customerDecision === 'authorized' || data.status === 'authorized';
    const isDeclined = data.customerDecision === 'declined' || data.status === 'declined';

    // "No Addendum Needed" — simplified view showing PM confirmation
    if (isNotNeeded) {
      const pmLabel = data.pmDisplayName || data.pmUsername || 'Project Manager';
      return (
        <div className="min-h-screen bg-gray-50">
          <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">HTBase</p>
              <p className="text-base font-semibold leading-tight">{data.firmName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Document</p>
              <p className="text-base font-semibold leading-tight">Supplemental Addendum</p>
            </div>
          </header>
          <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            {/* Status banner */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-semibold text-sm text-slate-800">No Supplemental Addendum Needed</p>
                <p className="text-xs mt-0.5 text-slate-500">
                  Confirmed by {pmLabel} on {data.createdAt ? formatTimestamp(data.createdAt) : '—'}
                </p>
              </div>
            </div>

            {/* Project info */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Project Details</h2>
              </div>
              <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Project</p>
                  <p className="text-slate-800 font-medium">{data.projectName}</p>
                </div>
                {data.customerName && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Customer</p>
                    <p className="text-slate-800 font-medium">{data.customerName}</p>
                  </div>
                )}
                {data.propertyAddress && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Property Address</p>
                    <p className="text-slate-800">{data.propertyAddress}</p>
                  </div>
                )}
              </div>
            </section>

            {/* PM signature */}
            {data.pmSignatureDataUrl && (
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Project Manager Signature
                  </h2>
                </div>
                <div className="px-6 py-5 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.pmSignatureDataUrl}
                    alt="PM signature"
                    className="max-h-40 rounded border border-slate-200 bg-white"
                  />
                  <p className="text-xs text-slate-500">
                    Signed by{' '}
                    <span className="font-medium text-slate-700">{pmLabel}</span>
                    {data.pmPhone && (
                      <span className="text-slate-400"> · {data.pmPhone}</span>
                    )}
                    {' '}on {data.createdAt ? formatTimestamp(data.createdAt) : '—'}
                  </p>
                </div>
              </section>
            )}

            <p className="text-center text-xs text-slate-400 pb-4">
              This document is on file. Powered by HTBase.
            </p>
          </main>
        </div>
      );
    }

    return (
      <>
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
        <div className="min-h-screen bg-gray-50">
          <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">HTBase</p>
              <p className="text-base font-semibold leading-tight">{data.firmName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Document</p>
              <p className="text-base font-semibold leading-tight">Supplemental Work Addendum</p>
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            {/* Decision banner */}
            {showBanner && (isAuthorized || isDeclined) && (
              <div
                className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${
                  isAuthorized
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <span className="text-2xl">{isAuthorized ? '✅' : '❌'}</span>
                <div>
                  <p
                    className={`font-semibold text-sm ${
                      isAuthorized ? 'text-emerald-800' : 'text-red-800'
                    }`}
                  >
                    {isAuthorized ? 'Supplemental Work Authorized' : 'Supplemental Work Declined'}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      isAuthorized ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    Signed on{' '}
                    {data.signedAt ? formatTimestamp(data.signedAt) : 'a previous date'}
                  </p>
                </div>
              </div>
            )}

            {/* Project details */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Project Details
                </h2>
              </div>
              <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Project</p>
                  <p className="text-slate-800 font-medium">{data.projectName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Customer</p>
                  <p className="text-slate-800 font-medium">{data.customerName}</p>
                </div>
                {data.propertyAddress && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                      Property Address
                    </p>
                    <p className="text-slate-800">{data.propertyAddress}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                    Original Contract Date
                  </p>
                  <p className="text-slate-800">{formatDate(data.originalContractDate ?? '')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                    Build Date
                  </p>
                  <p className="text-slate-800">{formatDate(data.buildDate ?? '')}</p>
                </div>
              </div>
            </section>

            {/* Photos */}
            {data.photos && data.photos.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Project Photos
                  </h2>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {data.photos.map((photo) => (
                    <button
                      key={photo.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus:outline-none"
                      onClick={() => setLightboxSrc(photo.uri)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbUri || photo.uri}
                        alt="Work photo"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                        <span className="text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          🔍
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Legal addendum text */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Section 1 — Supplemental Work Addendum
                </h2>
              </div>
              <div className="px-6 py-5 space-y-5 text-slate-700 text-sm leading-relaxed">
                <p>
                  During the teardown or repair process, certain conditions—such as hidden rot, code
                  violations, or structural deficiencies—may be discovered that were not visible during
                  the initial inspection. To ensure the integrity, safety, and warranty compliance of
                  your project, M&amp;T Roofing &amp; Restoration recommends the following supplemental
                  work.
                </p>

                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      Description of Additional Work/Materials:
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{data.workDescription ?? ''}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Reason for Recommendation:</p>
                    <p className="mt-1 whitespace-pre-wrap">{data.workReason ?? ''}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Supplemental Pricing
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-slate-600">Additional Material Cost</span>
                      <span className="font-medium text-slate-800">
                        {formatCurrency(data.materialCost ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-slate-600">Additional Labor Cost</span>
                      <span className="font-medium text-slate-800">
                        {formatCurrency(data.laborCost ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-slate-50">
                      <span className="font-semibold text-slate-800">Total Supplemental Cost</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(data.totalCost ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Signature */}
            {data.signatureDataUrl && (
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Customer Signature
                  </h2>
                </div>
                <div className="px-6 py-5 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.signatureDataUrl}
                    alt="Customer signature"
                    className="max-h-40 rounded border border-slate-200 bg-white"
                  />
                  <p className="text-xs text-slate-500">
                    Signed by{' '}
                    <span className="font-medium text-slate-700">{data.customerName}</span> on{' '}
                    {data.signedAt ? formatTimestamp(data.signedAt) : '—'}
                  </p>
                </div>
              </section>
            )}

            <p className="text-center text-xs text-slate-400 pb-4">
              This document is legally binding once signed. Powered by HTBase.
            </p>
          </main>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          <p className="text-slate-500 text-sm">Loading addendum…</p>
        </div>
      </div>
    );
  }

  if (pageState === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Addendum Not Found</h1>
          <p className="text-slate-500 text-sm">
            {error ?? 'This addendum link may be invalid or has expired.'}
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'already-signed' || pageState === 'complete') {
    return renderReadOnlyDoc(addendum!, true);
  }

  // ready | submitting
  const isSubmitting = pageState === 'submitting';
  const canSubmit = hasDrawn && decision !== null;

  return (
    <>
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">HTBase</p>
            <p className="text-base font-semibold leading-tight">{addendum?.firmName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Document</p>
            <p className="text-base font-semibold leading-tight">Supplemental Work Addendum</p>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Project details */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Project Details
              </h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Project</p>
                <p className="text-slate-800 font-medium">{addendum?.projectName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Customer</p>
                <p className="text-slate-800 font-medium">{addendum?.customerName}</p>
              </div>
              {addendum?.propertyAddress && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                    Property Address
                  </p>
                  <p className="text-slate-800">{addendum.propertyAddress}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                  Original Contract Date
                </p>
                <p className="text-slate-800">
                  {addendum?.originalContractDate
                    ? formatDate(addendum.originalContractDate)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                  Build Date
                </p>
                <p className="text-slate-800">
                  {addendum?.buildDate ? formatDate(addendum.buildDate) : '—'}
                </p>
              </div>
            </div>
          </section>

          {/* Photos */}
          {addendum?.photos && addendum.photos.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Project Photos
                </h2>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {addendum.photos.map((photo) => (
                  <button
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    onClick={() => setLightboxSrc(photo.uri)}
                    aria-label="View full-size photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbUri || photo.uri}
                      alt="Work photo"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                      <span className="text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        🔍
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Legal addendum text */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Section 1 — Supplemental Work Addendum
              </h2>
            </div>
            <div className="px-6 py-5 space-y-5 text-slate-700 text-sm leading-relaxed">
              <p className="font-medium text-slate-600 italic">Why This Addendum Is Needed:</p>
              <p>
                During the teardown or repair process, certain conditions—such as hidden rot, code
                violations, or structural deficiencies—may be discovered that were not visible during
                the initial inspection. To ensure the integrity, safety, and warranty compliance of
                your project, M&amp;T Roofing &amp; Restoration recommends the following supplemental
                work.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    Description of Additional Work/Materials:
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{addendum?.workDescription}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Reason for Recommendation:</p>
                  <p className="mt-1 whitespace-pre-wrap">{addendum?.workReason}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Supplemental Pricing
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-slate-600">Additional Material Cost</span>
                    <span className="font-medium text-slate-800">
                      {formatCurrency(addendum?.materialCost ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-slate-600">Additional Labor Cost</span>
                    <span className="font-medium text-slate-800">
                      {formatCurrency(addendum?.laborCost ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-slate-50">
                    <span className="font-semibold text-slate-800">Total Supplemental Cost</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(addendum?.totalCost ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Decision cards */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Your Decision
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Please select one of the options below, then sign.
              </p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A — Authorize */}
              <button
                type="button"
                onClick={() => setDecision('authorized')}
                className={`text-left rounded-xl border-2 p-4 transition-all focus:outline-none ${
                  decision === 'authorized'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                      decision === 'authorized'
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {decision === 'authorized' && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      decision === 'authorized' ? 'text-emerald-800' : 'text-slate-700'
                    }`}
                  >
                    Option A — AUTHORIZE
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  By signing below, I{' '}
                  <span className="font-medium">{addendum?.customerName}</span> authorize the
                  supplemental work described above. I understand these items are necessary for a
                  complete and professional installation. I agree that the Total Supplemental Cost
                  listed above will be added to my original contract price and included in the final
                  invoice.
                </p>
              </button>

              {/* Option B — Decline */}
              <button
                type="button"
                onClick={() => setDecision('declined')}
                className={`text-left rounded-xl border-2 p-4 transition-all focus:outline-none ${
                  decision === 'declined'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                      decision === 'declined'
                        ? 'border-red-500 bg-red-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {decision === 'declined' && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      decision === 'declined' ? 'text-red-800' : 'text-slate-700'
                    }`}
                  >
                    Option B — DECLINE
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  By signing below, I acknowledge that M&amp;T Roofing &amp; Restoration has
                  notified me of the necessary supplemental work/materials listed above, and I am
                  choosing to decline these recommendations. I understand that declining this work
                  may: Compromise the long-term performance or safety of the project. Void certain
                  manufacturer or workmanship warranties. Lead to future costs exceeding the current
                  supplemental price. M&amp;T Roofing &amp; Restoration is hereby released from any
                  liability or damages resulting from the decision to decline these specific
                  recommendations.
                </p>
              </button>
            </div>
          </section>

          {/* Signature section */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Digital Signature
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {decision && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  By signing below, I{' '}
                  <span className="font-semibold text-slate-800">{addendum?.customerName}</span>{' '}
                  confirm my decision to{' '}
                  <span
                    className={`font-semibold ${
                      decision === 'authorized' ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {decision === 'authorized' ? 'AUTHORIZE' : 'DECLINE'}
                  </span>{' '}
                  the supplemental work described above.
                </p>
              )}

              {/* Canvas wrapper */}
              <div
                className="relative rounded-lg border-2 border-slate-300 bg-white overflow-hidden"
                style={{ height: '200px' }}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                  style={{ display: 'block' }}
                />
                <SignatureCanvas canvasRef={canvasRef} onHasDrawn={setHasDrawn} />
                {!hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="text-slate-300 text-sm select-none">Draw your signature here</p>
                  </div>
                )}
              </div>

              {/* Clear button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
                  disabled={isSubmitting}
                >
                  Clear
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Validation hint */}
              {!decision && (
                <p className="text-xs text-slate-400 text-center">
                  Please select Option A or Option B above before signing.
                </p>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="w-full rounded-lg bg-slate-800 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting…
                  </span>
                ) : (
                  'Submit Decision & Sign'
                )}
              </button>
            </div>
          </section>

          <p className="text-center text-xs text-slate-400 pb-4">
            This document is legally binding once signed. Powered by HTBase.
          </p>
        </main>
      </div>
    </>
  );
}
