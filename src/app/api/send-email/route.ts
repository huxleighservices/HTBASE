
import { NextRequest, NextResponse } from 'next/server';

// This is a placeholder for your actual email sending logic (e.g., using Resend, SendGrid, etc.)
async function sendEmail(to: string, subject: string, text: string) {
    console.log(`Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);

    // In a real application, you would integrate with your email service provider here.
    // For example, using the Resend SDK:
    //
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'onboarding@resend.dev',
    //   to: to,
    //   subject: subject,
    //   text: text,
    // });
    
    // For now, we'll just simulate a successful email send.
    return { success: true };
}


export async function POST(request: NextRequest) {
  try {
    const { to, subject, text } = await request.json();

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: 'Recipient, subject, and text are required' },
        { status: 400 }
      );
    }
    
    const result = await sendEmail(to, subject, text);

    if (!result.success) {
      throw new Error('Failed to send email via external service.');
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully.'
    });

  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}
