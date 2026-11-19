// Expert-level (GRE 165–170) multi-concept generators with varied phrasing.
// Each generator draws its wording from several phrasings so the structure is harder to pattern-match.
import { Frac, fmt, gcd, nCr, poly, round, tnum } from '../../lib/math';
import type { GeoDiagram, Generator } from '../types';
import { H, fracAns, gen, numAns, numMcq, textMcq } from './helpers';
import { qcOutput } from './qc';

const E = (id: string) => `ex.${id}`;
const fac = (r: number) => (r === 0 ? 'x' : `(x ${r < 0 ? '+' : '-'} ${Math.abs(r)})`);
const pc = (k: number) => (k === 1 ? '' : fmt(k)); // coefficient before \pi
const modpow = (b: number, e: number, m: number) => { let r = 1, x = b % m; while (e > 0) { if (e & 1) r = (r * x) % m; x = (x * x) % m; e >>= 1; } return r; };

// 1. Remainders of large powers (cyclicity of remainders, not just units digits)
const powMod: Generator = gen({
  id: E('powmod'), unit: 'ar.remainders', subtopic: 'Modular reasoning', levels: [4, 5],
  skills: ['remainder cycles'], concepts: ['Remainders', 'Recognizing patterns', 'Powers and exponents'],
  generate(rng, level) {
    const b = rng.pick([2, 3, 5]), m = rng.pick([7, 9, 11, 13].filter((x) => gcd(x, b) === 1)), n = rng.int(40, 400);
    const cyc: number[] = []; let v = b % m; do { cyc.push(v); v = (v * b) % m; } while (v !== b % m && cyc.length < 20);
    if (level === 5) {
      const b2 = rng.pick([2, 3, 4, 5].filter((x) => x !== b && gcd(x, m) === 1)), n2 = rng.int(30, 300);
      const ans = (modpow(b, n, m) + modpow(b2, n2, m)) % m;
      return {
        format: 'numeric', stem: rng.pick([`What is the remainder when $${b}^{${n}} + ${b2}^{${n2}}$ is divided by ${m}?`, `When $${b}^{${n}} + ${b2}^{${n2}}$ is divided by ${m}, what remainder results?`]), answer: numAns(ans),
        explanation: [`Remainders of powers of ${b} mod ${m} cycle with period ${cyc.length}: ${cyc.join(', ')}. So $${b}^{${n}}$ leaves ${modpow(b, n, m)}.`, `Similarly $${b2}^{${n2}}$ leaves ${modpow(b2, n2, m)} (its cycle mod ${m} repeats too).`, `Remainders add: $${modpow(b, n, m)} + ${modpow(b2, n2, m)} = ${modpow(b, n, m) + modpow(b2, n2, m)}$, which leaves ${ans} mod ${m}.`],
        trap: 'Using units-digit cycles (which are remainders mod 10) for a different divisor.',
        hints: H('Remainders of successive powers repeat in a cycle.', `List ${b}^1, ${b}^2, … mod ${m} until it repeats.`, 'Find each remainder separately, then add and reduce.'),
      };
    }
    const ans = modpow(b, n, m);
    return {
      format: 'numeric', stem: rng.pick([`What is the remainder when $${b}^{${n}}$ is divided by ${m}?`, `If $${b}^{${n}}$ is divided by ${m}, what is the remainder?`, `$${b}^{${n}} = ${m}q + r$ for integers $q$ and $r$ with $0 \\le r < ${m}$. What is $r$?`]), answer: numAns(ans),
      explanation: [`Compute successive remainders mod ${m}: ${cyc.map((c, i) => `$${b}^{${i + 1}} \\to ${c}$`).join(', ')} — the cycle has length ${cyc.length}.`, `$${n} \\bmod ${cyc.length} = ${n % cyc.length}$${n % cyc.length === 0 ? ' (last position)' : ''}, so the remainder is ${ans}.`],
      trap: 'Treating the exponent remainder 0 as the first position of the cycle.',
      hints: H('Remainders of powers repeat.', `Work out ${b}^k mod ${m} for k = 1, 2, 3, …`, `The cycle length is ${cyc.length}.`),
    };
  },
});

