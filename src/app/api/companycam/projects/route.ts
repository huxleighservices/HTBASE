import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.COMPANYCAM_API_KEY;

    if (!apiKey) {
      console.error('COMPANYCAM_API_KEY is not set in environment variables.');
      return NextResponse.json(
        { error: 'CompanyCam API key not configured on the server.' },
        { status: 500 }
      );
    }

    const url = new URL('https://api.companycam.com/v2/projects');
    url.searchParams.set('per_page', '50');
    url.searchParams.set('status', 'active');

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
        { error: 'Failed to fetch projects from CompanyCam', details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    const projects = Array.isArray(data) ? data : data.projects ?? [];

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error in /api/companycam/projects route:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch CompanyCam projects',
        details: error instanceof Error ? error.message : 'An unknown error occurred.',
      },
      { status: 500 }
    );
  }
}
