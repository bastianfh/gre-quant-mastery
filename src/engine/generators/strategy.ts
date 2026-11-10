import { Frac, fmt, gcd, lcm, nCr, round, tnum } from '../../lib/math';
import type { Generator } from '../types';
import { H, fracAns, gen, multiSel, numAns, numMcq, textMcq } from './helpers';
import { qcNumeric, qcOutput, type Vals } from './qc';

const S = (id: string) => `st.${id}`;

// ===================== QC case testing =====================
const qcCases: Generator = gen({
  id: S('qc.cases'), unit: 'st.qc', subtopic: 'Testing positive and negative values', levels: [3, 4, 5],
  skills: ['systematic case testing (ZONEF: zero, one, negative, extremes, fractions)'], concepts: ['Testing positive and negative values', 'Testing zero', 'Testing fractions', 'Testing boundary cases'],
  generate(rng, level) {
    const k = rng.int(2, 5);
    type T = { lv: number; given?: string; a: string; b: string; v: string[]; int?: boolean; c?: (v: Vals) => boolean; fA: (v: Vals) => number; fB: (v: Vals) => number; proof?: string[]; extra?: Vals[] };
    const T: T[] = [
      { lv: 3, a: '$x^2$', b: '$x$', v: ['x'], fA: (v) => v.x ** 2, fB: (v) => v.x },
      { lv: 3, given: '$x > 1$', a: '$x^2$', b: '$x$', v: ['x'], c: (v) => v.x > 1, fA: (v) => v.x ** 2, fB: (v) => v.x, proof: ['For $x > 1$, multiplying $x > 1$ by the positive number $x$ gives $x^2 > x$.'] },
      { lv: 4, given: '$x$ is an integer.', a: '$x^2$', b: '$x$', v: ['x'], int: true, fA: (v) => v.x ** 2, fB: (v) => v.x },
      { lv: 4, given: '$x \\ne 0$', a: '$x^3$', b: '$x^2$', v: ['x'], c: (v) => v.x !== 0, fA: (v) => v.x ** 3, fB: (v) => v.x ** 2 },
      { lv: 4, given: '$-1 < x < 0$', a: '$x^3$', b: '$x$', v: ['x'], c: (v) => v.x > -1 && v.x < 0, fA: (v) => v.x ** 3, fB: (v) => v.x, proof: ['For $-1 < x < 0$, $|x^3| < |x|$, and both are negative, so $x^3$ is closer to 0, hence greater.'] },
      { lv: 3, given: `$x > 0$`, a: `$\\dfrac{x}{${k}}$`, b: `$\\dfrac{${k}}{x}$`, v: ['x'], c: (v) => v.x > 0, fA: (v) => v.x / k, fB: (v) => k / v.x, extra: [{ x: k }] },
      { lv: 5, given: '$x < y < 0$', a: '$xy$', b: '$y^2$', v: ['x', 'y'], c: (v) => v.x < v.y && v.y < 0, fA: (v) => v.x * v.y, fB: (v) => v.y * v.y, proof: ['$xy - y^2 = y(x - y)$. Here $y < 0$ and $x - y < 0$, so the product is positive.'] },
      { lv: 5, given: '$0 < x < y$', a: '$\\dfrac{x + 1}{y + 1}$', b: '$\\dfrac{x}{y}$', v: ['x', 'y'], c: (v) => v.x > 0 && v.x < v.y, fA: (v) => (v.x + 1) / (v.y + 1), fB: (v) => v.x / v.y, proof: ['Cross-multiply (both denominators positive): compare $y(x + 1) = xy + y$ with $x(y + 1) = xy + x$.', 'Since $y > x$, Quantity A is greater.'] },
      { lv: 4, given: `$n$ is a positive integer.`, a: '$n^2$', b: '$2n$', v: ['n'], int: true, c: (v) => v.n > 0, fA: (v) => v.n ** 2, fB: (v) => 2 * v.n },
      { lv: 5, given: `$n$ is a positive integer.`, a: '$2^n$', b: '$n^2$', v: ['n'], int: true, c: (v) => v.n > 0, fA: (v) => 2 ** v.n, fB: (v) => v.n ** 2 },
      { lv: 4, given: '$|x| > |y|$', a: '$x$', b: '$y$', v: ['x', 'y'], c: (v) => Math.abs(v.x) > Math.abs(v.y), fA: (v) => v.x, fB: (v) => v.y },
      { lv: 5, given: '$x + y = 10$ and $x > 0$, $y > 0$', a: '$xy$', b: '$25$', v: ['x'], c: (v) => v.x > 0 && v.x < 10, fA: (v) => v.x * (10 - v.x), fB: () => 25, extra: [{ x: 5 }] },
      { lv: 3, given: '$p$ and $q$ are positive and $p^2 = q^2$', a: '$p$', b: '$q$', v: ['p', 'q'], c: (v) => v.p > 0 && v.q > 0 && Math.abs(v.p * v.p - v.q * v.q) < 1e-12, fA: (v) => v.p, fB: (v) => v.q, proof: ['$p^2 = q^2$ means $p = \\pm q$; with both positive, $p = q$.'] },
      { lv: 4, given: '$p^2 = q^2$', a: '$p$', b: '$q$', v: ['p', 'q'], c: (v) => Math.abs(v.p * v.p - v.q * v.q) < 1e-12, fA: (v) => v.p, fB: (v) => v.q },
    ];
    const t = rng.pick(T.filter((x) => Math.abs(x.lv - level) <= (level === 5 ? 1 : 0) || x.lv === level));
    return qcOutput({
      given: t.given, a: t.a, b: t.b, vars: t.v.map((n) => ({ name: n, kind: t.int ? 'int' : 'real' })), constraint: t.c, fA: t.fA, fB: t.fB, proof: t.proof, extra: t.extra,
      intro: 'Test a full range of allowed values — zero, one, negatives, fractions, and large numbers (remember **ZONEF**) — not just a convenient positive integer.',
      trap: 'Plugging in a single “nice” number such as 2 and concluding a relationship holds for all values.',
      hints: H('List the kinds of numbers the conditions allow.', 'Test 0, 1, a negative, a fraction between 0 and 1, and a large number (when allowed).', 'If two allowed values give different results, stop: the answer is (D).'),
    });
  },
});