// 2. Divisors with a condition
const condDivisors: Generator = gen({
  id: E('divisors.cond'), unit: 'ar.primes', subtopic: 'Counting divisors', levels: [4, 5],
  skills: ['divisor counting with constraints'], concepts: ['Prime factorization', 'Counting divisors'],
  generate(rng, level) {
    const e2 = rng.int(2, 5), e3 = rng.int(1, 3), e5 = rng.int(1, 2);
    const N = 2 ** e2 * 3 ** e3 * 5 ** e5;
    if (level === 5) {
      // divisors that are multiples of 6 but not of 10
      const multOf6 = e2 * e3 * (e5 + 1); // exponent of 2 ≥1, 3 ≥1
      const multOf30 = e2 * e3 * e5;      // additionally 5 ≥1 → multiples of 30
      const ans = multOf6 - multOf30;
      return {
        format: 'numeric', stem: rng.pick([`How many positive divisors of $${tnum(N)}$ are multiples of 6 but not multiples of 10?`, `Of the positive divisors of $${tnum(N)}$, how many are divisible by 6 and not divisible by 10?`]), answer: numAns(ans),
        explanation: [`$${tnum(N)} = 2^{${e2}}\\cdot 3^{${e3}}\\cdot 5^{${e5}}$.`, `Multiples of 6 need $2^{\\ge1}3^{\\ge1}$: $${e2}\\cdot${e3}\\cdot${e5 + 1} = ${multOf6}$ divisors.`, `Among these, multiples of 10 (and so of 30) also need $5^{\\ge1}$: $${e2}\\cdot${e3}\\cdot${e5} = ${multOf30}$.`, `Answer: $${multOf6} - ${multOf30} = ${ans}$.`],
        trap: 'Subtracting all multiples of 10 instead of only those that are also multiples of 6.',
        hints: H('Write each divisor as 2^a·3^b·5^c.', 'A multiple of 6 needs a ≥ 1 and b ≥ 1; a multiple of 10 needs a ≥ 1 and c ≥ 1.', 'Not a multiple of 10 here means c = 0.'),
      };
    }
    const k = rng.pick([4, 6, 12, 15]);
    const need = { 4: [2, 0, 0], 6: [1, 1, 0], 12: [2, 1, 0], 15: [0, 1, 1] }[k]!;
    const ans = (e2 - need[0] + 1) * (e3 - need[1] + 1) * (e5 - need[2] + 1);
    return {
      format: 'numeric', stem: rng.pick([`How many positive divisors of $${tnum(N)}$ are multiples of ${k}?`, `How many of the positive factors of $${tnum(N)}$ are divisible by ${k}?`]), answer: numAns(ans),
      explanation: [`$${tnum(N)} = 2^{${e2}}\\cdot3^{${e3}}\\cdot5^{${e5}}$ and $${k} = ${k === 4 ? '2^2' : k === 6 ? '2\\cdot3' : k === 12 ? '2^2\\cdot3' : '3\\cdot5'}$.`, `A divisor that is a multiple of ${k} is ${k} times a divisor of $${tnum(N)}/${k} = ${tnum(N / k)}$.`, `Divisors of ${tnum(N / k)}: $${e2 - need[0] + 1}\\cdot${e3 - need[1] + 1}\\cdot${e5 - need[2] + 1} = ${ans}$.`],
      trap: 'Counting all divisors, or dividing the divisor count by k.',
      hints: H('Factor everything into primes.', `Multiples of ${k} that divide N correspond to divisors of N/${k}.`, `N/${k} = ${tnum(N / k)}.`),
    };
  },
});

