export type KnockStatus = 'no-answer' | 'rejected' | 'accepted';

export type KnockPin = {
  id: string;
  lat: number;
  lng: number;
  address?: string;
  date: any; // Firestore Timestamp
  knockedBy: string; // username
  knockedByDisplayName: string;
  status: KnockStatus;
  // Only populated for 'accepted'
  personName?: string;
  phone?: string;
  salesInfo?: string;
  notes?: string;
  // If empty/undefined → visible to all. Otherwise only listed usernames can see it.
  visibleTo?: string[];
};
