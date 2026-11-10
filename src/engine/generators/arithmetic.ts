import { Frac, divisors, factorize, factorTex, fmt, gcd, isPrime, lcm, lcmAll, money, numDivisors, primesUpTo, round, sqrtStr, simplifySqrt, tnum, texFrac } from '../../lib/math';
import type { Generator, Level } from '../types';
import { H, fracAns, gen, multiSel, numAns, numMcq, textMcq } from './helpers';
import { qcNumeric, qcOutput } from './qc';

const A = (id: string) => `ar.${id}`;
const clock = (t: number) => { const h24 = Math.floor(t / 60) % 24, m = Math.round(t % 60); const h12 = h24 % 12 === 0 ? 12 : h24 % 12; return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'a.m.' : 'p.m.'}`; };

// ===================== Integers & number properties =====================
type ParityExpr = { t: string; f: (a: number, b: number) => number };
const PARITY_EXPRS: ParityExpr[] = [
  { t: 'a + b', f: (a, b) => a + b },
  { t: 'ab', f: (a, b) => a * b },
  { t: 'a^2 + b', f: (a, b) => a * a + b },
  { t: '2a + b', f: (a, b) => 2 * a + b },
  { t: 'a + 3b', f: (a, b) => a + 3 * b },
  { t: 'ab + a', f: (a, b) => a * b + a },
  { t: 'a^2b', f: (a, b) => a * a * b },
  { t: '(a + 1)(b + 1)', f: (a, b) => (a + 1) * (b + 1) },
  { t: 'a^3 - b^2', f: (a, b) => a ** 3 - b * b },
  { t: '3a + 5b', f: (a, b) => 3 * a + 5 * b },
  { t: '(a - b)^2', f: (a, b) => (a - b) ** 2 },
  { t: 'a^b', f: (a, b) => a ** b },
];

const parity: Generator = gen({
  id: A('int.parity'), unit: 'ar.integers', subtopic: 'Odd and even numbers', levels: [2, 3, 4],
  skills: ['parity rules'], concepts: ['Odd and even numbers'],
  generate(rng, level) {
    const aOdd = rng.bool(), bOdd = level === 2 ? !aOdd : rng.bool();
    const want = rng.bool() ? 'odd' : 'even';
    // representative values (positive so a^b is integer)
    const tests = [[aOdd ? 3 : 2, bOdd ? 5 : 4], [aOdd ? 1 : 6, bOdd ? 7 : 2]];
    const exprs = rng.sample(PARITY_EXPRS.filter((e) => level >= 4 || e.t !== 'a^b'), level >= 3 ? 6 : 5);
    const opts = exprs.map((e) => {
      const p = tests.map(([a, b]) => Math.abs(e.f(a, b)) % 2);
      const isOdd = p[0] === 1;
      if (p[0] !== p[1]) throw new Error('parity inconsistent');
      return { t: `$${e.t}$`, ok: (want === 'odd') === isOdd, note: `$${e.t}$ is ${isOdd ? 'odd' : 'even'} for these parities.` };
    });
    if (!opts.some((o) => o.ok)) opts[0] = { ...opts[0] }; // validated below
    if (!opts.some((o) => o.ok)) throw new Error('no correct option');
    const ms = multiSel(rng, opts);
    return {
      format: 'multi',
      stem: `If $a$ is ${aOdd ? 'an odd' : 'an even'} integer and $b$ is ${bOdd ? 'an odd' : 'an even'} positive integer, which of the following must be **${want}**? Indicate all such expressions.`,
      ...ms,
      explanation: [
        'Use parity rules: odd ± odd = even, odd ± even = odd, even ± even = even; a product is even if any factor is even.',
        ...opts.map((o) => o.note!),
        `A fast check: substitute $a = ${tests[0][0]}$, $b = ${tests[0][1]}$ — parity rules guarantee the same result for every valid choice of $a$ and $b$.`,
      ],
      trap: 'Forgetting that multiplying by an even number always produces an even result, or that a power keeps the parity of its base.',
      hints: H('Parity is decided by rules, not by size.', 'Even × anything = even; odd + odd = even; odd + even = odd.', `Try $a = ${tests[0][0]}$ and $b = ${tests[0][1]}$ in each expression.`),
    };
  },
});

const orderOps: Generator = gen({
  id: A('int.orderops'), unit: 'ar.integers', subtopic: 'Order of operations', levels: [1, 2, 3],
  skills: ['PEMDAS', 'negative exponents of signs'], concepts: ['Order of operations', 'Positive and negative numbers'],
  generate(rng, level) {
    const a = rng.int(2, 5), b = rng.int(2, 9), c = rng.int(1, 6), d = rng.pick([2, 3, 4]);
    // value = -a^2 + (b - c*d)^2 / ...  keep integer
    const inner = b - c * d;
    const sq = inner * inner;
    const div = rng.pick(divisors(sq || 1).filter((x) => x <= 12)) || 1;
    const value = -(a * a) + sq / div + (level >= 2 ? c * (b - a) : 0);
    const expr = `-${a}^2 + \\dfrac{(${b} - ${c} \\cdot ${d})^2}{${div}}${level >= 2 ? ` + ${c}(${b} - ${a})` : ''}`;
    const wrong1 = a * a + sq / div + (level >= 2 ? c * (b - a) : 0);
    const mc = numMcq(value, [
      { v: wrong1, note: `Treats $-${a}^2$ as $(-${a})^2 = ${a * a}$. The exponent applies before the negative sign.` },
      { v: -(a * a) + ((b - c) * d) ** 2 / div + (level >= 2 ? c * (b - a) : 0), note: 'Subtracted before multiplying inside the parentheses.' },
      value + 2 * c, value - div,
    ]);
    return {
      format: 'mcq',
      stem: `What is the value of $${expr}$?`,
      ...mc,
      explanation: [
        `Parentheses first: $${b} - ${c}\\cdot${d} = ${inner}$, so the squared term is $${inner}^2 = ${sq}$ and $\\dfrac{${sq}}{${div}} = ${sq / div}$.`,
        `Exponent before negation: $-${a}^2 = -(${a}^2) = -${a * a}$.`,
        ...(level >= 2 ? [`$${c}(${b} - ${a}) = ${c * (b - a)}$.`] : []),
        `Total: $${-(a * a)} + ${sq / div}${level >= 2 ? ` + ${c * (b - a)}` : ''} = ${value}$.`,
      ],
      trap: `$-${a}^2$ equals $-${a * a}$, not $${a * a}$. Only $(-${a})^2$ is positive.`,
      hints: H('Work inside parentheses first, and multiply before subtracting.', 'Exponents are applied before the leading negative sign.', `Compute $${b} - ${c}\\cdot ${d}$ first.`),
    };
  },
});

const countIntegers: Generator = gen({
  id: A('int.count'), unit: 'ar.integers', subtopic: 'Integers', levels: [2, 3, 4],
  skills: ['inclusive counting', 'multiples in a range'], concepts: ['Integers', 'Counting'],
  generate(rng, level) {
    if (level === 2) {
      const lo = -rng.int(3, 15), hi = rng.int(5, 30);
      const incl = rng.bool();
      const n = incl ? hi - lo + 1 : hi - lo - 1;
      return {
        format: 'numeric',
        stem: `How many integers $n$ satisfy $${lo} ${incl ? '\\le' : '<'} n ${incl ? '\\le' : '<'} ${hi}$?`,
        answer: numAns(n),
        explanation: [`Count from ${lo} to ${hi} ${incl ? 'inclusive' : 'exclusive'}: $${hi} - (${lo})${incl ? ' + 1' : ' - 1'} = ${n}$.`, 'Remember that 0 is an integer.'],
        trap: 'Subtracting the endpoints without adjusting by +1 (inclusive) or −1 (exclusive), or forgetting zero.',
        hints: H('Inclusive count = last − first + 1.', `Here the range runs from ${lo} to ${hi}.`, `$${hi} - (${lo}) = ${hi - lo}$; now adjust.`),
      };
    }
    const k = rng.pick([3, 4, 6, 7, 8, 9, 11, 12, 13]);
    const lo = rng.int(10, 120), hi = lo + rng.int(150, 600);
    const first = Math.ceil(lo / k) * k, last = Math.floor(hi / k) * k;
    let n = (last - first) / k + 1;
    if (level === 3) {
      return {
        format: 'numeric',
        stem: `How many multiples of ${k} are between ${lo} and ${hi}, inclusive?`,
        answer: numAns(n),
        explanation: [`First multiple $\\ge ${lo}$: ${first}. Last multiple $\\le ${hi}$: ${last}.`, `Count $= \\dfrac{${last} - ${first}}{${k}} + 1 = ${n}$.`],
        trap: `Computing $(${hi} - ${lo}) / ${k}$ directly; the endpoints are not necessarily multiples of ${k}.`,
        hints: H('Find the first and last multiples in the range.', '(last − first) / step + 1.', `The first multiple of ${k} at least ${lo} is ${first}.`),
      };
    }
    const k2 = rng.pick([2, 3, 5].filter((x) => gcd(x, k) === 1));
    const L = k * k2;
    const f2 = Math.ceil(lo / L) * L, l2 = Math.floor(hi / L) * L;
    const both = l2 >= f2 ? (l2 - f2) / L + 1 : 0;
    const ans = n - both;
    return {
      format: 'numeric',
      stem: `How many integers between ${lo} and ${hi}, inclusive, are multiples of ${k} but **not** multiples of ${k2}?`,
      answer: numAns(ans),
      explanation: [
        `Multiples of ${k}: first ${first}, last ${last}, count $= (${last} - ${first})/${k} + 1 = ${n}$.`,
        `Multiples of both ${k} and ${k2} are multiples of ${L} (they are coprime): count $= ${both}$.`,
        `Answer: $${n} - ${both} = ${ans}$.`,
      ],
      trap: `Subtracting all multiples of ${k2} instead of only the common multiples (multiples of ${L}).`,
      hints: H('Count multiples of the first number, then remove the overlap.', `A number divisible by both ${k} and ${k2} is divisible by their LCM.`, `The LCM is ${L}.`),
    };
  },
});

const signQc: Generator = gen({
  id: A('int.signqc'), unit: 'ar.integers', subtopic: 'Positive and negative numbers', levels: [2, 3, 4],
  skills: ['sign analysis'], concepts: ['Positive and negative numbers'],
  generate(rng, level) {
    const T = [
      { given: '$xy < 0$ and $x > y$', a: '$x$', b: '$0$', vars: ['x', 'y'], c: (v: any) => v.x * v.y < 0 && v.x > v.y, fA: (v: any) => v.x, fB: () => 0, proof: ['$xy<0$ means $x$ and $y$ have opposite signs; since $x > y$, $x$ must be the positive one.'], lv: 2 },
      { given: '$a < b < 0$', a: '$a^2$', b: '$b^2$', vars: ['a', 'b'], c: (v: any) => v.a < v.b && v.b < 0, fA: (v: any) => v.a ** 2, fB: (v: any) => v.b ** 2, proof: ['Both are negative and $a$ is farther from zero, so $|a| > |b|$ and therefore $a^2 > b^2$.'], lv: 3 },
      { given: '$x < 0$', a: '$x^3$', b: '$x^2$', vars: ['x'], c: (v: any) => v.x < 0, fA: (v: any) => v.x ** 3, fB: (v: any) => v.x ** 2, proof: ['For negative $x$, $x^3$ is negative and $x^2$ is positive.'], lv: 2 },
      { given: '$xy > 0$', a: '$x + y$', b: '$0$', vars: ['x', 'y'], c: (v: any) => v.x * v.y > 0, fA: (v: any) => v.x + v.y, fB: () => 0, lv: 3 },
      { given: '$x$ and $y$ are integers with $x^2y < 0$', a: '$y$', b: '$x$', vars: ['x', 'y'], c: (v: any) => v.x * v.x * v.y < 0, fA: (v: any) => v.y, fB: (v: any) => v.x, int: true, lv: 4 },
      { given: '$\\dfrac{a}{b} < 0$ and $a - b > 0$', a: '$b$', b: '$0$', vars: ['a', 'b'], c: (v: any) => v.b !== 0 && v.a / v.b < 0 && v.a - v.b > 0, fA: (v: any) => v.b, fB: () => 0, proof: ['$a/b<0$ means opposite signs; $a > b$ forces $a > 0 > b$.'], lv: 3 },
      { given: '$x < y$ and $xy < 0$', a: '$\\dfrac{1}{x}$', b: '$\\dfrac{1}{y}$', vars: ['x', 'y'], c: (v: any) => v.x < v.y && v.x * v.y < 0, fA: (v: any) => 1 / v.x, fB: (v: any) => 1 / v.y, proof: ['Opposite signs with $x<y$ means $x<0<y$, so $1/x < 0 < 1/y$.'], lv: 4 },
      { given: '$x < y < 0$', a: '$\\dfrac{1}{x}$', b: '$\\dfrac{1}{y}$', vars: ['x', 'y'], c: (v: any) => v.x < v.y && v.y < 0, fA: (v: any) => 1 / v.x, fB: (v: any) => 1 / v.y, proof: ['Taking reciprocals of two numbers with the **same** sign reverses the inequality: $x < y < 0 \\Rightarrow \\frac1x > \\frac1y$.'], lv: 4 },
    ];
    const pool = T.filter((t) => Math.abs(t.lv - level) <= 1);
    const t = rng.pick(pool);
    return qcOutput({
      given: t.given, a: t.a, b: t.b,
      vars: t.vars.map((n) => ({ name: n, kind: (t as any).int ? 'int' : 'real' })),
      constraint: t.c, fA: t.fA, fB: t.fB, proof: t.proof,
      trap: 'Testing only positive integers. Sign questions demand negatives and fractions as test cases.',
      hints: H('Decide the sign of each variable from the given condition.', 'Opposite signs ⇔ product negative; same signs ⇔ product positive.', 'Test one negative and one positive case that satisfy the conditions.'),
    });
  },
});

// ===================== Primes =====================
const primeCount: Generator = gen({
  id: A('prime.count'), unit: 'ar.primes', subtopic: 'Prime numbers', levels: [1, 2, 3],
  skills: ['prime recognition'], concepts: ['Prime numbers'],
  generate(rng, level) {
    const lo = level === 1 ? rng.int(1, 20) : level === 2 ? rng.int(20, 60) : rng.int(60, 120);
    const hi = lo + (level === 1 ? rng.int(10, 20) : rng.int(20, 35));
    const ps = primesUpTo(hi).filter((p) => p > lo);
    const has1 = lo < 1;
    return {
      format: 'numeric',
      stem: `How many prime numbers are greater than ${lo} and less than ${hi}?`,
      answer: numAns(ps.filter((p) => p < hi).length),
      explanation: [`The primes strictly between ${lo} and ${hi} are: ${ps.filter((p) => p < hi).join(', ') || 'none'}.`, `Count: ${ps.filter((p) => p < hi).length}.`, 'Check divisibility only by primes up to the square root (2, 3, 5, 7, 11).'],
      trap: `Counting 1 as prime (it is not)${has1 ? '' : ''}, or including composite odd numbers like 51 = 3·17, 57 = 3·19, 91 = 7·13.`,
      hints: H('A prime has exactly two positive divisors.', `Test divisibility by 2, 3, 5, 7${hi > 121 ? ', 11' : ''}.`, 'Watch for disguised composites like 51, 57, 87, 91, 119.'),
    };
  },
});

const primeFactor: Generator = gen({
  id: A('prime.factor'), unit: 'ar.primes', subtopic: 'Prime factorization', levels: [2, 3, 4],
  skills: ['prime factorization', 'divisor counting'], concepts: ['Prime factorization', 'Counting divisors'],
  generate(rng, level) {
    const ps = rng.sample([2, 3, 5, 7, 11, 13], level >= 3 ? 3 : 2).sort((a, b) => a - b);
    const es = ps.map(() => rng.int(1, level >= 4 ? 4 : 3));
    const N = ps.reduce((acc, p, i) => acc * p ** es[i], 1);
    if (N > 200000) return primeFactor.generate(rng, level);
    const fTex = factorTex(N);
    const variant = level === 2 ? 0 : level === 3 ? rng.int(0, 1) : 2;
    if (variant === 0) {
      const s = ps.reduce((a, b) => a + b, 0);
      const mc = numMcq(s, [{ v: ps.reduce((a, p, i) => a + p * es[i], 0), note: 'Added each prime once per occurrence; the question asks for distinct primes.' }, s + 2, ps[ps.length - 1], s - 1]);
      return {
        format: 'mcq', stem: `What is the sum of the distinct prime factors of $${tnum(N)}$?`, ...mc,
        explanation: [`$${tnum(N)} = ${fTex}$.`, `Distinct primes: ${ps.join(', ')}; sum $= ${s}$.`],
        trap: 'Counting repeated primes multiple times, or including 1 or composite factors.',
        hints: H('Break the number into primes with a factor tree.', 'Divide repeatedly by 2, then 3, then 5, ...', `Start: $${tnum(N)} \\div ${ps[0]} = ${tnum(N / ps[0])}$.`),
      };
    }
    if (variant === 1) {
      const nd = numDivisors(N);
      return {
        format: 'numeric', stem: `How many positive divisors does $${tnum(N)}$ have?`, answer: numAns(nd),
        explanation: [`Prime factorization: $${tnum(N)} = ${fTex}$.`, `Number of divisors $= ${es.map((e) => `(${e}+1)`).join('')} = ${nd}$.`],
        trap: 'Multiplying the exponents instead of (exponent + 1) values, or forgetting 1 and the number itself.',
        hints: H('Every divisor is built from the same primes with smaller exponents.', 'If $N = p^a q^b$, it has $(a+1)(b+1)$ divisors.', `$${tnum(N)} = ${fTex}$.`),
      };
    }
    // level 4: perfect square divisors or odd divisors
    const odd = ps.includes(2) && rng.bool();
    if (odd) {
      const od = es.reduce((a, e, i) => (ps[i] === 2 ? a : a * (e + 1)), 1);
      return {
        format: 'numeric', stem: `How many **odd** positive divisors does $${tnum(N)}$ have?`, answer: numAns(od),
        explanation: [`$${tnum(N)} = ${fTex}$.`, 'An odd divisor cannot contain the factor 2, so ignore the power of 2.', `Odd divisors: ${es.map((e, i) => (ps[i] === 2 ? '' : `(${e}+1)`)).join('')} $= ${od}$.`],
        trap: 'Counting all divisors and halving — the split between odd and even divisors is not 50/50.',
        hints: H('Odd divisors use no factor of 2.', 'Count divisors of the odd part of the number.', `The odd part is $${tnum(N / 2 ** es[ps.indexOf(2)])}$.`),
      };
    }
    const sq = es.reduce((a, e) => a * (Math.floor(e / 2) + 1), 1);
    return {
      format: 'numeric', stem: `How many positive divisors of $${tnum(N)}$ are perfect squares?`, answer: numAns(sq),
      explanation: [`$${tnum(N)} = ${fTex}$.`, 'A perfect square divisor uses only even exponents.', ...ps.map((p, i) => `For $${p}$: exponents ${Array.from({ length: Math.floor(es[i] / 2) + 1 }, (_, k) => 2 * k).join(', ')} → ${Math.floor(es[i] / 2) + 1} choices.`), `Total: ${sq} (this includes 1).`],
      trap: 'Forgetting that 1 is a perfect square divisor, or allowing odd exponents.',
      hints: H('Perfect squares have even exponents in their factorization.', 'For each prime count how many even exponents are available (0 counts).', `Factor first: $${fTex}$.`),
    };
  },
});

const factorialPower: Generator = gen({
  id: A('prime.factorial'), unit: 'ar.primes', subtopic: 'Prime factorization', levels: [4, 5],
  skills: ['Legendre formula', 'trailing zeros'], concepts: ['Prime factorization', 'Factorials'],
  generate(rng, level) {
    const n = rng.int(level === 4 ? 20 : 40, level === 4 ? 40 : 110);
    const zeros = rng.bool();
    const p = zeros ? 5 : rng.pick([2, 3]);
    let cnt = 0, q = p;
    const terms: string[] = [];
    while (q <= n) { cnt += Math.floor(n / q); terms.push(`\\lfloor ${n}/${q} \\rfloor = ${Math.floor(n / q)}`); q *= p; }
    if (zeros) {
      return {
        format: 'numeric', stem: `How many consecutive zeros are at the end of the integer $${n}!$ when it is written out?`, answer: numAns(cnt),
        explanation: ['Each trailing zero is a factor of $10 = 2 \\cdot 5$; factors of 2 are plentiful, so count factors of 5.', `Factors of 5: ${terms.join(', ')}.`, `Total $= ${cnt}$.`],
        trap: `Using only $\\lfloor ${n}/5 \\rfloor$ and missing extra factors from multiples of 25${n >= 125 ? ' and 125' : ''}.`,
        hints: H('A trailing zero needs a pair (2, 5).', 'Count how many times 5 divides into the factorial.', 'Multiples of 25 contribute two fives.'),
      };
    }
    return {
      format: 'numeric', stem: `What is the greatest integer $k$ such that $${p}^k$ is a factor of $${n}!$?`, answer: numAns(cnt),
      explanation: [`Count factors of ${p} among $1, 2, \\dots, ${n}$: ${terms.join(', ')}.`, `Sum $= ${cnt}$.`],
      trap: `Counting only multiples of ${p} once, ignoring that multiples of ${p * p} contribute an extra factor.`,
      hints: H(`Each multiple of ${p} contributes at least one ${p}.`, `Add $\\lfloor n/${p} \\rfloor + \\lfloor n/${p * p} \\rfloor + \\dots$`, `$\\lfloor ${n}/${p} \\rfloor = ${Math.floor(n / p)}$.`),
    };
  },
});

// ===================== Factors, GCD, LCM =====================
const gcdLcm: Generator = gen({
  id: A('fac.gcdlcm'), unit: 'ar.factors', subtopic: 'Greatest common divisor', levels: [1, 2, 3, 4],
  skills: ['GCD', 'LCM'], concepts: ['Greatest common divisor', 'Least common multiple'],
  generate(rng, level) {
    const g = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 12, 14, 15]);
    let m = rng.int(2, 9), n = rng.int(2, 11);
    while (gcd(m, n) !== 1 || m === n) { m = rng.int(2, 9); n = rng.int(2, 11); }
    const a = g * m, b = g * n, L = g * m * n;
    if (level <= 2) {
      const askG = rng.bool();
      const v = askG ? g : L;
      const mc = numMcq(v, askG ? [{ v: g * Math.min(m, n), note: 'Not a divisor of both numbers.' }, a * b, g > 2 ? g / gcd(g, 2) : g + 1, Math.min(a, b)] : [{ v: a * b, note: 'The product is a common multiple, but not necessarily the least.' }, L / 2, L * 2, g]);
      return {
        format: 'mcq', stem: `What is the ${askG ? 'greatest common divisor' : 'least common multiple'} of $${a}$ and $${b}$?`, ...mc,
        explanation: [`$${a} = ${factorTex(a)}$ and $${b} = ${factorTex(b)}$.`, askG ? `GCD: take the lowest power of each shared prime → $${g}$.` : `LCM: take the highest power of each prime → $${L}$.`],
        trap: askG ? 'Choosing the smaller number, which only works if it divides the other.' : 'Multiplying the numbers — this double-counts their common factors.',
        hints: H('Prime-factorize both numbers.', askG ? 'GCD uses the shared primes with the smaller exponents.' : 'LCM uses every prime with the larger exponent.', `$${a} = ${factorTex(a)}$.`),
      };
    }
    if (level === 3) {
      return {
        format: 'numeric', stem: `The greatest common divisor of positive integers $p$ and $q$ is $${g}$, and their least common multiple is $${L}$. If $p = ${a}$, what is $q$?`, answer: numAns(b),
        explanation: ['For any two positive integers, $\\gcd(p, q)\\cdot \\operatorname{lcm}(p, q) = pq$.', `So $q = \\dfrac{${g}\\cdot ${L}}{${a}} = ${b}$.`],
        trap: 'Dividing the LCM by the GCD, or by $p$ alone.',
        hints: H('There is an identity connecting GCD, LCM and the product.', '$\\gcd \\cdot \\operatorname{lcm} = p \\cdot q$.', `$${g}\\times${L} = ${g * L}$.`),
      };
    }
    // level 4: three-number LCM word problem
    const xs = rng.sample([4, 6, 8, 9, 10, 12, 15, 18, 20], 3).sort((x, y) => x - y);
    const LL = lcmAll(xs);
    const start = rng.pick([7, 8, 9]);
    const total = start * 60 + LL;
    return {
      format: 'mcq',
      stem: `Three lights flash every ${xs[0]}, ${xs[1]}, and ${xs[2]} minutes, respectively. If they all flash together at ${start}:00 a.m., at what time will they next all flash together?`,
      ...textMcq(rng, clock(total), [
        { t: clock(start * 60 + xs[0] * xs[1] * xs[2]), note: 'Used the product of the intervals instead of the LCM.' },
        clock(start * 60 + LL / 2), clock(start * 60 + xs[2] * 2), clock(start * 60 + LL + 30), clock(start * 60 + LL * 2),
      ]),
      explanation: [`They coincide every $\\operatorname{lcm}(${xs.join(', ')}) = ${LL}$ minutes.`, `${start}:00 a.m. + ${LL} minutes = ${clock(total)}.`],
      trap: 'Multiplying the intervals — that is a common multiple, not the least one.',
      hints: H('“Together again” means a common multiple of all intervals.', 'Find the least common multiple.', `Factor: ${xs.map((x) => `$${factorTex(x)}$`).join(', ')}.`),
    };
  },
});

const divisibility: Generator = gen({
  id: A('fac.divis'), unit: 'ar.factors', subtopic: 'Divisibility rules', levels: [2, 3, 4],
  skills: ['divisibility rules'], concepts: ['Divisibility rules', 'Factors and multiples'],
  generate(rng, level) {
    if (level === 4) {
      const a = rng.pick([12, 18, 20, 24, 28]), b = rng.pick([15, 21, 30, 35, 42].filter((x) => x !== a));
      const L = lcm(a, b);
      const cands = [...new Set([...divisors(L).filter((d) => d > 3), 2 * L, L * 3, ...[8, 9, 16, 25, 27, 49].filter((x) => L % x !== 0)])];
      const opts = rng.sample(cands, 6).map((d) => ({ t: `$${d}$`, ok: L % d === 0, v: d, note: L % d === 0 ? `${d} divides ${L}.` : `${d} does not divide ${L}, the smallest such $n$.` }));
      if (!opts.some((o) => o.ok)) opts[0] = { t: `$${L}$`, ok: true, v: L, note: 'The LCM itself.' };
      const ms = multiSel(rng, opts);
      return {
        format: 'multi', stem: `If the positive integer $n$ is divisible by both ${a} and ${b}, which of the following must be divisors of $n$? Indicate all that apply.`, ...ms,
        explanation: [`$n$ must be a multiple of $\\operatorname{lcm}(${a}, ${b}) = ${L}$ (since $${a} = ${factorTex(a)}$, $${b} = ${factorTex(b)}$).`, `The smallest possible $n$ is ${L}; a number must divide every possible $n$, so it must divide ${L}.`, `Divisors of ${L} among the choices: ${opts.filter((o) => o.ok).map((o) => o.v).sort((x, y) => x - y).join(', ')}.`],
        trap: `Assuming $n$ is divisible by $${a}\\times${b} = ${a * b}$ — the overlap of prime factors is counted only once.`,
        hints: H('What is the smallest $n$ that works?', 'The smallest $n$ is the LCM.', `$\\operatorname{lcm}(${a}, ${b}) = ${L}$.`),
      };
    }
    const tests: [number, (n: number) => boolean, string][] = [[3, (n) => n % 3 === 0, 'digit sum divisible by 3'], [4, (n) => n % 4 === 0, 'last two digits divisible by 4'], [6, (n) => n % 6 === 0, 'divisible by both 2 and 3'], [8, (n) => n % 8 === 0, 'last three digits divisible by 8'], [9, (n) => n % 9 === 0, 'digit sum divisible by 9'], [11, (n) => n % 11 === 0, 'alternating digit sum divisible by 11'], [12, (n) => n % 12 === 0, 'divisible by 3 and 4'], [15, (n) => n % 15 === 0, 'divisible by 3 and 5']];
    let N = 0;
    for (let i = 0; i < 50; i++) { N = rng.int(10000, 99999) * (rng.bool() ? 6 : 4); if (N < 1e6) break; }
    const chosen = rng.sample(tests, 5).sort((a, b) => a[0] - b[0]);
    const opts = chosen.map(([d, f, rule]) => ({ t: `$${d}$`, ok: f(N), v: d, note: `${d}: ${rule} — ${f(N) ? 'yes' : 'no'}.` }));
    if (!opts.some((o) => o.ok)) return divisibility.generate(rng, level);
    const ds = String(N).split('').map(Number).reduce((a, b) => a + b, 0);
    return {
      format: 'multi', stem: `Which of the following integers are divisors of $${tnum(N)}$? Indicate all that apply.`, ...multiSel(rng, opts),
      explanation: [`Digit sum of ${fmt(N)} is ${ds}; last two digits ${String(N).slice(-2)}; last three digits ${String(N).slice(-3)}.`, ...opts.map((o) => o.note)],
      trap: 'Assuming divisibility by 4 and 6 implies divisibility by 24 (it implies only 12).',
      hints: H('Use divisibility rules instead of long division.', 'Digit sums handle 3 and 9; final digits handle 2, 4, 8, 5.', `The digit sum is ${ds}.`),
    };
  },
});

// ===================== Remainders =====================
const remainders: Generator = gen({
  id: A('rem.basic'), unit: 'ar.remainders', subtopic: 'Remainders', levels: [2, 3, 4, 5],
  skills: ['remainder arithmetic'], concepts: ['Remainders', 'Modular reasoning'],
  generate(rng, level) {
    const d = rng.pick([5, 6, 7, 8, 9, 11, 12]);
    const r = rng.int(1, d - 1);
    if (level === 2) {
      const k = rng.int(2, 9), add = rng.int(1, 20);
      const ans = (k * r + add) % d;
      return {
        format: 'numeric', stem: `When the positive integer $n$ is divided by ${d}, the remainder is ${r}. What is the remainder when $${k}n + ${add}$ is divided by ${d}?`, answer: numAns(ans),
        explanation: [`Write $n = ${d}q + ${r}$. Then $${k}n + ${add} = ${d}(${k}q) + ${k * r + add}$.`, `The remainder of $${k * r + add}$ divided by ${d} is ${ans}.`, `Shortcut: plug in the smallest such $n$, $n = ${r}$: $${k}(${r}) + ${add} = ${k * r + add}$, remainder ${ans}.`],
        trap: `Answering $${k}\\cdot${r} + ${add} = ${k * r + add}$ without reducing it below ${d}.`,
        hints: H(`Choose a concrete value of $n$ that leaves remainder ${r}.`, `$n = ${r}$ or $n = ${d + r}$ works.`, `Compute $${k}n + ${add}$ and divide by ${d}.`),
      };
    }
    if (level === 3) {
      const ans = (r * r) % d;
      const mc = numMcq(ans, [{ v: r * r, note: 'Did not reduce the result modulo the divisor.' }, r, (2 * r) % d, (ans + 1) % d]);
      return {
        format: 'mcq', stem: `When the integer $n$ is divided by ${d}, the remainder is ${r}. What is the remainder when $n^2$ is divided by ${d}?`, ...mc,
        explanation: [`$n = ${d}q + ${r} \\Rightarrow n^2 = ${d}(\\dots) + ${r * r}$.`, `$${r * r} = ${d}\\cdot${Math.floor((r * r) / d)} + ${ans}$, so the remainder is ${ans}.`, `Check with $n = ${r + d}$: $${(r + d) ** 2} \\div ${d}$ leaves ${((r + d) ** 2) % d}.`],
        trap: 'Squaring the remainder and forgetting to reduce it.',
        hints: H('Remainders multiply: rem(n·n) = rem(r·r).', `Square ${r}.`, `Reduce ${r * r} modulo ${d}.`),
      };
    }
    // level 4/5: two conditions (CRT) — smallest or count
    const d1 = rng.pick([3, 4, 5]), d2 = rng.pick([6, 7, 8, 9].filter((x) => gcd(x, d1) === 1));
    const r1 = rng.int(1, d1 - 1), r2 = rng.int(1, d2 - 1);
    const L = d1 * d2;
    let x = 1; while (!(x % d1 === r1 && x % d2 === r2)) x++;
    if (level === 4) {
      return {
        format: 'numeric', stem: `What is the smallest positive integer that leaves a remainder of ${r1} when divided by ${d1} and a remainder of ${r2} when divided by ${d2}?`, answer: numAns(x),
        explanation: [`List numbers with remainder ${r2} when divided by ${d2}: ${[0, 1, 2, 3, 4, 5].map((k) => r2 + d2 * k).join(', ')}, …`, `Check each for remainder ${r1} when divided by ${d1}: the first that works is ${x}.`, `(All solutions are $${x} + ${L}k$.)`],
        trap: 'Adding the remainders or multiplying the divisors without checking the conditions.',
        hints: H('List candidates from the larger divisor.', `Numbers of the form $${d2}k + ${r2}$.`, `Test each against division by ${d1}.`),
      };
    }
    const lim = rng.pick([100, 150, 200, 250]);
    let count = 0; for (let n = x; n < lim; n += L) count++;
    return {
      format: 'numeric', stem: `How many positive integers less than ${lim} leave a remainder of ${r1} when divided by ${d1} and a remainder of ${r2} when divided by ${d2}?`, answer: numAns(count),
      explanation: [`The smallest such integer is ${x}.`, `Solutions repeat every $\\operatorname{lcm}(${d1}, ${d2}) = ${L}$: ${x}, ${x + L}, ${x + 2 * L}, …`, `Those below ${lim}: ${count}.`],
      trap: `Dividing ${lim} by ${L} without anchoring at the first solution.`,
      hints: H('Find one number satisfying both conditions.', `Solutions are spaced by the LCM of ${d1} and ${d2}.`, `The first solution is ${x}.`),
    };
  },
});

const unitsDigit: Generator = gen({
  id: A('rem.units'), unit: 'ar.remainders', subtopic: 'Units-digit cycles', levels: [2, 3, 4],
  skills: ['cyclicity'], concepts: ['Units-digit cycles'],
  generate(rng, level) {
    const base = rng.pick([2, 3, 7, 8, 4, 9, 13, 17, 22, 23, 27, 28]);
    const e = rng.int(level === 2 ? 15 : 40, level === 2 ? 40 : 400);
    const u = base % 10;
    const cyc: number[] = []; let v = u;
    do { cyc.push(v); v = (v * u) % 10; } while (v !== cyc[0]);
    const unitOf = (ex: number) => cyc[(ex - 1) % cyc.length];
    if (level === 4) {
      const b2 = rng.pick([3, 7, 9, 2].filter((x) => x !== u)), e2 = rng.int(20, 200);
      const c2: number[] = []; let w = b2; do { c2.push(w); w = (w * b2) % 10; } while (w !== c2[0]);
      const u1 = unitOf(e), u2 = c2[(e2 - 1) % c2.length];
      const ans = (u1 + u2) % 10;
      return {
        format: 'numeric', stem: `What is the units digit of $${base}^{${e}} + ${b2}^{${e2}}$?`, answer: numAns(ans),
        explanation: [`Units digits of powers of ${u} cycle: ${cyc.join(', ')} (length ${cyc.length}). $${e} \\bmod ${cyc.length} = ${e % cyc.length || cyc.length}$ → units digit ${u1}.`, `Powers of ${b2} cycle: ${c2.join(', ')}. $${e2} \\bmod ${c2.length} = ${e2 % c2.length || c2.length}$ → units digit ${u2}.`, `Sum of units digits: $${u1} + ${u2} = ${u1 + u2}$ → units digit ${ans}.`],
        trap: 'Using the exponent’s remainder without matching remainder 0 to the last position of the cycle.',
        hints: H('Only units digits matter.', 'Units digits of powers repeat in short cycles.', `Cycle for ${u}: ${cyc.join(', ')}.`),
      };
    }
    const ans = unitOf(e);
    const distr = [...cyc.filter((x) => x !== ans), u, (ans + 5) % 10, 0, 5].filter((x, i, arr) => x !== ans && arr.indexOf(x) === i);
    const mc2 = numMcq(ans, distr.map((x) => ({ v: x })), { render: (n) => `$${n}$` });
    return {
      format: 'mcq', stem: `What is the units digit of $${base}^{${e}}$?`, ...mc2,
      explanation: [`Only the units digit ${u} matters. Its powers cycle: ${cyc.join(', ')} (period ${cyc.length}).`, `$${e} \\div ${cyc.length}$ leaves remainder ${e % cyc.length}${e % cyc.length === 0 ? ' (i.e., the last position in the cycle)' : ''}, so the units digit is ${ans}.`],
      trap: 'Treating remainder 0 as the first position instead of the last position in the cycle.',
      hints: H('Write out the first few powers and watch the last digit.', `The cycle for ${u} has length ${cyc.length}.`, `Find $${e} \\bmod ${cyc.length}$.`),
    };
  },
});

// ===================== Absolute value =====================
const absValue: Generator = gen({
  id: A('abs.eval'), unit: 'ar.absolute', subtopic: 'Absolute value', levels: [1, 2, 3, 4],
  skills: ['absolute value'], concepts: ['Absolute value', 'Distance on the number line'],
  generate(rng, level) {
    if (level <= 2) {
      const a = rng.int(-12, -2), b = rng.int(3, 15), c = rng.int(-9, 9);
      const val = Math.abs(a - b) - Math.abs(c) + Math.abs(a + b);
      return {
        format: 'numeric', stem: `What is the value of $|${a} - ${b}| - |${c}| + |${a} + ${b}|$?`, answer: numAns(val),
        explanation: [`$|${a} - ${b}| = |${a - b}| = ${Math.abs(a - b)}$`, `$|${c}| = ${Math.abs(c)}$`, `$|${a} + ${b}| = |${a + b}| = ${Math.abs(a + b)}$`, `Total: $${Math.abs(a - b)} - ${Math.abs(c)} + ${Math.abs(a + b)} = ${val}$.`],
        trap: 'Distributing absolute value: $|a - b|$ is not $|a| - |b|$.',
        hints: H('Simplify inside each absolute value first.', 'Absolute value makes the inside non-negative.', `$${a} - ${b} = ${a - b}$.`),
      };
    }
    if (level === 3) {
      const c = rng.int(-6, 8), d = rng.int(3, 9);
      const n = 2 * d + 1;
      return {
        format: 'numeric', stem: `How many integers $x$ satisfy $|x ${c < 0 ? '+' : '-'} ${Math.abs(c)}| \\le ${d}$?`, answer: numAns(n),
        explanation: [`$|x - (${c})| \\le ${d}$ means $x$ is within ${d} of ${c}: $${c - d} \\le x \\le ${c + d}$.`, `Integer count: $${c + d} - (${c - d}) + 1 = ${n}$.`],
        trap: 'Forgetting the lower half of the solution set or miscounting endpoints.',
        hints: H('Absolute value measures distance.', `$|x - c| \\le d$ ⇔ $c - d \\le x \\le c + d$.`, `Here the center is ${c}.`),
      };
    }
    const p = rng.int(2, 9), q = rng.int(1, 7);
    // |x - p| = q*? Two solutions; sum or product
    const s1 = p + q, s2 = p - q;
    return {
      format: 'mcq', stem: `If $|2x - ${2 * p}| = ${2 * q}$, what is the sum of all possible values of $x$?`,
      ...numMcq(s1 + s2, [{ v: s1, note: 'Only took the positive case.' }, { v: s1 * s2, note: 'Multiplied the roots instead of adding.' }, 2 * q, p]),
      explanation: [`$2x - ${2 * p} = ${2 * q}$ or $2x - ${2 * p} = -${2 * q}$.`, `So $x = ${s1}$ or $x = ${s2}$; sum $= ${s1 + s2}$.`, 'Shortcut: the two solutions are symmetric about the center $x = ' + p + '$, so their sum is $2 \\cdot ' + p + '$.'],
      trap: 'Solving only the positive case.',
      hints: H('An absolute value equation usually has two cases.', `Set the inside equal to $${2 * q}$ and to $-${2 * q}$.`, `Divide everything by 2: $|x - ${p}| = ${q}$.`),
    };
  },
});

// ===================== Fractions & decimals =====================
const fracOps: Generator = gen({
  id: A('frac.ops'), unit: 'ar.fractions', subtopic: 'Fraction operations', levels: [1, 2, 3],
  skills: ['fraction arithmetic'], concepts: ['Fraction operations'],
  generate(rng, level) {
    const f = () => new Frac(rng.int(1, 9), rng.pick([2, 3, 4, 5, 6, 8, 9, 10, 12]));
    let a = f(), b = f(), c = f();
    while (a.eq(b)) b = f();
    let res: Frac, expr: string, steps: string[];
    if (level === 1) {
      res = a.add(b); expr = `${a.tex()} + ${b.tex()}`;
      steps = [`Common denominator: ${a.tex()} + ${b.tex()} = ${res.tex()}$.`];
      steps = [`Use a common denominator ${a.d * b.d / gcd(a.d, b.d)}: $${expr} = ${res.tex()}$.`];
    } else if (level === 2) {
      res = a.add(b).mul(c); expr = `\\left(${a.tex()} + ${b.tex()}\\right) \\times ${c.tex()}`;
      steps = [`$${a.tex()} + ${b.tex()} = ${a.add(b).tex()}$`, `$${a.add(b).tex()} \\times ${c.tex()} = ${res.tex()}$`];
    } else {
      while (c.n === 0) c = f();
      res = a.sub(b).div(c); expr = `\\dfrac{${a.tex()} - ${b.tex()}}{${c.tex()}}`;
      steps = [`Numerator: $${a.tex()} - ${b.tex()} = ${a.sub(b).tex()}$`, `Dividing by $${c.tex()}$ means multiplying by $${new Frac(c.d, c.n).tex()}$: result $${res.tex()}$.`];
    }
    return {
      format: 'numeric', stem: `What is the value of $${expr}$? Give your answer as a fraction.`, answer: fracAns(res.n, res.d),
      explanation: [...steps, 'Equivalent fractions are accepted (they need not be reduced).'],
      trap: 'Adding numerators and denominators separately, or forgetting to flip the divisor.',
      hints: H('Fractions need a common denominator to be added or subtracted.', 'To divide by a fraction, multiply by its reciprocal.', steps[0]),
    };
  },
});

const fracCompare: Generator = gen({
  id: A('frac.compare'), unit: 'ar.fractions', subtopic: 'Comparing fractions', levels: [2, 3, 4],
  skills: ['benchmark comparison', 'cross-multiplication'], concepts: ['Comparing fractions', 'Decimals'],
  generate(rng, level) {
    if (level === 4) {
      // QC: a/b vs (a+k)/(b+k)
      const b = rng.int(5, 15), a = rng.int(2, b + 6), k = rng.int(1, 9);
      if (a === b) return fracCompare.generate(rng, level);
      return qcNumeric({
        a: `$\\dfrac{${a}}{${b}}$`, b: `$\\dfrac{${a + k}}{${b + k}}$`, va: a / b, vb: (a + k) / (b + k),
        proof: [`Cross-multiply: compare $${a}(${b + k}) = ${a * (b + k)}$ with $${b}(${a + k}) = ${b * (a + k)}$.`, `Adding the same positive amount to numerator and denominator moves a fraction toward 1; since $\\frac{${a}}{${b}}$ is ${a < b ? 'less' : 'greater'} than 1, it ${a < b ? 'increases' : 'decreases'}.`],
        trap: 'Assuming adding the same number to top and bottom leaves the fraction unchanged.',
        hints: H('Is the fraction above or below 1?', 'Adding equal amounts to numerator and denominator pulls a fraction toward 1.', 'Cross-multiply to confirm.'),
      });
    }
    const fr = Array.from({ length: 5 }, () => { const d = rng.int(level === 2 ? 3 : 7, level === 2 ? 12 : 19); return new Frac(rng.int(1, d - 1), d); });
    const vals = fr.map((x) => x.value);
    if (new Set(vals.map((v) => v.toFixed(6))).size < 5) return fracCompare.generate(rng, level);
    const greatest = rng.bool();
    const target = greatest ? Math.max(...vals) : Math.min(...vals);
    const ci = vals.indexOf(target);
    const order = rng.shuffle([0, 1, 2, 3, 4]);
    return {
      format: 'mcq', stem: `Which of the following is the ${greatest ? 'greatest' : 'least'}?`,
      choices: order.map((i) => `$${fr[i].tex()}$`), answer: order.indexOf(ci),
      explanation: [`Convert to decimals (or compare to benchmarks like $\\tfrac12$): ${fr.map((x) => `$${x.tex()} \\approx ${x.value.toFixed(3)}$`).join(', ')}.`, `The ${greatest ? 'greatest' : 'least'} is $${fr[ci].tex()}$.`],
      trap: 'Comparing numerators or denominators alone instead of the whole fraction.',
      hints: H('Compare each fraction to 1/2 first.', 'Cross-multiply to compare two close fractions.', 'Approximate each as a decimal to two places.'),
      distractorNotes: {},
    };
  },
});

const fracRemaining: Generator = gen({
  id: A('frac.remaining'), unit: 'ar.fractions', subtopic: 'Fractions', levels: [2, 3, 4],
  skills: ['fraction of a remainder'], concepts: ['Fractions', 'Fraction operations'],
  generate(rng, level) {
    const f1 = new Frac(1, rng.pick([3, 4, 5])), f2 = new Frac(rng.pick([1, 2]), rng.pick([3, 5]));
    const left1 = new Frac(1).sub(f1), left2 = left1.mul(new Frac(1).sub(f2));
    const D = left2.d * f1.d * f2.d;
    const total = D * rng.int(1, level >= 3 ? 6 : 3) * (level >= 3 ? 2 : 1);
    const remaining = left2.mul(total).value;
    const askTotal = level >= 3;
    const thing = rng.pick([['budget', 'dollars', 'rent', 'food'], ['tank', 'liters', 'the first trip', 'the second trip'], ['salary', 'dollars', 'taxes', 'savings']]);
    if (!Number.isInteger(remaining)) return fracRemaining.generate(rng, level);
    if (askTotal) {
      return {
        format: 'numeric',
        stem: `A person spent $${f1.tex()}$ of a ${thing[0]} on ${thing[2]} and then $${f2.tex()}$ of the **remaining** amount on ${thing[3]}. If ${fmt(remaining)} ${thing[1]} were left, what was the original ${thing[0]}, in ${thing[1]}?`,
        answer: numAns(total), unitLabel: thing[1],
        explanation: [`After the first expense, $1 - ${f1.tex()} = ${left1.tex()}$ remains.`, `After the second, $${left1.tex()} \\times ${new Frac(1).sub(f2).tex()} = ${left2.tex()}$ of the original remains.`, `$${left2.tex()} \\cdot T = ${remaining}$, so $T = ${total}$.`],
        trap: `Subtracting both fractions from the whole: $1 - ${f1.tex()} - ${f2.tex()}$ — the second fraction is of the remainder.`,
        hints: H('Track what fraction of the original remains after each step.', 'The second fraction applies to what is left, not the original.', `After step one, $${left1.tex()}$ remains.`),
      };
    }
    return {
      format: 'mcq',
      stem: `A person spent $${f1.tex()}$ of a ${thing[0]} on ${thing[2]} and $${f2.tex()}$ of the remainder on ${thing[3]}. What fraction of the original ${thing[0]} is left?`,
      ...textMcq(rng, `$${left2.tex()}$`, [{ t: `$${new Frac(1).sub(f1).sub(f2).tex()}$`, note: 'Subtracted both fractions from the original.' }, `$${f1.mul(f2).tex()}$`, `$${left1.tex()}$`, `$${new Frac(1).sub(left2).tex()}$`]),
      explanation: [`Remaining after ${thing[2]}: $${left1.tex()}$.`, `Remaining after ${thing[3]}: $${left1.tex()} \\times \\left(1 - ${f2.tex()}\\right) = ${left2.tex()}$.`],
      trap: 'Subtracting fractions of different wholes.',
      hints: H('The second fraction is of the remainder.', 'Multiply the remaining fractions.', `$1 - ${f1.tex()} = ${left1.tex()}$.`),
    };
  },
});

const repeatingDecimal: Generator = gen({
  id: A('frac.decimal'), unit: 'ar.fractions', subtopic: 'Decimals', levels: [3, 4, 5],
  skills: ['repeating decimals', 'pattern recognition'], concepts: ['Decimals', 'Recognizing patterns'],
  generate(rng, level) {
    const d = rng.pick([7, 11, 13, 27, 37]);
    const n = rng.int(1, d - 1);
    if (gcd(n, d) !== 1) return repeatingDecimal.generate(rng, level);
    // compute repeating block
    const digits: number[] = []; let r = n;
    for (let i = 0; i < 60; i++) { r *= 10; digits.push(Math.floor(r / d)); r %= d; }
    let period = 1; for (; period <= 12; period++) if (digits.slice(0, 24).every((x, i) => x === digits[i % period])) break;
    const k = rng.int(level === 3 ? 20 : 50, level === 5 ? 999 : 200);
    const ans = digits[(k - 1) % period];
    return {
      format: 'numeric', stem: `What is the ${k === 1 ? '1st' : `${k}th`} digit to the right of the decimal point in the decimal expansion of $${texFrac(n, d)}$?`,
      answer: numAns(ans),
      explanation: [`$${texFrac(n, d)} = 0.\\overline{${digits.slice(0, period).join('')}}$ — a repeating block of ${period} digits.`, `$${k} \\div ${period}$ leaves remainder ${k % period}${k % period === 0 ? ' (last digit of the block)' : ''}, so the digit is ${ans}.`],
      trap: 'Off-by-one errors when the remainder is 0 (it corresponds to the last digit of the block).',
      hints: H('Long-divide to find the repeating block.', 'Digits repeat with a fixed period.', `The block has length ${period}.`),
    };
  },
});

// ===================== Percents =====================
const pctChange: Generator = gen({
  id: A('pct.change'), unit: 'ar.percents', subtopic: 'Percentage increase and decrease', levels: [1, 2, 3],
  skills: ['percent change'], concepts: ['Percentage increase and decrease'],
  generate(rng, level) {
    const from = rng.pick([40, 50, 60, 80, 120, 125, 150, 160, 200, 240, 250, 400]);
    const p = rng.pick([5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75]);
    const up = rng.bool();
    const to = from * (1 + (up ? p : -p) / 100);
    if (!Number.isInteger(to * 100)) return pctChange.generate(rng, level);
    if (level === 3) {
      // reverse: decrease from 'to' back to 'from'
      const back = Math.abs(from - to) / to * 100;
      return {
        format: 'numeric', stem: `The price of an item ${up ? 'increased' : 'decreased'} by ${fmt(p)}% to ${money(to)}. By what percent must the new price ${up ? 'decrease' : 'increase'} to return to the original price? (Round to the nearest tenth of a percent.)`,
        answer: numAns(round(back, 1), 0.051), unitLabel: '%',
        explanation: [`Original price: ${money(to)} $\\div ${fmt(1 + (up ? p : -p) / 100)} = ${money(from)}$.`, `Change needed: ${money(Math.abs(to - from))} relative to the **new** price ${money(to)}: $${fmt(Math.abs(to - from))}/${fmt(to)} \\approx ${fmt(round(back, 1))}\\%$.`],
        trap: `Answering ${fmt(p)}% — the base changes, so reversing a percent change needs a different percent.`,
        hints: H('Percent change always divides by the starting value.', 'The starting value for the reversal is the new price.', `Original price: ${money(from)}.`),
      };
    }
    const mc = numMcq(p, [{ v: round(Math.abs(to - from) / to * 100, 2), note: 'Divided by the new value instead of the original.' }, p * 2, Math.abs(to - from), round(to / from * 100, 2)], { render: (n) => `$${fmt(n)}\\%$` });
    return {
      format: 'mcq', stem: `A quantity changes from ${fmt(from)} to ${fmt(to)}. What is the percent ${up ? 'increase' : 'decrease'}?`, ...mc,
      explanation: [`Percent change $= \\dfrac{\\text{change}}{\\text{original}}\\times 100 = \\dfrac{${fmt(Math.abs(to - from))}}{${fmt(from)}}\\times 100 = ${fmt(p)}\\%$.`],
      trap: 'Dividing by the new value instead of the original.',
      hints: H('Percent change compares the change to the starting value.', 'Change ÷ original × 100.', `The change is ${fmt(Math.abs(to - from))}.`),
    };
  },
});

const pctSuccessive: Generator = gen({
  id: A('pct.successive'), unit: 'ar.percents', subtopic: 'Successive percentage changes', levels: [2, 3, 4, 5],
  skills: ['multiplier method'], concepts: ['Successive percentage changes'],
  generate(rng, level) {
    const p = rng.pick([10, 20, 25, 30, 40, 50]), q = rng.pick([10, 20, 25, 30, 40, 50]);
    const m = (1 + p / 100) * (1 - q / 100);
    const net = round((m - 1) * 100, 4);
    if (level === 5) {
      // QC: increase p then decrease p vs original
      return qcNumeric({
        given: `A stock's price rises by ${p}% on Monday and then falls by ${p}% on Tuesday.`,
        a: "The stock's price at the end of Tuesday", b: "The stock's price before Monday", va: (1 + p / 100) * (1 - p / 100), vb: 1,
        proof: [`Multiplier: $${fmt(1 + p / 100)} \\times ${fmt(1 - p / 100)} = ${fmt((1 + p / 100) * (1 - p / 100))}$, which is less than 1.`, `In general $(1 + x)(1 - x) = 1 - x^2 < 1$ for any nonzero $x$.`],
        trap: 'Assuming equal percent rises and falls cancel out.',
        hints: H('Convert percents to multipliers.', 'A rise of p% is ×(1 + p/100); a fall is ×(1 − p/100).', 'Use $(1+x)(1-x) = 1 - x^2$.'),
      });
    }
    if (level === 4) {
      const r = rng.pick([10, 20, 25]);
      const m3 = m * (1 + r / 100);
      const net3 = round((m3 - 1) * 100, 4);
      return {
        format: 'numeric', stem: `A population increases by ${p}% in year 1, decreases by ${q}% in year 2, and increases by ${r}% in year 3. By what percent has the population changed over the three years? (Enter a negative number for a decrease.)`,
        answer: numAns(net3, 0.01), unitLabel: '%',
        explanation: [`Multiply the factors: $${fmt(1 + p / 100)} \\times ${fmt(1 - q / 100)} \\times ${fmt(1 + r / 100)} = ${fmt(m3, 6)}$.`, `Net change: $${fmt(m3, 6)} - 1 = ${fmt(net3 / 100, 6)}$, i.e. ${fmt(net3)}%.`],
        trap: `Adding the percents: $${p} - ${q} + ${r} = ${p - q + r}$%.`,
        hints: H('Successive changes multiply.', 'Turn each change into a multiplier.', `$1 + ${p}\\% = ${fmt(1 + p / 100)}$.`),
      };
    }
    const mc = numMcq(net, [{ v: p - q, note: 'Added the percents; successive changes multiply.' }, { v: -net, note: 'Sign error.' }, net + 5, round(p * q / 100, 4)], { render: (n) => (Math.abs(n) < 1e-9 ? 'No net change' : `${n > 0 ? 'Increase' : 'Decrease'} of $${fmt(Math.abs(n))}\\%$`) });
    return {
      format: 'mcq', stem: `The price of a jacket is increased by ${p}% and then the new price is decreased by ${q}%. What is the net effect on the original price?`, ...mc,
      explanation: [`Use multipliers: $${fmt(1 + p / 100)} \\times ${fmt(1 - q / 100)} = ${fmt(m, 6)}$.`, `$${fmt(m, 6)}$ means a net ${net >= 0 ? 'increase' : 'decrease'} of ${fmt(Math.abs(net))}%.`, `Shortcut: net % $= p - q - \\dfrac{pq}{100} = ${p} - ${q} - ${fmt(p * q / 100)} = ${fmt(net)}$.`],
      trap: 'Adding and subtracting percents directly. The second change acts on a different base.',
      hints: H('Pick a starting price of 100.', 'Apply the increase, then apply the decrease to the new price.', `100 → ${100 + p} → ?`),
    };
  },
});

