'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  Activity,
  ListTodo,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TeamStatus = 'online' | 'busy' | 'away' | 'offline';

type TeamStatusDoc = {
  status: TeamStatus;
  message: string;
  updatedAt: any;
};

type PipelineTask = {
  id: string;
  assignee?: string;
  status?: string;
  title?: string;
  completedAt?: any;
  updatedAt?: any;
  createdAt?: any;
};

type MemberWithStatus = AccessKey & {
  teamStatus: TeamStatusDoc | null;
  activeTaskCount: number;
};

type RecentCompletion = {
  taskId: string;
  title: string;
  assignee: string;
  completedAt: any;
};

type TeamOverviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TeamStatus, { label: string; color: string; dot: string }> = {
  online:  { label: 'Online',  color: 'bg-green-500/20 text-green-400 border-green-500/30',  dot: 'bg-green-400' },
  busy:    { label: 'Busy',    color: 'bg-red-500/20 text-red-400 border-red-500/30',        dot: 'bg-red-400'   },
  away:    { label: 'Away',    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  offline: { label: 'Offline', color: 'bg-muted/40 text-muted-foreground border-border',     dot: 'bg-muted-foreground' },
};

function getStatusConfig(status: string | undefined): (typeof STATUS_CONFIG)[TeamStatus] {
  return STATUS_CONFIG[(status as TeamStatus) ?? 'offline'] ?? STATUS_CONFIG.offline;
}

/** Deterministic avatar color from username string */
function usernameToHsl(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function toDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string | undefined }) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full flex-shrink-0',
        cfg.dot,
        status === 'online' && 'ring-2 ring-green-400/30 ring-offset-1 ring-offset-transparent',
      )}
    />
  );
}

