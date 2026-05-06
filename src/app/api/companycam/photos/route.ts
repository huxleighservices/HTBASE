import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.COMPANYCAM_API_KEY;

    if (!apiKey) {
      console.error('COMPANYCAM_API_KEY is not set in environment variables.');
      return NextResponse.json(
        { error: 'CompanyCam API key not configured on the server.' },
        { status: 500 }
      );
    }

    const url = new URL(
      `https://api.companycam.com/v2/projects/${projectId}/photos`
    );
    url.searchParams.set('per_page', '100');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        'CompanyCam API error. Status:',
        response.status,
        'Body:',
        errorBody
      );
      return NextResponse.json(
        { error: 'Failed to fetch photos from CompanyCam', details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawPhotos: Array<Record<string, unknown>> = Array.isArray(data)
      ? data
      : (data.photos ?? []);

    // Normalise to a consistent shape regardless of API version.
    // CompanyCam v2 returns uris as an array: [{ uri, size }]
    const photos = rawPhotos.map((photo) => {
      const urisArr = Array.isArray(photo.uris)
        ? (photo.uris as { uri: string; size: string }[])
        : [];
      const find = (size: string) => urisArr.find((u) => u.size === size)?.uri ?? '';
      const original = find('original') || find('large') || (urisArr[0]?.uri ?? String(photo.uri ?? ''));
      const thumb = find('thumb') || find('small') || original;
      return {
        id: photo.id,
        uri: original,
        thumb_uri: thumb,
      };
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error in /api/companycam/photos route:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch CompanyCam photos',
        details: error instanceof Error ? error.message : 'An unknown error occurred.',
      },
      { status: 500 }
    );
  }
}
