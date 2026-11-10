import { RNG } from '../lib/rng';
import { extraQuestions, getBank, makeVariant, GEN_BY_ID } from './bank';
import { DEFAULT_RATING, targetLevel } from './adaptive';
import type { CategoryId, Format, Level, Question } from './types';
import { ALL_GENERATORS } from './generators';
import { MAIN_CATEGORIES } from '../content/curriculum';

export interface Filter {
  categories?: CategoryId[];
  units?: string[];
  levels?: Level[];
  formats?: (Format | 'di')[];
  status?: 'any' | 'untouched' | 'incorrect' | 'saved' | 'flagged';
  combos?: boolean;          // only multi-concept generators
  maxTimeSec?: number;       // e.g. speed drills
}

export interface QStat { n: number; correct: number; last: number; lastCorrect: boolean }
export interface PickCtx {
  qstats: Map<string, QStat>;
  ratings: Record<string, number>;
  mastery: Record<string, number>;     // unit -> score (0-100); missing = no data
  recent: string[];                    // recently served qids (most recent last)
  saved?: string[];
  flagged?: string[];
}

export function matches(q: Question, f: Filter): boolean {
  if (f.categories?.length && !f.categories.includes(q.category)) return false;
  if (f.units?.length && !f.units.includes(q.unit)) return false;
  if (f.levels?.length && !f.levels.includes(q.level)) return false;
  if (f.formats?.length) {
    if (!(f.formats.includes(q.format) || (q.di && f.formats.includes('di')))) return false;
  }
  if (f.combos && !GEN_BY_ID[q.generatorId]?.combo) return false;
  if (f.maxTimeSec && q.timeSec > f.maxTimeSec * 1.6) return false;
  return true;
}

export function pool(f: Filter, ctx: PickCtx): Question[] {
  const all = [...getBank(), ...extraQuestions.values()];
  let qs = all.filter((q) => matches(q, f));
  switch (f.status) {
    case 'untouched': qs = qs.filter((q) => !ctx.qstats.has(q.id)); break;
    case 'incorrect': qs = qs.filter((q) => { const s = ctx.qstats.get(q.id); return s && !s.lastCorrect; }); break;
    case 'saved': qs = qs.filter((q) => ctx.saved?.includes(q.id)); break;
    case 'flagged': qs = qs.filter((q) => ctx.flagged?.includes(q.id)); break;
  }
  return qs;
}

/** Weighted sampling: adaptive difficulty, novelty, weakness emphasis, anti-repetition. */
export function pickQuestions(f: Filter, count: number, ctx: PickCtx, opts: { adaptive?: boolean; seed?: number; sortByLevel?: boolean } = {}): Question[] {
  const rng = new RNG(opts.seed ?? (Date.now() & 0x7fffffff));
  const candidates = pool(f, ctx);
  const recentSet = new Set(ctx.recent.slice(-60));
  const out: Question[] = [];
  const usedGens: string[] = [];
  const weightOf = (q: Question) => {
    let w = 1;
    const st = ctx.qstats.get(q.id);
    if (!st) w *= 1.6;
    else if (st.lastCorrect) w *= 0.25;
    else w *= 1.2;
    if (recentSet.has(q.id)) w *= 0.02;
    const m = ctx.mastery[q.unit];
    if (m === undefined) w *= 1.2; else if (m < 40) w *= 2; else if (m < 60) w *= 1.6; else if (m >= 90) w *= 0.5;
    if (opts.adaptive !== false && !f.levels?.length) {
      const r = ctx.ratings[q.unit] ?? ctx.ratings[`cat:${q.category}`] ?? ctx.ratings._global ?? DEFAULT_RATING;
      const t = targetLevel(r);
      const d = Math.abs(q.level - t);
      w *= d === 0 ? 1 : d === 1 ? 0.45 : d === 2 ? 0.08 : 0.01;
    }
    const gi = usedGens.lastIndexOf(q.generatorId);
    if (gi >= 0) w *= gi >= usedGens.length - 3 ? 0.05 : 0.4;
    return w;
  };
  const avail = new Set(candidates);
  while (out.length < count && avail.size) {
    const arr = [...avail];
    const ws = arr.map(weightOf);
    const tot = ws.reduce((a, b) => a + b, 0);
    let x = rng.next() * tot, idx = 0;
    while (idx < arr.length - 1 && (x -= ws[idx]) > 0) idx++;
    const q = arr[idx];
    out.push(q); usedGens.push(q.generatorId); avail.delete(q);
  }
  // not enough bank questions → generate fresh variants that match the filter
  if (out.length < count) {
    const gens = ALL_GENERATORS.filter((g) => (!f.units?.length || f.units.includes(g.unit)) && (!f.combos || g.combo) && (!f.categories?.length || f.categories.some((c) => getBank().some((q) => q.generatorId === g.id && q.category === c))));
    let guard = 0;
    while (out.length < count && gens.length && guard++ < count * 20) {
      const g = rng.pick(gens);
      const lv = f.levels?.length ? rng.pick(f.levels.filter((l) => g.levels.includes(l)).length ? f.levels.filter((l) => g.levels.includes(l)) : g.levels) : rng.pick(g.levels);
      const v = makeVariant(g.id, lv, new Set(out.map((q) => q.id)), () => rng.next());
      if (v && matches(v, { ...f, units: undefined, categories: undefined }) && !out.some((q) => q.stem === v.stem && q.qc?.a === v.qc?.a)) out.push(v);
    }
  }
  if (opts.sortByLevel) out.sort((a, b) => a.level - b.level);
  return out;
}