function MemberCard({ member, isSelf }: { member: MemberWithStatus; isSelf: boolean }) {
  const cfg = getStatusConfig(member.teamStatus?.status);
  const avatarColor = usernameToHsl(member.username);
  const initials = getInitials(member.displayName);
  const lastSeen = toDate(member.teamStatus?.updatedAt);

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200',
        'bg-card/40 border-border/60 hover:border-border',
        isSelf && 'border-primary/40 bg-primary/5',
      )}
    >
      {isSelf && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
          You
        </span>
      )}

      {/* Avatar + name row */}
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-md"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate leading-tight">{member.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn('text-xs gap-1.5 px-2 py-0.5 border', cfg.color)}
        >
          <StatusDot status={member.teamStatus?.status} />
          {cfg.label}
        </Badge>

        {member.teamStatus?.message && (
          <span className="text-xs text-muted-foreground italic truncate max-w-[120px]">
            {member.teamStatus.message}
          </span>
        )}
      </div>

      {/* Task count + last seen */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2 mt-auto">
        <span className="flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5" />
          {member.activeTaskCount} active {member.activeTaskCount === 1 ? 'task' : 'tasks'}
        </span>
        {lastSeen && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(lastSeen, { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

function ActivityFeedItem({ item }: { item: RecentCompletion }) {
  const completedDate = toDate(item.completedAt);
  const avatarColor = usernameToHsl(item.assignee);
  const initials = getInitials(item.assignee);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-snug line-clamp-2">{item.title || 'Untitled task'}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          <span className="text-primary/80">@{item.assignee}</span>
          {completedDate && ` · ${formatDistanceToNow(completedDate, { addSuffix: true })}`}
        </p>
      </div>
      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TeamOverviewDialog({ open, onOpenChange, client, activeUser }: TeamOverviewDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [myStatus, setMyStatus] = useState<TeamStatus>('online');
  const [myMessage, setMyMessage] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // ── Collection refs ────────────────────────────────────────────────────────

  const accessKeysRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'accessKeys');
  }, [firestore, client.path]);

  const teamStatusesRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'teamStatuses');
  }, [firestore, client.path]);

  const pipelineTasksRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'pipelineTasks');
  }, [firestore, client.path]);

  // ── Live data ──────────────────────────────────────────────────────────────

  const { data: accessKeys, isLoading: isLoadingKeys } = useCollection<AccessKey>(accessKeysRef);
  const { data: teamStatuses, isLoading: isLoadingStatuses } = useCollection<TeamStatusDoc>(teamStatusesRef);
  const { data: pipelineTasks, isLoading: isLoadingTasks } = useCollection<PipelineTask>(pipelineTasksRef);

  const isLoading = isLoadingKeys || isLoadingStatuses || isLoadingTasks;

  // ── Derived data ───────────────────────────────────────────────────────────

  const statusMap = useMemo(() => {
    const map = new Map<string, TeamStatusDoc>();
    for (const s of teamStatuses ?? []) {
      map.set(s.id, s); // doc id = username
    }
    return map;
  }, [teamStatuses]);

  // Count active tasks per assignee (status !== 'Done')
  const taskCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of pipelineTasks ?? []) {
      if (task.assignee && task.status !== 'Done') {
        map.set(task.assignee, (map.get(task.assignee) ?? 0) + 1);
      }
    }
    return map;
  }, [pipelineTasks]);

  // Recent completions sorted by most recent
  const recentCompletions = useMemo((): RecentCompletion[] => {
    const done = (pipelineTasks ?? [])
      .filter((t) => t.status === 'Done' && t.assignee)
      .map((t) => ({
        taskId: t.id,
        title: t.title ?? 'Untitled task',
        assignee: t.assignee!,
        completedAt: t.completedAt ?? t.updatedAt ?? t.createdAt ?? null,
      }));

    done.sort((a, b) => {
      const da = toDate(a.completedAt)?.getTime() ?? 0;
      const db = toDate(b.completedAt)?.getTime() ?? 0;
      return db - da;
    });

    return done.slice(0, 20);
  }, [pipelineTasks]);

  // Enrich access keys with status + task counts
  const membersWithStatus = useMemo((): MemberWithStatus[] => {
    return (accessKeys ?? []).map((key) => ({
      ...key,
      teamStatus: statusMap.get(key.username) ?? null,
      activeTaskCount: taskCountMap.get(key.username) ?? 0,
    }));
  }, [accessKeys, statusMap, taskCountMap]);

  // Filtered by search
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return membersWithStatus;
    return membersWithStatus.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q),
    );
  }, [membersWithStatus, searchQuery]);

  // ── Stats bar ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalMembers = membersWithStatus.length;
    const onlineCount = membersWithStatus.filter(
      (m) => m.teamStatus?.status === 'online',
    ).length;
    const totalActiveTasks = Array.from(taskCountMap.values()).reduce((a, b) => a + b, 0);
    return { totalMembers, onlineCount, totalActiveTasks };
  }, [membersWithStatus, taskCountMap]);

  // ── Status save handler ────────────────────────────────────────────────────

  async function handleSaveStatus() {
    if (!activeUser || !client.path || !firestore) return;
    setIsSavingStatus(true);
    try {
      const statusDocRef = doc(firestore, client.path, 'teamStatuses', activeUser.username);
      await updateDoc(statusDocRef, {
        status: myStatus,
        message: myMessage.trim(),
        updatedAt: serverTimestamp(),
      }).catch(async () => {
        // Document may not exist yet — use set via addDoc workaround via updateDoc with merge
        // Firestore doesn't have setDoc in the same import, so we use a manual approach:
        const { setDoc } = await import('firebase/firestore');
        await setDoc(statusDocRef, {
          status: myStatus,
          message: myMessage.trim(),
          updatedAt: serverTimestamp(),
        });
      });
      toast({ title: 'Status Updated', description: `You are now ${myStatus}.` });
    } catch {
      toast({ title: 'Error', description: 'Could not update status.', variant: 'destructive' });
    } finally {
      setIsSavingStatus(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-strong border-border/50 max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <span className="text-gradient">Team Overview</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Real-time status and activity for {client.firmName}.
          </DialogDescription>
        </DialogHeader>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-border/40 flex flex-wrap gap-6">
          <StatPill
            icon={<Users className="h-4 w-4" />}
            label="Members"
            value={stats.totalMembers}
            isLoading={isLoading}
          />
          <StatPill
            icon={<Wifi className="h-4 w-4 text-green-400" />}
            label="Online"
            value={stats.onlineCount}
            isLoading={isLoading}
            valueClassName="text-green-400"
          />
          <StatPill
            icon={<ListTodo className="h-4 w-4 text-primary" />}
            label="Active Tasks"
            value={stats.totalActiveTasks}
            isLoading={isLoading}
          />
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex gap-0 overflow-hidden">

          {/* Left: member grid + search */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border/40">

            {/* Search bar */}
            <div className="px-5 py-3 flex-shrink-0 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/40 border-border/60 text-sm"
                />
              </div>
            </div>

            {/* Member grid */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                    <WifiOff className="h-8 w-8 opacity-40" />
                    <p className="text-sm">
                      {searchQuery ? 'No members match your search.' : 'No team members found.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredMembers.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        isSelf={activeUser?.username === member.username}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right column */}
          <div className="w-80 flex-shrink-0 flex flex-col">

            {/* My Status panel */}
            {activeUser && (
              <div className="flex-shrink-0 p-4 border-b border-border/40 bg-primary/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  My Status
                </p>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                    <Select
                      value={myStatus}
                      onValueChange={(v) => setMyStatus(v as TeamStatus)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/40 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_CONFIG) as TeamStatus[]).map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            <span className="flex items-center gap-2">
                              <StatusDot status={s} />
                              {STATUS_CONFIG[s].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Message <span className="opacity-60">(optional)</span>
                    </Label>
                    <Textarea
                      placeholder="What are you working on?"
                      value={myMessage}
                      onChange={(e) => setMyMessage(e.target.value)}
                      maxLength={120}
                      rows={2}
                      className="resize-none text-xs bg-background/40 border-border/60"
                    />
                  </div>

                  <Button
                    size="sm"
                    className="btn-gradient w-full h-8 text-xs"
                    onClick={handleSaveStatus}
                    disabled={isSavingStatus}
                  >
                    {isSavingStatus ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
                    ) : (
                      'Update Status'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Activity feed */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-border/40 flex-shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  Recent Completions
                </p>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="px-4 py-2">
                  {isLoading ? (
                    <div className="space-y-3 pt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded" />
                      ))}
                    </div>
                  ) : recentCompletions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center pt-8 pb-4">
                      No completed tasks yet.
                    </p>
                  ) : (
                    recentCompletions.map((item) => (
                      <ActivityFeedItem key={item.taskId} item={item} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill helper
// ─────────────────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  isLoading,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        {isLoading ? (
          <Skeleton className="h-5 w-8 inline-block" />
        ) : (
          <span className={cn('text-lg font-bold leading-none', valueClassName)}>{value}</span>
        )}
        <span className="text-xs text-muted-foreground ml-1.5">{label}</span>
      </div>
    </div>
  );
}
