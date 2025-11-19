import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT: Replace this with your actual Make.com webhook URL
const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/your-webhook-id';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'phoneNumber and message are required' },
        { status: 400 }
      );
    }
    
    if (MAKE_WEBHOOK_URL.includes('your-webhook-id')) {
        console.warn('Make.com webhook URL is not configured.');
        return NextResponse.json(
            { error: 'Webhook URL is not configured on the server. Please contact an administrator.' },
            { status: 500 }
        );
    }


    // Forward the request to the Make.com webhook
    const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, message }),
      }
    );

    // Make.com typically responds with a 200 OK and "Accepted".
    // We don't need to parse the response body unless there's a specific need.
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from Make.com webhook:', errorText);
      return NextResponse.json(
        { error: 'Failed to trigger webhook.' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SMS successfully queued via webhook.',
    });
  } catch (error: any) {
    console.error('Error in send-sms API route:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
