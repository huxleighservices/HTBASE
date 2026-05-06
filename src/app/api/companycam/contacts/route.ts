import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
  }

  const apiKey = process.env.COMPANYCAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'CompanyCam API key not configured.' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.companycam.com/v2/projects/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) return NextResponse.json([]);

    const project = await res.json();
    const pc = project.primary_contact;
    if (!pc) return NextResponse.json([]);

    // Normalise primary_contact into the shape the dialog expects
    return NextResponse.json([
      {
        name: pc.name ?? pc.display_name ?? null,
        email_address: pc.email_address ?? pc.email ?? null,
        phone_number: pc.phone_number ?? pc.phone ?? null,
      },
    ]);
  } catch (err) {
    console.error('[CC contacts]', err);
    return NextResponse.json([]);
  }
}