// 3. Integers satisfying a quadratic inequality
const quadIneq: Generator = gen({
  id: E('quad.ineq'), unit: 'al.inequalities', subtopic: 'Compound inequalities', levels: [4, 5],
  skills: ['sign analysis of quadratics'], concepts: ['Quadratic equations', 'Linear inequalities', 'Testing boundary cases'],
  generate(rng, level) {
    const r = rng.int(-8, 3), s = r + rng.int(3, 10);
    const strict = rng.bool();
    const b = -(r + s), c = r * s;
    const expr = poly([[1, 'x^2'], [b, 'x'], [c, '']]);
    if (level === 5) {
      // outside the roots, within a bounded window
      const L = rng.int(8, 15);
      let cnt = 0; for (let x = -L; x <= L; x++) { const v = x * x + b * x + c; if (strict ? v > 0 : v >= 0) cnt++; }
      return {
        format: 'numeric', stem: rng.pick([`How many integers $x$ with $-${L} \\le x \\le ${L}$ satisfy $${expr} ${strict ? '>' : '\\ge'} 0$?`, `For how many integers $x$ between $-${L}$ and $${L}$, inclusive, is $${expr}$ ${strict ? 'positive' : 'nonnegative'}?`]), answer: numAns(cnt),
        explanation: [`Factor: $${fac(r)}${fac(s)}$, roots ${r} and ${s}.`, `An upward parabola is ${strict ? 'positive outside' : 'nonnegative outside and at'} its roots: $x ${strict ? '<' : '\\le'} ${r}$ or $x ${strict ? '>' : '\\ge'} ${s}$.`, `Count in $[-${L}, ${L}]$: ${Math.max(0, (strict ? r - 1 : r) - -L + 1)} on the left and ${Math.max(0, L - (strict ? s + 1 : s) + 1)} on the right: ${cnt}.`],
        trap: 'Counting the integers between the roots instead of outside them, or mishandling the endpoints.',
        hints: H('Factor the quadratic.', 'Upward parabola: positive outside its roots.', `Roots: ${r} and ${s}.`),
      };
    }
    const cnt = strict ? s - r - 1 : s - r + 1;
    return {
      format: 'numeric', stem: rng.pick([`How many integers $x$ satisfy $${expr} ${strict ? '<' : '\\le'} 0$?`, `For how many integer values of $x$ is $${expr}$ ${strict ? 'negative' : 'less than or equal to zero'}?`]), answer: numAns(cnt),
      explanation: [`$${expr} = ${fac(r)}${fac(s)}$.`, `The product is ${strict ? 'negative' : 'at most zero'} ${strict ? 'strictly between' : 'between and at'} the roots: $${r} ${strict ? '<' : '\\le'} x ${strict ? '<' : '\\le'} ${s}$.`, `Integers: ${cnt}.`],
      trap: strict ? 'Including the roots, where the expression equals 0.' : 'Excluding the roots, where the expression equals 0 (which is allowed).',
      hints: H('Factor and find the roots.', 'Between the roots an upward parabola is below zero.', `Roots: ${r} and ${s}.`),
    };
  },
});

// 4. Extremes with integer constraints
const extremeProduct: Generator = gen({
  id: E('extreme.product'), unit: 'st.traps', subtopic: 'Using symmetry', levels: [4, 5],
  skills: ['optimization under constraints'], concepts: ['Using symmetry', 'Identifying hidden constraints'],
  generate(rng, level) {
    if (level === 5) {
      const d = rng.int(5, 19);
      const ans = d % 2 === 0 ? -(d * d) / 4 : -((d * d - 1) / 4);
      return {
        format: 'numeric', stem: rng.pick([`If $x$ and $y$ are integers and $x - y = ${d}$, what is the least possible value of $xy$?`, `Integers $x$ and $y$ differ by ${d}, with $x$ the larger. What is the smallest possible value of their product?`]), answer: numAns(ans),
        explanation: [`Write $x = y + ${d}$: $xy = y^2 + ${d}y$, a parabola minimized at $y = -${d}/2$.`, d % 2 === 0 ? `$y = -${d / 2}$ is an integer: $xy = (${d / 2})(-${d / 2}) = ${ans}$.` : `$-${d}/2$ is not an integer, so try the nearest integers $y = -${(d - 1) / 2}$ or $-${(d + 1) / 2}$: $xy = ${(d + 1) / 2}\\cdot(-${(d - 1) / 2}) = ${ans}$.`],
        trap: 'Assuming the product is smallest when one number is 0, or forgetting the integer constraint.',
        hints: H('Express xy in one variable.', 'A quadratic in y has its minimum at the vertex.', 'If the vertex is not an integer, check the nearest integers.'),
      };
    }
    const S = rng.int(11, 41);
    const ans = Math.floor(S / 2) * Math.ceil(S / 2);
    return {
      format: 'numeric', stem: rng.pick([`If $x$ and $y$ are positive integers with $x + y = ${S}$, what is the greatest possible value of $xy$?`, `Two positive integers have a sum of ${S}. What is the largest possible product of the two integers?`]), answer: numAns(ans),
      explanation: ['For a fixed sum, the product is largest when the numbers are as close as possible.', S % 2 === 0 ? `$${S / 2}\\cdot${S / 2} = ${ans}$.` : `${S} is odd, so use ${Math.floor(S / 2)} and ${Math.ceil(S / 2)}: product ${ans}.`],
      trap: 'Using non-integer halves for an odd sum.',
      hints: H('Try a few splits and watch the product.', 'Closer numbers give a larger product.', `Split ${S} as evenly as possible.`),
    };
  },
});

