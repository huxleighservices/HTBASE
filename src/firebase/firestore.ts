
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
  getFirestore,
} from 'firebase/firestore';
import { initializeFirebase } from '.';
import type { TrainingResult } from '@/types/sessions';

let firestore: Firestore;
try {
  const services = initializeFirebase();
  firestore = services.firestore;
} catch (e) {
  console.warn('Could not initialize firestore directly, will use getFirestore()');
}


export async function addResultToSession(clientPath: string, sessionId: string, result: Omit<TrainingResult, 'createdAt'>) {
    const db = firestore || getFirestore();
    // In the new flow, all results for a client are stored in a single document
    // named after the session ID ('access-key-session').
    const sessionRef = doc(db, clientPath, 'sessions', sessionId);
    
    const resultWithTimestamp = {
        ...result,
        createdAt: new Date() // Use client-side timestamp
    };

    // We use set with merge:true to create the doc if it doesn't exist,
    // and arrayUnion to add the new result to the 'results' array.
    await setDoc(sessionRef, {
        results: arrayUnion(resultWithTimestamp)
    }, { merge: true });
}
