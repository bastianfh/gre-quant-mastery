// Rapid-fire mental-math drills: short typed answers, 60-second rounds.
// Pure and seeded so every item can be unit-tested; nothing here touches mastery.
import { RNG } from '../lib/rng';
import { fact, gcd, nCr } from '../lib/math';

export type DrillKind = 'squares' | 'powers' | 'fracpct' | 'multiply' | 'divisibility' | 'formulas' | 'mixed';

export interface DrillItem {
  kind: Exclude<DrillKind, 'mixed'>;
  prompt: string;            // markup ($…$ math)
  answer: string;            // canonical display of the answer
  hint?: string;             // input hint shown under the box ("yes / no", "fraction", "%")
  check: (input: string) => boolean;
}

export const DRILL_KINDS: { id: DrillKind; label: string; blurb: string }[] = [
  { id: 'squares', label: 'Squares & roots', blurb: '$11^2$–$25^2$, and perfect-square roots' },
  { id: 'powers', label: 'Powers', blurb: 'Powers of 2, 3, 5 and cubes to $10^3$' },
  { id: 'fracpct', label: 'Fractions ↔ %', blurb: 'Benchmark fractions, decimals and percents' },
  { id: 'multiply', label: 'Multiplication', blurb: 'Two-digit products, ×11, ×25, percent of' },
  { id: 'divisibility', label: 'Divisibility', blurb: 'Divisibility rules and remainders' },
  { id: 'formulas', label: 'Formula recall', blurb: 'Angles, triples, special triangles, counting' },
  { id: 'mixed', label: 'Mixed', blurb: 'A bit of everything' },
];

export const ROUND_SEC = 60;

// ---------- answer parsing ----------
/** Parses "1,024", "-3", "12.5", "12.5%", "3/8", "-3/8", "1 1/2". Returns null if not a number. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/,/g, '').replace(/%$/, '').trim();
  if (!s) return null;
  let m = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (m) { const w = Number(m[1]), n = Number(m[2]), d = Number(m[3]); return d ? (w < 0 || m[1].startsWith('-') ? -1 : 1) * (Math.abs(w) + n / d) : null; }
  m = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (m) { const d = Number(m[2]); return d ? Number(m[1]) / d : null; }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
  return null;
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const numCheck = (ans: number, tol = 1e-9) => (input: string) => { const v = parseNumber(input); return v !== null && near(v, ans, tol); };
/** Fraction in lowest terms required (the skill being drilled is the conversion itself). */
const fracCheck = (n: number, d: number) => (input: string) => {
  const m = input.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return b > 0 && a * d === b * n && gcd(a, b) === 1;
};
const ynCheck = (yes: boolean) => (input: string) => {
  const s = input.trim().toLowerCase();
  return yes ? s === 'y' || s === 'yes' : s === 'n' || s === 'no';
};
const fmtNum = (x: number) => (Number.isInteger(x) ? x.toLocaleString('en-US') : String(Math.round(x * 1000) / 1000));
const fmtPct = (x: number) => `${Number.isInteger(x) ? x : Math.round(x * 10) / 10}%`;

// ---------- generators ----------
type Gen = (rng: RNG) => DrillItem;

const squares: Gen = (rng) => {
  if (rng.bool(0.3)) {
    const n = rng.int(11, 25);
    return { kind: 'squares', prompt: `$\\sqrt{${n * n}}$`, answer: String(n), check: numCheck(n) };
  }
  const n = rng.int(11, 25);
  return { kind: 'squares', prompt: `$${n}^2$`, answer: fmtNum(n * n), check: numCheck(n * n) };
};

const powers: Gen = (rng) => {
  const t = rng.pick(['two', 'three', 'five', 'cube', 'cuberoot'] as const);
  const [b, e] = t === 'two' ? [2, rng.int(5, 12)] : t === 'three' ? [3, rng.int(3, 6)] : t === 'five' ? [5, rng.int(2, 5)] : [rng.int(2, 10), 3];
  const v = b ** e;
  if (t === 'cuberoot') return { kind: 'powers', prompt: `$\\sqrt[3]{${v}}$`, answer: String(b), check: numCheck(b) };
  return { kind: 'powers', prompt: `$${b}^{${e}}$`, answer: fmtNum(v), check: numCheck(v) };
};

const FRACS: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [3, 10], [7, 10], [1, 20], [3, 20], [1, 25], [1, 40], [1, 3], [2, 3], [1, 6], [5, 6], [1, 12], [1, 16], [1, 50]];
const fracpct: Gen = (rng) => {
  const [n, d] = rng.pick(FRACS);
  const pct = (100 * n) / d;
  const exact = Number.isInteger(pct * 10);
  const tol = exact ? 1e-9 : 0.06; // 1/3 → 33.3 or 33.33 both fine
  const mode = rng.int(0, 2);
  if (mode === 0) return { kind: 'fracpct', prompt: `$\\tfrac{${n}}{${d}}$ as a percent`, answer: exact ? fmtPct(pct) : `${fmtPct(pct)} (≈)`, hint: '%', check: numCheck(pct, tol) };
  if (mode === 1 && exact) return { kind: 'fracpct', prompt: `$${fmtPct(pct).replace('%', '\\%')}$ as a fraction in lowest terms`, answer: `${n}/${d}`, hint: 'fraction like 3/8', check: fracCheck(n, d) };
  const dec = n / d;
  return exact
    ? { kind: 'fracpct', prompt: `$\\tfrac{${n}}{${d}}$ as a decimal`, answer: String(dec), check: numCheck(dec) }
    : { kind: 'fracpct', prompt: `$\\tfrac{${n}}{${d}}$ as a percent`, answer: `${fmtPct(pct)} (≈)`, hint: '%', check: numCheck(pct, tol) };
};

