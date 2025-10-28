
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
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '.';
import type { TrainingResult, TrainingSession } from '@/types/sessions';

let firestore: Firestore;
try {
  const services = initializeFirebase();
  firestore = services.firestore;
} catch (e) {
  console.warn('Could not initialize firestore directly, will use getFirestore()');
}


export function onSessionsUpdate(userId: string, callback: (sessions: TrainingSession[]) => void) {
    const db = firestore || getFirestore();
    const sessionsQuery = query(
        collection(db, 'users', userId, 'sessions'),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(sessionsQuery, (querySnapshot) => {
        const sessions: TrainingSession[] = [];
        querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() } as TrainingSession);
        });
        callback(sessions);
    });

    return unsubscribe;
}

export async function addResultToSession(userId: string, sessionId: string, result: TrainingResult) {
    const db = firestore || getFirestore();
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await updateDoc(sessionRef, {
        results: arrayUnion(result)
    });
}
