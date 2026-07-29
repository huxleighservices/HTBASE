import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';

export type ActivityWidgetType =
  | 'base'
  | 'leads'
  | 'inventory-manager'
  | 'task-pipeline'
  | 'ar-collections'
  | 'opac'
  | 'builds'
  | 'contracts'
  | 'base-doc';

/**
 * Records a change for the daily notification digest. Fire-and-forget: failures are
 * logged but never surface to the user, since this must never block the actual mutation.
 */
export function logActivity(
  firestore: Firestore,
  clientPath: string,
  widgetType: ActivityWidgetType,
  summary: string,
): void {
  if (!clientPath) return;
  addDoc(collection(firestore, clientPath, 'activityLog'), {
    widgetType,
    summary,
    createdAt: serverTimestamp(),
  }).catch((err) => console.error('logActivity failed:', err));
}