const multiply: Gen = (rng) => {
  const t = rng.int(0, 4);
  if (t === 0) { const a = rng.int(12, 99), b = rng.int(3, 9); return { kind: 'multiply', prompt: `$${a} \\times ${b}$`, answer: fmtNum(a * b), check: numCheck(a * b) }; }
  if (t === 1) { const a = rng.int(12, 99); return { kind: 'multiply', prompt: `$${a} \\times 11$`, answer: fmtNum(a * 11), check: numCheck(a * 11) }; }
  if (t === 2) { const a = rng.int(4, 48) * 2; return { kind: 'multiply', prompt: `$${a} \\times 25$`, answer: fmtNum(a * 25), check: numCheck(a * 25) }; }
  if (t === 3) { const a = rng.int(11, 19), b = rng.int(11, 19); return { kind: 'multiply', prompt: `$${a} \\times ${b}$`, answer: fmtNum(a * b), check: numCheck(a * b) }; }
  const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 75, 12.5]);
  const base = p === 12.5 ? rng.int(1, 12) * 8 : rng.int(2, 20) * 20;
  const v = (p * base) / 100;
  return { kind: 'multiply', prompt: `$${p}\\%$ of $${base}$`, answer: fmtNum(v), check: numCheck(v) };
};

const divisibility: Gen = (rng) => {
  if (rng.bool(0.5)) {
    const k = rng.pick([3, 4, 6, 8, 9, 11]);
    const yes = rng.bool();
    let n = 0;
    for (let i = 0; i < 100; i++) { n = rng.int(1000, 9999); if ((n % k === 0) === yes) break; }
    if ((n % k === 0) !== yes) n = yes ? n - (n % k) : n - (n % k) + 1; // guarantee the intended branch
    return { kind: 'divisibility', prompt: `Is $${fmtNum(n).replace(/,/g, '{,}')}$ divisible by $${k}$?`, answer: n % k === 0 ? 'yes' : 'no', hint: 'y / n', check: ynCheck(n % k === 0) };
  }
  const k = rng.pick([3, 4, 5, 9, 10]);
  const n = rng.int(1000, 99999);
  const r = n % k;
  return { kind: 'divisibility', prompt: `Remainder when $${fmtNum(n).replace(/,/g, '{,}')}$ is divided by $${k}$`, answer: String(r), check: numCheck(r) };
};

const formulas: Gen = (rng) => {
  const t = rng.int(0, 8);
  switch (t) {
    case 0: { const n = rng.int(5, 12); const v = (n - 2) * 180; return { kind: 'formulas', prompt: `Sum of the interior angles of a ${n}-sided polygon (degrees)`, answer: `${v}°`, check: numCheck(v) }; }
    case 1: { const n = rng.pick([5, 6, 8, 9, 10, 12]); const v = ((n - 2) * 180) / n; return { kind: 'formulas', prompt: `Each interior angle of a regular ${n}-gon (degrees)`, answer: `${v}°`, check: numCheck(v) }; }
    case 2: { const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]); const k = rng.int(1, 4); return { kind: 'formulas', prompt: `Right triangle, legs $${a * k}$ and $${b * k}$: hypotenuse`, answer: String(c * k), check: numCheck(c * k) }; }
    case 3: { const s = rng.int(2, 12); return { kind: 'formulas', prompt: `45-45-90 triangle with legs $${s}$: hypotenuse $= k\\sqrt{2}$. Find $k$`, answer: String(s), check: numCheck(s) }; }
    case 4: { const s = rng.int(2, 12); return { kind: 'formulas', prompt: `30-60-90 triangle, short leg $${s}$: hypotenuse`, answer: String(2 * s), check: numCheck(2 * s) }; }
    case 5: { const n = rng.int(4, 7); const v = fact(n); return { kind: 'formulas', prompt: `$${n}!$`, answer: fmtNum(v), check: numCheck(v) }; }
    case 6: { const n = rng.int(5, 10), r = rng.int(2, 3); const v = nCr(n, r); return { kind: 'formulas', prompt: `$\\binom{${n}}{${r}}$`, answer: String(v), check: numCheck(v) }; }
    case 7: { const n = rng.pick([10, 20, 30, 40, 50, 100]); const v = (n * (n + 1)) / 2; return { kind: 'formulas', prompt: `$1 + 2 + \\cdots + ${n}$`, answer: fmtNum(v), check: numCheck(v) }; }
    default: { const n = rng.int(5, 12); const v = (n * (n - 3)) / 2; return { kind: 'formulas', prompt: `Number of diagonals of a ${n}-sided polygon`, answer: String(v), check: numCheck(v) }; }
  }
};

const GENS: Record<Exclude<DrillKind, 'mixed'>, Gen> = { squares, powers, fracpct, multiply, divisibility, formulas };

/** Endless, seeded stream of items; avoids repeating the same prompt within the last 8 items. */
export function drillStream(kind: DrillKind, seed: number) {
  const rng = new RNG(seed);
  const recent: string[] = [];
  const kinds = Object.keys(GENS) as Exclude<DrillKind, 'mixed'>[];
  return (): DrillItem => {
    let it: DrillItem = GENS.squares(rng);
    for (let i = 0; i < 20; i++) {
      it = GENS[kind === 'mixed' ? rng.pick(kinds) : kind](rng);
      if (!recent.includes(it.prompt)) break;
    }
    recent.push(it.prompt); if (recent.length > 8) recent.shift();
    return it;
  };
}

/** XP for a round: 1 per correct answer, -1 per miss beyond 3, capped at 30, min 0. */
export const drillXp = (correct: number, wrong: number) => Math.max(0, Math.min(30, correct - Math.max(0, wrong - 3)));