const qcConstraint: Generator = gen({
  id: S('qc.hidden'), unit: 'st.qc', subtopic: 'Identifying hidden constraints', levels: [3, 4, 5],
  skills: ['spotting implicit restrictions'], concepts: ['Identifying hidden constraints', 'Testing boundary cases'],
  generate(rng, level) {
    const m = rng.int(3, 9);
    type T = { lv: number; given: string; a: string; b: string; v: string[]; int?: boolean; c: (v: Vals) => boolean; fA: (v: Vals) => number; fB: (v: Vals) => number; proof?: string[]; intro: string; extra?: Vals[] };
    const T: T[] = [
      { lv: 3, given: `A box contains red and blue marbles only. The number of red marbles is $r$, and there are ${m} more blue marbles than red marbles.`, a: 'The number of blue marbles', b: `$${m}$`, v: ['r'], int: true, c: (v) => v.r >= 0, fA: (v) => v.r + m, fB: () => m, intro: 'Hidden constraint: counts are non-negative integers — and $r$ could be 0.', extra: [{ r: 0 }] },
      { lv: 4, given: `In a class, the ratio of boys to girls is 3 to 4.`, a: 'The number of students in the class', b: '$14$', v: ['k'], int: true, c: (v) => v.k >= 1, fA: (v) => 7 * v.k, fB: () => 14, intro: 'Hidden constraint: the class size must be a multiple of 7 (3 + 4 parts), but any multiple works.' },
      { lv: 4, given: `$x$ is the length of a side of a triangle whose other two sides have lengths ${m} and ${m + 4}.`, a: '$x$', b: '$4$', v: ['x'], c: (v) => v.x > 4 && v.x < 2 * m + 4, fA: (v) => v.x, fB: () => 4, intro: `Hidden constraint: the triangle inequality forces $4 < x < ${2 * m + 4}$.`, proof: [`$x > (${m} + 4) - ${m} = 4$.`] },
      { lv: 5, given: `$x$ and $y$ are positive integers, and $x + y = ${m + 2}$.`, a: '$xy$', b: `$${m + 1}$`, v: ['x'], int: true, c: (v) => v.x >= 1 && v.x <= m + 1, fA: (v) => v.x * (m + 2 - v.x), fB: () => m + 1, intro: `Hidden constraint: both $x$ and $y$ are at least 1, so the smallest product is $1\\cdot${m + 1}$.`, extra: [{ x: 1 }, { x: 2 }] },
      { lv: 5, given: `$\\sqrt{x} = -x$`, a: '$x$', b: '$0$', v: ['x'], c: (v) => v.x >= 0 && Math.abs(Math.sqrt(v.x) + v.x) < 1e-12, fA: (v) => v.x, fB: () => 0, intro: 'Hidden constraint: $\\sqrt{x} \\ge 0$, so $-x \\ge 0$, i.e. $x \\le 0$; combined with $x \\ge 0$ (domain), $x = 0$.', proof: ['The only solution is $x = 0$.'] },
      { lv: 3, given: `The average of $a$, $b$, and ${m} is ${m}.`, a: '$a + b$', b: `$${2 * m}$`, v: ['a'], c: () => true, fA: () => 2 * m, fB: () => 2 * m, intro: `Total $= 3\\cdot${m}$, so $a + b = ${3 * m} - ${m} = ${2 * m}$ regardless of the individual values.`, proof: [`$a + b + ${m} = ${3 * m}$.`] },
    ];
    const t = rng.pick(T.filter((x) => x.lv === level || (level === 5 && x.lv >= 4)));
    return qcOutput({ given: t.given, a: t.a, b: t.b, vars: t.v.map((n) => ({ name: n, kind: t.int ? 'int' : 'real' })), constraint: t.c, fA: t.fA, fB: t.fB, proof: t.proof, intro: t.intro, extra: t.extra, trap: 'Ignoring constraints implied by the context (counts are whole numbers, lengths are positive, square roots are non-negative).', hints: H('What does the real-world context force to be true?', 'Write the constraint explicitly before testing values.', 'Test the boundary values the constraint allows.') });
  },
});