// ======================= Exam forms =======================
export type Path = 'easier' | 'medium' | 'harder';
interface Slot { format: Format; di?: boolean; category?: CategoryId }

function sectionSlots(n: 12 | 15, rng: RNG): Slot[] {
  const cats = (k: number) => rng.shuffle(Array.from({ length: k }, (_, i) => MAIN_CATEGORIES[i % MAIN_CATEGORIES.length]));
  const qcN = n === 12 ? 4 : 5, diN = n === 12 ? 1 : 3, multiN = n === 12 ? 1 : 2, numN = n === 12 ? 2 : 2;
  const mcqN = n - qcN - diN - multiN - numN;
  const qcCats = cats(qcN).map((c) => (c === 'data' && rng.bool() ? 'arithmetic' : c) as CategoryId);
  const slots: Slot[] = [
    ...qcCats.map((c) => ({ format: 'qc' as Format, category: c })),
    ...cats(mcqN + multiN + numN).map((c, i) => ({ format: (i < mcqN ? 'mcq' : i < mcqN + multiN ? 'multi' : 'numeric') as Format, category: c })),
  ];
  // QC first (as on the GRE), then others shuffled, then the data-interpretation set grouped together
  const rest = rng.shuffle(slots.slice(qcN));
  const di: Slot[] = Array.from({ length: diN }, (_, i) => ({ format: (['mcq', 'numeric', 'multi'][i % 3]) as Format, di: true, category: 'data' as CategoryId }));
  const diPos = Math.min(rest.length, Math.floor(rest.length * 0.6));
  return [...slots.slice(0, qcN), ...rest.slice(0, diPos), ...di, ...rest.slice(diPos)];
}

const LEVEL_PLAN: Record<'s1' | Path, Level[]> = {
  s1: [2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 2],
  easier: [1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 2, 1, 2, 3],
  medium: [2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 2, 3, 3, 4],
  harder: [3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 4, 4, 5, 3],
};

/** Section 2 routing — the GRE is section-level adaptive. */
export const routeSection2 = (s1Correct: number): Path => (s1Correct >= 9 ? 'harder' : s1Correct >= 6 ? 'medium' : 'easier');

/** Build a section for a given form seed; avoids questions in `exclude` where possible. */
export function buildSection(section: 1 | 2, path: Path, formSeed: number, exclude: Set<string>): Question[] {
  const rng = new RNG(formSeed * 7919 + section * 104729 + (path === 'harder' ? 3 : path === 'easier' ? 1 : 2));
  const n = section === 1 ? 12 : 15;
  const slots = sectionSlots(n as 12 | 15, rng);
  const levels = rng.shuffle(LEVEL_PLAN[section === 1 ? 's1' : path]);
  const bank = [...getBank()];
  const chosen: Question[] = [];
  const used = new Set<string>(), usedGen = new Set<string>();
  slots.forEach((slot, i) => {
    const want = levels[i % levels.length];
    const fits = (q: Question, lvTol: number, strictGen: boolean) => q.format === slot.format && !!slot.di === q.di && (slot.di || !slot.category || q.category === slot.category || (slot.format === 'qc' && q.category === 'strategy')) && Math.abs(q.level - want) <= lvTol && !used.has(q.id) && (!strictGen || !usedGen.has(q.generatorId));
    let cands: Question[] = [];
    for (const [tol, strict, excl] of [[0, true, true], [1, true, true], [1, false, true], [2, false, true], [1, false, false], [4, false, false]] as [number, boolean, boolean][]) {
      cands = bank.filter((q) => fits(q, tol, strict) && (!excl || !exclude.has(q.id)));
      if (cands.length) break;
    }
    if (!cands.length) cands = bank.filter((q) => q.format === slot.format && !used.has(q.id));
    const q = rng.pick(cands);
    used.add(q.id); usedGen.add(q.generatorId);
    chosen.push(q);
  });
  return chosen;
}

export const FORM_NAMES = ['Form A', 'Form B', 'Form C', 'Form D', 'Form E', 'Form F', 'Form G', 'Form H'];
