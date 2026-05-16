import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) return getApp();
  return initializeApp();
}

const adminApp = initializeFirebaseAdmin();
export const adminDb = getFirestore(adminApp);
