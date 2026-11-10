// Exact-ish math utilities used by generators and grading.

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
export const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;
export const gcdAll = (xs: number[]) => xs.reduce((a, b) => gcd(a, b));
export const lcmAll = (xs: number[]) => xs.reduce((a, b) => lcm(a, b));

export const isPrime = (n: number): boolean => {
  if (n < 2 || !Number.isInteger(n)) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
export const primesUpTo = (n: number) => Array.from({ length: n + 1 }, (_, i) => i).filter(isPrime);

/** prime factorization as map p -> exponent */
export const factorize = (n: number): Map<number, number> => {
  const m = new Map<number, number>();
  let x = Math.abs(n);
  for (let p = 2; p * p <= x; p++) {
    while (x % p === 0) { m.set(p, (m.get(p) ?? 0) + 1); x /= p; }
  }
  if (x > 1) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};
export const numDivisors = (n: number) => [...factorize(n).values()].reduce((a, e) => a * (e + 1), 1);
export const divisors = (n: number) => {
  const r: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) r.push(i);
  return r;
};
export const factorTex = (n: number) =>
  [...factorize(n).entries()].map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join(' \\cdot ');

export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
export const nCr = (n: number, r: number): number => {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let res = 1;
  for (let i = 1; i <= r; i++) res = (res * (n - r + i)) / i;
  return Math.round(res);
};
export const nPr = (n: number, r: number): number => {
  let res = 1;
  for (let i = 0; i < r; i++) res *= n - i;
  return res;
};

export const round = (x: number, d = 2) => {
  const f = 10 ** d;
  return Math.round((x + Number.EPSILON) * f) / f;
};
export const approxEq = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
export const key = (x: number) => round(x, 8).toString();

// ---------- Fractions ----------
export class Frac {
  readonly n: number; readonly d: number;
  constructor(n: number, d = 1) {
    if (d === 0) throw new Error('zero denominator');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    this.n = n / g; this.d = d / g;
  }
  static of(x: number | Frac) { return x instanceof Frac ? x : new Frac(x, 1); }
  add(o: number | Frac) { const b = Frac.of(o); return new Frac(this.n * b.d + b.n * this.d, this.d * b.d); }
  sub(o: number | Frac) { const b = Frac.of(o); return new Frac(this.n * b.d - b.n * this.d, this.d * b.d); }
  mul(o: number | Frac) { const b = Frac.of(o); return new Frac(this.n * b.n, this.d * b.d); }
  div(o: number | Frac) { const b = Frac.of(o); return new Frac(this.n * b.d, this.d * b.n); }
  get value() { return this.n / this.d; }
  isInt() { return this.d === 1; }
  eq(o: number | Frac) { const b = Frac.of(o); return this.n === b.n && this.d === b.d; }
  tex(): string {
    if (this.d === 1) return `${this.n}`;
    const s = this.n < 0 ? '-' : '';
    return `${s}\\frac{${Math.abs(this.n)}}{${this.d}}`;
  }
  text(): string { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`; }
}

// ---------- Formatting ----------
/** number with thousands separators; trims trailing zeros */
export const fmt = (x: number, maxDec = 4): string => {
  const r = round(x, maxDec);
  const neg = r < 0;
  const [i, f] = Math.abs(r).toString().split('.');
  const withSep = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : i;
  return (neg ? '-' : '') + withSep + (f ? '.' + f : '');
};
/** KaTeX-safe formatted number (commas need braces in TeX) */
export const tnum = (x: number, maxDec = 4) => fmt(x, maxDec).replace(/,/g, '{,}');
export const money = (x: number, dec?: number) => {
  const d = dec ?? (Number.isInteger(round(x, 2)) ? 0 : 2);
  const s = Math.abs(x).toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (x < 0 ? '-' : '') + '\\$' + s;
};
export const pct = (x: number, dec = 2) => `${fmt(x, dec)}\\%`;
export const texFrac = (n: number, d: number) => new Frac(n, d).tex();
export const sqrtTex = (k: number, inner: number) => (k === 1 ? `\\sqrt{${inner}}` : `${k}\\sqrt{${inner}}`);
/** simplify sqrt(n) → [outside, inside] */
export const simplifySqrt = (n: number): [number, number] => {
  let out = 1, inn = n;
  for (let f = 2; f * f <= inn; f++) {
    while (inn % (f * f) === 0) { inn /= f * f; out *= f; }
  }
  return [out, inn];
};
export const sqrtStr = (n: number) => {
  const [o, i] = simplifySqrt(n);
  if (i === 1) return `${o}`;
  return sqrtTex(o, i);
};
export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
export const signed = (n: number, first = false) => {
  if (first) return `${n}`;
  return n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`;
};
/** coefficient formatting for polynomials: 1x -> x, -1x -> -x */
export const coef = (c: number, v: string, first = false): string => {
  if (c === 0) return '';
  const abs = Math.abs(c);
  const body = abs === 1 && v ? v : `${abs}${v}`;
  if (first) return (c < 0 ? '-' : '') + body;
  return c < 0 ? ` - ${body}` : ` + ${body}`;
};
export const poly = (terms: [number, string][]): string => {
  let out = '';
  for (const [c, v] of terms) {
    if (c === 0) continue;
    out += coef(c, v, out === '');
  }
  return out || '0';
};
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const range = (n: number, start = 0) => Array.from({ length: n }, (_, i) => i + start);
export const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