const pctReverse: Generator = gen({
  id: A('pct.reverse'), unit: 'ar.percents', subtopic: 'Percentages', levels: [2, 3, 4],
  skills: ['reverse percent'], concepts: ['Percentages', 'Percentage increase and decrease'],
  generate(rng, level) {
    if (level === 4) {
      // x is p% more than y; y is q% less than z; x is what percent of z?
      const p = rng.pick([20, 25, 50, 60]), q = rng.pick([10, 20, 25, 40]);
      const ans = round((1 + p / 100) * (1 - q / 100) * 100, 4);
      return {
        format: 'mcq', stem: `$x$ is ${p}% greater than $y$, and $y$ is ${q}% less than $z$. $x$ is what percent of $z$?`,
        ...numMcq(ans, [{ v: 100 + p - q, note: 'Added the percents instead of multiplying factors.' }, ans - 10, round((1 + p / 100) / (1 - q / 100) * 100, 2), 100 - p + q], { render: (n) => `$${fmt(n)}\\%$` }),
        explanation: [`$x = ${fmt(1 + p / 100)}y$ and $y = ${fmt(1 - q / 100)}z$.`, `$x = ${fmt(1 + p / 100)}\\times${fmt(1 - q / 100)}z = ${fmt(ans / 100)}z$, i.e. ${fmt(ans)}% of $z$.`],
        trap: 'Adding percent changes that have different bases.',
        hints: H('Translate “p% greater than” as a multiplier.', `$x = (1 + ${p}/100)y$.`, 'Substitute y in terms of z.'),
      };
    }
    const p = rng.pick([5, 8, 10, 15, 20, 25, 40]);
    const orig = rng.pick([40, 60, 80, 120, 160, 200, 240, 320, 400]);
    const up = level === 3 ? false : rng.bool();
    const final = orig * (1 + (up ? p : -p) / 100);
    if (!Number.isInteger(final * 100)) return pctReverse.generate(rng, level);
    const wrong = round(final * (1 - (up ? p : -p) / 100), 2);
    return {
      format: 'mcq', stem: `After a ${p}% ${up ? 'increase' : 'discount'}, an item costs ${money(final)}. What was the price before the ${up ? 'increase' : 'discount'}?`,
      ...numMcq(orig, [{ v: wrong, note: `Applied ${p}% to the final price. The percent is of the original price.` }, round(final + (up ? -p : p), 2), round(final * (1 + (up ? p : -p) / 100), 2), orig + 10], { render: (n) => `$${money(n, Number.isInteger(n) ? 0 : 2)}$` }),
      explanation: [`Final $=$ original $\\times ${fmt(1 + (up ? p : -p) / 100)}$.`, `Original $= ${fmt(final)} \\div ${fmt(1 + (up ? p : -p) / 100)} = ${fmt(orig)}$.`],
      trap: `Taking ${p}% of the final price and ${up ? 'subtracting' : 'adding'} it.`,
      hints: H('The percent was applied to the unknown original.', `Write final = original × multiplier.`, `Divide by ${fmt(1 + (up ? p : -p) / 100)}.`),
    };
  },
});

