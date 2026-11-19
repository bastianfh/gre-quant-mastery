// Independent verification: recompute answers from the *rendered question text* with a separate
// method, across many fresh variants. Guards against generator bugs that structural checks miss.
import { makeQuestion, GEN_BY_ID } from '../src/engine/bank';
import { numericValue } from '../src/engine/grading';
import { plainText } from '../src/lib/markup';
import type { Level, NumericAnswer, Question } from '../src/engine/types';

const variants = (gid: string, level: Level, n = 40) => Array.from({ length: n }, (_, i) => makeQuestion(GEN_BY_ID[gid], level, 5000 + i, 'variant'));
const nums = (s: string) => (s.replace(/\\\$/g, '').replace(/\{,\}/g, '').replace(/(\d),(\d{3})/g, '$1$2').match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const ans = (q: Question) => numericValue(q.answer as NumericAnswer);
const chosen = (q: Question) => plainText(q.choices![q.answer as number]);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));

describe('independent recomputation from question text', () => {
  it('rhombus perimeter from diagonals', () => {
    for (const q of variants('ge.quad.rhombus', 4)) {
      const [d1, d2] = nums(plainText(q.stem));
      expect(close(ans(q), 4 * Math.hypot(d1 / 2, d2 / 2)), q.stem).toBe(true);
    }
  });
  it('rhombus area from diagonals', () => {
    for (const q of variants('ge.quad.rhombus', 3)) { const [d1, d2] = nums(plainText(q.stem)); expect(ans(q)).toBe((d1 * d2) / 2); }
  });
  it('rectangle diagonal from perimeter and area', () => {
    for (const q of variants('ge.quad.rectdiag', 4)) {
      const [P, A] = nums(plainText(q.stem));
      // l + w = P/2, lw = A  ⇒ d = √((l+w)² − 2lw); also confirm such a rectangle exists
      const s = P / 2; const disc = s * s - 4 * A;
      expect(disc).toBeGreaterThanOrEqual(0);
      expect(close(ans(q), Math.sqrt(s * s - 2 * A)), q.stem).toBe(true);
    }
  });
  it('rectangle diagonal from length and width', () => {
    for (const q of variants('ge.right.applied', 3)) { const [l, w] = nums(plainText(q.stem)); expect(close(ans(q), Math.hypot(l, w)), q.stem).toBe(true); }
  });
  it('box space diagonal', () => {
    for (const q of variants('ge.solid.diagonal', 4)) { const [a, b, c] = nums(plainText(q.stem)); expect(close(ans(q), Math.hypot(a, b, c)), q.stem).toBe(true); }
  });
  it('distance between points', () => {
    for (const q of variants('ge.coord.distance', 1)) { const [x1, y1, x2, y2] = nums(plainText(q.stem)); expect(close(ans(q), Math.hypot(x2 - x1, y2 - y1))).toBe(true); }
  });
  it('integer count in an interval', () => {
    for (const q of variants('ar.int.count', 2)) {
      const t = plainText(q.stem); const [lo, hi] = nums(t.split('satisfy')[1]);
      let c = 0; for (let n = lo - 1; n <= hi + 1; n++) { const okLo = t.includes('\\le n') ? n >= lo : n > lo; const okHi = t.includes('n \\le') ? n <= hi : n < hi; if (okLo && okHi) c++; }
      expect(ans(q), t).toBe(c);
    }
  });
  it('arithmetic mean of a list', () => {
    for (const q of variants('da.stats.mean', 1)) { const xs = nums(plainText(q.stem).split('of')[1]); expect(close(ans(q), xs.reduce((a, b) => a + b, 0) / xs.length)).toBe(true); }
  });
  it('ticket system by brute force', () => {
    for (const q of variants('wp.tickets', 2)) {
      const [N, R, pa, pc] = nums(plainText(q.stem));
      const sols = []; for (let a = 0; a <= N; a++) if (a * pa + (N - a) * pc === R) sols.push(a);
      expect(sols).toEqual([ans(q)]);
    }
  });
  it('divisor count by brute force', () => {
    for (const q of variants('ar.prime.factor', 3).filter((x) => x.format === 'numeric' && /How many positive divisors/.test(x.stem))) {
      const [N] = nums(plainText(q.stem)); let c = 0; for (let d = 1; d <= N; d++) if (N % d === 0) c++;
      expect(ans(q)).toBe(c);
    }
  });
  it('units digit via modular exponentiation', () => {
    for (const q of variants('ar.rem.units', 3)) {
      const m = q.stem.match(/\$(\d+)\^\{(\d+)\}\$/)!; const [b, e] = [BigInt(m[1]), BigInt(m[2])];
      let r = 1n, base = b % 10n, ex = e; while (ex > 0n) { if (ex & 1n) r = (r * base) % 10n; base = (base * base) % 10n; ex >>= 1n; }
      expect(Number(chosen(q))).toBe(Number(r));
    }
  });
  it('committee count C(n,k)', () => {
    for (const q of variants('da.count.comb', 2)) {
      const [k, n] = nums(plainText(q.stem)); let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
      expect(Number(chosen(q).replace(/,/g, ''))).toBe(Math.round(c));
    }
  });
  it('linear equations: the answer satisfies the stated equation', () => {
    for (const q of variants('al.lin.solve', 2)) {
      const eq = q.stem.match(/\$(.+?)\$/)![1].replace(/(\d)x/g, '$1*x').replace(/(^|[^\d])x/g, '$1x');
      const [l, r] = eq.split('=').map((side) => (x: number) => Function('x', `return ${side.replace(/(\d)\*x/g, '$1*x')}`)(x));
      expect(close(l(ans(q)), r(ans(q))), eq).toBe(true);
    }
  });
});