// 5. Function composition identity
const composition: Generator = gen({
  id: E('fn.composition'), unit: 'al.functions', subtopic: 'Composite functions', levels: [4, 5],
  skills: ['matching coefficients'], concepts: ['Composite functions', 'Systems of equations'],
  generate(rng, level) {
    const p = rng.int(2, 5), q = rng.intNot(-6, 6, [0]), t = rng.int(-3, 4);
    const A = p * p, B = (p + 1) * q;
    const ask = level === 5 ? t : 1;
    return {
      format: 'numeric', stem: rng.pick([`The function $f$ is defined by $f(x) = px + q$, where $p > 0$. If $f(f(x)) = ${A}x ${B < 0 ? '-' : '+'} ${Math.abs(B)}$ for all $x$, what is $f(${ask})$?`, `Suppose $f(x) = px + q$ with $p > 0$, and $f(f(x)) = ${A}x ${B < 0 ? '-' : '+'} ${Math.abs(B)}$ for every $x$. Find $f(${ask})$.`]),
      answer: numAns(p * ask + q),
      explanation: [`$f(f(x)) = p(px + q) + q = p^2x + (p + 1)q$.`, `Match coefficients: $p^2 = ${A}$ so $p = ${p}$ (since $p > 0$); $(p + 1)q = ${B}$ so $q = ${q}$.`, `$f(${ask}) = ${p}(${ask}) ${q < 0 ? '-' : '+'} ${Math.abs(q)} = ${p * ask + q}$.`],
      trap: 'Taking p = −√… (excluded by p > 0) or forgetting the second q term in f(f(x)).',
      hints: H('Compute f(f(x)) symbolically.', 'f(f(x)) = p(px + q) + q.', 'Match the x-coefficient and the constant.'),
    };
  },
});

// 6. Shaded regions with quarter circles
const shaded: Generator = gen({
  id: E('geo.shaded'), unit: 'ge.circles', subtopic: 'Area', levels: [4, 5],
  skills: ['composite areas'], concepts: ['Area', 'Circles', 'Squares'],
  generate(rng, level) {
    const s = rng.pick([2, 4, 6, 8, 10]);
    const P = (x: number, y: number) => ({ x, y });
    if (level === 5) {
      // four quarter circles of radius s/2 centered at the corners; region inside the square, outside all four
      const r = s / 2;
      const diagram: GeoDiagram = { kind: 'geo', width: 230, height: 230, polygons: [{ pts: [P(0, 0), P(2, 0), P(2, 2), P(0, 2)] }], arcs: [{ c: P(0, 0), r: 1, from: 0, to: 90 }, { c: P(2, 0), r: 1, from: 90, to: 180 }, { c: P(2, 2), r: 1, from: 180, to: 270 }, { c: P(0, 2), r: 1, from: 270, to: 360 }], labels: [{ at: P(1, -0.2), text: `${s}` }], note: 'Note: Figure not necessarily drawn to scale.' };
      return {
        format: 'mcq', diagram, stem: rng.pick([`A square has side length ${s}. Four quarter circles of radius ${r} are drawn inside it, each centered at a different vertex. What is the area of the region inside the square but outside all four quarter circles?`, `In the figure, each arc is a quarter circle of radius ${r} centered at a vertex of a square with side ${s}. Find the area of the part of the square not covered by the quarter circles.`]),
        ...textMcq(rng, `$${s * s} - ${r * r === 1 ? '' : r * r}\\pi$`, [{ t: `$${s * s} - ${4 * r * r}\\pi$`, note: 'Counted four full circles instead of four quarter circles.' }, `$${s * s}\\pi - ${s * s}$`, `$${s * s} - ${pc((r * r) / 4)}\\pi$`, `$${4 * s} - ${r * r === 1 ? '' : r * r}\\pi$`]),
        explanation: ['Four quarter circles with equal radii make exactly one full circle.', `Covered area $= \\pi(${r})^2 = ${r * r === 1 ? '' : r * r}\\pi$ (radius ${r} = half the side, so the arcs just touch).`, `Uncovered area $= ${s}^2 - ${r * r === 1 ? '' : r * r}\\pi = ${s * s} - ${r * r === 1 ? '' : r * r}\\pi$.`],
        trap: 'Adding four full circle areas.', hints: H('How many quarter circles make a whole circle?', 'Four quarters = one circle of radius r.', `r = ${r}.`),
      };
    }
    const diagram: GeoDiagram = { kind: 'geo', width: 230, height: 230, polygons: [{ pts: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)] }], arcs: [{ c: P(0, 0), r: 1, from: 0, to: 90 }], points: [{ p: P(0, 0), label: 'A', dx: -10, dy: 12 }], labels: [{ at: P(0.5, -0.12), text: `${s}` }], note: 'Note: Figure not necessarily drawn to scale.' };
    const q4 = (s * s) / 4;
    return {
      format: 'mcq', diagram, stem: rng.pick([`A quarter circle centered at vertex $A$ of a square passes through the two vertices adjacent to $A$. If the square has side ${s}, what is the area of the region inside the square but outside the quarter circle?`, `In square $ABCD$ with side ${s}, an arc is drawn with center $A$ from $B$ to $D$. Find the area of the square that lies outside the arc's quarter-circle region.`]),
      ...textMcq(rng, `$${s * s} - ${pc(q4)}\\pi$`, [{ t: `$${s * s} - ${pc(s * s)}\\pi$`, note: 'Used the full circle area.' }, `$${s * s} - ${pc(q4 * 2)}\\pi$`, `$${pc(q4)}\\pi$`, `$${4 * s} - ${pc(s / 2)}\\pi$`]),
      explanation: [`The quarter circle has radius ${s} (the side), so its area is $\\tfrac14\\pi(${s})^2 = ${q4 === 1 ? '' : fmt(q4)}\\pi$.`, `Outside region: $${s * s} - ${q4 === 1 ? '' : fmt(q4)}\\pi$.`],
      trap: 'Using radius s/2 instead of s.', hints: H('What is the radius of the arc?', 'The radius equals the side length.', 'A quarter circle is ¼ of πr².'),
    };
  },
});