// ===================== Ratios =====================
const ratioParts: Generator = gen({
  id: A('ratio.parts'), unit: 'ar.ratios', subtopic: 'Ratios', levels: [1, 2, 3],
  skills: ['ratio parts'], concepts: ['Ratios', 'Part-to-part vs part-to-whole'],
  generate(rng, level) {
    let a = rng.int(1, 7), b = rng.int(2, 9);
    while (gcd(a, b) !== 1 || a === b) { a = rng.int(1, 7); b = rng.int(2, 9); }
    const k = rng.int(3, 15);
    const total = (a + b) * k;
    const things = rng.pick([['red', 'blue', 'marbles'], ['juniors', 'seniors', 'students'], ['cats', 'dogs', 'pets'], ['fiction', 'nonfiction', 'books']]);
    if (level === 3) {
      const c = rng.int(1, 6);
      const T = (a + b + c) * k;
      return {
        format: 'numeric', stem: `A collection of ${T} ${things[2]} is split into three groups in the ratio $${a}:${b}:${c}$. How many more are in the largest group than in the smallest group?`,
        answer: numAns((Math.max(a, b, c) - Math.min(a, b, c)) * k),
        explanation: [`Total parts: $${a} + ${b} + ${c} = ${a + b + c}$; each part $= ${T}/${a + b + c} = ${k}$.`, `Difference: $(${Math.max(a, b, c)} - ${Math.min(a, b, c)})\\times ${k} = ${(Math.max(a, b, c) - Math.min(a, b, c)) * k}$.`],
        trap: 'Dividing the total by one term of the ratio instead of by the sum of parts.',
        hints: H('Find the value of one ratio “part”.', 'Total ÷ (sum of parts) = size of one part.', `There are ${a + b + c} parts.`),
      };
    }
    const ask = level === 1 ? 'first' : 'diff';
    const ans = ask === 'first' ? a * k : Math.abs(b - a) * k;
    return {
      format: 'mcq', stem: `The ratio of ${things[0]} to ${things[1]} ${things[2]} is $${a}:${b}$. If there are ${total} ${things[2]} in all, ${ask === 'first' ? `how many are ${things[0]}?` : `how many more ${b > a ? things[1] : things[0]} than ${b > a ? things[0] : things[1]} are there?`}`,
      ...numMcq(ans, [{ v: Math.round((total * a) / b), note: 'Treated the ratio as part-to-whole.' }, ask === 'first' ? b * k : a * k, total / (a + b), ans + k]),
      explanation: [`Total parts $= ${a} + ${b} = ${a + b}$, so one part $= ${total}/${a + b} = ${k}$.`, ask === 'first' ? `${things[0]}: $${a}\\times${k} = ${a * k}$.` : `Difference: $|${b} - ${a}| \\times ${k} = ${ans}$.`],
      trap: 'Confusing part-to-part ratios with part-to-whole fractions.',
      hints: H('Add the ratio terms to get the number of parts.', `Each part is total ÷ ${a + b}.`, `One part $= ${k}$.`),
    };
  },
});

