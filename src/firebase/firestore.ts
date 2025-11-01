
'use client';

import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  Firestore,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '.';
import type { TrainingResult } from '@/types/sessions';
import type { Session } from '@/types/session';

let firestore: Firestore;
try {
  const services = initializeFirebase();
  firestore = services.firestore;
} catch (e) {
  console.warn('Could not initialize firestore directly, will use getFirestore()');
}


export function onSessionsUpdate(clientPath: string, callback: (sessions: Session[]) => void) {
    const db = firestore || getFirestore();
    const sessionsQuery = query(
        collection(db, clientPath, 'sessions'),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(sessionsQuery, (querySnapshot) => {
        const sessions: Session[] = [];
        querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() } as Session);
        });
        callback(sessions);
    });

    return unsubscribe;
}

export async function addResultToSession(clientPath: string, sessionId: string, result: TrainingResult) {
    const db = firestore || getFirestore();
    const sessionRef = doc(db, clientPath, 'sessions', sessionId);
    await updateDoc(sessionRef, {
        results: arrayUnion(result)
    });
}

export async function deleteSession(clientPath: string, sessionId: string) {
    const db = firestore || getFirestore();
    const sessionRef = doc(db, clientPath, 'sessions', sessionId);
    await deleteDoc(sessionRef);
}
