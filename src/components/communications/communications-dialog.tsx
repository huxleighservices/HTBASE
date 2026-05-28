'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Search,
  Pin,
  Info,
  Hash,
  Loader2,
  X,
  ChevronRight,
  Lock,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ChannelType = 'public' | 'admin';

type CommChannel = {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  createdBy: string;
  createdAt: any;
  lastMessage?: string;
  lastMessageAt?: any;
  pinnedMessage?: string;
  pinnedBy?: string;
  path: string;
};

type CommMessage = {
  id: string;
  text: string;
  author: string;
  authorDisplay: string;
  createdAt: any;
  reactions?: Record<string, string[]>;
  path: string;
};

type ActivePanel = 'messages' | 'create-channel' | 'channel-info';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ['👍', '✅', '👀', '🔥'];

const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
  'bg-green-500/20 text-green-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-yellow-500/20 text-yellow-400',
  'bg-red-500/20 text-red-400',
];

function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function UserAvatar({ username, displayName, size = 'sm' }: { username: string; displayName: string; size?: 'sm' | 'md' }) {
  const colorClass = getAvatarColor(username);
  return (
    <div
      className={cn(
        'shrink-0 rounded-full flex items-center justify-center font-bold select-none',
        colorClass,
        size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
      )}
    >
      {getInitials(displayName)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isMine,
  isAdmin,
  onDelete,
  onReact,
}: {
  message: CommMessage;
  isMine: boolean;
  isAdmin: boolean;
  onDelete: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const ts = toDate(message.createdAt);

  return (
    <div
      className={cn('group flex items-end gap-2 px-4 py-1', isMine && 'flex-row-reverse')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Avatar */}
      <UserAvatar username={message.author} displayName={message.authorDisplay} />

      <div className={cn('flex flex-col gap-1 max-w-[70%]', isMine && 'items-end')}>
        {/* Author + timestamp */}
        <div className={cn('flex items-center gap-2', isMine && 'flex-row-reverse')}>
          <span className="text-[11px] font-semibold text-foreground/80">{message.authorDisplay}</span>
          {ts && (
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(ts, { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
            isMine
              ? 'bg-primary/20 border border-primary/30 text-foreground rounded-br-sm'
              : 'bg-background/40 border border-border/40 text-foreground rounded-bl-sm'
          )}
        >
          {message.text}
        </div>

        {/* Reactions display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn('flex flex-wrap gap-1', isMine && 'justify-end')}>
            {Object.entries(message.reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="flex items-center gap-0.5 rounded-full border border-border/40 bg-background/30 px-2 py-0.5 text-[11px] hover:bg-background/60 transition-colors"
                >
                  {emoji} <span className="text-muted-foreground ml-0.5">{users.length}</span>
                </button>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div
        className={cn(
          'flex items-center gap-1 transition-opacity',
          showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Emoji picker trigger */}
        <div className="relative">
          <button
            onClick={() => setShowReactions((v) => !v)}
            className="h-6 w-6 rounded-md border border-border/40 bg-background/50 text-[12px] flex items-center justify-center hover:bg-background/80 transition-colors"
            title="React"
          >
            😊
          </button>
          {showReactions && (
            <div className={cn(
              'absolute bottom-8 z-50 flex gap-1 rounded-xl border border-border/50 bg-background/90 backdrop-blur-sm p-2 shadow-lg',
              isMine ? 'right-0' : 'left-0'
            )}>
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact(message.id, emoji); setShowReactions(false); }}
                  className="rounded-lg p-1.5 text-base hover:bg-primary/10 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        {(isMine || isAdmin) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="h-6 w-6 rounded-md border border-border/40 bg-background/50 flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                title="Delete message"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete message?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(message.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel list item
// ─────────────────────────────────────────────────────────────────────────────

function ChannelItem({
  channel,
  isSelected,
  isAdmin,
  unreadCount,
  onSelect,
  onDelete,
}: {
  channel: CommChannel;
  isSelected: boolean;
  isAdmin: boolean;
  unreadCount: number;
  onSelect: () => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const ts = toDate(channel.lastMessageAt);

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all',
        isSelected
          ? 'bg-primary/15 border border-primary/30'
          : 'hover:bg-background/30 border border-transparent'
      )}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn('shrink-0 text-muted-foreground', isSelected && 'text-primary')}>
        {channel.type === 'admin' ? <Lock className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn('text-sm font-medium truncate', isSelected ? 'text-primary' : 'text-foreground')}>
            {channel.name}
          </span>
          {unreadCount > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary/80 text-primary-foreground shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
        {channel.lastMessage && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{channel.lastMessage}</p>
        )}
      </div>

      {isAdmin && channel.name !== 'general' && hovered && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 h-5 w-5 rounded flex items-center justify-center hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete #{channel.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the channel and all its messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(channel.id)}
              >
                Delete Channel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create channel panel
// ─────────────────────────────────────────────────────────────────────────────

function CreateChannelPanel({
  onClose,
  onCreate,
  activeUser,
}: {
  onClose: () => void;
  onCreate: (name: string, description: string, type: ChannelType) => Promise<void>;
  activeUser: AccessKey;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChannelType>('public');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim().replace(/^#+/, '').trim();
    if (!trimmed) return;
    setSaving(true);
    await onCreate(trimmed, description.trim(), type);
    setSaving(false);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">New Channel</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Channel Name
          </Label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm font-mono">#</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              placeholder="channel-name"
              className="h-8 text-sm border-border/60 bg-background/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Description (optional)
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            rows={2}
            className="resize-none text-sm border-border/60 bg-background/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Visibility
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('public')}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all',
                type === 'public'
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border/40 bg-background/30 text-muted-foreground hover:text-foreground'
              )}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              Public
            </button>
            <button
              onClick={() => setType('admin')}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all',
                type === 'admin'
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border/40 bg-background/30 text-muted-foreground hover:text-foreground'
              )}
            >
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Admin Only
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/30 space-y-2">
        <Button
          className="w-full btn-gradient"
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create Channel
        </Button>
        <Button variant="ghost" size="sm" className="w-full border border-border/40 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel info panel
// ─────────────────────────────────────────────────────────────────────────────

function ChannelInfoPanel({
  channel,
  messageCount,
  onClose,
}: {
  channel: CommChannel;
  messageCount: number;
  onClose: () => void;
}) {
  const ts = toDate(channel.createdAt);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Channel Info</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {channel.type === 'admin' ? <Lock className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold text-sm">#{channel.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{channel.type === 'admin' ? 'Admin Only' : 'Public'}</p>
          </div>
        </div>

        {channel.description && (
          <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground/80">{channel.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Messages</p>
            <p className="text-lg font-bold text-foreground">{messageCount}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Created</p>
            <p className="text-xs text-foreground">
              {ts ? formatDistanceToNow(ts, { addSuffix: true }) : '—'}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Created By</p>
          <p className="text-sm text-foreground">@{channel.createdBy}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dialog
// ─────────────────────────────────────────────────────────────────────────────

type CommunicationsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

type CommunicationsContentProps = {
  client: Client;
  activeUser: AccessKey | null;
  compact?: boolean;
};

export function CommunicationsContent({ client, activeUser, compact = false }: CommunicationsContentProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const isManager = activeUser?.role === 'admin';

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel>('messages');
  const [isSending, setIsSending] = useState(false);
  const [initializedGeneral, setInitializedGeneral] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Firestore refs ──────────────────────────────────────────────────────────

  const channelsRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'commChannels');
  }, [firestore, client.path]);

  const channelsQuery = useMemoFirebase(() => {
    if (!channelsRef) return null;
    return query(channelsRef, orderBy('createdAt', 'asc'));
  }, [channelsRef]);

  const { data: channels, isLoading: areChannelsLoading } = useCollection<CommChannel>(channelsQuery);

  const messagesCollRef = useMemoFirebase(() => {
    if (!firestore || !client.path || !selectedChannelId) return null;
    return collection(firestore, client.path, 'commChannels', selectedChannelId, 'messages');
  }, [firestore, client.path, selectedChannelId]);

  const messagesQuery = useMemoFirebase(() => {
    if (!messagesCollRef) return null;
    return query(messagesCollRef, orderBy('createdAt', 'asc'), limit(200));
  }, [messagesCollRef]);

  const { data: messages, isLoading: areMessagesLoading } = useCollection<CommMessage>(messagesQuery);

  // ── Visible channels (non-admin users can't see admin channels) ─────────────

  const visibleChannels = useMemo(() => {
    if (!channels) return [];
    if (isManager) return channels;
    return channels.filter((ch) => ch.type !== 'admin');
  }, [channels, isManager]);

  // ── Auto-create "general" on first load ─────────────────────────────────────

  useEffect(() => {
    if (initializedGeneral || areChannelsLoading || !channelsRef || !channels || !activeUser) return;
    setInitializedGeneral(true);

    const hasGeneral = channels.some((ch) => ch.name === 'general');
    if (!hasGeneral) {
      addDoc(channelsRef, {
        name: 'general',
        description: 'General team communication',
        type: 'public',
        createdBy: activeUser.username,
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      }).then((docRef) => {
        setSelectedChannelId(docRef.id);
      }).catch(() => {});
    }
  }, [areChannelsLoading, channels, channelsRef, activeUser, initializedGeneral]);

  // ── Auto-select first channel once loaded ───────────────────────────────────

  useEffect(() => {
    if (!selectedChannelId && visibleChannels.length > 0) {
      const general = visibleChannels.find((ch) => ch.name === 'general');
      setSelectedChannelId(general?.id ?? visibleChannels[0].id);
    }
  }, [visibleChannels, selectedChannelId]);

  // ── Auto-scroll to bottom ───────────────────────────────────────────────────

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Selected channel object ─────────────────────────────────────────────────

  const selectedChannel = useMemo(
    () => visibleChannels.find((ch) => ch.id === selectedChannelId) ?? null,
    [visibleChannels, selectedChannelId]
  );

  // ── Filtered messages (search) ──────────────────────────────────────────────

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.authorDisplay.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !messagesCollRef || !selectedChannelId || !activeUser || !client.path) return;
    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      await addDoc(messagesCollRef, {
        text,
        author: activeUser.username,
        authorDisplay: activeUser.displayName,
        createdAt: serverTimestamp(),
        reactions: {},
      });

      // Update channel's last message
      const channelDocRef = doc(firestore, client.path, 'commChannels', selectedChannelId);
      await updateDoc(channelDocRef, {
        lastMessage: text.length > 60 ? text.substring(0, 60) + '…' : text,
        lastMessageAt: serverTimestamp(),
      });
    } catch {
      toast({ title: 'Failed to send', variant: 'destructive' });
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  }, [messageText, messagesCollRef, selectedChannelId, activeUser, client.path, firestore, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    if (!client.path || !selectedChannelId) return;
    try {
      await deleteDoc(doc(firestore, client.path, 'commChannels', selectedChannelId, 'messages', msgId));
    } catch {
      toast({ title: 'Failed to delete message', variant: 'destructive' });
    }
  }, [firestore, client.path, selectedChannelId, toast]);

  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    if (!client.path || !selectedChannelId || !activeUser) return;
    const msg = messages?.find((m) => m.id === msgId);
    if (!msg) return;

    const currentReactions = msg.reactions ?? {};
    const existing = currentReactions[emoji] ?? [];
    const username = activeUser.username;
    const newUsers = existing.includes(username)
      ? existing.filter((u) => u !== username)
      : [...existing, username];

    try {
      await updateDoc(
        doc(firestore, client.path, 'commChannels', selectedChannelId, 'messages', msgId),
        { [`reactions.${emoji}`]: newUsers }
      );
    } catch {
      toast({ title: 'Failed to add reaction', variant: 'destructive' });
    }
  }, [firestore, client.path, selectedChannelId, activeUser, messages, toast]);

  const handlePinMessage = useCallback(async (msgId: string, text: string) => {
    if (!client.path || !selectedChannelId || !activeUser) return;
    try {
      await updateDoc(
        doc(firestore, client.path, 'commChannels', selectedChannelId),
        {
          pinnedMessage: text,
          pinnedBy: activeUser.username,
        }
      );
      toast({ title: 'Message pinned' });
    } catch {
      toast({ title: 'Failed to pin message', variant: 'destructive' });
    }
  }, [firestore, client.path, selectedChannelId, activeUser, toast]);

  const handleUnpin = useCallback(async () => {
    if (!client.path || !selectedChannelId) return;
    try {
      await updateDoc(
        doc(firestore, client.path, 'commChannels', selectedChannelId),
        { pinnedMessage: '', pinnedBy: '' }
      );
    } catch {
      toast({ title: 'Failed to unpin', variant: 'destructive' });
    }
  }, [firestore, client.path, selectedChannelId, toast]);

  const handleCreateChannel = useCallback(async (name: string, description: string, type: ChannelType) => {
    if (!channelsRef || !activeUser) return;
    const already = channels?.some((ch) => ch.name === name);
    if (already) {
      toast({ title: `#${name} already exists`, variant: 'destructive' });
      return;
    }
    try {
      const docRef = await addDoc(channelsRef, {
        name,
        description,
        type,
        createdBy: activeUser.username,
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      });
      setSelectedChannelId(docRef.id);
      setActivePanel('messages');
      toast({ title: `#${name} created` });
    } catch {
      toast({ title: 'Failed to create channel', variant: 'destructive' });
    }
  }, [channelsRef, activeUser, channels, toast]);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    if (!client.path) return;
    try {
      // Delete messages subcollection first
      const msgsSnap = await getDocs(
        collection(firestore, client.path, 'commChannels', channelId, 'messages')
      );
      await Promise.all(msgsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(firestore, client.path, 'commChannels', channelId));

      if (selectedChannelId === channelId) {
        const remaining = visibleChannels.filter((ch) => ch.id !== channelId);
        setSelectedChannelId(remaining[0]?.id ?? null);
      }
      toast({ title: 'Channel deleted', variant: 'destructive' });
    } catch {
      toast({ title: 'Failed to delete channel', variant: 'destructive' });
    }
  }, [firestore, client.path, selectedChannelId, visibleChannels, toast]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden h-full">
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className={`${compact ? 'w-36' : 'w-56'} shrink-0 flex flex-col border-r border-border/30 bg-background/20`}>
            {/* Sidebar header — hidden in compact mode (sidebar has its own header) */}
            {!compact && (
              <div className="px-3 py-3.5 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{client.firmName}</p>
                    <p className="text-[10px] text-muted-foreground">Communications</p>
                  </div>
                </div>
              </div>
            )}

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channels</span>
                {isManager && (
                  <button
                    onClick={() => setActivePanel(activePanel === 'create-channel' ? 'messages' : 'create-channel')}
                    className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    title="Create channel"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {areChannelsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : visibleChannels.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-4 px-2">
                  No channels yet
                </p>
              ) : (
                visibleChannels.map((ch) => (
                  <ChannelItem
                    key={ch.id}
                    channel={ch}
                    isSelected={selectedChannelId === ch.id}
                    isAdmin={isManager}
                    unreadCount={0}
                    onSelect={() => {
                      setSelectedChannelId(ch.id);
                      setActivePanel('messages');
                      setSearchQuery('');
                    }}
                    onDelete={handleDeleteChannel}
                  />
                ))
              )}
            </div>

            {/* Sidebar footer — active user */}
            {activeUser && (
              <div className="px-3 py-2.5 border-t border-border/30 flex items-center gap-2">
                <UserAvatar username={activeUser.username} displayName={activeUser.displayName} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{activeUser.displayName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize truncate">
                    {activeUser.role ?? 'user'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <div className="flex flex-1 min-w-0 overflow-hidden">
            {/* Messages view */}
            {activePanel === 'messages' && selectedChannel && (
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                {/* Channel top bar */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/10">
                  <button
                    onClick={() => setActivePanel('channel-info')}
                    className="flex items-center gap-1.5 min-w-0 hover:text-primary transition-colors group"
                    title="Channel info"
                  >
                    {selectedChannel.type === 'admin' ? (
                      <Lock className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    ) : (
                      <Hash className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    )}
                    <span className="font-semibold text-sm truncate">{selectedChannel.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>

                  {selectedChannel.description && (
                    <span className="text-xs text-muted-foreground hidden sm:block truncate border-l border-border/30 pl-3">
                      {selectedChannel.description}
                    </span>
                  )}

                  <div className="ml-auto shrink-0 flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search messages…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-7 w-40 text-xs border-border/50 bg-background/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Pinned message banner */}
                {selectedChannel.pinnedMessage && (
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-yellow-500/20 bg-yellow-500/5">
                    <Pin className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    <p className="text-xs text-yellow-300 truncate flex-1">
                      <span className="font-semibold">Pinned:</span> {selectedChannel.pinnedMessage}
                    </p>
                    {isManager && (
                      <button
                        onClick={handleUnpin}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Unpin"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto py-2">
                  {areMessagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center px-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No messages match your search.' : `No messages yet in #${selectedChannel.name}. Say hello!`}
                      </p>
                    </div>
                  ) : (
                    <>
                      {filteredMessages.map((msg) => (
                        <div key={msg.id} className="group/msg relative">
                          <MessageBubble
                            message={msg}
                            isMine={msg.author === activeUser?.username}
                            isAdmin={isManager}
                            onDelete={handleDeleteMessage}
                            onReact={handleReact}
                          />
                          {/* Admin pin action on hover */}
                          {isManager && (
                            <button
                              onClick={() => handlePinMessage(msg.id, msg.text)}
                              className="absolute right-4 top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-yellow-400"
                              title="Pin message"
                            >
                              <Pin className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input bar */}
                <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border/30 bg-background/10">
                  <div className="flex items-end gap-2">
                    {activeUser && (
                      <UserAvatar username={activeUser.username} displayName={activeUser.displayName} size="md" />
                    )}
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${selectedChannel.name}… (Enter to send, Shift+Enter for newline)`}
                        rows={1}
                        className="resize-none text-sm border-border/50 bg-background/40 pr-12 min-h-[42px] max-h-32 overflow-y-auto"
                        style={{ fieldSizing: 'content' } as any}
                        disabled={isSending}
                      />
                    </div>
                    <Button
                      size="icon"
                      className="btn-gradient h-[42px] w-[42px] shrink-0"
                      onClick={handleSendMessage}
                      disabled={isSending || !messageText.trim()}
                      title="Send message"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* No channel selected */}
            {activePanel === 'messages' && !selectedChannel && !areChannelsLoading && (
              <div className="flex flex-col flex-1 items-center justify-center gap-3 px-6 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a channel to start chatting</p>
                {isManager && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/50 text-xs"
                    onClick={() => setActivePanel('create-channel')}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Create a channel
                  </Button>
                )}
              </div>
            )}

            {/* Create channel panel */}
            {activePanel === 'create-channel' && isManager && activeUser && (
              <div className="flex flex-col flex-1 min-h-0 max-w-sm mx-auto w-full">
                <CreateChannelPanel
                  activeUser={activeUser}
                  onClose={() => setActivePanel('messages')}
                  onCreate={handleCreateChannel}
                />
              </div>
            )}

            {/* Channel info panel */}
            {activePanel === 'channel-info' && selectedChannel && (
              <div className="flex flex-col flex-1 min-h-0 max-w-sm mx-auto w-full">
                <ChannelInfoPanel
                  channel={selectedChannel}
                  messageCount={messages?.length ?? 0}
                  onClose={() => setActivePanel('messages')}
                />
              </div>
            )}
          </div>
    </div>
  );
}

export function CommunicationsDialog({ open, onOpenChange, client, activeUser }: CommunicationsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 overflow-hidden glass-card-strong border-border/50">
        <DialogHeader className="sr-only">
          <DialogTitle>Team Communications — {client.firmName}</DialogTitle>
          <DialogDescription>Chat channels for {client.firmName}</DialogDescription>
        </DialogHeader>
        <CommunicationsContent client={client} activeUser={activeUser} />
      </DialogContent>
    </Dialog>
  );
}
