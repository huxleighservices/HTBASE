import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { customerPath, message } = await request.json();

    if (!customerPath || !message) {
      return NextResponse.json(
        { error: 'customerPath and message are required' },
        { status: 400 }
      );
    }

    // Call the Cloud Function from your backend (server-to-server)
    const response = await fetch(
      'https://us-central1-studio-9495804365-10cc6.cloudfunctions.net/sendSMS',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPath, message }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to send SMS' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
    });
  } catch (error: any) {
    console.error('Error in send-sms API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