const qcSimplify: Generator = gen({
  id: S('qc.simplify'), unit: 'st.qc', subtopic: 'Simplifying both quantities', levels: [2, 3, 4],
  skills: ['treating QC like an inequality'], concepts: ['Simplifying both quantities', 'Avoiding unnecessary calculations'],
  generate(rng, level) {
    const a = rng.int(11, 40), b = rng.int(11, 40), c = rng.int(2, 9);
    if (level === 2) return qcNumeric({ a: `$${a} \\times ${b} + ${a} \\times ${c}$`, b: `$${a} \\times ${b + c}$`, va: a * (b + c), vb: a * (b + c), proof: [`Factor Quantity A: $${a}(${b} + ${c}) = ${a}\\times${b + c}$.`], trap: 'Multiplying everything out instead of factoring.', hints: H('Look for a common factor.', 'Factor Quantity A.', `$${a}(${b} + ${c})$.`) });
    if (level === 3) {
      const x = rng.int(101, 999), y = rng.int(2, 9);
      return qcNumeric({ a: `$\\dfrac{${x}}{${x + y}}$`, b: `$\\dfrac{${x - y}}{${x}}$`, va: x / (x + y), vb: (x - y) / x, proof: [`Compare $1 - \\dfrac{${y}}{${x + y}}$ with $1 - \\dfrac{${y}}{${x}}$.`, `Since $\\dfrac{${y}}{${x + y}} < \\dfrac{${y}}{${x}}$, Quantity A is greater.`], trap: 'Doing long division on both fractions.', hints: H('Rewrite each fraction as 1 minus something.', 'Compare the subtracted pieces.', 'A smaller piece removed means a larger result.') });
    }
    return qcOutput({ given: `$y > 0$`, a: `$(x + ${c})^2$`, b: `$x^2 + ${c * c} + ${2 * c}xy^0$`.replace('xy^0', 'x'), vars: [{ name: 'x', kind: 'real' }, { name: 'y', kind: 'real' }], constraint: (v) => v.y > 0, fA: (v) => (v.x + c) ** 2, fB: (v) => v.x ** 2 + c * c + 2 * c * v.x, proof: [`Expand: $(x + ${c})^2 = x^2 + ${2 * c}x + ${c * c}$, identical to Quantity B. The condition on $y$ is irrelevant.`], trap: 'Being distracted by irrelevant information (the condition on y).', hints: H('Expand Quantity A.', '$(a + b)^2 = a^2 + 2ab + b^2$.', 'Does the given condition matter?') });
  },
});

// ===================== Plugging in, backsolving, smart numbers =====================
const pluginVars: Generator = gen({
  id: S('plugin.vars'), unit: 'st.plugin', subtopic: 'Plugging in numbers', levels: [3, 4, 5],
  skills: ['plugging in for variable answer choices'], concepts: ['Plugging in numbers', 'Choosing convenient numbers'],
  generate(rng, level) {
    const forms = [
      { lv: 3, stem: 'A car travels $m$ miles in $h$ hours. At this rate, how many miles will it travel in $t$ minutes?', ans: '\\dfrac{mt}{60h}', ds: [{ t: '\\dfrac{60mt}{h}', note: 'Converted minutes to hours in the wrong direction.' }, '\\dfrac{mh}{60t}', '\\dfrac{mt}{h}', '\\dfrac{60h}{mt}'], plug: 'Try $m = 120$, $h = 2$, $t = 30$: the car goes 60 mph, so in 30 minutes it travels 30 miles. Only $\\dfrac{mt}{60h} = \\dfrac{120\\cdot30}{120} = 30$ matches.' },
      { lv: 4, stem: 'If $p$ pencils cost $c$ cents, how many dollars do $n$ pencils cost?', ans: '\\dfrac{nc}{100p}', ds: [{ t: '\\dfrac{100nc}{p}', note: 'Multiplied by 100 instead of dividing when converting cents to dollars.' }, '\\dfrac{np}{100c}', '\\dfrac{nc}{p}', '\\dfrac{100p}{nc}'], plug: 'Try $p = 2$, $c = 50$, $n = 4$: each pencil costs 25 cents, so 4 pencils cost \\$1. Only $\\dfrac{nc}{100p} = \\dfrac{200}{200} = 1$ matches.' },
      { lv: 4, stem: 'The price of an item is $x$ dollars. After a discount of $d$ percent and then a sales tax of $t$ percent on the discounted price, what is the final price?', ans: 'x\\left(1 - \\dfrac{d}{100}\\right)\\left(1 + \\dfrac{t}{100}\\right)', ds: [{ t: 'x\\left(1 - \\dfrac{d - t}{100}\\right)', note: 'Combined the percents additively.' }, 'x(1 - d)(1 + t)', 'x - d + t', 'x\\left(1 + \\dfrac{d}{100}\\right)\\left(1 - \\dfrac{t}{100}\\right)'], plug: 'Try $x = 100$, $d = 10$, $t = 10$: price → 90 → 99. Only the first expression gives 99.' },
      { lv: 5, stem: 'A tank is $\\tfrac{1}{k}$ full. After $g$ gallons are added, it is $\\tfrac{1}{2}$ full. In terms of $k$ and $g$, what is the capacity of the tank, in gallons? (Assume $k > 2$.)', ans: '\\dfrac{2gk}{k - 2}', ds: [{ t: '\\dfrac{2g}{k - 2}', note: 'Dropped a factor of k when solving.' }, '\\dfrac{gk}{k - 2}', '\\dfrac{2gk}{k + 2}', '2g(k - 2)'], plug: 'Try $k = 4$, capacity 40: the tank goes from 10 to 20 gallons, so $g = 10$. Check: $\\dfrac{2\\cdot10\\cdot4}{2} = 40$ ✓.' },
      { lv: 3, stem: 'If $x$ is $y$ percent of $z$, then $z$ equals', ans: '\\dfrac{100x}{y}', ds: [{ t: '\\dfrac{xy}{100}', note: 'Solved for x instead of z.' }, '\\dfrac{100y}{x}', '\\dfrac{x}{100y}', '\\dfrac{y}{100x}'], plug: 'Try $z = 200$, $y = 50$: then $x = 100$, and $\\dfrac{100\\cdot100}{50} = 200$ ✓.' },
    ];
    const f = rng.pick(forms.filter((x) => x.lv === level || (level === 5 && x.lv === 4)));
    return {
      format: 'mcq', stem: f.stem,
      ...textMcq(rng, `$${f.ans}$`, f.ds.map((d) => (typeof d === 'string' ? `$${d}$` : { t: `$${d.t}$`, note: d.note }))),
      explanation: ['**Plug in** easy numbers for the variables, compute the target value directly, then test each choice.', f.plug, 'Always test every choice — if two match, pick new numbers.'],
      altMethod: 'Set up the algebra directly with units, cancelling as you go.',
      trap: 'Picking numbers that make several choices equal (avoid 0, 1, and repeated values).',
      hints: H('The answer choices contain variables — that is a signal to plug in.', 'Choose simple, distinct numbers (not 0 or 1) that keep arithmetic clean.', 'Compute the target with your numbers, then evaluate each choice.'),
    };
  },
});

