'use server';

function normalizeURL(url: string): string {
  const trimmed = url.trim();

  // Google Sheets edit/view URL → CSV export URL
  const gsMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (gsMatch) {
    const id = gsMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }

  return trimmed;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1)
    .map(parseRow)
    .filter(r => r.some(c => c.length > 0));

  return { headers, rows };
}

export async function fetchSheetData(url: string): Promise<{
  headers: string[];
  rows: string[][];
  error?: string;
}> {
  try {
    const csvUrl = normalizeURL(url);
    const res = await fetch(csvUrl, {
      headers: { 'User-Agent': 'HTBase-Bridge/1.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        headers: [], rows: [],
        error: `Could not access sheet (HTTP ${res.status}). Make sure it is shared as "Anyone with the link" or published as CSV.`,
      };
    }

    const text = await res.text();

    if (text.trimStart().startsWith('<')) {
      return {
        headers: [], rows: [],
        error: 'Sheet is not publicly accessible. In Google Sheets: File → Share → Publish to web → CSV. Or share as Viewer with "Anyone with the link".',
      };
    }

    const { headers, rows } = parseCSV(text);
    if (headers.length === 0) {
      return { headers: [], rows: [], error: 'No data found in the spreadsheet.' };
    }

    return { headers, rows };
  } catch (e: any) {
    return { headers: [], rows: [], error: e?.message ?? 'Unexpected error fetching data.' };
  }
}