// 7. Right triangle inscribed in a circle
const inscribedRight: Generator = gen({
  id: E('geo.inscribedright'), unit: 'ge.triangles', subtopic: 'Geometric relationships', levels: [5],
  skills: ['Thales theorem', 'composite areas'], concepts: ['Circles', 'Pythagorean theorem', 'Inscribed figures'],
  generate(rng) {
    const [a, b, c] = rng.pick([[6, 8, 10], [5, 12, 13], [8, 15, 17], [12, 16, 20]]);
    const R = c / 2;
    const xC = (b * b - a * a) / (2 * c) / R, yC = Math.sqrt(b * b - ((b * b - a * a) / (2 * c) + R) ** 2) / R;
    const diagram: GeoDiagram = { kind: 'geo', width: 240, height: 240, circles: [{ c: { x: 0, y: 0 }, r: 1 }], polygons: [{ pts: [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: xC, y: yC }] }], points: [{ p: { x: -1, y: 0 }, label: 'A', dx: -12, dy: 4 }, { p: { x: 1, y: 0 }, label: 'B', dx: 12, dy: 4 }, { p: { x: xC, y: yC }, label: 'C', dy: -10 }], note: 'Note: Figure not necessarily drawn to scale.' };
    const R2 = new Frac(c * c, 4);
    const piTex = R2.d === 1 ? `${R2.n}\\pi` : `\\dfrac{${R2.n}\\pi}{${R2.d}}`;
    const area = (a * b) / 2;
    return {
      format: 'mcq', diagram, stem: rng.pick([`Triangle $ABC$ is inscribed in a circle, and $AB$ is a diameter. If $AC = ${b}$ and $BC = ${a}$, what is the area of the region inside the circle but outside the triangle?`, `Points $A$, $B$, $C$ lie on a circle with $AB$ a diameter, $AC = ${b}$, and $BC = ${a}$. Find the area of the circle not covered by triangle $ABC$.`]),
      ...textMcq(rng, `$${piTex} - ${area}$`, [{ t: `$${c * c}\\pi - ${area}$`, note: 'Used the diameter as the radius.' }, `$${piTex} - ${a * b}$`, `$${piTex} - ${(a + b) / 2}$`, `$${R * 2}\\pi - ${area}$`]),
      explanation: ['An angle inscribed in a semicircle is a right angle, so $\\angle C = 90^\\circ$.', `$AB = \\sqrt{${a}^2 + ${b}^2} = ${c}$, so the radius is ${fmt(R)} and the circle's area is $${piTex}$.`, `Triangle area $= \\tfrac12\\cdot${a}\\cdot${b} = ${area}$; outside region $= ${piTex} - ${area}$.`],
      trap: 'Not recognizing the right angle at C, or using the diameter as the radius.',
      hints: H('What does a diameter tell you about the angle at C?', 'It is 90°: use the Pythagorean theorem.', `The diameter is ${c}.`),
    };
  },
});

