'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ScanSearch, Mail, Phone, GitMerge } from 'lucide-react';
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
import type { ERPPerson } from '@/types/erp';

type DuplicateGroup = {
  key: string;
  reason: string;
  people: ERPPerson[];
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function detectDuplicates(people: ERPPerson[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      const pairKey = [a.id, b.id].sort().join(':');
      if (seen.has(pairKey)) continue;

      let reason: string | null = null;

      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        reason = `Same email: ${a.email}`;
      } else if (a.phone && b.phone) {
        const pa = normalizePhone(a.phone);
        const pb = normalizePhone(b.phone);
        if (pa.length >= 7 && pa === pb) reason = `Same phone: ${a.phone}`;
      }

      if (!reason) {
        const na = normalizeName(a.name);
        const nb = normalizeName(b.name);
        if (na.length >= 3 && nb.length >= 3 && (na === nb || na.includes(nb) || nb.includes(na))) {
          reason = `Similar name: "${a.name}" / "${b.name}"`;
        }
      }

      if (reason) {
        seen.add(pairKey);
        groups.push({ key: pairKey, reason, people: [a, b] });
      }
    }
  }

  return groups;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: ERPPerson[];
  onDeletePerson: (id: string) => void;
  onMerge: (keepId: string, mergeFromId: string) => void;
};

export function DuplicateReviewSheet({ open, onOpenChange, people, onDeletePerson, onMerge }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const allGroups = useMemo(() => detectDuplicates(people), [people]);
  const activeGroups = allGroups.filter((g) => !dismissed.has(g.key));

  const dismiss = (key: string) => setDismissed((prev) => new Set([...prev, key]));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
        style={{
          background: 'rgba(10, 10, 22, 0.97)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <SheetHeader className="px-6 py-5 border-b border-white/8">
          <SheetTitle className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4" style={{ color: '#F4C430' }} />
            Duplicate Review
          </SheetTitle>
          <SheetDescription>
            {activeGroups.length === 0
              ? 'No potential duplicates detected.'
              : `${activeGroups.length} potential duplicate pair${activeGroups.length !== 1 ? 's' : ''} found. Review and resolve each one.`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-grow px-4 py-4">
          {activeGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <ScanSearch className="h-10 w-10 opacity-15" />
              <p className="text-sm">All clear — no duplicates found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGroups.map((group) => (
                <div
                  key={group.key}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(244,196,48,0.04)',
                    border: '1px solid rgba(244,196,48,0.15)',
                  }}
                >
                  {/* Reason tag */}
                  <div
                    className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: '#F4C430', borderBottom: '1px solid rgba(244,196,48,0.1)' }}
                  >
                    {group.reason}
                  </div>

                  {/* Person rows */}
                  {group.people.map((person, idx) => {
                    const other = group.people[idx === 0 ? 1 : 0];
                    return (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                        style={idx < group.people.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                      >
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: 'rgba(244,196,48,0.12)',
                            border: '1px solid rgba(244,196,48,0.22)',
                            color: '#F4C430',
                          }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium truncate">{person.name}</p>
                          <div className="flex items-center flex-wrap gap-3 mt-0.5">
                            {person.email && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Mail className="h-2.5 w-2.5" />
                                {person.email}
                              </span>
                            )}
                            {person.phone && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Phone className="h-2.5 w-2.5" />
                                {person.phone}
                              </span>
                            )}
                          </div>
                          {person.departments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {person.departments.map((d) => (
                                <span
                                  key={d}
                                  className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
                                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Merge button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 gap-1 text-[10px] font-semibold shrink-0"
                              style={{
                                background: 'rgba(139,92,246,0.1)',
                                border: '1px solid rgba(139,92,246,0.25)',
                                color: '#8B5CF6',
                              }}
                            >
                              <GitMerge className="h-3 w-3" />
                              Keep
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Merge into &ldquo;{person.name}&rdquo;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will copy all departments, widget links, and contact info from &ldquo;{other.name}&rdquo; into &ldquo;{person.name}&rdquo;, then permanently delete &ldquo;{other.name}&rdquo;.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onMerge(person.id, other.id)}
                                style={{ background: 'rgba(139,92,246,0.9)', color: '#fff' }}
                              >
                                Merge & Keep {person.name}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 hover:bg-destructive/15"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete &ldquo;{person.name}&rdquo; from the ERP. This cannot be undone.
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
                    );
                  })}

                  {/* Dismiss */}
                  <div
                    className="px-3 py-2 flex justify-end"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <button
                      onClick={() => dismiss(group.key)}
                      className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                    >
                      Not a duplicate — dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