const ratioCombine: Generator = gen({
  id: A('ratio.combine'), unit: 'ar.ratios', subtopic: 'Combining ratios', levels: [3, 4],
  skills: ['linking ratios'], concepts: ['Combining ratios', 'Proportions'],
  generate(rng, level) {
    const a = rng.int(1, 7), b = rng.int(2, 7), c = rng.int(2, 7), d = rng.int(1, 9);
    if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return ratioCombine.generate(rng, level);
    // a:b and c:d where b and c both refer to y
    const L = lcm(b, c);
    const x = a * (L / b), y = L, z = d * (L / c);
    const g = gcd(gcd(x, y), z);
    const X = x / g, Y = y / g, Z = z / g;
    const correct = `$${X}:${Z}$`;
    if (level === 4) {
      const total = (X + Y + Z) * rng.int(2, 6);
      return {
        format: 'numeric', stem: `In a club, the ratio of members who play chess to members who play go is $${a}:${b}$, and the ratio of members who play go to members who play bridge is $${c}:${d}$. Each member plays exactly one of the three games. If the club has ${total} members, how many play bridge?`,
        answer: numAns((Z * total) / (X + Y + Z)),
        explanation: [`Match the common term (go): scale to $\\operatorname{lcm}(${b}, ${c}) = ${L}$.`, `chess : go : bridge $= ${X}:${Y}:${Z}$ (simplified).`, `Bridge $= \\dfrac{${Z}}{${X + Y + Z}}\\times ${total} = ${(Z * total) / (X + Y + Z)}$.`],
        trap: 'Combining the ratios without first making the shared term equal.',
        hints: H('The “go” term appears in both ratios.', `Scale both ratios so the go term equals ${L}.`, `chess:go:bridge $= ${X}:${Y}:${Z}$.`),
      };
    }
    return {
      format: 'mcq', stem: `If $x:y = ${a}:${b}$ and $y:z = ${c}:${d}$, what is $x:z$?`,
      ...textMcq(rng, correct, [{ t: `$${a}:${d}$`, note: 'Linked the outer terms without matching y.' }, `$${a * c}:${b * d}$`, `$${Z}:${X}$`, `$${a + c}:${b + d}$`]),
      explanation: [`Make $y$ the same in both: $\\operatorname{lcm}(${b}, ${c}) = ${L}$.`, `$x:y = ${x}:${L}$ and $y:z = ${L}:${z}$, so $x:z = ${x}:${z} = ${X}:${Z}$.`, `Equivalently $\\dfrac{x}{z} = \\dfrac{x}{y}\\cdot\\dfrac{y}{z} = \\dfrac{${a}}{${b}}\\cdot\\dfrac{${c}}{${d}}$.`],
      trap: 'Pairing the first term of one ratio with the last term of the other directly.',
      hints: H('The shared variable must have the same value in both ratios.', 'Multiply x/y by y/z.', `$\\frac{${a}}{${b}}\\times\\frac{${c}}{${d}}$.`),
    };
  },
});

