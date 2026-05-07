import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const apiKey = process.env.COMPANYCAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'CompanyCam API key not configured on the server.' },
      { status: 500 }
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const allProjects: unknown[] = [];
    let page = 1;
    const perPage = 50; // CompanyCam caps per_page at 50

    // Paginate until we get all projects
    while (true) {
      const url = new URL('https://api.companycam.com/v2/projects');
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const response = await fetch(url.toString(), { method: 'GET', headers });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('CompanyCam API error. Status:', response.status, 'Body:', errorBody);
        return NextResponse.json(
          { error: 'Failed to fetch projects from CompanyCam', details: errorBody },
          { status: response.status }
        );
      }

      const data = await response.json();
      const page_projects: unknown[] = Array.isArray(data) ? data : data.projects ?? [];

      allProjects.push(...page_projects);

      // Stop if this page returned fewer results than requested (last page)
      if (page_projects.length < perPage) break;

      page++;

      // Safety cap — avoid infinite loops
      if (page > 50) break;
    }

    return NextResponse.json(allProjects);
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
