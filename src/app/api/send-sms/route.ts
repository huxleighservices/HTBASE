
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    // Validate inputs
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Your Make webhook URL from environment variables
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!makeWebhookUrl) {
      console.error('MAKE_WEBHOOK_URL is not set in environment variables.');
      return NextResponse.json(
        { error: 'Webhook URL not configured on the server.' },
        { status: 500 }
      );
    }

    // Prepare the payload for Make.com
    const payload = {
      phoneNumber,
      message,
      timestamp: new Date().toISOString(),
    };

    // Send to Make
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Failed to trigger Make scenario. Status:', response.status, 'Body:', errorBody);
        // Do not throw an error, instead return a structured JSON response
        return NextResponse.json(
            { error: 'Failed to trigger Make scenario', details: errorBody },
            { status: response.status }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'SMS queued for sending'
    });

  } catch (error) {
    console.error('Error in send-sms route:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS', details: error instanceof Error ? error.message : 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}