const ratioChange: Generator = gen({
  id: A('ratio.change'), unit: 'ar.ratios', subtopic: 'Proportions', levels: [3, 4, 5],
  skills: ['ratio change equations'], concepts: ['Ratios', 'Proportions'],
  generate(rng, level) {
    let a = rng.int(2, 7), b = rng.int(2, 9);
    while (gcd(a, b) !== 1 || a === b) { a = rng.int(2, 7); b = rng.int(2, 9); }
    const k = rng.int(3, 12), add = rng.int(2, 20);
    const A0 = a * k, B0 = b * k, A1 = A0 + add;
    const g = gcd(A1, B0);
    const c = A1 / g, d = B0 / g;
    if (c > 30 || d > 30 || (c === a && d === b)) return ratioChange.generate(rng, level);
    return {
      format: 'numeric', stem: `The ratio of boys to girls in a class is $${a}:${b}$. After ${add} more boys join the class, the ratio of boys to girls becomes $${c}:${d}$. How many girls are in the class?`,
      answer: numAns(B0),
      explanation: [`Let boys $= ${a}k$ and girls $= ${b}k$.`, `$\\dfrac{${a}k + ${add}}{${b}k} = \\dfrac{${c}}{${d}} \\Rightarrow ${d}(${a}k + ${add}) = ${c}\\cdot${b}k$.`, `$${d * a}k + ${d * add} = ${c * b}k \\Rightarrow k = ${k}$.`, `Girls $= ${b}\\times${k} = ${B0}$.`],
      trap: 'Assuming the total number of parts stays the same after the change.',
      hints: H('Use a multiplier $k$ for the original ratio.', 'Write the new ratio as an equation in $k$.', `$\\frac{${a}k + ${add}}{${b}k} = \\frac{${c}}{${d}}$.`),
      altMethod: `Backsolve: girls must be a multiple of ${b}; test choices until $(\\text{boys} + ${add}) : \\text{girls} = ${c}:${d}$.`,
    };
  },
});

