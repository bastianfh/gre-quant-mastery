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