describe('data-interpretation sets', () => {
  const set = (base: string, level: Level, seed: number) => [1, 2, 3].map((k) => makeQuestion(GEN_BY_ID[`${base}.q${k}`], level, seed, 'variant'));
  it('members of a set share identical chart data and set ids', () => {
    for (const base of ['da.set.bar', 'da.set.table', 'da.set.line', 'da.set.pie']) for (const lv of [3, 4, 5] as Level[]) for (let sd = 0; sd < 15; sd++) {
      const [a, b, c] = set(base, lv, 7000 + sd);
      expect(JSON.stringify(b.diagram), base).toBe(JSON.stringify(a.diagram));
      expect(JSON.stringify(c.diagram)).toBe(JSON.stringify(a.diagram));
      expect([a.setIndex, b.setIndex, c.setIndex]).toEqual([0, 1, 2]);
      expect(new Set([a.setId, b.setId, c.setId]).size).toBe(1);
      expect(a.di && b.di && c.di).toBe(true);
    }
  });
  it('answers recompute from the chart data', () => {
    for (let sd = 0; sd < 30; sd++) {
      const [q1] = set('da.set.bar', 3, 8000 + sd);
      const d = q1.diagram as any; const yr = d.categories.find((y: string) => q1.stem.includes(y));
      const i = d.categories.indexOf(yr);
      expect(ans(q1)).toBe(d.series[0].values[i] + d.series[1].values[i]);
      const [, t2] = set('da.set.table', 4, 8000 + sd);
      const rows = (t2.diagram as any).rows as [string, number, number][];
      const margins = rows.map((r) => (r[1] - r[2]) / r[1]);
      expect(t2.answer).toBe(margins.indexOf(Math.max(...margins)));
      const [p1] = set('da.set.pie', 3, 8000 + sd);
      const pd = p1.diagram as any; const total = Number(pd.title.match(/\$([\d,]+)/)[1].replace(/,/g, ''));
      const slice = pd.slices.find((s: any) => p1.stem.toLowerCase().includes(s.label.toLowerCase()));
      expect(ans(p1)).toBe((slice.value * total) / 100);
    }
  });
});