// 8. At least k successes
const atLeastTwo: Generator = gen({
  id: E('prob.atleast'), unit: 'da.probability', subtopic: 'Independent events', levels: [5],
  skills: ['binomial counting', 'complements'], concepts: ['Independent events', 'Combinations', 'Complement rule'],
  generate(rng) {
    const n = rng.int(3, 5), p = new Frac(1, rng.pick([2, 3, 4])), qn = new Frac(1).sub(p);
    const P0 = new Frac(qn.n ** n, qn.d ** n), P1 = new Frac(nCr(n, 1) * p.n * qn.n ** (n - 1), p.d * qn.d ** (n - 1));
    const ans = new Frac(1).sub(P0).sub(P1);
    const ctx = rng.pick([
      { s: `A basketball player makes each free throw with probability $${p.tex()}$, independently. If she takes ${n} free throws, what is the probability that she makes at least two?`, e: 'makes' },
      { s: `Each of ${n} independent light bulbs fails within a year with probability $${p.tex()}$. What is the probability that at least two of the bulbs fail within a year?`, e: 'fails' },
      { s: `A die-rolling game awards a point on each roll with probability $${p.tex()}$, independently of other rolls. In ${n} rolls, what is the probability of scoring at least two points?`, e: 'scores' },
    ]);
    return {
      format: 'numeric', stem: `${ctx.s} Give your answer as a fraction.`, answer: fracAns(ans.n, ans.d),
      explanation: [`Use the complement: $P(\\ge 2) = 1 - P(0) - P(1)$.`, `$P(0) = \\left(${qn.tex()}\\right)^{${n}} = ${P0.tex()}$.`, `$P(1) = \\binom{${n}}{1}\\left(${p.tex()}\\right)\\left(${qn.tex()}\\right)^{${n - 1}} = ${P1.tex()}$.`, `$P(\\ge2) = 1 - ${P0.tex()} - ${P1.tex()} = ${ans.tex()}$.`],
      trap: 'Forgetting the factor $\\binom{n}{1}$ for which trial is the single success.',
      hints: H('“At least two” is easier through its complement.', 'Complement = exactly 0 or exactly 1.', `P(exactly 1) = ${n} · p · (1 − p)^${n - 1}.`),
    };
  },
});

// 9. Non-adjacent selections
const noAdjacent: Generator = gen({
  id: E('count.nonadjacent'), unit: 'da.counting', subtopic: 'Restrictions and complements', levels: [5],
  skills: ['gap method', 'complementary counting'], concepts: ['Combinations', 'Permutations', 'Restrictions and complements'],
  generate(rng) {
    if (rng.bool()) {
      const n = rng.int(8, 15), k = rng.int(2, 4);
      const ans = nCr(n - k + 1, k);
      return {
        format: 'numeric', stem: rng.pick([`In how many ways can ${k} of ${n} chairs in a row be chosen so that no two chosen chairs are next to each other?`, `A runner wants to rest on exactly ${k} of the next ${n} days, never resting on two consecutive days. How many rest schedules are possible?`]), answer: numAns(ans),
        explanation: [`Place the ${n - k} unchosen items in a row; they create ${n - k + 1} gaps (including both ends).`, `Choose ${k} different gaps for the chosen items: $\\binom{${n - k + 1}}{${k}} = ${ans}$.`],
        trap: `Using $\\binom{${n}}{${k}}$, which allows adjacent choices.`, hints: H('Arrange the unchosen items first.', 'Chosen items go into gaps between them.', `There are ${n - k + 1} gaps.`),
      };
    }
    const n = rng.int(5, 7), m = rng.pick([2, 3]);
    const f = (x: number): number => (x <= 1 ? 1 : x * f(x - 1));
    const together = f(n - m + 1) * f(m);
    const apart = m === 2 ? f(n) - together : f(n - m) * nCr(n - m + 1, m) * f(m);
    return {
      format: 'numeric', stem: m === 2 ? rng.pick([`${n} people, including Kai and Lia, line up in a row. In how many orders are Kai and Lia **not** next to each other?`, `How many ways can ${n} different books be shelved in a row if two particular books must not be adjacent?`]) : `${n} people, including 3 friends, sit in a row of ${n} chairs. In how many arrangements are no two of the 3 friends seated next to each other?`,
      answer: numAns(apart),
      explanation: m === 2
        ? [`Total orders: $${n}! = ${f(n)}$.`, `Together: treat the pair as one block: $${n - 1}!\\cdot 2 = ${together}$.`, `Not together: $${f(n)} - ${together} = ${apart}$.`]
        : [`Arrange the other ${n - 3} people: $${n - 3}! = ${f(n - 3)}$ ways, creating ${n - 2} gaps.`, `Choose 3 distinct gaps and order the friends: $\\binom{${n - 2}}{3}\\cdot 3! = ${nCr(n - 2, 3) * 6}$.`, `Total: $${f(n - 3)}\\cdot${nCr(n - 2, 3) * 6} = ${apart}$.`],
      trap: m === 2 ? 'Forgetting the two internal orders of the block when counting "together".' : 'Subtracting only the arrangements where all three sit together.',
      hints: H(m === 2 ? 'Count the complement: together.' : 'Seat the others first.', m === 2 ? 'Glue the pair into a block.' : 'The friends must go into different gaps.', m === 2 ? `Together: ${n - 1}! × 2.` : `${n - 2} gaps; choose 3.`),
    };
  },
});

