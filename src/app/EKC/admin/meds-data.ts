// EKC Meds — Session 1 Week 1
// Base data from med sheets. Edits are persisted to localStorage under MEDS_STORAGE_KEY.

export type MedTime = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface MedEntry {
  id: string;
  name: string;   // First Last — matches data.ts format where possible
  unit: string;
  times: MedTime[];
  notes?: string;
}

export const BASE_MEDS: MedEntry[] = [
  // ── KINERET ──────────────────────────────────────────────────────────────
  { id: 'k01',  name: 'Olivia Albert',        unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k02',  name: 'Arielle Baer',         unit: 'kineret',  times: ['breakfast'] },
  { id: 'k03',  name: 'Sarah Berman',         unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k04',  name: 'Cora Duff',            unit: 'kineret',  times: ['breakfast'] },
  { id: 'k05',  name: 'Max Eberhard',         unit: 'kineret',  times: ['breakfast'] },
  { id: 'k06',  name: 'Coralie Ennis',        unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k07',  name: 'Aaron Fisher',         unit: 'kineret',  times: ['lunch','snack'] },
  { id: 'k08',  name: 'Graham Fleming',       unit: 'kineret',  times: ['breakfast'] },
  { id: 'k09',  name: 'Cece Friedman',        unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k10',  name: 'Emma Hameroff',        unit: 'kineret',  times: ['breakfast'] },
  { id: 'k11',  name: 'Lizzy Hauskens',       unit: 'kineret',  times: ['breakfast'] },
  { id: 'k12',  name: 'Asher Herman',         unit: 'kineret',  times: ['lunch'] },
  { id: 'k13',  name: 'Kate Iglin',           unit: 'kineret',  times: ['breakfast'] },
  { id: 'k14',  name: 'Wynne Karlin',         unit: 'kineret',  times: ['lunch','snack'] },
  { id: 'k15',  name: 'Eva Longman',          unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k16',  name: 'MaiLan Cooper',        unit: 'kineret',  times: ['breakfast'] },
  { id: 'k17',  name: 'Sarah McKain',         unit: 'kineret',  times: ['lunch'],                   notes: 'MWF only' },
  { id: 'k18',  name: 'Noah McVeagh',         unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k19',  name: 'Sonny Mello',          unit: 'kineret',  times: ['breakfast','dinner'] },
  { id: 'k20',  name: 'Millie Messick',       unit: 'kineret',  times: ['breakfast'] },
  { id: 'k21',  name: 'Marcel Nabiev',        unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k22',  name: 'Maya Nagler',          unit: 'kineret',  times: ['breakfast','dinner'] },
  { id: 'k23',  name: 'Thomas Oller',         unit: 'kineret',  times: ['lunch','snack'] },
  { id: 'k24',  name: 'Noah Perer',           unit: 'kineret',  times: ['lunch','snack'] },
  { id: 'k25',  name: 'Leslie Pollner',       unit: 'kineret',  times: ['breakfast','lunch'] },
  { id: 'k26',  name: 'Charlie Ritchey',      unit: 'kineret',  times: ['lunch','snack'] },
  { id: 'k27',  name: 'Candice Rothstein',    unit: 'kineret',  times: ['dinner'],                  notes: 'Not Friday' },
  { id: 'k28',  name: 'Tanner Rumbaugh',      unit: 'kineret',  times: ['breakfast'] },
  { id: 'k29',  name: 'Lucy Schacter',        unit: 'kineret',  times: ['breakfast'] },
  { id: 'k30',  name: 'Ivy Schwartz',         unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k31',  name: 'Isaac Senser',         unit: 'kineret',  times: ['lunch','snack'] },
  { id: 'k32',  name: 'Anna Rose Sloan',      unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k33',  name: 'Charlie Sohinki',      unit: 'kineret',  times: ['breakfast'] },
  { id: 'k34',  name: 'Beckett Soria Fech',   unit: 'kineret',  times: ['breakfast'] },
  { id: 'k35',  name: 'Ava Spitz',            unit: 'kineret',  times: ['breakfast'] },
  { id: 'k36',  name: 'Moses Sutcliffe',      unit: 'kineret',  times: ['breakfast','lunch','dinner','snack'] },
  { id: 'k37',  name: 'Henry Vestal',         unit: 'kineret',  times: ['breakfast'] },
  { id: 'k38',  name: 'Max Warshafsky',       unit: 'kineret',  times: ['breakfast','lunch','snack'] },
  { id: 'k39',  name: 'Henry Weisberg',       unit: 'kineret',  times: ['breakfast'] },
  { id: 'k40',  name: 'Clementine Wezcowicz', unit: 'kineret',  times: ['lunch','snack'] },
  { id: 'k41',  name: 'Sylvia Wietmarschen',  unit: 'kineret',  times: ['breakfast'] },
  { id: 'k42',  name: 'Greyson Zawid',        unit: 'kineret',  times: ['breakfast','lunch','snack'] },

  // ── HALUTZIM ─────────────────────────────────────────────────────────────
  { id: 'h01',  name: 'Jonah Albert',         unit: 'halutzim', times: ['breakfast','snack'] },
  { id: 'h02',  name: 'Ella Bar Av',          unit: 'halutzim', times: ['breakfast','snack'] },
  { id: 'h03',  name: 'Hanna Bar Av',         unit: 'halutzim', times: ['breakfast'] },
  { id: 'h04',  name: 'Henry Berger',         unit: 'halutzim', times: ['breakfast','snack','dinner'] },
  { id: 'h05',  name: 'Cal Birnbaum',         unit: 'halutzim', times: ['breakfast','snack'] },
  { id: 'h06',  name: 'Teddy Booker',         unit: 'halutzim', times: ['snack'] },
  { id: 'h07',  name: 'Riley Davis',          unit: 'halutzim', times: ['breakfast','snack'] },
  { id: 'h08',  name: 'Frances Doolittle',    unit: 'halutzim', times: ['breakfast','lunch','snack'] },
  { id: 'h09',  name: 'Mattan Even',          unit: 'halutzim', times: ['breakfast','snack'],       notes: 'Until 6/23' },
  { id: 'h10',  name: 'Ivy Foreman',          unit: 'halutzim', times: ['breakfast','snack'] },
  { id: 'h11',  name: 'Eyal Friedman',        unit: 'halutzim', times: ['breakfast'] },
  { id: 'h12',  name: 'Jenna Goldberg',       unit: 'halutzim', times: ['breakfast'] },
  { id: 'h13',  name: 'Savannah Gustman',     unit: 'halutzim', times: ['snack'] },
  { id: 'h14',  name: 'Ellen Gusenoff',       unit: 'halutzim', times: ['snack'] },
  { id: 'h15',  name: 'Aidan Hameroff',       unit: 'halutzim', times: ['breakfast'] },
  { id: 'h16',  name: 'Riley Herman',         unit: 'halutzim', times: ['breakfast','dinner'],      notes: 'Dinner 6/24 & 7/8 only' },
  { id: 'h17',  name: 'Mack Johnson',         unit: 'halutzim', times: ['breakfast'] },
  { id: 'h18',  name: 'Helena Kuehn',         unit: 'halutzim', times: ['snack'] },
  { id: 'h19',  name: 'Dylan McGrath',        unit: 'halutzim', times: ['snack'] },
  { id: 'h20',  name: 'Charlie Messick',      unit: 'halutzim', times: ['breakfast'] },
  { id: 'h21',  name: 'Nora Nernberg',        unit: 'halutzim', times: ['breakfast','dinner'] },
  { id: 'h22',  name: 'Ezra Ruttenberg',      unit: 'halutzim', times: ['snack'] },
  { id: 'h23',  name: 'Eden Schwartz',        unit: 'halutzim', times: ['breakfast'] },
  { id: 'h24',  name: 'Sivia Selig',          unit: 'halutzim', times: ['breakfast','snack'] },
  { id: 'h25',  name: 'Eli Shapiro',          unit: 'halutzim', times: ['breakfast','snack'],       notes: 'Breakfast from 6/23' },
  { id: 'h26',  name: 'Sunny Singer',         unit: 'halutzim', times: ['breakfast'] },
  { id: 'h27',  name: 'Maya Spitz',           unit: 'halutzim', times: ['breakfast'] },
  { id: 'h28',  name: 'Charles Stanley',      unit: 'halutzim', times: ['breakfast'] },
  { id: 'h29',  name: 'Audrey Valen',         unit: 'halutzim', times: ['lunch'] },
  { id: 'h30',  name: 'Max Vestal',           unit: 'halutzim', times: ['breakfast'] },
  { id: 'h31',  name: 'Barrett Wood',         unit: 'halutzim', times: ['breakfast'] },

  // ── TEENS ────────────────────────────────────────────────────────────────
  { id: 't01',  name: 'Julia Cantor',         unit: 'teens',    times: ['lunch'],                   notes: '3pm' },
  { id: 't02',  name: 'Maya Capezzuto',       unit: 'teens',    times: ['lunch'] },
  { id: 't03',  name: 'Will Chernyak',        unit: 'teens',    times: ['breakfast','snack'] },
  { id: 't04',  name: 'Maddie Feinman',       unit: 'teens',    times: ['breakfast'] },
  { id: 't05',  name: 'Sydney Feldman',       unit: 'teens',    times: ['breakfast','lunch','snack'] },
  { id: 't06',  name: 'Enzo Fossi',           unit: 'teens',    times: ['breakfast','snack'] },
  { id: 't07',  name: 'Ava Garcia',           unit: 'teens',    times: ['breakfast','lunch','dinner'] },
  { id: 't08',  name: 'Alivia Gustman',       unit: 'teens',    times: ['snack'] },
  { id: 't09',  name: 'Scott Harinstein',     unit: 'teens',    times: ['breakfast'],               notes: 'M-F or 6/28 & 7/12' },
  { id: 't10',  name: 'Jack Johnson',         unit: 'teens',    times: ['breakfast'] },
  { id: 't11',  name: 'Maya Kingsley',        unit: 'teens',    times: ['breakfast','lunch'] },
  { id: 't12',  name: 'Eli Lasus',            unit: 'teens',    times: ['breakfast'] },
  { id: 't13',  name: 'Eli Leveton',          unit: 'teens',    times: ['lunch','snack'] },
  { id: 't14',  name: 'Eli Lipman',           unit: 'teens',    times: ['lunch','snack'] },
  { id: 't15',  name: 'Eliana Mirvish',       unit: 'teens',    times: ['breakfast'],               notes: '6/28 & 7/12 only' },
  { id: 't16',  name: 'Angie Nestico',        unit: 'teens',    times: ['breakfast'] },
  { id: 't17',  name: 'Kat Oppenheim',        unit: 'teens',    times: ['lunch','snack'] },
  { id: 't18',  name: 'Drew Puffenberger',    unit: 'teens',    times: ['breakfast','lunch','snack'] },
  { id: 't19',  name: 'Thomas Ritchey',       unit: 'teens',    times: ['breakfast','lunch','snack'] },
  { id: 't20',  name: 'Makayla Todd',         unit: 'teens',    times: ['breakfast','lunch','snack'] },
  { id: 't21',  name: 'Sadie West',           unit: 'teens',    times: ['lunch'] },

  // ── SITS ─────────────────────────────────────────────────────────────────
  { id: 's01',  name: 'Seth Childs',          unit: 'sits',     times: ['breakfast'] },
  { id: 's02',  name: 'Audrey Fossi',         unit: 'sits',     times: ['breakfast'] },
  { id: 's03',  name: 'Devorah Hartz',        unit: 'sits',     times: ['breakfast'] },
  { id: 's04',  name: 'Sam Miller',           unit: 'sits',     times: ['breakfast'] },
  { id: 's05',  name: 'Lily Nestico',         unit: 'sits',     times: ['breakfast'] },
  { id: 's06',  name: 'Nava Rosenstein',      unit: 'sits',     times: ['breakfast','lunch','dinner'], notes: 'Lunch Mon only · Dinner Sat only' },
  { id: 's07',  name: 'Jada Bierly',          unit: 'sits',     times: ['dinner'] },
  { id: 's08',  name: "Gus O'Toole",          unit: 'sits',     times: ['dinner'] },
  { id: 's09',  name: 'Sofia Alonso-Taub',    unit: 'sits',     times: ['snack'] },
  { id: 's10',  name: 'Ian Leaman',           unit: 'sits',     times: ['snack'] },
  { id: 's11',  name: 'Rebecca Rosenthal',    unit: 'sits',     times: ['snack'] },
];

export const MEDS_STORAGE_KEY = 'ekc-meds-v1';

export function loadMeds(): MedEntry[] {
  if (typeof window === 'undefined') return BASE_MEDS;
  try {
    const raw = localStorage.getItem(MEDS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MedEntry[];
  } catch {}
  return BASE_MEDS;
}

export function saveMeds(meds: MedEntry[]): void {
  try { localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(meds)); } catch {}
}

export function medsForPerson(name: string, meds: MedEntry[]): MedEntry | undefined {
  const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  return meds.find(m => {
    const mw = m.name.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    return words.filter(w => mw.includes(w)).length >= 2;
  });
}
