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
    const upstream = await fetch(raw);
    if (!upstream.ok) {
      console.error(`[image-proxy] upstream ${upstream.status} for ${parsed.hostname}${parsed.pathname}`);
      return new NextResponse('Upstream error', { status: 502 });
    }

    const contentType = upstream.headers.get('Content-Type') ?? 'image/jpeg';
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[image-proxy] fetch failed:', err);
    return new NextResponse('Fetch failed', { status: 502 });
  }
}
