
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Initialize a separate admin-like app instance for this server-side route
// Note: In a real production scenario, you would use the Firebase Admin SDK
// with service account credentials for security. For this context, we'll
// use the client SDK with the understanding that security rules will be essential.
let db;
try {
    const { firestore } = initializeFirebase();
    db = firestore;
} catch (e) {
    console.error("Failed to initialize Firebase for send-email route", e);
}


export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
        { error: 'The database is not initialized. Cannot send email.' },
        { status: 500 }
      );
  }
  
  try {
    const { to, subject, text } = await request.json();

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: 'Recipient, subject, and text are required' },
        { status: 400 }
      );
    }
    
    // The "Trigger Email" extension listens to a specific collection.
    // We will write a new document to the 'mail' collection.
    const mailCollection = collection(db, 'mail');
    
    await addDoc(mailCollection, {
        to: [to],
        message: {
            subject: subject,
            text: text,
        }
    });

    return NextResponse.json({
      success: true,
      message: 'Email queued for sending via Firebase.'
    });

  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: 'Failed to queue email', details: error instanceof Error ? error.message : 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}