// ===================== Rates & conversions =====================
const unitConvert: Generator = gen({
  id: A('rate.units'), unit: 'ar.rates', subtopic: 'Unit conversions', levels: [2, 3, 4],
  skills: ['dimensional analysis'], concepts: ['Unit conversions', 'Rates'],
  generate(rng, level) {
    if (level === 2) {
      const v = rng.pick([18, 36, 54, 72, 90, 108]);
      return {
        format: 'numeric', stem: `A car travels at ${v} kilometers per hour. What is its speed in meters per second?`, answer: numAns(v / 3.6), unitLabel: 'm/s',
        explanation: [`$${v}\\,\\tfrac{\\text{km}}{\\text{h}} \\times \\dfrac{1000\\text{ m}}{1\\text{ km}} \\times \\dfrac{1\\text{ h}}{3600\\text{ s}} = ${fmt(v / 3.6)}$ m/s.`],
        trap: 'Multiplying by 3.6 instead of dividing.',
        hints: H('Convert km to m and hours to seconds.', '1 km = 1,000 m; 1 h = 3,600 s.', 'Dividing by 3.6 converts km/h to m/s.'),
      };
    }
    if (level === 3) {
      const g = rng.int(3, 12), mins = rng.pick([15, 20, 30, 40, 45]);
      const perHour = g * (60 / mins);
      const hours = rng.pick([2, 3, 4, 5]);
      const ans = perHour * hours * 4; // quarts
      return {
        format: 'numeric', stem: `A pump moves ${g} gallons of water every ${mins} minutes. At this rate, how many quarts does it move in ${hours} hours? (1 gallon = 4 quarts)`, answer: numAns(ans),
        explanation: [`Per hour: $${g}\\times\\dfrac{60}{${mins}} = ${fmt(perHour)}$ gallons.`, `In ${hours} hours: $${fmt(perHour * hours)}$ gallons $= ${fmt(ans)}$ quarts.`],
        trap: 'Forgetting one conversion (minutes → hours or gallons → quarts).',
        hints: H('Write the rate with units and cancel them.', `There are ${60 / mins} intervals of ${mins} minutes in an hour.`, 'Multiply gallons by 4 at the end.'),
      };
    }
    const side = rng.pick([2, 3, 4, 5]);
    return {
      format: 'mcq', stem: `A storage room has a floor area of ${side * side} square yards. What is its floor area in square feet? (1 yard = 3 feet)`,
      ...numMcq(side * side * 9, [{ v: side * side * 3, note: 'Converted with 3 instead of 3² = 9 for square units.' }, side * side * 27, side * side * 6, side * 9]),
      explanation: ['Square units convert with the square of the linear factor: 1 yd² = 9 ft².', `$${side * side}\\times 9 = ${side * side * 9}$ ft².`],
      trap: 'Using the linear conversion factor for area.',
      hints: H('Area units are squared.', '1 square yard = 3 ft × 3 ft.', '1 yd² = 9 ft².'),
    };
  },
});

const machineRate: Generator = gen({
  id: A('rate.machines'), unit: 'ar.rates', subtopic: 'Rates', levels: [2, 3, 4],
  skills: ['proportional rates'], concepts: ['Rates', 'Unit rates', 'Proportions'],
  generate(rng, level) {
    const m = rng.pick([3, 4, 5, 6, 8]), h = rng.pick([2, 3, 4, 5, 6]);
    const unit = rng.int(2, 9);
    const units = m * h * unit;
    const m2 = rng.pick([2, 4, 6, 9, 10, 12].filter((x) => x !== m)), h2 = rng.pick([1, 2, 3, 5, 7, 8]);
    if (level === 4) {
      const target = m2 * h2 * unit * rng.int(1, 3);
      const hoursNeeded = target / (m2 * unit);
      return {
        format: 'numeric', stem: `Working at the same constant rate, ${m} identical machines produce ${units} parts in ${h} hours. How many hours will ${m2} such machines need to produce ${target} parts?`,
        answer: numAns(hoursNeeded), unitLabel: 'hours',
        explanation: [`One machine makes $\\dfrac{${units}}{${m}\\times${h}} = ${unit}$ parts per hour.`, `${m2} machines make $${m2 * unit}$ parts per hour, so they need $${target}/${m2 * unit} = ${fmt(hoursNeeded)}$ hours.`],
        trap: 'Assuming more machines take more time (time is inversely proportional to the number of machines).',
        hints: H('Find the rate of a single machine.', 'Parts = machines × rate × time.', `Single-machine rate: ${unit} parts/hour.`),
      };
    }
    const ans = m2 * h2 * unit;
    return {
      format: 'mcq', stem: `Running at the same constant rate, ${m} identical printers print ${units} pages in ${h} minutes. At this rate, how many pages could ${m2} such printers print in ${h2} minutes?`,
      ...numMcq(ans, [{ v: Math.round((units * m2) / m), note: 'Adjusted for printers but not for time.' }, Math.round((units * h2) / h), units, ans * 2]),
      explanation: [`Per printer per minute: $\\dfrac{${units}}{${m}\\cdot${h}} = ${unit}$ pages.`, `$${m2}\\times${h2}\\times${unit} = ${ans}$ pages.`],
      trap: 'Scaling for only one of the two changes (machines or time).',
      hints: H('Find the output of one printer in one minute.', 'Output scales with both printers and minutes.', `$${units}/(${m}\\cdot ${h})$.`),
    };
  },
});

// ===================== Exponents & roots =====================
const expSimplify: Generator = gen({
  id: A('exp.simplify'), unit: 'ar.exponents', subtopic: 'Powers and exponents', levels: [2, 3, 4],
  skills: ['common bases'], concepts: ['Powers and exponents'],
  generate(rng, level) {
    const base = rng.pick([2, 3]);
    const b2 = base ** 2, b3 = base ** 3;
    const a = rng.int(2, 9), b = rng.int(1, 6), c = rng.int(1, 5);
    const exp = a + 2 * b - 3 * c;
    if (level === 4) {
      const n = rng.int(5, 20), k = rng.pick([2, 3, 4]);
      // base^n + base^n + ... (base times) = base^{n+1}; or (b^{n+k} - b^n)/b^n
      const v = base ** k - 1;
      return {
        format: 'numeric', stem: `What is the value of $\\dfrac{${base}^{${n + k}} - ${base}^{${n}}}{${base}^{${n}}}$?`, answer: numAns(v),
        explanation: [`Factor out $${base}^{${n}}$: $${base}^{${n}}(${base}^{${k}} - 1)$.`, `Dividing by $${base}^{${n}}$ leaves $${base}^{${k}} - 1 = ${v}$.`],
        trap: `Subtracting exponents across a subtraction: $${base}^{${n + k}} - ${base}^{${n}} \\ne ${base}^{${k}}$.`,
        hints: H('Exponent rules work on products, not sums or differences.', 'Factor out the smallest power.', `$${base}^{${n + k}} = ${base}^{${n}}\\cdot ${base}^{${k}}$.`),
      };
    }
    return {
      format: 'numeric', stem: `If $\\dfrac{${base}^{${a}} \\cdot ${b2}^{${b}}}{${b3}^{${c}}} = ${base}^{n}$, what is the value of $n$?`, answer: numAns(exp),
      explanation: [`Rewrite with base ${base}: $${b2}^{${b}} = ${base}^{${2 * b}}$ and $${b3}^{${c}} = ${base}^{${3 * c}}$.`, `$n = ${a} + ${2 * b} - ${3 * c} = ${exp}$.`],
      trap: `Adding exponents of different bases, e.g. treating $${b2}^{${b}}$ as $${base}^{${b}}$.`,
      hints: H('Rewrite everything with the same base.', `$${b2} = ${base}^2$ and $${b3} = ${base}^3$.`, 'Multiply → add exponents; divide → subtract.'),
    };
  },
});

const expCompare: Generator = gen({
  id: A('exp.compare'), unit: 'ar.exponents', subtopic: 'Comparing powers', levels: [3, 4, 5],
  skills: ['comparing powers via common exponents'], concepts: ['Comparing powers', 'Powers and exponents'],
  generate(rng, level) {
    const sets = [
      [[2, 60], [3, 40], [5, 24], [7, 20], [10, 15]],
      [[2, 100], [3, 60], [4, 45], [5, 40], [6, 35]],
      [[2, 36], [3, 24], [5, 15], [6, 13], [11, 10]],
      [[3, 30], [4, 24], [5, 21], [9, 14], [27, 9]],
    ];
    const set = rng.pick(sets);
    const vals = set.map(([b, e]) => e * Math.log(b));
    const greatest = level === 5 ? rng.bool() : true;
    const target = greatest ? Math.max(...vals) : Math.min(...vals);
    const ci = vals.indexOf(target);
    if (new Set(vals.map((v) => v.toFixed(6))).size < 5) return expCompare.generate(rng, level);
    const g = set.reduce((acc, [, e]) => gcd(acc, e), 0);
    return {
      format: 'mcq', stem: `Which of the following is ${greatest ? 'greatest' : 'least'}?`,
      choices: set.map(([b, e]) => `$${b}^{${e}}$`), answer: ci,
      explanation: [
        g > 1 ? `All exponents share the factor ${g}; write each as $(b^{e/${g}})^{${g}}$ and compare the bases: ${set.map(([b, e]) => `$${b}^{${e / g}} = ${tnum(b ** (e / g))}$`).join(', ')}.` : 'Compare via logarithms or by rewriting with shared exponents: larger $e\\cdot\\ln b$ means a larger power.',
        `The ${greatest ? 'greatest' : 'least'} is $${set[ci][0]}^{${set[ci][1]}}$.`,
      ],
      trap: 'Assuming the largest base or the largest exponent automatically gives the largest value.',
      hints: H('Try to rewrite the powers with a common exponent.', `Every exponent here is a multiple of ${g || 1}.`, 'Compare $b^{e/g}$ instead of $b^e$.'),
    };
  },
});

