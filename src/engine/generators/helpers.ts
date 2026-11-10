import type { RNG } from '../../lib/rng';
import { key, round, tnum } from '../../lib/math';
import type { GenOutput, Generator, Level, NumericAnswer } from '../types';

export type D = number | { v: number; note?: string };

/**
 * Build a 5-choice numeric MCQ. Choices are sorted ascending (GRE convention),
 * de-duplicated, and padded with plausible nearby values if needed.
 */
export function numMcq(
  correct: number,
  distractors: D[],
  opts: { render?: (n: number) => string; count?: number; step?: number; integer?: boolean; allowNeg?: boolean } = {},
): Pick<GenOutput, 'choices' | 'answer' | 'distractorNotes'> {
  const count = opts.count ?? 5;
  const render = opts.render ?? ((n: number) => `$${tnum(n)}$`);
  const seen = new Set<string>([key(correct)]);
  const picked: { v: number; note?: string }[] = [];
  for (const d of distractors) {
    const o = typeof d === 'number' ? { v: d } : d;
    if (!Number.isFinite(o.v)) continue;
    if (opts.allowNeg === false && o.v < 0) continue;
    const k = key(o.v);
    if (seen.has(k)) continue;
    // also reject values that render identically
    if (picked.some((p) => render(p.v) === render(o.v)) || render(o.v) === render(correct)) continue;
    seen.add(k);
    picked.push(o);
    if (picked.length === count - 1) break;
  }
  const step = opts.step ?? (Math.abs(correct) >= 10 ? Math.max(1, Math.round(Math.abs(correct) / 10)) : Number.isInteger(correct) ? 1 : 0.5);
  let k = 1;
  while (picked.length < count - 1 && k < 60) {
    for (const v of [correct + k * step, correct - k * step]) {
      if (picked.length >= count - 1) break;
      if (opts.allowNeg === false && v < 0) continue;
      const vv = round(v, 6);
      if (seen.has(key(vv)) || render(vv) === render(correct) || picked.some((p) => render(p.v) === render(vv))) continue;
      seen.add(key(vv));
      picked.push({ v: vv });
    }
    k++;
  }
  const all = [{ v: correct, note: undefined as string | undefined, c: true }, ...picked.map((p) => ({ ...p, c: false }))];
  all.sort((a, b) => a.v - b.v);
  const distractorNotes: Record<number, string> = {};
  all.forEach((o, i) => { if (!o.c && o.note) distractorNotes[i] = o.note; });
  return { choices: all.map((o) => render(o.v)), answer: all.findIndex((o) => o.c), distractorNotes };
}

/** Text/expression MCQ: correct + distractors shuffled. */
export function textMcq(rng: RNG, correct: string, distractors: (string | { t: string; note?: string })[], sort = false): Pick<GenOutput, 'choices' | 'answer' | 'distractorNotes'> {
  const ds = distractors.map((d) => (typeof d === 'string' ? { t: d } : d)).filter((d, i, arr) => d.t !== correct && arr.findIndex((x) => x.t === d.t) === i).slice(0, 4);
  let all = [{ t: correct, c: true, note: undefined as string | undefined }, ...ds.map((d) => ({ ...d, c: false }))];
  all = sort ? all : rng.shuffle(all);
  const distractorNotes: Record<number, string> = {};
  all.forEach((o, i) => { if (!o.c && o.note) distractorNotes[i] = o.note; });
  return { choices: all.map((o) => o.t), answer: all.findIndex((o) => o.c), distractorNotes };
}

/** Multi-select: options with correctness flags. Keeps given order when `keepOrder`. */
export function multiSel(rng: RNG, options: { t: string; ok: boolean; note?: string; v?: number }[], keepOrder = false): Pick<GenOutput, 'choices' | 'answer' | 'distractorNotes'> {
  const uniq = options.filter((o, i, arr) => arr.findIndex((x) => x.t === o.t) === i);
  let all = keepOrder ? uniq : rng.shuffle(uniq);
  if (!keepOrder && all.every((o) => o.v !== undefined)) all = [...all].sort((a, b) => a.v! - b.v!);
  const distractorNotes: Record<number, string> = {};
  all.forEach((o, i) => { if (o.note) distractorNotes[i] = o.note; });
  return { choices: all.map((o) => o.t), answer: all.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0), distractorNotes };
}

export type Rel = 'A' | 'B' | 'C' | 'D';
export const relIndex: Record<Rel, number> = { A: 0, B: 1, C: 2, D: 3 };
export const relOf = (a: number, b: number): Rel => (Math.abs(a - b) < 1e-9 ? 'C' : a > b ? 'A' : 'B');
export const relText: Record<Rel, string> = {
  A: 'Quantity A is greater',
  B: 'Quantity B is greater',
  C: 'the two quantities are equal',
  D: 'the relationship cannot be determined',
};

export const numAns = (value: number, tolerance?: number): NumericAnswer => ({ kind: 'number', value, tolerance });
export const fracAns = (num: number, den: number): NumericAnswer => ({ kind: 'fraction', num, den });

export const H = (a: string, b: string, c: string): [string, string, string] => [a, b, c];

const BASE_TIME: Record<Level, number> = { 1: 45, 2: 60, 3: 85, 4: 110, 5: 140 };
export const timeFor = (level: Level, mult = 1) => Math.round((BASE_TIME[level] * mult) / 5) * 5;

/** Define a generator with sane defaults. */
export function gen(g: Generator): Generator {
  return g;
}

export const choose = <T>(rng: RNG, level: Level, byLevel: Partial<Record<Level, T>>, fallback: T): T => byLevel[level] ?? fallback;

/** pick n distinct ints in range */
export function distinctInts(rng: RNG, n: number, lo: number, hi: number): number[] {
  const s = new Set<number>();
  let guard = 0;
  while (s.size < n && guard++ < 1000) s.add(rng.int(lo, hi));
  return [...s];
}

export const NAMES = ['Ana', 'Ben', 'Chen', 'Dara', 'Eli', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kofi', 'Lena', 'Milo', 'Nia', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sami', 'Tara'];
export const twoNames = (rng: RNG) => rng.sample(NAMES, 2) as [string, string];