const backsolve: Generator = gen({
  id: S('plugin.backsolve'), unit: 'st.plugin', subtopic: 'Backsolving', levels: [2, 3, 4],
  skills: ['testing answer choices'], concepts: ['Backsolving', 'Using the answer choices strategically', 'Working backward'],
  generate(rng, level) {
    if (level === 2) {
      const n = rng.int(5, 30), a = rng.int(2, 5), b = rng.int(3, 20);
      const rhs = a * n - b;
      return { format: 'mcq', stem: `When ${b} is subtracted from ${a} times a number, the result is ${rhs}. What is the number?`, ...numMcq(n, [n - 2, n + 3, n + 1, n - 1, Math.round((rhs + b) / (a + 1))]), explanation: ['**Backsolve:** start with the middle choice and test it in the condition.', `For ${n}: $${a}\\cdot${n} - ${b} = ${rhs}$ ✓.`, 'If the middle choice gives a result that is too large, move to smaller choices (choices are in ascending order).'], trap: 'Adding instead of subtracting when undoing the steps.', hints: H('Try the answer choices in the equation.', 'Start with the middle value.', `Check $${a}x - ${b} = ${rhs}$.`) };
    }
    const nu = rng.int(2, 7), de = rng.int(nu + 2, nu + 9);
    if (gcd(nu, de) !== 1) return backsolve.generate(rng, level);
    const x = rng.int(2, 15);
    const r = new Frac(nu + x, de + x);
    if (level === 3) return { format: 'mcq', stem: `The same number is added to both the numerator and the denominator of $\\dfrac{${nu}}{${de}}$, and the resulting fraction equals $${r.tex()}$. What is the number?`, ...numMcq(x, [x - 1, x + 1, x + 2, x - 2, x * 2].filter((v) => v > 0)), explanation: [`Test ${x}: $\\dfrac{${nu} + ${x}}{${de} + ${x}} = \\dfrac{${nu + x}}{${de + x}} = ${r.tex()}$ ✓.`, `Algebra check: $${r.d}(${nu} + x) = ${r.n}(${de} + x)$ gives $x = ${x}$.`], trap: 'Adding the number only to the numerator.', hints: H('Test the choices.', 'Reduce each resulting fraction.', 'Start with the middle choice.') };
    // level 4: age/ratio puzzle with backsolving
    const s = rng.int(4, 12), mult = rng.pick([3, 4]), yrs = rng.int(2, 8);
    const f = mult * s;
    const r2 = new Frac(f + yrs, s + yrs);
    return { format: 'mcq', stem: `A father is ${mult} times as old as his son. In ${yrs} years, the ratio of the father's age to the son's age will be $${r2.n}:${r2.d}$. How old is the son now?`, ...numMcq(s, [s - 2, s + 2, s + 1, s + 4, s - 1].filter((v) => v > 0)), explanation: [`Test ${s}: father ${f}; in ${yrs} years: ${f + yrs} and ${s + yrs}, ratio $${f + yrs}:${s + yrs} = ${r2.n}:${r2.d}$ ✓.`, 'Backsolving avoids setting up and solving a rational equation.'], trap: 'Forgetting to add the years to both ages.', hints: H('Test each choice for the son’s age.', 'Compute both ages in the future.', 'Reduce the ratio and compare.') };
  },
});

const smartNumbers: Generator = gen({
  id: S('plugin.smart'), unit: 'st.plugin', subtopic: 'Choosing convenient numbers', levels: [3, 4, 5],
  skills: ['picking a convenient total'], concepts: ['Choosing convenient numbers', 'Fractions', 'Percentages'],
  generate(rng, level) {
    if (level === 5) {
      const p = rng.pick([20, 25, 40, 50]), q = rng.pick([10, 20, 25]);
      // length up p%, width down q%: area change
      const ch = round(((1 + p / 100) * (1 - q / 100) - 1) * 100, 4);
      return { format: 'mcq', stem: `The length of a rectangle is increased by ${p}% and its width is decreased by ${q}%. By what percent does the area change?`, ...numMcq(ch, [{ v: p - q, note: 'Added the percents.' }, round(p * q / 100, 4), -ch, ch + 10], { render: (v) => (Math.abs(v) < 1e-9 ? 'No change' : `${v > 0 ? 'Increase' : 'Decrease'} of $${fmt(Math.abs(v))}\\%$`) }), explanation: ['**Smart numbers:** let the length and width both be 10 (area 100).', `New dimensions: ${fmt(10 * (1 + p / 100))} and ${fmt(10 * (1 - q / 100))}; new area $= ${fmt(100 * (1 + p / 100) * (1 - q / 100))}$.`, `Change from 100: ${fmt(ch)}%.`], trap: 'Adding percent changes of factors that multiply.', hints: H('Pick a 10-by-10 rectangle.', 'Apply each change.', 'Compare the new area with 100.') };
    }
    const f1 = new Frac(1, rng.pick([3, 4, 5])), f2 = new Frac(rng.pick([1, 2]), rng.pick([3, 5]));
    const rest = new Frac(1).sub(f1).mul(new Frac(1).sub(f2));
    const T = lcm(f1.d, f2.d) * lcm(f1.d, f2.d);
    const g1 = level === 3 ? 'soccer' : 'math', g2 = level === 3 ? 'tennis' : 'physics';
    return { format: 'numeric', stem: `Of the members of a club, $${f1.tex()}$ play ${g1}, and $${f2.tex()}$ of the remaining members play ${g2}. No member plays both. What fraction of the members play neither? Give your answer as a fraction.`, answer: fracAns(rest.n, rest.d), explanation: [`**Smart number:** let the club have ${T} members (a multiple of every denominator).`, `${g1}: ${f1.mul(T).value}; remaining: ${T - f1.mul(T).value}; ${g2}: ${f2.mul(T - f1.mul(T).value).tex()}.`, `Neither: $${rest.mul(T).tex()}$ of ${T}, i.e. $${rest.tex()}$.`], trap: 'Taking the second fraction of the whole club instead of the remainder.', hints: H('Pick a total divisible by all denominators.', `Try ${T} members.`, 'Apply the second fraction to the remainder.') };
  },
});