describe('expert generators: brute-force recomputation', () => {
  it('power remainders match modular exponentiation', () => {
    for (const lv of [4, 5] as Level[]) for (const q of variants('ex.powmod', lv)) {
      const terms = [...q.stem.matchAll(/(\d+)\^\{(\d+)\}/g)].map((m) => [BigInt(m[1]), BigInt(m[2])]);
      const m = BigInt(q.stem.match(/divided by (\d+)/)?.[1] ?? q.stem.match(/= (\d+)q/)![1]);
      const mp = (b: bigint, e: bigint) => { let r = 1n, x = b % m; while (e > 0n) { if (e & 1n) r = (r * x) % m; x = (x * x) % m; e >>= 1n; } return r; };
      expect(ans(q), q.stem).toBe(Number(terms.reduce((a, [b, e]) => a + mp(b, e), 0n) % m));
    }
  });
  it('conditional divisor counts match brute force', () => {
    for (const lv of [4, 5] as Level[]) for (const q of variants('ex.divisors.cond', lv)) {
      const t = plainText(q.stem); const N = nums(t)[0];
      let c = 0;
      for (let d = 1; d <= N; d++) if (N % d === 0) {
        if (lv === 5) { if (d % 6 === 0 && d % 10 !== 0) c++; } else { const k = Number(t.match(/(?:multiples of|divisible by) (\d+)/)![1]); if (d % k === 0) c++; }
      }
      expect(ans(q), t).toBe(c);
    }
  });
  it('quadratic-inequality integer counts match brute force', () => {
    for (const lv of [4, 5] as Level[]) for (const q of variants('ex.quad.ineq', lv)) {
      const t = q.stem; const m = t.match(/\$(x\^2[^$<>≤≥]*?)\s*(<|\\le|>|\\ge)\s*0\$/);
      const exprTex = m ? m[1] : t.match(/is \$(x\^2[^$]*)\$/)![1];
      const op = m ? m[2] : /nonnegative/.test(t) ? '\\ge' : /negative/.test(t) ? '<' : /positive/.test(t) ? '>' : '\\le';
      const f = Function('x', `return ${exprTex.replace(/x\^2/, 'x*x').replace(/(\d)x/g, '$1*x')}`) as (x: number) => number;
      const L = lv === 5 ? Number(t.match(/-(\d+)/)![1]) : 60;
      let c = 0; for (let x = -L; x <= L; x++) { const v = f(x); if ((op === '<' && v < 0) || (op === '\\le' && v <= 0) || (op === '>' && v > 0) || (op === '\\ge' && v >= 0)) c++; }
      expect(ans(q), t).toBe(c);
    }
  });
  it('extreme products match brute force', () => {
    for (const q of variants('ex.extreme.product', 4)) { const S = nums(plainText(q.stem))[0]; let best = 0; for (let x = 1; x < S; x++) best = Math.max(best, x * (S - x)); expect(ans(q)).toBe(best); }
    for (const q of variants('ex.extreme.product', 5)) { const d = nums(plainText(q.stem))[0]; let best = Infinity; for (let y = -50; y <= 50; y++) best = Math.min(best, y * (y + d)); expect(ans(q)).toBe(best); }
  });
  it('non-adjacent counts match brute-force enumeration', () => {
    for (const q of variants('ex.count.nonadjacent', 5, 30)) {
      const t = plainText(q.stem);
      if (/chairs in a row be chosen|rest on exactly/.test(t)) {
        const [a, b] = nums(t); const k = Math.min(a, b), n = Math.max(a, b);
        let c = 0; for (let mask = 0; mask < 1 << n; mask++) { if (bitCount(mask) === k && (mask & (mask >> 1)) === 0) c++; }
        expect(ans(q), t).toBe(c);
      } else {
        const n = nums(t)[0]; const friends = /3 friends/.test(t) ? 3 : 2;
        let c = 0; permute(n, (p) => { const pos = p.map((v, i) => [v, i]).filter(([v]) => v < friends).map(([, i]) => i).sort((x, y) => x - y); if (pos.every((x, i) => i === 0 || x - pos[i - 1] > 1)) c++; });
        expect(ans(q), t).toBe(c);
      }
    }
  });
  it('at-least-two probabilities match exhaustive enumeration', () => {
    for (const q of variants('ex.prob.atleast', 5)) {
      const t = plainText(q.stem); const p = t.match(/\\frac\{1\}\{(\d)\}/)!; const pr = 1 / Number(p[1]);
      const n = nums(t.replace(/\\frac\{1\}\{\d\}/, '')).find((x) => x >= 3 && x <= 5)!;
      let tot = 0; for (let mask = 0; mask < 1 << n; mask++) { const k = bitCount(mask); if (k >= 2) tot += pr ** k * (1 - pr) ** (n - k); }
      expect(Math.abs(ans(q) - tot) < 1e-12, t).toBe(true);
    }
  });
  it('composition answers satisfy f(f(x)) identity', () => {
    for (const lv of [4, 5] as Level[]) for (const q of variants('ex.fn.composition', lv)) {
      const t = plainText(q.stem); const m = t.match(/= (\d+)x ([+-]) (\d+)/)!; const A = Number(m[1]), B = (m[2] === '-' ? -1 : 1) * Number(m[3]);
      const p = Math.sqrt(A), qq = B / (p + 1), at = Number(t.match(/f\((-?\d+)\)\?|Find f\((-?\d+)\)/)!.slice(1).find((x) => x !== undefined));
      expect(ans(q), t).toBe(p * at + qq);
    }
  });
  it('track meeting times are typeable (whole or quarter minutes)', () => {
    for (const q of variants('ex.dist.track', 4)) expect(Number.isInteger(ans(q) * 4), q.stem).toBe(true);
  });
});
function bitCount(x: number) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
function permute(n: number, f: (p: number[]) => void) { const a = Array.from({ length: n }, (_, i) => i); const rec = (k: number) => { if (k === n) { f(a); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; } }; rec(0); }