// 10. Circular track meetings
const circularTrack: Generator = gen({
  id: E('dist.track'), unit: 'wp.distance', subtopic: 'Relative speed', levels: [4, 5],
  skills: ['relative speed on a loop'], concepts: ['Relative speed', 'Distance, rate, and time', 'Least common multiple'],
  generate(rng, level) {
    let L = 0, v1 = 0, v2 = 0, opposite = false, rel = 1;
    for (let tries = 0; tries < 200; tries++) {
      L = rng.pick([300, 400, 600, 800]); v1 = rng.pick([150, 200, 240, 250]); v2 = rng.pick([100, 120, 160, 180].filter((x) => x < v1)); opposite = rng.bool();
      rel = opposite ? v1 + v2 : v1 - v2;
      if (Number.isInteger((L * 4) / rel)) break; // meeting time is a whole or quarter minute: typeable for numeric entry
    }
    if (level === 5) {
      let T = rng.pick([20, 30, 40, 60]);
      if ((rel * T) % L === 0) T += 1; // avoid a meeting exactly at the time limit (ambiguous)
      const meets = Math.floor((rel * T) / L);
      return {
        format: 'numeric', stem: rng.pick([`Two runners start together at the same point of a ${L}-meter circular track and run ${opposite ? 'in opposite directions' : 'in the same direction'} at constant speeds of ${v1} and ${v2} meters per minute. How many times do they meet (not counting the start) during the first ${T} minutes?`, `On a ${L} m loop, cyclists leave the same spot at the same moment, ${opposite ? 'heading opposite ways' : 'heading the same way'}, at ${v1} m/min and ${v2} m/min. Excluding the start, how many times do they pass each other in ${T} minutes?`]), answer: numAns(meets),
        explanation: [`${opposite ? 'Moving toward each other' : 'Moving the same way'}, the gap between them changes at $${rel}$ m/min.`, `They meet each time that relative distance reaches a multiple of ${L} m: every $${L}/${rel} = ${fmt(L / rel)}$ min.`, `In ${T} min: $\\lfloor ${rel * T}/${L} \\rfloor = ${meets}$ meetings.`],
        trap: opposite ? 'Using the difference of the speeds for opposite directions.' : 'Adding the speeds for runners going the same way.',
        hints: H('Think of one runner as standing still.', opposite ? 'Opposite directions: add the speeds.' : 'Same direction: subtract the speeds.', 'Count how many full laps of relative distance fit.'),
      };
    }
    const t = L / rel;
    return {
      format: 'numeric', stem: rng.pick([`Two runners start at the same point of a ${L}-meter circular track and run ${opposite ? 'in opposite directions' : 'in the same direction'} at ${v1} and ${v2} meters per minute. After how many minutes do they first meet again?`, `How many minutes after starting together do two walkers first meet on a ${L} m circular path if they walk ${opposite ? 'in opposite directions' : 'in the same direction'} at ${v1} m/min and ${v2} m/min?`]), answer: numAns(round(t, 4), 0.001),
      explanation: [`Relative speed: $${opposite ? `${v1} + ${v2}` : `${v1} - ${v2}`} = ${rel}$ m/min.`, `They meet when the relative distance covered equals one lap: $${L}/${rel} = ${fmt(t)}$ min.`],
      trap: opposite ? 'Subtracting the speeds.' : 'Adding the speeds; the faster runner must gain a whole lap.', hints: H('Use relative speed.', opposite ? 'Opposite directions → add speeds.' : 'Same direction → subtract speeds.', `One lap = ${L} m.`),
    };
  },
});