// ===================== Traps, patterns, efficiency =====================
const pctPoints: Generator = gen({
  id: S('traps.points'), unit: 'st.traps', subtopic: 'Recognizing traps', levels: [3, 4],
  skills: ['percent vs percentage points'], concepts: ['Recognizing traps', 'Percentage increase and decrease'],
  generate(rng, level) {
    const a = rng.pick([2, 4, 5, 8, 10, 20, 25]), b = a + rng.pick([1, 2, 5, 10].filter((d) => (d / a) * 100 === Math.round((d / a) * 100 * 100) / 100));
    const pc = ((b - a) / a) * 100;
    if (level === 4) return qcNumeric({ given: `An interest rate rises from ${a}% to ${b}%.`, a: 'The percent increase in the interest rate', b: `${b - a}`, va: pc, vb: b - a, proof: [`The rate rises by ${b - a} percentage **point${b - a === 1 ? '' : 's'}**, but the percent increase is $\\dfrac{${b - a}}{${a}}\\times100 = ${fmt(pc)}\\%$.`], trap: 'Confusing percentage points with percent change.', hints: H('Percentage points measure the raw difference.', 'Percent change divides by the starting rate.', `$(${b} - ${a})/${a}$.`) });
    return { format: 'mcq', stem: `The unemployment rate in a region fell from ${b}% to ${a}%. By what percent did the unemployment rate decrease?`, ...numMcq(round(((b - a) / b) * 100, 2), [{ v: b - a, note: 'That is the change in percentage points.' }, round(pc, 2), round(((b - a) / b) * 50, 2), round((a / b) * 100, 2)], { render: (v) => `$${fmt(v)}\\%$` }), explanation: [`Change: ${b - a} percentage points.`, `Percent decrease $= \\dfrac{${b - a}}{${b}}\\times100 = ${fmt(round(((b - a) / b) * 100, 2))}\\%$.`], trap: 'Answering with the percentage-point difference.', hints: H('Percent change = change ÷ original.', `Original rate: ${b}%.`, `Change: ${b - a} points.`) };
  },
});

const patterns: Generator = gen({
  id: S('traps.patterns'), unit: 'st.traps', subtopic: 'Recognizing patterns', levels: [3, 4, 5],
  skills: ['series patterns', 'telescoping'], concepts: ['Recognizing patterns', 'Avoiding unnecessary calculations', 'Arithmetic sequences'],
  generate(rng, level) {
    const n = rng.int(20, 100);
    if (level === 3) return { format: 'numeric', stem: `What is the sum of all even integers from 2 to ${2 * n}, inclusive, minus the sum of all odd integers from 1 to ${2 * n - 1}, inclusive?`, answer: numAns(n), explanation: [`Pair them: $(2 - 1) + (4 - 3) + \\dots + (${2 * n} - ${2 * n - 1})$.`, `There are ${n} pairs, each equal to 1: total ${n}.`], trap: 'Computing both sums separately (slow and error-prone).', hints: H('Line up the two sums term by term.', 'Each even number is 1 more than the odd number before it.', `How many pairs are there?`) };
    if (level === 4) { const m = rng.int(5, 30); const t = new Frac(m, m + 1); return { format: 'numeric', stem: `What is the value of $\\dfrac{1}{1\\cdot2} + \\dfrac{1}{2\\cdot3} + \\dfrac{1}{3\\cdot4} + \\dots + \\dfrac{1}{${m}\\cdot${m + 1}}$? Give your answer as a fraction.`, answer: fracAns(t.n, t.d), explanation: ['Each term telescopes: $\\dfrac{1}{k(k+1)} = \\dfrac1k - \\dfrac{1}{k+1}$.', `The sum collapses to $1 - \\dfrac{1}{${m + 1}} = ${t.tex()}$.`], trap: 'Adding the fractions one by one.', hints: H('Rewrite one term as a difference of two fractions.', '$\\frac{1}{k(k+1)} = \\frac1k - \\frac1{k+1}$.', 'Most terms cancel.') }; }
    const k = rng.int(10, 40);
    return { format: 'numeric', stem: `The sum of the first $n$ positive odd integers is $n^2$. What is the sum of the odd integers from ${2 * k + 1} to ${2 * n + 1 + 2 * k}, inclusive?`, answer: numAns((n + k + 1) ** 2 - k * k), explanation: [`Odd integers up to ${2 * (n + k) + 1}: the first ${n + k + 1} odd numbers, sum $${n + k + 1}^2 = ${tnum((n + k + 1) ** 2)}$.`, `Odd integers up to ${2 * k - 1}: the first ${k}, sum $${k}^2 = ${k * k}$.`, `Difference: $${tnum((n + k + 1) ** 2)} - ${k * k} = ${tnum((n + k + 1) ** 2 - k * k)}$.`], trap: 'Miscounting how many odd numbers lie in a range.', hints: H('Write the target as a difference of two “first n odds” sums.', 'The m-th odd number is 2m − 1.', `${2 * n + 1 + 2 * k} is the ${n + k + 1}th odd number.`) };
  },
});