const radicals: Generator = gen({
  id: A('exp.roots'), unit: 'ar.exponents', subtopic: 'Square roots', levels: [1, 2, 3, 4],
  skills: ['simplifying radicals'], concepts: ['Square roots'],
  generate(rng, level) {
    const inner = rng.pick([2, 3, 5, 6, 7]);
    let k1 = rng.int(2, 6), k2 = rng.int(1, 5);
    if (k1 === k2) return radicals.generate(rng, level);
    if (k1 < k2) [k1, k2] = [k2, k1];
    const n1 = k1 * k1 * inner, n2 = k2 * k2 * inner;
    if (level === 1) {
      const sq = rng.int(4, 25) ** 2, sq2 = rng.int(2, 12) ** 2;
      const v = Math.sqrt(sq) - Math.sqrt(sq2);
      return {
        format: 'numeric', stem: `What is $\\sqrt{${sq}} - \\sqrt{${sq2}}$?`, answer: numAns(v),
        explanation: [`$\\sqrt{${sq}} = ${Math.sqrt(sq)}$ and $\\sqrt{${sq2}} = ${Math.sqrt(sq2)}$; difference $${v}$.`],
        trap: `$\\sqrt{a} - \\sqrt{b} \\ne \\sqrt{a - b}$: $\\sqrt{${sq - sq2}}$ is wrong.`,
        hints: H('Evaluate each root separately.', 'These are perfect squares.', `$\\sqrt{${sq}} = ${Math.sqrt(sq)}$.`),
      };
    }
    if (level === 4) {
      // rationalize: a/(sqrt(x)-sqrt(y))
      const x = rng.pick([5, 6, 7, 10, 11]), y = rng.pick([2, 3]);
      const num = x - y;
      return {
        format: 'mcq', stem: `Which of the following is equal to $\\dfrac{${num}}{\\sqrt{${x}} - \\sqrt{${y}}}$?`,
        ...textMcq(rng, `$\\sqrt{${x}} + \\sqrt{${y}}$`, [{ t: `$\\sqrt{${x}} - \\sqrt{${y}}$`, note: 'Forgot that the conjugate flips the sign.' }, `$${num}(\\sqrt{${x}} + \\sqrt{${y}})$`, `$\\sqrt{${x - y}}$`, `$\\dfrac{\\sqrt{${x}} + \\sqrt{${y}}}{${num}}$`]),
        explanation: [`Multiply top and bottom by the conjugate $\\sqrt{${x}} + \\sqrt{${y}}$.`, `Denominator: $(\\sqrt{${x}})^2 - (\\sqrt{${y}})^2 = ${x} - ${y} = ${num}$.`, `Result: $\\dfrac{${num}(\\sqrt{${x}} + \\sqrt{${y}})}{${num}} = \\sqrt{${x}} + \\sqrt{${y}}$.`],
        trap: 'Squaring the denominator alone, which changes the value of the expression.',
        hints: H('Rationalize using the conjugate.', '$(a - b)(a + b) = a^2 - b^2$.', `Multiply by $\\frac{\\sqrt{${x}} + \\sqrt{${y}}}{\\sqrt{${x}} + \\sqrt{${y}}}$.`),
      };
    }
    const op = level === 3 ? rng.pick(['+', '-']) : '+';
    const res = op === '+' ? k1 + k2 : k1 - k2;
    const rtex = (c: number) => (c === 1 ? `\\sqrt{${inner}}` : c === -1 ? `-\\sqrt{${inner}}` : `${c}\\sqrt{${inner}}`);
    return {
      format: 'mcq', stem: `$\\sqrt{${n1}} ${op} \\sqrt{${n2}} =$`,
      ...textMcq(rng, `$${rtex(res)}$`, [{ t: `$\\sqrt{${op === '+' ? n1 + n2 : n1 - n2}}$`, note: 'Combined under one radical — roots do not add that way.' }, `$${rtex(k1 * k2)}$`, `$${rtex(res + 1)}$`, `$${rtex(op === '+' ? res * 2 : k1 + k2)}$`]),
      explanation: [`$\\sqrt{${n1}} = \\sqrt{${k1 * k1}\\cdot${inner}} = ${k1}\\sqrt{${inner}}$ and $\\sqrt{${n2}} = ${sqrtStr(n2)}$.`, `Like radicals combine: $${k1}\\sqrt{${inner}} ${op} ${k2}\\sqrt{${inner}} = ${rtex(res)}$.`],
      trap: '$\\sqrt{a} + \\sqrt{b} \\ne \\sqrt{a + b}$.',
      hints: H('Pull perfect-square factors out of each root.', `Both radicands contain the factor ${inner}.`, `$${n1} = ${k1 * k1}\\times${inner}$.`),
    };
  },
});

const expSum: Generator = gen({
  id: A('exp.sum'), unit: 'ar.exponents', subtopic: 'Powers and exponents', levels: [3, 4, 5],
  skills: ['adding equal powers'], concepts: ['Powers and exponents', 'Recognizing patterns'],
  generate(rng, level) {
    const b = rng.pick([2, 3, 4, 5]);
    const n = rng.int(5, 30);
    const terms = Array(b).fill(`${b}^{${n}}`).join(' + ');
    if (level === 5) {
      // QC: 2^{n} + 2^{n} vs 2^{n+1}? Equal -> make one with 2^{2n}
      return qcNumeric({
        a: `$${terms}$`, b: `$${b}^{${n + 1}}$`, va: 0, vb: 0,
        proof: [`There are ${b} equal terms: $${b}\\cdot ${b}^{${n}} = ${b}^{${n + 1}}$.`],
        expect: 'C',
        trap: `Multiplying the exponent: thinking $${terms}$ equals $${b}^{${b * n}}$.`,
        hints: H('How many identical terms are there?', `Adding $${b}$ copies of $X$ gives $${b}X$.`, `$${b}\\cdot ${b}^{${n}}$.`),
      });
    }
    return {
      format: 'mcq', stem: `$${terms} =$`,
      ...textMcq(rng, `$${b}^{${n + 1}}$`, [{ t: `$${b}^{${b * n}}$`, note: 'Multiplied exponents; equal terms add to a coefficient.' }, { t: `$${b * b}^{${n}}$`, note: 'Multiplied the bases.' }, `$${b}^{${n + b}}$`, `$${b * b}^{${b * n}}$`]),
      explanation: [`There are ${b} copies of $${b}^{${n}}$: $${b}\\cdot${b}^{${n}} = ${b}^{1}\\cdot${b}^{${n}} = ${b}^{${n + 1}}$.`],
      trap: 'Applying exponent rules to a sum.',
      hints: H('Count the identical terms.', `Write the sum as ${b} × $${b}^{${n}}$.`, 'Multiply powers of the same base by adding exponents.'),
    };
  },
});

// ===================== Sequences =====================
const arithSeq: Generator = gen({
  id: A('seq.arith'), unit: 'ar.sequences', subtopic: 'Arithmetic sequences', levels: [2, 3, 4],
  skills: ['nth term', 'series sum'], concepts: ['Arithmetic sequences', 'Number sequences'],
  generate(rng, level) {
    const a1 = rng.int(-10, 20), d = rng.intNot(-6, 9, [0]);
    const n = rng.int(level === 2 ? 10 : 25, level === 2 ? 25 : 60);
    const an = a1 + (n - 1) * d;
    if (level === 2) {
      return {
        format: 'numeric', stem: `In an arithmetic sequence the first term is ${a1} and each term is ${d > 0 ? `${d} more` : `${-d} less`} than the previous term. What is the ${n}th term?`, answer: numAns(an),
        explanation: [`$a_n = a_1 + (n-1)d = ${a1} + (${n - 1})(${d}) = ${an}$.`],
        trap: 'Using $n \\cdot d$ instead of $(n-1)\\cdot d$.',
        hints: H('Each step adds the common difference.', 'From term 1 to term n there are n − 1 steps.', `$a_{${n}} = ${a1} + ${n - 1}\\cdot(${d})$.`),
      };
    }
    if (level === 3) {
      const S = (n * (a1 + an)) / 2;
      return {
        format: 'numeric', stem: `What is the sum of the first ${n} terms of the arithmetic sequence ${a1}, ${a1 + d}, ${a1 + 2 * d}, ${a1 + 3 * d}, …?`, answer: numAns(S),
        explanation: [`Last term: $a_{${n}} = ${a1} + ${n - 1}(${d}) = ${an}$.`, `Sum $= \\dfrac{n(a_1 + a_n)}{2} = \\dfrac{${n}(${a1} + ${an})}{2} = ${S}$.`],
        trap: 'Using the wrong last term (off by one step).',
        hints: H('Sum = number of terms × average term.', 'Average of an arithmetic sequence = (first + last)/2.', `The ${n}th term is ${an}.`),
      };
    }
    // level 4: given two terms find another
    const i = rng.int(3, 8), j = i + rng.int(4, 10), k = j + rng.int(5, 15);
    const ai = a1 + (i - 1) * d, aj = a1 + (j - 1) * d, ak = a1 + (k - 1) * d;
    return {
      format: 'numeric', stem: `In an arithmetic sequence, the ${i}th term is ${ai} and the ${j}th term is ${aj}. What is the ${k}th term?`, answer: numAns(ak),
      explanation: [`From term ${i} to term ${j} is ${j - i} steps: $d = \\dfrac{${aj} - ${ai}}{${j - i}} = ${d}$.`, `From term ${j} to ${k} is ${k - j} steps: $${aj} + ${k - j}(${d}) = ${ak}$.`],
      trap: 'Counting terms instead of steps between terms.',
      hints: H('Find the common difference first.', 'Steps between term i and term j: j − i.', `$d = (${aj} - ${ai})/${j - i}$.`),
    };
  },
});

const consecutive: Generator = gen({
  id: A('seq.consec'), unit: 'ar.sequences', subtopic: 'Consecutive integers', levels: [2, 3, 4, 5],
  skills: ['consecutive integer sums'], concepts: ['Consecutive integers', 'Properties of integers'],
  generate(rng, level) {
    if (level === 5) {
      // QC: sum of k consecutive integers divisible?
      const k = rng.pick([4, 6, 8]);
      return qcOutput({
        given: `$n$ is an integer, and $S$ is the sum of the ${k} consecutive integers $n, n+1, \\dots, n+${k - 1}$.`,
        a: `The remainder when $S$ is divided by ${k}`, b: `$${k / 2}$`,
        vars: [{ name: 'n', kind: 'int' }],
        fA: (v) => ((((k * v.n + (k * (k - 1)) / 2) % k) + k) % k), fB: () => k / 2,
        proof: [`$S = ${k}n + ${(k * (k - 1)) / 2}$.`, `$${k}n$ is divisible by ${k} and $${(k * (k - 1)) / 2} = ${k}\\cdot${(k - 2) / 2} + ${k / 2}$, so the remainder is always ${k / 2}.`],
        expect: 'C',
        trap: 'Assuming the sum of an even number of consecutive integers is divisible by that number.',
        hints: H('Write the sum algebraically.', `$S = ${k}n + (0 + 1 + \\dots + ${k - 1})$.`, `$0 + 1 + \\dots + ${k - 1} = ${(k * (k - 1)) / 2}$.`),
      });
    }
    const k = rng.pick(level === 2 ? [3, 5] : [4, 5, 6, 7]);
    const even = level >= 3 && rng.bool();
    const step = even ? 2 : 1;
    const first = even ? 2 * rng.int(3, 40) : rng.int(5, 80);
    const xs = Array.from({ length: k }, (_, i) => first + i * step);
    const S = xs.reduce((a, b) => a + b, 0);
    return {
      format: 'numeric', stem: `The sum of ${k} consecutive ${even ? 'even ' : ''}integers is ${S}. What is the largest of these integers?`, answer: numAns(xs[k - 1]),
      explanation: [`The average is $${S}/${k} = ${fmt(S / k)}$, which is the middle value.`, `The integers are ${xs.join(', ')}; the largest is ${xs[k - 1]}.`],
      trap: 'Forgetting consecutive even integers differ by 2.',
      hints: H('Average of evenly spaced numbers = middle value.', `Divide the sum by ${k}.`, `The average is ${fmt(S / k)}.`),
    };
  },
});

