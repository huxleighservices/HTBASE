'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key is not configured.');
    return { success: false, error: 'Email service not configured. RESEND_API_KEY is missing.' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'HTBase <service@huxleigh.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    console.error('Email send error:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return { success: false, error: errorMessage };
  }
}