const symmetry: Generator = gen({
  id: S('traps.symmetry'), unit: 'st.traps', subtopic: 'Using symmetry', levels: [4, 5],
  skills: ['symmetry arguments'], concepts: ['Using symmetry', 'Probability'],
  generate(rng, level) {
    if (level === 4) {
      const n = rng.pick([5, 7, 9]);
      return { format: 'mcq', stem: `A fair coin is flipped ${n} times. What is the probability of getting more heads than tails?`, ...textMcq(rng, '$\\dfrac{1}{2}$', [{ t: `$\\dfrac{${nCr(n, (n + 1) / 2)}}{${2 ** n}}$`, note: 'That is the probability of exactly one specific count.' }, '$\\dfrac{1}{4}$', `$\\dfrac{${n - 1}}{${2 * n}}$`, '$\\dfrac{2}{3}$']), explanation: [`With ${n} (odd) flips, a tie is impossible, so “more heads” and “more tails” cover every outcome.`, 'By symmetry the two events are equally likely: each has probability $\\tfrac12$.'], trap: 'Summing binomial terms when symmetry gives the answer instantly.', hints: H('Can heads and tails tie?', 'Heads and tails are interchangeable.', 'The two possible outcomes are equally likely.') };
    }
    const n = rng.pick([4, 6]);
    const tie = new Frac(nCr(n, n / 2), 2 ** n);
    const more = new Frac(1).sub(tie).mul(new Frac(1, 2));
    return { format: 'numeric', stem: `A fair coin is flipped ${n} times. What is the probability of getting more heads than tails? Give your answer as a fraction.`, answer: fracAns(more.n, more.d), explanation: [`$P(\\text{tie}) = \\dbinom{${n}}{${n / 2}}/2^{${n}} = ${tie.tex()}$.`, `By symmetry $P(\\text{more heads}) = P(\\text{more tails}) = \\dfrac{1 - ${tie.tex()}}{2} = ${more.tex()}$.`], trap: 'Forgetting the tie case, or answering 1/2.', hints: H('Ties are possible with an even number of flips.', 'Compute P(tie) first.', 'Split the remaining probability equally.') };
  },
});

const avoidCalc: Generator = gen({
  id: S('traps.avoidcalc'), unit: 'st.traps', subtopic: 'Avoiding unnecessary calculations', levels: [2, 3, 4],
  skills: ['decimal shifting', 'using given facts'], concepts: ['Avoiding unnecessary calculations', 'Estimation'],
  generate(rng, level) {
    const a = rng.int(12, 89), b = rng.int(12, 89), p = a * b;
    const s1 = rng.pick([1, 2]), s2 = rng.pick([1, 2, 3]);
    const val = (a / 10 ** s1) * (b / 10 ** s2);
    if (level === 4) {
      const c = rng.int(2, 9);
      const opts = [[a * c, b], [a, b * c * 10], [a * 10, b / 10], [(a * c) / 10, b * 10], [a / c, b * c]].map(([x, y]) => ({ t: `$${tnum(x, 4)} \\times ${tnum(y, 4)}$`, ok: Math.abs(x * y - p * c) < 1e-6, v: x * y }));
      if (!opts.some((o) => o.ok)) return avoidCalc.generate(rng, level);
      return { format: 'multi', stem: `Given that $${a} \\times ${b} = ${tnum(p)}$, which of the following products equal $${tnum(p * c)}$? Indicate all such products.`, ...multiSel(rng, opts.map(({ v, ...o }) => ({ ...o, note: `value $= ${tnum(round(v, 6), 4)}$` }))), explanation: [`Target $= ${c}\\times(${a}\\times${b})$.`, 'Track how each choice scales the two factors: the product scales by the product of the scale factors.', ...opts.map((o) => `${o.t} $= ${tnum(round(o.v, 6), 4)}$ ${o.ok ? '✓' : '✗'}`)], trap: 'Multiplying each option out in full.', hints: H('Compare each option to the given product.', 'Scaling one factor by k scales the product by k.', `You need a total scale of ${c}.`) };
    }
    return { format: 'mcq', stem: `Given that $${a} \\times ${b} = ${tnum(p)}$, what is $${tnum(a / 10 ** s1, 4)} \\times ${tnum(b / 10 ** s2, 4)}$?`, ...numMcq(val, [val * 10, val / 10, val * 100, val / 100], { render: (v) => `$${tnum(round(v, 8), 8)}$` }), explanation: [`The factors are the original numbers divided by $10^{${s1}}$ and $10^{${s2}}$.`, `So the product is $${tnum(p)} \\div 10^{${s1 + s2}} = ${tnum(round(val, 8), 8)}$.`], trap: 'Miscounting decimal places.', hints: H('Use the given product.', 'Count the total decimal shift.', `Shift ${s1 + s2} places.`) };
  },
});

// ===================== Multi-concept (boss) =====================
const comboGeoRatio: Generator = gen({
  id: S('combo.georatio'), unit: 'ge.quads', subtopic: 'Geometry + ratios', levels: [4, 5], combo: 'Geometry + Ratios',
  skills: ['ratio scaling', 'Pythagorean theorem', 'perimeter'], concepts: ['Ratios', 'Rectangles', 'Pythagorean theorem'],
  generate(rng, level) {
    const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]]);
    const k = rng.int(2, 6);
    if (level === 4) return { format: 'numeric', stem: `The length and width of a rectangle are in the ratio $${b}:${a}$, and its perimeter is ${2 * (a + b) * k}. What is the length of its diagonal?`, answer: numAns(c * k), explanation: [`Let the sides be $${b}k$ and $${a}k$: $2(${a + b}k) = ${2 * (a + b) * k} \\Rightarrow k = ${k}$.`, `Sides ${b * k} and ${a * k}; diagonal $= ${c}k = ${c * k}$ (a ${a}-${b}-${c} triangle).`], trap: 'Treating the ratio terms as the actual side lengths.', hints: H('Write the sides as multiples of k.', 'Use the perimeter to find k.', `The sides form an ${a}-${b}-${c} right triangle with the diagonal.`) };
    const area = a * b * k * k;
    return { format: 'numeric', stem: `The legs of a right triangle are in the ratio $${a}:${b}$, and its area is ${area / 2}. What is the perimeter of the triangle?`, answer: numAns((a + b + c) * k), explanation: [`Legs $${a}k$ and $${b}k$: area $= \\tfrac12\\cdot${a * b}k^2 = ${area / 2} \\Rightarrow k^2 = ${k * k}$, $k = ${k}$.`, `Sides ${a * k}, ${b * k}, ${c * k}; perimeter ${(a + b + c) * k}.`], trap: 'Forgetting the ½ in the area formula.', hints: H('Represent the legs as multiples of k.', 'Area gives k².', `Hypotenuse is ${c}k.`) };
  },
});

