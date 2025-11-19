import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Await the JSON body from the incoming request
    const body = await request.json();
    const { phoneNumber, message } = body;

    // Validate inputs
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!makeWebhookUrl) {
      console.error('MAKE_WEBHOOK_URL not set in environment variables.');
      return NextResponse.json(
        { error: 'Webhook URL not configured' },
        { status: 500 }
      );
    }

    // Send the received body directly to Make
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Pass the original body, which already contains phoneNumber and message
      body: JSON.stringify(body),
    });

    if (!response.ok) {
       console.error('Failed to trigger Make scenario:', await response.text());
      throw new Error('Failed to trigger Make scenario');
    }

    return NextResponse.json({ 
      success: true,
      message: 'SMS queued for sending' 
    });

  } catch (error: any) {
    console.error('Error in /api/send-sms:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
