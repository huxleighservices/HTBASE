'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { CommunicationsContent } from './communications-dialog';

type Props = {
  client: Client;
  activeUser: AccessKey | null;
};

export function CommunicationsSidebar({ client, activeUser }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Only close if the click is not on the toggle button
        const toggle = document.getElementById('coms-sidebar-toggle');
        if (toggle && toggle.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <>
      {/* Floating toggle button — always visible */}
      <button
        id="coms-sidebar-toggle"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'fixed bottom-20 right-4 z-[100] flex items-center justify-center rounded-full shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95',
          isOpen
            ? 'h-11 w-11 bg-primary/20 border border-primary/50 text-primary'
            : 'h-11 w-11 bg-background/80 border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40'
        )}
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isOpen
            ? '0 0 20px rgba(0,235,255,0.25), 0 4px 24px rgba(0,0,0,0.4)'
            : '0 4px 24px rgba(0,0,0,0.4)',
        }}
        title={isOpen ? 'Close Chat' : 'Open Chat'}
      >
        {isOpen ? <X className="h-4.5 w-4.5" /> : <MessageSquare className="h-4.5 w-4.5" />}
      </button>

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[99] flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          width: 'min(420px, 92vw)',
          background: 'rgba(8,8,22,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground/90">{client.firmName}</p>
              <p className="text-[10px] text-muted-foreground">Team Chat</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Chat content — only mounted when open to avoid unnecessary subscriptions */}
        {isOpen && (
          <div className="flex flex-col flex-1 min-h-0">
            <CommunicationsContent client={client} activeUser={activeUser} />
          </div>
        )}
      </div>

      {/* Backdrop when open on small screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[98] sm:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