const comboProbCount: Generator = gen({
  id: S('combo.probcount'), unit: 'da.probability', subtopic: 'Probability + counting', levels: [4, 5], combo: 'Probability + Counting',
  skills: ['combinations in probability'], concepts: ['Combinations', 'Probability', 'Dependent events'],
  generate(rng, level) {
    const n = rng.int(6, 10), k = level === 4 ? 2 : 3;
    if (level === 4) { const p = new Frac(nCr(n - 2, k - 2), nCr(n, k)); return { format: 'numeric', stem: `A committee of ${k} people is chosen at random from ${n} people, including Lee and Kim. What is the probability that both Lee and Kim are chosen? Give your answer as a fraction.`, answer: fracAns(p.n, p.d), explanation: [`Total committees: $\\binom{${n}}{${k}} = ${nCr(n, k)}$; committees with both: $\\binom{${n - 2}}{${k - 2}} = ${nCr(n - 2, k - 2)}$.`, `$P = ${p.tex()}$.`], trap: 'Multiplying 2/n · 1/(n−1) without accounting for the committee size properly.', hints: H('Count all committees.', 'Fix Lee and Kim; choose the rest.', `$\\binom{${n}}{${k}}$ committees total.`) }; }
    const p = new Frac(2, n);
    return { format: 'numeric', stem: `${n} people, including Lee and Kim, are seated at random in a row of ${n} chairs. What is the probability that Lee and Kim sit next to each other? Give your answer as a fraction.`, answer: fracAns(p.n, p.d), explanation: [`Treat Lee-Kim as one block: $(${n} - 1)!$ arrangements of the block and the others, times 2 orders inside the block.`, `$P = \\dfrac{2\\cdot(${n - 1})!}{${n}!} = \\dfrac{2}{${n}} = ${p.tex()}$.`, `Check another way: Lee is at an end with probability $\\tfrac{2}{${n}}$ (1 neighbouring seat) and in the middle otherwise (2 neighbouring seats), so $P = \\tfrac{2}{${n}}\\cdot\\tfrac{1}{${n - 1}} + \\tfrac{${n - 2}}{${n}}\\cdot\\tfrac{2}{${n - 1}} = ${p.tex()}$.`], trap: 'Forgetting that the pair can sit in two orders.', hints: H('Treat Lee-Kim as a block.', 'Count arrangements of the block and the others.', 'Divide by the total number of arrangements.') };
  },
});

const comboPctWeighted: Generator = gen({
  id: S('combo.pctweighted'), unit: 'wp.mixtures', subtopic: 'Percentages + weighted averages', levels: [4, 5], combo: 'Percentages + Weighted Averages',
  skills: ['weighted percents'], concepts: ['Weighted averages', 'Percentages'],
  generate(rng, level) {
    const nA = rng.pick([200, 300, 400]), nB = rng.pick([100, 200, 600]), pA = rng.pick([60, 70, 80, 90]), pB = rng.pick([40, 50, 65, 75]);
    const overall = (nA * pA + nB * pB) / (nA + nB);
    if (level === 4) return { format: 'numeric', stem: `School A has ${nA} students, of whom ${pA}% passed an exam. School B has ${nB} students, of whom ${pB}% passed. What percent of all students in the two schools passed? (Round to the nearest tenth of a percent.)`, answer: numAns(round(overall, 1), 0.051), unitLabel: '%', explanation: [`Passed: $${pA / 100}\\cdot${nA} + ${pB / 100}\\cdot${nB} = ${(nA * pA) / 100 + (nB * pB) / 100}$.`, `Overall $= ${(nA * pA) / 100 + (nB * pB) / 100}/${nA + nB} \\approx ${overall.toFixed(2)}\\%$.`], trap: `Averaging ${pA}% and ${pB}%.`, hints: H('Convert each percent into a count.', 'Add counts, then divide by the total.', `School A passes: ${(nA * pA) / 100}.`) };
    const target = rng.int(Math.min(pA, pB) + 2, Math.max(pA, pB) - 2);
    // how many from B needed for overall target with nA fixed: nA (pA - target) = x (target - pB)
    const x = new Frac(nA * (pA - target), target - pB);
    if (!x.isInt() || x.value <= 0) return comboPctWeighted.generate(rng, level);
    return { format: 'numeric', stem: `${nA} students at School A had a pass rate of ${pA}%. How many students from School B, which had a pass rate of ${pB}%, must be combined with them so that the combined pass rate is exactly ${target}%?`, answer: numAns(x.value), explanation: [`Balance deviations from ${target}%: $${nA}(${pA} - ${target}) = x(${target} - ${pB})$.`, `$x = ${x.value}$.`], trap: 'Using simple averages of rates.', hints: H('Weighted averages balance around the target.', 'Group A is above target, group B below.', `$${nA}\\cdot${Math.abs(pA - target)} = x\\cdot${Math.abs(target - pB)}$.`) };
  },
});

