
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


export function onSessionsUpdate(clientPath: string, callback: (sessions: TrainingSession[]) => void) {
    const db = firestore || getFirestore();
    const sessionsQuery = query(
        collection(db, clientPath, 'sessions'),
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

export async function createSession(clientPath: string, sessionId: string, sessionName: string) {
    const db = firestore || getFirestore();
    const sessionRef = doc(db, clientPath, 'sessions', sessionId);
    await setDoc(sessionRef, {
        id: sessionId,
        name: sessionName,
        createdAt: serverTimestamp(),
        results: [],
    });
}

export async function addResultToSession(clientPath: string, sessionId: string, result: TrainingResult) {
    const db = firestore || getFirestore();
    const sessionRef = doc(db, clientPath, 'sessions', sessionId);
    await updateDoc(sessionRef, {
        results: arrayUnion(result)
    });
}
