import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface CompletionEmailBody {
  certId: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
  isInsuranceJob: boolean;
  firmName: string;
  signedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CompletionEmailBody = await request.json();
    const {
      certId,
      customerName,
      customerEmail,
      projectName,
      isInsuranceJob,
      firmName,
      signedAt,
    } = body;

    if (!certId || !customerName || !projectName) {
      return NextResponse.json(
        { error: 'certId, customerName, and projectName are required.' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in environment variables.');
      return NextResponse.json(
        { error: 'Email service not configured on the server.' },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const certLink = `${appUrl}/sign/${certId}`;

    const signedDateFormatted = signedAt
      ? new Date(signedAt).toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        })
      : 'N/A';

    const insuranceBanner = isInsuranceJob
      ? `
        <tr>
          <td style="background:#fff3cd;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:4px;margin-bottom:16px;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#92400e;">
              ⚠ INSURANCE JOB
            </p>
            <p style="margin:6px 0 0;font-size:14px;color:#92400e;">
              This project is flagged as an insurance job. Please ensure all documentation is in order before invoicing.
            </p>
          </td>
        </tr>
        <tr><td style="height:12px;"></td></tr>
      `
      : '';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Completion Signed</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1e293b;padding:28px 32px;">
              <p style="margin:0;font-size:13px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;">HTBase</p>
              <h1 style="margin:4px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Certificate of Completion Signed</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Intro -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0;font-size:15px;color:#334155;">
                      A Certificate of Completion has been signed by the customer. Details are below.
                    </p>
                  </td>
                </tr>

                <!-- Insurance banner (conditional) -->
                ${insuranceBanner}

                <!-- Action Required -->
                <tr>
                  <td style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;border-radius:4px;">
                    <p style="margin:0;font-size:15px;font-weight:700;color:#991b1b;">
                      ACTION REQUIRED: Invoice needs to be billed
                    </p>
                    <p style="margin:6px 0 0;font-size:14px;color:#991b1b;">
                      Please generate and send the invoice to the customer as soon as possible.
                    </p>
                  </td>
                </tr>
                <tr><td style="height:24px;"></td></tr>

                <!-- Details table -->
                <tr>
                  <td style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr style="background:#f8fafc;">
                        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;width:40%;">Customer</td>
                        <td style="padding:12px 16px;font-size:14px;color:#1e293b;">${customerName}</td>
                      </tr>
                      <tr style="border-top:1px solid #e2e8f0;">
                        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Customer Email</td>
                        <td style="padding:12px 16px;font-size:14px;color:#1e293b;">${customerEmail ?? '—'}</td>
                      </tr>
                      <tr style="border-top:1px solid #e2e8f0;background:#f8fafc;">
                        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Project</td>
                        <td style="padding:12px 16px;font-size:14px;color:#1e293b;">${projectName}</td>
                      </tr>
                      <tr style="border-top:1px solid #e2e8f0;">
                        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Firm</td>
                        <td style="padding:12px 16px;font-size:14px;color:#1e293b;">${firmName ?? '—'}</td>
                      </tr>
                      <tr style="border-top:1px solid #e2e8f0;background:#f8fafc;">
                        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Signed At</td>
                        <td style="padding:12px 16px;font-size:14px;color:#1e293b;">${signedDateFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:24px;"></td></tr>

                <!-- CTA -->
                <tr>
                  <td align="center">
                    <a href="${certLink}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.02em;">
                      View Certificate
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                This notification was sent automatically by HTBase · <a href="${appUrl}" style="color:#64748b;">htbase.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const { data, error } = await resend.emails.send({
      from: 'HTBase <service@huxleigh.com>',
      to: 'mt@mtroofingandrestoration.com',
      subject: `Certificate of Completion Signed — ${customerName}`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/send-completion-email route:', error);
    return NextResponse.json(
      {
        error: 'Failed to send completion email.',
        details: error instanceof Error ? error.message : 'An unknown error occurred.',
      },
      { status: 500 }
    );
  }
}
