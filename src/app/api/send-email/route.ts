
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, text } = await request.json();

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: 'Recipient, subject, and text are required' },
        { status: 400 }
      );
    }

    const makeWebhookUrl = process.env.MAKE_EMAIL_WEBHOOK_URL;

    if (!makeWebhookUrl) {
      console.error('MAKE_EMAIL_WEBHOOK_URL is not set in environment variables.');
      return NextResponse.json(
        { error: 'Email service not configured on the server.' },
        { status: 500 }
      );
    }

    const payload = { to, subject, text };

    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Failed to trigger Make email scenario. Status:', response.status, 'Body:', errorBody);
        return NextResponse.json(
            { error: 'Failed to trigger email webhook', details: errorBody },
            { status: response.status }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Email queued for sending'
    });

  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}
