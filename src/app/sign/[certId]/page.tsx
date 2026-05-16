'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

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
type CertData = {
  clientPath: string;
  firmName: string;
  projectId: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  isInsuranceJob: boolean;
  photos: Array<{ id: string; uri: string; thumbUri: string }>;
  status: 'pending' | 'signed';
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  signedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  signatureDataUrl?: string;
};

type PageState = 'loading' | 'not-found' | 'already-signed' | 'ready' | 'submitting' | 'complete';

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

// ---------------------------------------------------------------------------
// Lightbox component
// ---------------------------------------------------------------------------
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
    canvas: HTMLCanvasElement
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
  };

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if ('touches' in e) e.preventDefault();
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e, canvas);
    onHasDrawn(true);
  }, [canvasRef, onHasDrawn]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
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
  }, [canvasRef]);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas internal resolution to match display size
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
export default function SignCertPage({
  params,
}: {
  params: { certId: string };
}) {
  const { certId } = params;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [cert, setCert] = useState<CertData | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // -------------------------------------------------------------------------
  // Load certificate from Firestore
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function loadCert() {
      try {
        const db = getFirestoreDb();
        const snap = await getDoc(doc(db, 'completionCertificates', certId));
        if (!snap.exists()) {
          setPageState('not-found');
          return;
        }
        const data = snap.data() as CertData;
        setCert(data);
        setPageState(data.status === 'signed' ? 'already-signed' : 'ready');
      } catch (err) {
        console.error('Failed to load certificate:', err);
        setError('Failed to load certificate. Please try again.');
        setPageState('not-found');
      }
    }

    loadCert();
  }, [certId]);

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
  // Submit signature
  // -------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!cert || !hasDrawn) return;
    setPageState('submitting');
    setError(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available.');
      const signatureDataUrl = canvas.toDataURL('image/png');

      const db = getFirestoreDb();
      await updateDoc(doc(db, 'completionCertificates', certId), {
        status: 'signed',
        signedAt: serverTimestamp(),
        signatureDataUrl,
      });

      await fetch('/api/send-completion-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certId,
          customerName: cert.customerName,
          customerEmail: cert.customerEmail,
          projectName: cert.projectName,
          isInsuranceJob: cert.isInsuranceJob,
          firmName: cert.firmName,
          signedAt: new Date().toISOString(),
        }),
      });

      setPageState('complete');
    } catch (err) {
      console.error('Failed to submit signature:', err);
      setError('Something went wrong while submitting. Please try again.');
      setPageState('ready');
    }
  };

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          <p className="text-slate-500 text-sm">Loading certificate…</p>
        </div>
      </div>
    );
  }

  if (pageState === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Certificate Not Found</h1>
          <p className="text-slate-500 text-sm">
            {error ?? 'This certificate link may be invalid or has expired.'}
          </p>
        </div>
      </div>
    );
  }

  // Shared read-only document view for already-signed and just-completed states
  if (pageState === 'already-signed' || pageState === 'complete') {
    const signedData = cert;
    return (
      <>
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
        <div className="min-h-screen bg-gray-50">
          <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">HTBase</p>
              <p className="text-base font-semibold leading-tight">{signedData?.firmName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Document</p>
              <p className="text-base font-semibold leading-tight">Certificate of Completion</p>
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            {/* Signed banner */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Certificate Signed</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Signed on {signedData?.signedAt ? formatTimestamp(signedData.signedAt) : 'a previous date'}
                </p>
              </div>
            </div>

            {/* Project details */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Project Details</h2>
              </div>
              <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Project</p>
                  <p className="text-slate-800 font-medium">{signedData?.projectName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Customer</p>
                  <p className="text-slate-800 font-medium">{signedData?.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Date Issued</p>
                  <p className="text-slate-800">{signedData?.createdAt ? formatTimestamp(signedData.createdAt) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Firm</p>
                  <p className="text-slate-800">{signedData?.firmName}</p>
                </div>
              </div>
              {signedData?.isInsuranceJob && (
                <div className="mx-6 mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <span className="text-amber-500 text-lg leading-none">⚠</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Insurance Job</p>
                    <p className="text-xs text-amber-700 mt-0.5">This project is associated with an insurance claim.</p>
                  </div>
                </div>
              )}
            </section>

            {/* Photos */}
            {signedData?.photos && signedData.photos.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Completed Work Photos</h2>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {signedData.photos.map((photo) => (
                    <button
                      key={photo.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus:outline-none"
                      onClick={() => setLightboxSrc(photo.uri)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.thumbUri || photo.uri} alt="Work photo" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                        <span className="text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">🔍</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Legal document + Signature */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Section 2 — Certificate of Completion &amp; Release</h2>
                <p className="text-xs text-slate-400 mt-1">Completed after final walkthrough.</p>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Work Completion Confirmation</p>
                  <ol className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-3"><span className="font-semibold text-slate-700 shrink-0">I.</span><span><span className="font-semibold text-slate-700">Completion of Scope:</span> All work outlined in the original contract and any authorized supplemental addendums has been completed in full.</span></li>
                    <li className="flex gap-3"><span className="font-semibold text-slate-700 shrink-0">II.</span><span><span className="font-semibold text-slate-700">Final Inspection:</span> A final walkthrough was performed with the Project Manager to verify the quality of materials and workmanship. If the customer was not available to be on-site, a virtual walkthrough was conducted via video call or digital photo documentation. The customer confirms satisfaction with the results.</span></li>
                    <li className="flex gap-3"><span className="font-semibold text-slate-700 shrink-0">III.</span><span><span className="font-semibold text-slate-700">Jobsite Condition:</span> The jobsite has been left clean and free of debris to the best of M&amp;T Roofing &amp; Restoration's ability.</span></li>
                    <li className="flex gap-3"><span className="font-semibold text-slate-700 shrink-0">IV.</span><span><span className="font-semibold text-slate-700">Final Payment:</span> The final invoice total will include the original contract amount plus any supplemental costs authorized in Section 1.</span></li>
                  </ol>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Release of Liability</p>
                  <p className="text-sm text-slate-600 leading-relaxed">Upon signing this Certificate of Completion, M&amp;T Roofing &amp; Restoration is released from any further responsibility, except for obligations specifically covered under applicable manufacturer and/or workmanship warranties. If supplemental work was declined in Section 1, the customer remains responsible for any resulting issues.</p>
                </div>
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Customer Final Approval</p>
                  <p className="text-xs text-slate-500">Printed Name: <span className="font-medium text-slate-700">{signedData?.customerName}</span></p>
                  {signedData?.signatureDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signedData.signatureDataUrl} alt="Customer signature" className="max-h-40 rounded border border-slate-200 bg-white" />
                  ) : (
                    <p className="text-sm text-slate-400 italic">Signature not available.</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Signed by <span className="font-medium text-slate-700">{signedData?.customerName}</span> on{' '}
                    {signedData?.signedAt ? formatTimestamp(signedData.signedAt) : '—'}
                  </p>
                </div>
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

  // ready | submitting
  const isSubmitting = pageState === 'submitting';

  return (
    <>
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      <div className="min-h-screen bg-gray-50">
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                              */}
        {/* ------------------------------------------------------------------ */}
        <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">
              HTBase
            </p>
            <p className="text-base font-semibold leading-tight">{cert?.firmName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">
              Document
            </p>
            <p className="text-base font-semibold leading-tight">Certificate of Completion</p>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* ---------------------------------------------------------------- */}
          {/* Project info card                                                 */}
          {/* ---------------------------------------------------------------- */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Project Details
              </h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                  Project
                </p>
                <p className="text-slate-800 font-medium">{cert?.projectName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                  Customer
                </p>
                <p className="text-slate-800 font-medium">{cert?.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                  Date Issued
                </p>
                <p className="text-slate-800">{cert?.createdAt ? formatTimestamp(cert.createdAt) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                  Firm
                </p>
                <p className="text-slate-800">{cert?.firmName}</p>
              </div>
            </div>

            {/* Insurance job notice */}
            {cert?.isInsuranceJob && (
              <div className="mx-6 mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-amber-500 text-lg leading-none">⚠</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Insurance Job</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This project is associated with an insurance claim.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Photos                                                            */}
          {/* ---------------------------------------------------------------- */}
          {cert?.photos && cert.photos.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Completed Work Photos
                </h2>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {cert.photos.map((photo) => (
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
                      loading="eager"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== photo.uri) img.src = photo.uri;
                      }}
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

          {/* ---------------------------------------------------------------- */}
          {/* Legal document                                                    */}
          {/* ---------------------------------------------------------------- */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Section 2 — Certificate of Completion &amp; Release
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                To be completed after the final walkthrough once all work is finished.
              </p>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Work Completion Confirmation */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Work Completion Confirmation</p>
                <p className="text-sm text-slate-600 mb-3">
                  By signing below, the customer acknowledges and agrees that:
                </p>
                <ol className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <span className="font-semibold text-slate-700 shrink-0">I.</span>
                    <span><span className="font-semibold text-slate-700">Completion of Scope:</span> All work outlined in the original contract and any authorized supplemental addendums has been completed in full.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-slate-700 shrink-0">II.</span>
                    <span><span className="font-semibold text-slate-700">Final Inspection:</span> A final walkthrough was performed with the Project Manager to verify the quality of materials and workmanship. If the customer was not available to be on-site, a virtual walkthrough was conducted via video call or digital photo documentation. The customer confirms satisfaction with the results.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-slate-700 shrink-0">III.</span>
                    <span><span className="font-semibold text-slate-700">Jobsite Condition:</span> The jobsite has been left clean and free of debris to the best of M&amp;T Roofing &amp; Restoration's ability.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-slate-700 shrink-0">IV.</span>
                    <span><span className="font-semibold text-slate-700">Final Payment:</span> The final invoice total will include the original contract amount plus any supplemental costs authorized in Section 1.</span>
                  </li>
                </ol>
              </div>

              {/* Release of Liability */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Release of Liability</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upon signing this Certificate of Completion, M&amp;T Roofing &amp; Restoration is released from any further
                  responsibility, except for obligations specifically covered under applicable manufacturer and/or workmanship
                  warranties. If supplemental work was declined in Section 1, the customer remains responsible for any
                  resulting issues.
                </p>
              </div>

              {/* Customer Final Approval header */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-1">Customer Final Approval</p>
                <p className="text-xs text-slate-500">
                  Printed Name: <span className="font-medium text-slate-700">{cert?.customerName}</span>
                </p>
              </div>

              {/* Canvas wrapper */}
              <div className="relative rounded-lg border-2 border-slate-300 bg-white overflow-hidden"
                style={{ height: '200px' }}>
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                  style={{ display: 'block' }}
                />
                <SignatureCanvas canvasRef={canvasRef} onHasDrawn={setHasDrawn} />
                {!hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="text-slate-300 text-sm select-none">
                      Draw your signature here
                    </p>
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

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!hasDrawn || isSubmitting}
                className="w-full rounded-lg bg-slate-800 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting…
                  </span>
                ) : (
                  'Sign & Submit Certificate'
                )}
              </button>
            </div>
          </section>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 pb-4">
            This document is legally binding once signed. Powered by HTBase.
          </p>
        </main>
      </div>
    </>
  );
}
