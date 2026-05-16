import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTNAME_SUFFIX = '.companycam.com';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return new NextResponse('Missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (
    parsed.protocol !== 'https:' ||
    (!parsed.hostname.endsWith(ALLOWED_HOSTNAME_SUFFIX) && parsed.hostname !== 'companycam.com')
  ) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const upstream = await fetch(raw, { headers: { Accept: 'image/*' } });
    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: 502 });
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('Fetch failed', { status: 502 });
  }
}
