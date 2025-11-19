import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    console.log('Received request:', { phoneNumber, message });

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Format phone number to E.164 if needed
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
    }

    console.log('Formatted phone:', formattedPhone);

    // Your Make webhook URL - replace with your actual URL
    const makeWebhookUrl = 'https://hook.us2.make.com/53qbv5mfdpxyue0reapkbe26mor';

    console.log('Sending to Make...');

    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        message,
      }),
    });

    console.log('Make response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Make error:', errorText);
      throw new Error('Failed to trigger Make scenario');
    }

    return NextResponse.json({ 
      success: true,
      message: 'SMS sent successfully' 
    });

  } catch (error) {
    console.error('Error in send-sms route:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}