const comboAlgNum: Generator = gen({
  id: S('combo.algnum'), unit: 'ar.integers', subtopic: 'Algebra + number properties', levels: [4, 5], combo: 'Algebra + Number Properties',
  skills: ['algebraic parity and divisibility'], concepts: ['Properties of integers', 'Factoring', 'Consecutive integers'],
  generate(rng, level) {
    const exprs = [
      { t: 'n^2 + n', must: 'even', ok: true, why: '$n(n + 1)$ is a product of consecutive integers.' },
      { t: 'n^3 - n', must: 'divisible by 6', ok: true, why: '$(n - 1)n(n + 1)$: three consecutive integers include a multiple of 2 and of 3.' },
      { t: 'n^2 + 1', must: 'odd', ok: false, why: 'If $n$ is odd, $n^2 + 1$ is even.' },
      { t: '2n + 1', must: 'prime', ok: false, why: '$n = 4$ gives 9.' },
      { t: '(n + 1)(n + 2)(n + 3)', must: 'divisible by 6', ok: true, why: 'Three consecutive integers.' },
      { t: 'n^2 - n + 1', must: 'odd', ok: true, why: '$n(n - 1)$ is even, so adding 1 gives an odd number.' },
      { t: '4n^2 + 2', must: 'divisible by 4', ok: false, why: '$4n^2 + 2$ leaves remainder 2 when divided by 4.' },
      { t: 'n^4 - n^2', must: 'divisible by 12', ok: true, why: '$n^2(n - 1)(n + 1)$: contains a multiple of 3, and a factor of 4 (either $n^2$ even ⇒ divisible by 4, or $n$ odd ⇒ $(n-1)(n+1)$ divisible by 8).' },
    ];
    const pick = rng.sample(exprs, level === 4 ? 4 : 5);
    if (!pick.some((e) => e.ok)) return comboAlgNum.generate(rng, level);
    return { format: 'multi', stem: 'If $n$ is a positive integer, which of the following statements must be true? Indicate all such statements.', ...multiSel(rng, pick.map((e) => ({ t: `$${e.t}$ is ${e.must}`, ok: e.ok, note: e.why }))), explanation: ['Factor each expression to expose consecutive integers, then apply divisibility facts; to reject a statement, find one counterexample.', ...pick.map((e) => `$${e.t}$ — ${e.ok ? 'always' : 'not always'} ${e.must}: ${e.why}`)], trap: 'Checking only one or two values of n and generalizing.', hints: H('Factor each expression.', 'Products of k consecutive integers are divisible by k!.', 'One counterexample disproves a “must be true” statement.') };
  },
});

const comboArithAlg: Generator = gen({
  id: S('combo.arithalg'), unit: 'al.linear', subtopic: 'Arithmetic + algebra', levels: [4, 5], combo: 'Arithmetic + Algebra',
  skills: ['translating number relationships'], concepts: ['Consecutive integers', 'Linear equations', 'Remainders'],
  generate(rng, level) {
    if (level === 4) {
      const x = 2 * rng.int(3, 30) + 1, extra = rng.int(1, 20);
      // three consecutive odd: x, x+2, x+4; sum = 3x+6 ; "sum is extra more than twice the largest": 3x+6 = 2(x+4)+e -> x = 2 + e
      const xs = 2 + extra;
      if (xs % 2 === 0) return comboArithAlg.generate(rng, level);
      void x;
      return { format: 'numeric', stem: `The sum of three consecutive odd integers is ${extra} more than twice the largest of the three. What is the smallest of the integers?`, answer: numAns(xs), explanation: [`Let them be $x, x + 2, x + 4$: $3x + 6 = 2(x + 4) + ${extra}$.`, `$x = ${xs}$. Check: $${xs} + ${xs + 2} + ${xs + 4} = ${3 * xs + 6}$ and $2(${xs + 4}) + ${extra} = ${2 * (xs + 4) + extra}$ ✓.`], trap: 'Using x, x+1, x+2 for odd integers.', hints: H('Consecutive odd integers differ by 2.', 'Write x, x + 2, x + 4.', `$3x + 6 = 2(x + 4) + ${extra}$.`) };
    }
    const a = rng.pick([2, 3, 4]), b = rng.pick([5, 7]), N = rng.int(40, 90);
    const sols: [number, number][] = [];
    for (let x = 1; a * x < N; x++) if ((N - a * x) % b === 0 && (N - a * x) / b >= 1) sols.push([x, (N - a * x) / b]);
    if (sols.length < 2) return comboArithAlg.generate(rng, level);
    return { format: 'numeric', stem: `How many ordered pairs of **positive integers** $(x, y)$ satisfy $${a}x + ${b}y = ${N}$?`, answer: numAns(sols.length), explanation: [`Solve for $y$: $y = \\dfrac{${N} - ${a}x}{${b}}$, which must be a positive integer.`, `The first solution is $(${sols[0][0]}, ${sols[0][1]})$; further solutions step by $x \\to x + ${b}$, $y \\to y - ${a}$ (keeping the sum fixed).`, `Solutions: ${sols.map(([x, y]) => `(${x}, ${y})`).join(', ')} — ${sols.length} pairs.`], trap: 'Counting solutions with x or y equal to 0, or listing values by trial without the step pattern.', hints: H('Isolate y and require divisibility.', `${N} − ${a}x must be a positive multiple of ${b}.`, `Once you find one solution, add ${b} to x and subtract ${a} from y.`) };
  },
});

export const STRATEGY: Generator[] = [qcCases, qcConstraint, qcSimplify, pluginVars, backsolve, smartNumbers, pctPoints, patterns, symmetry, avoidCalc, comboGeoRatio, comboProbCount, comboPctWeighted, comboAlgNum, comboArithAlg];
void numMcq;