// 11. Shares after uneven growth
const shareShift: Generator = gen({
  id: E('pct.share'), unit: 'wp.money', subtopic: 'Percentage applications', levels: [5],
  skills: ['weighted percent change'], concepts: ['Percentage applications', 'Weighted averages', 'Successive percentage changes'],
  generate(rng) {
    const s = rng.pick([20, 25, 30, 40]), g = rng.pick([10, 20, 25, 50]), h = rng.pick([5, 10, 20]);
    const a = s * (1 + g / 100), o = (100 - s) * (1 - h / 100);
    const share = (a / (a + o)) * 100, totalChange = (a + o - 100);
    const askTotal = rng.bool();
    const lead = rng.pick([`Last year product A accounted for ${s}% of a company's revenue. This year A's revenue grew by ${g}% while revenue from all other products fell by ${h}%.`, `A store's sales were ${s}% from electronics last year. This year electronics sales rose ${g}% and all other sales dropped ${h}%.`]);
    return {
      format: 'numeric', stem: askTotal ? `${lead} By what percent did total revenue change? (Enter a negative number for a decrease; round to the nearest tenth.)` : `${lead} What percent of this year's total came from that category? (Round to the nearest tenth of a percent.)`,
      answer: numAns(round(askTotal ? totalChange : share, 1), 0.051), unitLabel: '%',
      explanation: ['Assume last year’s total was 100.', `Category: $${s}\\times${fmt(1 + g / 100)} = ${fmt(a)}$. Others: $${100 - s}\\times${fmt(1 - h / 100)} = ${fmt(o)}$.`, `New total $= ${fmt(a + o)}$.`, askTotal ? `Total change $= ${fmt(a + o)} - 100 = ${fmt(totalChange, 2)}\\%$.` : `Share $= ${fmt(a)}/${fmt(a + o)} \\approx ${share.toFixed(2)}\\%$.`],
      trap: askTotal ? `Averaging ${g}% and −${h}% without weighting by the ${s}/${100 - s} split.` : `Adding ${g}% to the old share (${s}%).`,
      hints: H('Start from a total of 100.', 'Apply each growth rate to its own part.', `Category becomes ${s} × ${fmt(1 + g / 100)}.`),
    };
  },
});

// 12. QC with absolute-value ranges
const absQc: Generator = gen({
  id: E('qc.absrange'), unit: 'st.qc', subtopic: 'Testing boundary cases', levels: [4, 5],
  skills: ['interval reasoning', 'case testing'], concepts: ['Absolute value', 'Testing boundary cases', 'Identifying hidden constraints'],
  generate(rng, level) {
    const c = rng.int(1, 4), r = rng.pick([1, 2]), d = rng.int(-3, 1);
    const T = [
      { lv: 4, given: `$|x - ${c}| < ${r}$`, a: '$x$', b: `$${c - r}$`, v: ['x'], cst: (v: any) => Math.abs(v.x - c) < r, fA: (v: any) => v.x, fB: () => c - r, proof: [`$|x - ${c}| < ${r}$ means $${c - r} < x < ${c + r}$, so $x > ${c - r}$.`] },
      { lv: 4, given: `$|x - ${c}| \\le ${r}$`, a: '$x$', b: `$${c - r}$`, v: ['x'], cst: (v: any) => Math.abs(v.x - c) <= r, fA: (v: any) => v.x, fB: () => c - r, extra: [{ x: c - r }, { x: c }] },
      { lv: 5, given: `$|x - ${c}| < ${r}$ and $|y - ${d}| < 1$`, a: '$x - y$', b: `$${c - d}$`, v: ['x', 'y'], cst: (v: any) => Math.abs(v.x - c) < r && Math.abs(v.y - d) < 1, fA: (v: any) => v.x - v.y, fB: () => c - d, extra: [{ x: c + 0.5, y: d }, { x: c - 0.5, y: d }, { x: c, y: d }] },
      { lv: 5, given: `$|x| < 1$ and $x \\ne 0$`, a: '$x^2$', b: '$|x|$', v: ['x'], cst: (v: any) => Math.abs(v.x) < 1 && v.x !== 0, fA: (v: any) => v.x * v.x, fB: (v: any) => Math.abs(v.x), proof: ['For $0 < |x| < 1$: $x^2 = |x|\\cdot|x| < |x|$.'] },
    ];
    const t = rng.pick(T.filter((x) => x.lv === level));
    return qcOutput({
      given: t.given, a: t.a, b: t.b, vars: t.v.map((name) => ({ name, kind: 'real' as const })), constraint: t.cst, fA: t.fA, fB: t.fB, proof: t.proof, extra: t.extra,
      intro: 'Turn each absolute-value condition into an interval, then test the interval’s ends and middle.',
      trap: 'Ignoring whether the inequality is strict: “≤” allows the boundary value, which can create equality.',
      hints: H('Rewrite |x − c| < r as an interval.', 'Test values near both ends of the interval and in the middle.', 'Watch strict vs non-strict boundaries.'),
    });
  },
});

export const EXPERT: Generator[] = [powMod, condDivisors, quadIneq, extremeProduct, composition, shaded, inscribedRight, atLeastTwo, noAdjacent, circularTrack, shareShift, absQc];
void numMcq;
