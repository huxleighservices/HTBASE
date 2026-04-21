'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin, Loader2, Check, X, ChevronRight, Users,
  Phone, DollarSign, MessageSquare, Eye, EyeOff,
  Search, Map, History, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection, addDoc, serverTimestamp, getDocs, query, where,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Client } from '@/types/client';
import type { AccessKey } from '@/types/session';
import type { KnockPin, KnockStatus } from '@/types/knock-pro';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 }; // center of US

const STATUS_COLORS: Record<KnockStatus, string> = {
  'accepted':  '#22c55e',
  'rejected':  '#eab308',
  'no-answer': '#ef4444',
};

const STATUS_LABELS: Record<KnockStatus, string> = {
  'accepted':  'Accepted',
  'rejected':  'Not Interested',
  'no-answer': 'No Answer',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pinSymbol(color: string) {
  return {
    path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 1.5,
    scale: 1.2,
  };
}

type Step = 'idle' | 'answered' | 'outcome' | 'details';

type PendingKnock = {
  lat: number;
  lng: number;
  address?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Knock form panel (slides in from right)
// ─────────────────────────────────────────────────────────────────────────────

function KnockForm({
  pending,
  activeUser,
  onSave,
  onCancel,
}: {
  pending: PendingKnock;
  activeUser: AccessKey;
  onSave: (pin: Omit<KnockPin, 'id'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>('answered');
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [salesInfo, setSalesInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveNoAnswer = async () => {
    setSaving(true);
    await onSave({
      lat: pending.lat, lng: pending.lng,
      address: pending.address,
      date: serverTimestamp(),
      knockedBy: activeUser.username,
      knockedByDisplayName: activeUser.displayName,
      status: 'no-answer',
    });
    setSaving(false);
  };

  const handleSaveRejected = async () => {
    setSaving(true);
    await onSave({
      lat: pending.lat, lng: pending.lng,
      address: pending.address,
      date: serverTimestamp(),
      knockedBy: activeUser.username,
      knockedByDisplayName: activeUser.displayName,
      status: 'rejected',
      notes,
    });
    setSaving(false);
  };

  const handleSaveAccepted = async () => {
    setSaving(true);
    await onSave({
      lat: pending.lat, lng: pending.lng,
      address: pending.address,
      date: serverTimestamp(),
      knockedBy: activeUser.username,
      knockedByDisplayName: activeUser.displayName,
      status: 'accepted',
      personName,
      phone,
      salesInfo,
      notes,
    });
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Location header */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {pending.address || `${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`}
            </p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(), 'PPpp')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Step: Was door answered? */}
        {step === 'answered' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Was the door answered?</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-16 flex-col gap-1 border-green-500/40 hover:bg-green-500/10 hover:border-green-500/70"
                onClick={() => { setAnswered(true); setStep('outcome'); }}
              >
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-xs">Yes, answered</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1 border-red-500/40 hover:bg-red-500/10 hover:border-red-500/70"
                onClick={() => { setAnswered(false); handleSaveNoAnswer(); }}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5 text-red-500" />}
                <span className="text-xs">No answer</span>
              </Button>
            </div>
          </div>
        )}

        {/* Step: Accepted or rejected? */}
        {step === 'outcome' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Were they interested?</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-16 flex-col gap-1 border-green-500/40 hover:bg-green-500/10 hover:border-green-500/70"
                onClick={() => { setAccepted(true); setStep('details'); }}
              >
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-xs">Accepted</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1 border-yellow-500/40 hover:bg-yellow-500/10 hover:border-yellow-500/70"
                onClick={() => { setAccepted(false); setStep('details'); }}
              >
                <X className="h-5 w-5 text-yellow-500" />
                <span className="text-xs">Not interested</span>
              </Button>
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="space-y-3">
            <div className={cn(
              'rounded-xl border px-3 py-2 text-xs font-semibold',
              accepted
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            )}>
              {accepted ? '✓ Accepted — enter lead details' : '✗ Not interested — add any notes'}
            </div>

            {accepted && (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Name</Label>
                  <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Homeowner name" className="h-8 text-sm border-border/60 bg-background/50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" className="h-8 text-sm border-border/60 bg-background/50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sales Info / What They Need</Label>
                  <Textarea value={salesInfo} onChange={(e) => setSalesInfo(e.target.value)} placeholder="Roof damage, interested in inspection, etc." rows={2} className="resize-none text-sm border-border/60 bg-background/50" />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the interaction..."
                rows={2}
                className="resize-none text-sm border-border/60 bg-background/50"
              />
            </div>

            <Button
              className="w-full btn-gradient"
              onClick={accepted ? handleSaveAccepted : handleSaveRejected}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Knock
            </Button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border/30">
        <Button variant="ghost" size="sm" onClick={onCancel} className="w-full border border-border/40 text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility settings panel
// ─────────────────────────────────────────────────────────────────────────────

function VisibilityPanel({
  accessKeys,
  visibleUsers,
  currentUsername,
  onChange,
  onClose,
}: {
  accessKeys: AccessKey[];
  visibleUsers: string[];
  currentUsername: string;
  onChange: (users: string[]) => void;
  onClose: () => void;
}) {
  const others = accessKeys.filter((k) => k.username !== currentUsername);

  const toggle = (username: string) => {
    if (visibleUsers.includes(username)) {
      onChange(visibleUsers.filter((u) => u !== username));
    } else {
      onChange([...visibleUsers, username]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Visible Pin Layers</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Toggle which team members' pins are shown on your map.
        </p>
        {/* Current user — always on */}
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/30 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{currentUsername}</p>
            <p className="text-[10px] text-muted-foreground">You (always visible)</p>
          </div>
          <Switch checked disabled />
        </div>
        {others.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-4">No other team members.</p>
        )}
        {others.map((k) => (
          <div key={k.username} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{k.displayName}</p>
              <p className="text-[10px] text-muted-foreground">@{k.username}</p>
            </div>
            <Switch
              checked={visibleUsers.includes(k.username)}
              onCheckedChange={() => toggle(k.username)}
            />
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border/30">
        <Button size="sm" className="w-full btn-gradient text-xs" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dialog
// ─────────────────────────────────────────────────────────────────────────────

type KnockProDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

type SidePanel = 'none' | 'knock-form' | 'visibility';
type ActiveTab = 'map' | 'history';

export function KnockProDialog({ open, onOpenChange, client, activeUser }: KnockProDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [pending, setPending] = useState<PendingKnock | null>(null);
  const [selectedPin, setSelectedPin] = useState<KnockPin | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [accessKeys, setAccessKeys] = useState<AccessKey[]>([]);
  const [visibleUsers, setVisibleUsers] = useState<string[]>([activeUser?.username ?? '']);
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [search, setSearch] = useState('');

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: ['places'],
  });

  // Load access keys for visibility panel
  useEffect(() => {
    if (!firestore || !client.path) return;
    getDocs(collection(firestore, client.path, 'accessKeys')).then((snap) => {
      setAccessKeys(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as AccessKey));
    });
  }, [firestore, client.path]);

  // Ensure current user is always in visibleUsers
  useEffect(() => {
    if (activeUser && !visibleUsers.includes(activeUser.username)) {
      setVisibleUsers((prev) => [...prev, activeUser.username]);
    }
  }, [activeUser]);

  // Load knock pins
  const pinsRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'knockPins');
  }, [firestore, client.path]);
  const { data: allPins } = useCollection<KnockPin>(pinsRef);

  // Filter by visible users + search
  const visiblePins = useMemo(() => {
    if (!allPins) return [];
    const q = search.trim().toLowerCase();
    return allPins.filter((p) => {
      if (!visibleUsers.includes(p.knockedBy)) return false;
      if (!q) return true;
      return (
        p.address?.toLowerCase().includes(q) ||
        p.personName?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        STATUS_LABELS[p.status].toLowerCase().includes(q)
      );
    });
  }, [allPins, visibleUsers, search]);

  // History: current user's pins, newest first, filtered by search
  const myHistory = useMemo(() => {
    if (!allPins) return [];
    const q = search.trim().toLowerCase();
    return allPins
      .filter((p) => {
        if (p.knockedBy !== activeUser?.username) return false;
        if (!q) return true;
        return (
          p.address?.toLowerCase().includes(q) ||
          p.personName?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          STATUS_LABELS[p.status].toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ta = a.date?.toDate ? a.date.toDate().getTime() : 0;
        const tb = b.date?.toDate ? b.date.toDate().getTime() : 0;
        return tb - ta;
      });
  }, [allPins, activeUser, search]);

  // Stats
  const stats = useMemo(() => {
    const mine = allPins?.filter((p) => p.knockedBy === activeUser?.username) ?? [];
    return {
      total: mine.length,
      accepted: mine.filter((p) => p.status === 'accepted').length,
      rejected: mine.filter((p) => p.status === 'rejected').length,
      noAnswer: mine.filter((p) => p.status === 'no-answer').length,
    };
  }, [allPins, activeUser]);

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    // Reverse geocode
    let address: string | undefined;
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      address = result.results[0]?.formatted_address;
      console.log('[KnockPro] geocode result:', result.results[0]);
    } catch (err) {
      console.error('[KnockPro] geocode error:', err);
    }

    setPending({ lat, lng, address });
    setSelectedPin(null);
    setSidePanel('knock-form');
  }, []);

  const handleSaveKnock = useCallback(async (pin: Omit<KnockPin, 'id'>) => {
    if (!pinsRef) return;
    await addDoc(pinsRef, pin);
    toast({
      title: 'Knock saved!',
      description: `${STATUS_LABELS[pin.status]} — ${pin.address ?? 'Location logged'}`,
    });
    setPending(null);
    setSidePanel('none');
  }, [pinsRef, toast]);

  const handleGeolocate = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        map?.panTo(c);
        map?.setZoom(15);
      },
      () => toast({ title: 'Location unavailable', variant: 'destructive' })
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden glass-card-strong border-border/50">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="font-headline text-lg">Knock Pro</DialogTitle>
                <DialogDescription className="text-xs">
                  {activeTab === 'map' ? `Tap the map to log a knock · ${client.firmName}` : 'Your personal knock history'}
                </DialogDescription>
              </div>
            </div>

            {/* Stats pills */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-border/40 bg-background/30 px-2.5 py-1 text-[10px] font-bold">
                Total: <span className="text-foreground ml-1">{stats.total}</span>
              </span>
              <span className="flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-400">
                ● {stats.accepted}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-400">
                ● {stats.rejected}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400">
                ● {stats.noAnswer}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeTab === 'map' && (
                <>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/50" onClick={handleGeolocate}>
                    <MapPin className="h-3.5 w-3.5" />My Location
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs border-border/50"
                    onClick={() => setSidePanel(sidePanel === 'visibility' ? 'none' : 'visibility')}
                  >
                    <Users className="h-3.5 w-3.5" />Visibility
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="flex items-center gap-3 pt-3">
            <div className="flex rounded-lg border border-border/40 bg-background/30 p-0.5 gap-0.5">
              <button
                onClick={() => setActiveTab('map')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  activeTab === 'map'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Map className="h-3.5 w-3.5" />Map
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  activeTab === 'history'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <History className="h-3.5 w-3.5" />My History
              </button>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'map' ? 'Search pins on map…' : 'Search history…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs border-border/50 bg-background/50"
              />
            </div>
          </div>
        </DialogHeader>

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-2">
            {myHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No knocks match your search.' : "You haven't logged any knocks yet."}
                </p>
              </div>
            ) : (
              myHistory.map((pin) => {
                const pinDate = pin.date?.toDate ? pin.date.toDate() : null;
                return (
                  <div
                    key={pin.id}
                    className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/30 px-4 py-3 hover:bg-background/50 transition-all"
                  >
                    <span
                      className="mt-0.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
                      style={{ background: STATUS_COLORS[pin.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{STATUS_LABELS[pin.status]}</span>
                        {pinDate && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(pinDate, 'MMM d, yyyy · h:mm a')}
                          </span>
                        )}
                      </div>
                      {pin.address && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{pin.address}</p>
                      )}
                      {pin.personName && (
                        <p className="text-xs mt-1">
                          <span className="text-muted-foreground">Contact:</span> {pin.personName}
                          {pin.phone && <span className="ml-2 text-muted-foreground">{pin.phone}</span>}
                        </p>
                      )}
                      {pin.salesInfo && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">{pin.salesInfo}</p>
                      )}
                      {pin.notes && !pin.salesInfo && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">{pin.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Map + side panel */}
        {activeTab === 'map' && <div className="flex flex-1 min-h-0">
          {/* Map */}
          <div className="flex-1 relative">
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                {loadError ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-destructive">Map failed to load</p>
                    <p className="text-xs text-muted-foreground">
                      Add <span className="font-mono text-primary">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> to your .env.local
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading map...</p>
                  </div>
                )}
              </div>
            )}

            {isLoaded && (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={center}
                zoom={12}
                onLoad={setMap}
                onClick={handleMapClick}
                options={{
                  styles: darkMapStyle,
                  disableDefaultUI: false,
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                }}
              >
                {/* Pending (unconfirmed) marker */}
                {pending && (
                  <Marker
                    position={{ lat: pending.lat, lng: pending.lng }}
                    icon={pinSymbol('#60a5fa')}
                    animation={google.maps.Animation.BOUNCE}
                  />
                )}

                {/* Saved pins */}
                {visiblePins.map((pin) => (
                  <Marker
                    key={pin.id}
                    position={{ lat: pin.lat, lng: pin.lng }}
                    icon={pinSymbol(STATUS_COLORS[pin.status])}
                    onClick={() => { setSelectedPin(pin); setPending(null); setSidePanel('none'); }}
                  />
                ))}

                {/* Info window for selected pin */}
                {selectedPin && (
                  <InfoWindow
                    position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
                    onCloseClick={() => setSelectedPin(null)}
                  >
                    <div className="p-1 min-w-[180px] text-sm space-y-1.5" style={{ color: '#111' }}>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: STATUS_COLORS[selectedPin.status] }}
                        />
                        <span className="font-bold">{STATUS_LABELS[selectedPin.status]}</span>
                      </div>
                      {selectedPin.address && (
                        <p className="text-xs text-gray-600">{selectedPin.address}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        By {selectedPin.knockedByDisplayName}
                        {selectedPin.date?.toDate && (
                          <> · {format(selectedPin.date.toDate(), 'MMM d, h:mm a')}</>
                        )}
                      </p>
                      {selectedPin.personName && (
                        <p className="text-xs"><strong>Contact:</strong> {selectedPin.personName}</p>
                      )}
                      {selectedPin.phone && (
                        <p className="text-xs"><strong>Phone:</strong> {selectedPin.phone}</p>
                      )}
                      {selectedPin.salesInfo && (
                        <p className="text-xs"><strong>Sales:</strong> {selectedPin.salesInfo}</p>
                      )}
                      {selectedPin.notes && (
                        <p className="text-xs text-gray-600 italic">{selectedPin.notes}</p>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-xl border border-border/40 bg-background/80 backdrop-blur-md px-3 py-2.5">
              {(['accepted', 'rejected', 'no-answer'] as KnockStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                  <span className="text-muted-foreground">{STATUS_LABELS[s]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Side panel */}
          {sidePanel !== 'none' && (
            <div className="w-72 shrink-0 border-l border-border/30 bg-background/50 backdrop-blur-sm flex flex-col">
              {sidePanel === 'knock-form' && pending && activeUser && (
                <KnockForm
                  pending={pending}
                  activeUser={activeUser}
                  onSave={handleSaveKnock}
                  onCancel={() => { setPending(null); setSidePanel('none'); }}
                />
              )}
              {sidePanel === 'visibility' && (
                <VisibilityPanel
                  accessKeys={accessKeys}
                  visibleUsers={visibleUsers}
                  currentUsername={activeUser?.username ?? ''}
                  onChange={setVisibleUsers}
                  onClose={() => setSidePanel('none')}
                />
              )}
            </div>
          )}
        </div>}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dark map style
// ─────────────────────────────────────────────────────────────────────────────

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0d1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0d1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f1f0f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#2d5a2d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2433' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050d1a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#050d1a' }] },
];