const recursiveSeq: Generator = gen({
  id: A('seq.recursive'), unit: 'ar.sequences', subtopic: 'Recursive sequences', levels: [3, 4, 5],
  skills: ['recursive definitions', 'pattern finding'], concepts: ['Recursive sequences', 'Recognizing patterns'],
  generate(rng, level) {
    if (level === 5) {
      // periodic sequence a_n = a_{n-1} - a_{n-2}
      const a = rng.int(2, 9), b = rng.int(-5, 12);
      const seq = [a, b]; while (seq.length < 12) seq.push(seq[seq.length - 1] - seq[seq.length - 2]);
      const N = rng.int(40, 120);
      const s = seq.slice(0, 6).reduce((x, y) => x + y, 0);
      const full = Math.floor(N / 6), rem = N % 6;
      const total = full * s + seq.slice(0, rem).reduce((x, y) => x + y, 0);
      return {
        format: 'numeric', stem: `A sequence is defined by $a_1 = ${a}$, $a_2 = ${b}$, and $a_n = a_{n-1} - a_{n-2}$ for $n \\ge 3$. What is the sum of the first ${N} terms?`, answer: numAns(total),
        explanation: [`Write out terms: ${seq.slice(0, 8).join(', ')}, … — the sequence repeats every 6 terms.`, `The sum of each block of 6 is ${s}.`, `${N} = 6·${full} + ${rem}, so the sum is $${full}\\cdot${s} + (${seq.slice(0, rem).join(' + ') || '0'}) = ${total}$.`],
        trap: 'Trying to compute all terms instead of spotting the cycle.',
        hints: H('Write out the first 8 terms.', 'Look for a repeating block.', 'The period is 6.'),
      };
    }
    const m = rng.pick([2, 3]), c = rng.intNot(-4, 5, [0]);
    const a1 = rng.int(1, 5);
    const n = level === 3 ? 5 : 6;
    const seq = [a1]; for (let i = 1; i < n; i++) seq.push(m * seq[i - 1] + c);
    return {
      format: 'numeric', stem: `A sequence is defined by $a_1 = ${a1}$ and $a_n = ${m}a_{n-1} ${c < 0 ? '-' : '+'} ${Math.abs(c)}$ for $n > 1$. What is $a_{${n}}$?`, answer: numAns(seq[n - 1]),
      explanation: [`Compute term by term: ${seq.map((v, i) => `$a_${i + 1} = ${v}$`).join(', ')}.`],
      trap: `Applying the rule ${n} times instead of ${n - 1} times.`,
      hints: H('Apply the rule one step at a time.', `$a_2 = ${m}(${a1}) ${c < 0 ? '-' : '+'} ${Math.abs(c)}$.`, `$a_2 = ${seq[1]}$, $a_3 = ${seq[2]}$.`),
    };
  },
});

// ===================== Estimation =====================
const estimation: Generator = gen({
  id: A('est.closest'), unit: 'ar.estimation', subtopic: 'Estimation and approximation', levels: [2, 3, 4],
  skills: ['rounding strategically'], concepts: ['Estimation and approximation', 'Benchmark fractions'],
  generate(rng, level) {
    const x = rng.pick([49.7, 50.3, 19.8, 20.2, 99.6, 0.98, 1.02, 3.97, 4.03, 24.9, 25.1]);
    const y = rng.pick([0.0498, 0.0502, 0.199, 0.201, 0.251, 0.249, 7.98, 8.02, 1.99, 2.01]);
    const z = rng.pick([0.333, 0.334, 0.497, 0.502, 1.98, 2.02, 0.249, 0.251]);
    const val = (x * y) / z;
    const nice = (v: number) => {
      const mag = 10 ** Math.floor(Math.log10(Math.abs(v)));
      return Math.round(v / mag) * mag;
    };
    const ans = nice(val);
    const pos = rng.int(0, 4);
    const ch = [0, 1, 2, 3, 4].map((i) => round(ans * 10 ** (i - pos), 8));
    return {
      format: 'mcq', stem: `Which of the following is closest to $\\dfrac{${x} \\times ${y}}{${z}}$?`,
      choices: ch.map((v) => `$${tnum(v, 8)}$`), answer: pos,
      explanation: [`Round to friendly values: $${x} \\approx ${nice(x)}$, $${y} \\approx ${nice(y)}$, $${z} \\approx ${nice(z)}$.`, `$\\dfrac{${nice(x)} \\times ${nice(y)}}{${nice(z)}} \\approx ${tnum(round((nice(x) * nice(y)) / nice(z), 6), 6)}$; the exact value is about $${val.toPrecision(4)}$.`, 'The answer choices differ by factors of 10, so a rough estimate is enough — do not calculate exactly.'],
      trap: 'Misplacing the decimal point when dividing by a decimal.',
      hints: H('The choices differ by powers of 10 — estimate.', 'Round each number to one significant figure.', 'Dividing by a number less than 1 makes the result larger.'),
    };
  },
});

const sqrtEstimate: Generator = gen({
  id: A('est.sqrt'), unit: 'ar.estimation', subtopic: 'Rounding', levels: [2, 3, 4],
  skills: ['root estimation'], concepts: ['Estimation and approximation', 'Square roots'],
  generate(rng, level) {
    if (level === 4) {
      const a = rng.int(20, 90), b = rng.int(20, 90);
      if (Math.sqrt(a) % 1 === 0 || Math.sqrt(b) % 1 === 0) return sqrtEstimate.generate(rng, level);
      const s = Math.sqrt(a) + Math.sqrt(b);
      const lo = Math.floor(s);
      const pos = rng.int(0, 4);
      const opts = [0, 1, 2, 3, 4].map((i) => lo - pos + i).map((k) => ({ t: `between $${k}$ and $${k + 1}$`, c: k === lo }));
      return {
        format: 'mcq', stem: `The value of $\\sqrt{${a}} + \\sqrt{${b}}$ is`,
        choices: opts.map((o) => o.t), answer: pos,
        explanation: [`$${Math.floor(Math.sqrt(a))}^2 = ${Math.floor(Math.sqrt(a)) ** 2} < ${a} < ${Math.ceil(Math.sqrt(a)) ** 2}$, so $\\sqrt{${a}} \\approx ${Math.sqrt(a).toFixed(2)}$.`, `Similarly $\\sqrt{${b}} \\approx ${Math.sqrt(b).toFixed(2)}$.`, `Sum $\\approx ${s.toFixed(2)}$, between ${lo} and ${lo + 1}.`],
        trap: `Adding under the root: $\\sqrt{${a + b}} \\approx ${Math.sqrt(a + b).toFixed(1)}$ is much smaller.`,
        hints: H('Bracket each root between consecutive integers.', 'Refine with how close each radicand is to a perfect square.', `$\\sqrt{${a}}$ is between ${Math.floor(Math.sqrt(a))} and ${Math.ceil(Math.sqrt(a))}.`),
      };
    }
    const n = rng.int(level === 2 ? 20 : 150, level === 2 ? 140 : 900);
    if (Number.isInteger(Math.sqrt(n))) return sqrtEstimate.generate(rng, level);
    const lo = Math.floor(Math.sqrt(n));
    return {
      format: 'mcq', stem: `$\\sqrt{${n}}$ is between which two consecutive integers?`,
      ...(() => { const pos = rng.int(0, Math.min(4, lo - 1)); return { choices: [0, 1, 2, 3, 4].map((i) => lo - pos + i).map((k) => `$${k}$ and $${k + 1}$`), answer: pos }; })(),
      explanation: [`$${lo}^2 = ${lo * lo}$ and $${lo + 1}^2 = ${(lo + 1) ** 2}$; since $${lo * lo} < ${n} < ${(lo + 1) ** 2}$, $\\sqrt{${n}}$ is between ${lo} and ${lo + 1}.`],
      trap: 'Dividing by 2 instead of finding nearby perfect squares.',
      hints: H('Find the nearest perfect squares.', `Which squares surround ${n}?`, `$${lo}^2 = ${lo * lo}$.`),
    };
  },
});

// =============== Arithmetic QC (numeric, no variables) ===============
const arithQc: Generator = gen({
  id: A('qc.numeric'), unit: 'ar.fractions', subtopic: 'Comparing quantities', levels: [2, 3, 4, 5],
  skills: ['comparing without full computation'], concepts: ['Fractions', 'Percentages', 'Powers and exponents'],
  generate(rng, level) {
    const T = [
      () => { const p = rng.int(11, 39), x = rng.int(2, 9) * 50; return { a: `${p}% of ${x}`, b: `${x}% of ${p}`, va: (p * x) / 100, vb: (x * p) / 100, proof: [`$\\tfrac{${p}}{100}\\cdot${x} = \\tfrac{${x}}{100}\\cdot ${p}$ — multiplication is commutative.`], lv: 2 }; },
      () => { const n = rng.int(12, 30); return { a: `$2^{${n}} + 2^{${n}}$`, b: `$2^{${n + 1}}$`, va: 2, vb: 2, proof: [`$2^{${n}} + 2^{${n}} = 2 \\cdot 2^{${n}} = 2^{${n + 1}}$.`], lv: 3 }; },
      () => { const a = rng.int(21, 49), b = rng.int(51, 99); return { a: `$\\dfrac{${a}}{${a + 1}}$`, b: `$\\dfrac{${b}}{${b + 1}}$`, va: a / (a + 1), vb: b / (b + 1), proof: [`$\\dfrac{n}{n+1} = 1 - \\dfrac{1}{n+1}$, which increases with $n$.`], lv: 3 }; },
      () => { const n = rng.int(3, 9); return { a: `$(0.${n})^{2}$`, b: `$\\sqrt{0.${n}}$`, va: (n / 10) ** 2, vb: Math.sqrt(n / 10), proof: [`For $0 < x < 1$: $x^2 < x < \\sqrt{x}$.`], lv: 3 }; },
      () => { const k = rng.int(6, 15); return { a: `$${k}^{10} \\cdot ${k}^{5}$`, b: `$(${k}^{5})^{3}$`, va: 15, vb: 15, proof: [`$${k}^{10}\\cdot${k}^{5} = ${k}^{15}$ and $(${k}^5)^3 = ${k}^{15}$.`], lv: 2 }; },
      () => { const p = rng.pick([20, 25, 40, 50]); return { a: `The result of increasing 80 by ${p}% and then decreasing the result by ${p}%`, b: '80', va: 80 * (1 + p / 100) * (1 - p / 100), vb: 80, proof: [`$80(1 + ${p / 100})(1 - ${p / 100}) = 80(1 - ${(p / 100) ** 2}) < 80$.`], lv: 4 }; },
      () => { const a = rng.int(101, 199), b = rng.int(201, 299); return { a: `$\\dfrac{1}{${a}} + \\dfrac{1}{${b}}$`, b: `$\\dfrac{2}{${Math.round((a + b) / 2)}}$`, va: 1 / a + 1 / b, vb: 2 / Math.round((a + b) / 2), proof: ['Because $1/x$ is convex, the average of $1/a$ and $1/b$ exceeds $1/$(average): compute both to check.', `Quantity A $\\approx ${(1 / a + 1 / b).toFixed(6)}$, Quantity B $\\approx ${(2 / Math.round((a + b) / 2)).toFixed(6)}$.`], lv: 5 }; },
      () => { const n = rng.int(25, 60); return { a: `$${n - 1}\\times${n + 1}$`, b: `$${n}^2$`, va: (n - 1) * (n + 1), vb: n * n, proof: [`$(${n} - 1)(${n} + 1) = ${n}^2 - 1$.`], lv: 3 }; },
      () => { const x = rng.pick([3, 5, 7]); return { a: `$\\sqrt{${x * x * 2}}$`, b: `$${x}\\sqrt{2}$`, va: Math.sqrt(x * x * 2), vb: x * Math.sqrt(2), proof: [`$\\sqrt{${2 * x * x}} = \\sqrt{${x * x}}\\sqrt{2} = ${x}\\sqrt{2}$.`], lv: 2 }; },
      () => { const n = rng.int(30, 80); return { a: `The number of multiples of 3 from 1 to ${3 * n} inclusive`, b: `The number of multiples of 4 from 1 to ${4 * n + 3} inclusive`, va: n, vb: n, proof: [`Multiples of 3 up to ${3 * n}: ${n}. Multiples of 4 up to ${4 * n + 3}: $\\lfloor ${4 * n + 3}/4\\rfloor = ${n}$.`], lv: 4 }; },
    ];
    const items = T.map((f) => f()).filter((t) => Math.abs(t.lv - level) <= 1);
    const t = rng.pick(items);
    return qcNumeric({ a: t.a, b: t.b, va: t.va, vb: t.vb, proof: t.proof, trap: 'Computing everything exactly instead of comparing structure — or assuming two forms are different just because they look different.', hints: H('Simplify each quantity before computing.', 'Look for an identity or property linking the two quantities.', 'Rewrite both quantities in the same form.') });
  },
});

export const ARITHMETIC: Generator[] = [parity, orderOps, countIntegers, signQc, primeCount, primeFactor, factorialPower, gcdLcm, divisibility, remainders, unitsDigit, absValue, fracOps, fracCompare, fracRemaining, repeatingDecimal, pctChange, pctSuccessive, pctReverse, ratioParts, ratioCombine, ratioChange, unitConvert, machineRate, expSimplify, expCompare, radicals, expSum, arithSeq, consecutive, recursiveSeq, estimation, sqrtEstimate, arithQc];
void simplifySqrt; void isPrime; void factorize;
export type { Level };
