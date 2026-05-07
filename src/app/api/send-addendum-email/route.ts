import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface AddendumEmailBody {
  addendumId: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
  decision: 'authorized' | 'declined';
  totalCost: number;
  firmName: string;
  signedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AddendumEmailBody = await request.json();
    const {
      addendumId,
      customerName,
      customerEmail,
      projectName,
      decision,
      totalCost,
      firmName,
      signedAt,
    } = body;

    if (!addendumId || !customerName || !projectName) {
      return NextResponse.json(
        { error: 'addendumId, customerName, and projectName are required.' },
        { status: 400 },
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in environment variables.');
      return NextResponse.json(
        { error: 'Email service not configured on the server.' },
        { status: 500 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const addendumLink = `${appUrl}/addendum/${addendumId}`;

    const signedDateFormatted = signedAt
      ? new Date(signedAt).toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        })
      : 'N/A';

    const totalCostFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalCost ?? 0);

    const isAuthorized = decision === 'authorized';

    const decisionBanner = isAuthorized
      ? `
        <tr>
          <td style="background:#d1fae5;border-left:4px solid #10b981;padding:16px 20px;border-radius:4px;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#065f46;">
              ✅ AUTHORIZED
            </p>
            <p style="margin:6px 0 0;font-size:14px;color:#065f46;">
              The customer has authorized the supplemental work. Please proceed and add to the final invoice.
            </p>
          </td>
        </tr>
        <tr><td style="height:12px;"></td></tr>
      `
      : `
        <tr>
          <td style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px 20px;border-radius:4px;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#991b1b;">
              ❌ DECLINED — ACTION REQUIRED
            </p>
            <p style="margin:6px 0 0;font-size:14px;color:#991b1b;">
              The customer has declined the supplemental work. Document this for your records. M&amp;T Roofing &amp; Restoration is released from liability for the declined items.
            </p>
          </td>
        </tr>
        <tr><td style="height:12px;"></td></tr>
      `;

    const decisionLabel = isAuthorized ? 'Authorized' : 'Declined';
    const subjectDecisionLabel = isAuthorized ? 'Authorized' : 'Declined';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Supplemental Work Addendum ${subjectDecisionLabel}</title>
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
              <h1 style="margin:4px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Supplemental Work Addendum ${subjectDecisionLabel}</h1>
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
                      A Supplemental Work Addendum has been ${decisionLabel.toLowerCase()} by the customer. Details are below.
                    </p>
                  </td>
                </tr>

                <!-- Decision banner -->
                ${decisionBanner}

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
                        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Decision</td>
                        <td style="padding:12px 16px;font-size:14px;font-weight:700;color:${isAuthorized ? '#065f46' : '#991b1b'};">${decisionLabel}</td>
                      </tr>
                      <tr style="border-top:1px solid #e2e8f0;background:#f8fafc;">
                        <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Total Cost</td>
                        <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1e293b;">${totalCostFormatted}</td>
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
                    <a href="${addendumLink}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.02em;">
                      View Addendum
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
      subject: `Supplemental Addendum ${subjectDecisionLabel} — ${customerName}`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email.', details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/send-addendum-email route:', error);
    return NextResponse.json(
      {
        error: 'Failed to send addendum email.',
        details:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      },
      { status: 500 },
    );
  }
}
