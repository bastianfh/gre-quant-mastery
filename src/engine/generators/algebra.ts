import { Frac, fmt, gcd, poly, tnum } from '../../lib/math';
import type { Generator } from '../types';
import { H, fracAns, gen, multiSel, numAns, numMcq, textMcq } from './helpers';
import { qcNumeric, qcOutput } from './qc';

const G = (id: string) => `al.${id}`;
const lin = (a: number, b: number, v = 'x') => poly([[a, v], [b, '']]);

// ===================== Expressions =====================
const substitution: Generator = gen({
  id: G('expr.eval'), unit: 'al.expressions', subtopic: 'Substitution', levels: [1, 2, 3],
  skills: ['substitution', 'signed arithmetic'], concepts: ['Substitution', 'Algebraic expressions'],
  generate(rng, level) {
    const x = rng.intNot(-5, 6, [0]), y = rng.intNot(-4, 5, [0]);
    const a = rng.int(2, 5), b = rng.int(1, 4);
    let expr: string, val: number, steps: string[];
    if (level === 1) {
      expr = `${a}x^2 - ${b}xy`; val = a * x * x - b * x * y;
      steps = [`$${a}(${x})^2 - ${b}(${x})(${y}) = ${a * x * x} - (${b * x * y}) = ${val}$`];
    } else if (level === 2) {
      expr = `\\dfrac{x^2 - y^2}{x - y} + ${a}y`;
      if (x === y) return substitution.generate(rng, level);
      val = x + y + a * y; steps = [`$\\dfrac{x^2 - y^2}{x - y} = x + y$ (when $x \\ne y$) $= ${x + y}$.`, `$${a}y = ${a * y}$; total ${val}.`];
    } else {
      expr = `(x - y)^2 - (x + y)^2 + ${a}x^2y`; val = -4 * x * y + a * x * x * y;
      steps = [`$(x - y)^2 - (x + y)^2 = -4xy = ${-4 * x * y}$.`, `$${a}x^2y = ${a}(${x * x})(${y}) = ${a * x * x * y}$.`, `Total: ${val}.`];
    }
    return {
      format: 'numeric', stem: `If $x = ${x}$ and $y = ${y}$, what is the value of $${expr}$?`, answer: numAns(val),
      explanation: steps, trap: 'Sign errors when substituting negatives — always wrap substituted values in parentheses.',
      hints: H('Substitute with parentheses around each value.', 'Simplify algebraically first if a pattern appears.', steps[0]),
    };
  },
});

const expandSimplify: Generator = gen({
  id: G('expr.simplify'), unit: 'al.expressions', subtopic: 'Simplification', levels: [2, 3, 4],
  skills: ['FOIL', 'combining like terms'], concepts: ['Simplification', 'Polynomials', 'Algebraic manipulation'],
  generate(rng, level) {
    const a = rng.int(1, 4), b = rng.intNot(-6, 6, [0]), c = rng.int(1, 3), d = rng.intNot(-6, 6, [0]);
    const e = rng.intNot(-5, 5, [0]);
    // (ax + b)(cx + d) - (x + e)^2   [level>=3]   or just product
    let A2 = a * c, A1 = a * d + b * c, A0 = b * d;
    let stem = `(${lin(a, b)})(${lin(c, d)})`;
    const steps = [`$(${lin(a, b)})(${lin(c, d)}) = ${poly([[A2, 'x^2'], [A1, 'x'], [A0, '']])}$`];
    if (level >= 3) {
      stem += ` - (${lin(1, e)})^2`;
      A2 -= 1; A1 -= 2 * e; A0 -= e * e;
      steps.push(`$(${lin(1, e)})^2 = ${poly([[1, 'x^2'], [2 * e, 'x'], [e * e, '']])}$`, `Subtract: $${poly([[A2, 'x^2'], [A1, 'x'], [A0, '']])}$`);
    }
    const P = (p2: number, p1: number, p0: number) => `$${poly([[p2, 'x^2'], [p1, 'x'], [p0, '']])}$`;
    const correct = P(A2, A1, A0);
    const ds = level >= 3
      ? [{ t: P(A2, A1 + 4 * e, A0), note: 'Sign error distributing the minus sign over $(x + e)^2$.' }, { t: P(A2 + 2, A1 + 2 * e, A0 + 2 * e * e), note: 'Added instead of subtracted the square.' }, { t: P(A2, A1 + 2 * e, A0), note: 'Forgot the middle term $2ex$ in the square.' }, P(A2, A1, -A0), P(A2 + 1, A1, A0 + e * e)]
      : [{ t: P(A2, a + c, A0), note: 'Missed the outer/inner products.' }, P(A2, A1, -A0), P(A2, -A1, A0), P(A2, a * b + c * d, A0)];
    return {
      format: 'mcq', stem: `Which of the following is equivalent to $${stem}$?`,
      ...textMcq(rng, correct, ds),
      explanation: steps,
      trap: level >= 3 ? 'Forgetting to distribute the negative sign across every term of the subtracted square.' : 'Multiplying only first and last terms (missing the middle term).',
      hints: H('Expand each product term by term.', '$(p + q)^2 = p^2 + 2pq + q^2$.', steps[0]),
      altMethod: `Plug in $x = 1$: the original equals ${(a + b) * (c + d) - (level >= 3 ? (1 + e) ** 2 : 0)}; only the correct choice gives the same value (check a second value like $x = 2$ to break ties).`,
    };
  },
});

const combination: Generator = gen({
  id: G('expr.combo'), unit: 'al.expressions', subtopic: 'Algebraic manipulation', levels: [2, 3, 4],
  skills: ['solving for an expression'], concepts: ['Algebraic manipulation', 'Substitution'],
  generate(rng, level) {
    const p = rng.int(2, 5), q = rng.int(1, 6), k = rng.int(5, 40), m = rng.int(2, 4), c = rng.int(-10, 10);
    if (level === 4) {
      // QC: given 2x - y = k; A: 6x - 3y; B: 3k  -> equal; or vs other
      const mult = rng.int(2, 4);
      const delta = rng.pick([0, 1, -1]);
      return qcNumeric({
        given: `$${p}x - ${q}y = ${k}$`, a: `$${p * mult}x - ${q * mult}y$`, b: `$${mult * k + delta}$`, va: mult * k, vb: mult * k + delta,
        proof: [`Multiply the given equation by ${mult}: $${p * mult}x - ${q * mult}y = ${mult * k}$.`, `Compare ${mult * k} with ${mult * k + delta}.`],
        trap: 'Trying to solve for x and y individually — one equation cannot determine both, but it does determine this combination.',
        hints: H('Is Quantity A a multiple of the given expression?', `Factor ${mult} out of Quantity A.`, `$${p * mult}x - ${q * mult}y = ${mult}(${p}x - ${q}y)$.`),
      });
    }
    const val = m * k + c;
    return {
      format: 'numeric', stem: `If $${p}x + ${q}y = ${k}$, what is the value of $${m * p}x + ${m * q}y ${c < 0 ? '-' : '+'} ${Math.abs(c)}$?`, answer: numAns(val),
      explanation: [`$${m * p}x + ${m * q}y = ${m}(${p}x + ${q}y) = ${m}\\cdot${k} = ${m * k}$.`, `Then ${c < 0 ? 'subtract' : 'add'} ${Math.abs(c)}: ${val}.`],
      trap: 'Trying to find x and y separately — the question asks only for a combination.',
      hints: H('You cannot find x and y individually.', 'Is the target expression a multiple of the given one?', `Factor ${m} from the first two terms.`),
    };
  },
});

const identities: Generator = gen({
  id: G('expr.identity'), unit: 'al.expressions', subtopic: 'Algebraic identities', levels: [3, 4, 5],
  skills: ['special products'], concepts: ['Algebraic manipulation', 'Special products'],
  generate(rng, level) {
    const x = rng.intNot(-6, 9, [0]), y = rng.intNot(-6, 9, [0, x]);
    const s = x + y, pr = x * y, sq = x * x + y * y;
    if (level === 3) {
      return {
        format: 'numeric', stem: `If $x + y = ${s}$ and $xy = ${pr}$, what is the value of $x^2 + y^2$?`, answer: numAns(sq),
        explanation: [`$(x + y)^2 = x^2 + 2xy + y^2$, so $x^2 + y^2 = (x+y)^2 - 2xy$.`, `$= ${s * s} - ${2 * pr} = ${sq}$.`],
        trap: `Squaring the sum and forgetting to subtract $2xy$ (giving ${s * s}).`,
        hints: H('Use the square of a sum.', '$(x+y)^2 = x^2 + 2xy + y^2$.', `$(x+y)^2 = ${s * s}$.`),
      };
    }
    if (level === 4) {
      const d = x - y;
      if (d === 0) return identities.generate(rng, level);
      return {
        format: 'numeric', stem: `If $x^2 - y^2 = ${x * x - y * y}$ and $x - y = ${d}$, what is the value of $x$?`, answer: numAns(x),
        explanation: [`$x^2 - y^2 = (x - y)(x + y)$, so $x + y = \\dfrac{${x * x - y * y}}{${d}} = ${s}$.`, `Add the equations $x + y = ${s}$ and $x - y = ${d}$: $2x = ${s + d}$, $x = ${x}$.`],
        trap: 'Treating $x^2 - y^2$ as $(x - y)^2$.',
        hints: H('Factor the difference of squares.', '$x^2 - y^2 = (x - y)(x + y)$.', `So $x + y = ${s}$.`),
      };
    }
    // level 5: QC (x+y)^2 vs x^2+y^2 given xy constraint
    const sign = rng.pick(['>', '<']);
    return qcOutput({
      given: `$xy ${sign} 0$`, a: '$(x + y)^2$', b: '$x^2 + y^2$', vars: [{ name: 'x', kind: 'real' }, { name: 'y', kind: 'real' }],
      constraint: (v) => (sign === '>' ? v.x * v.y > 0 : v.x * v.y < 0), fA: (v) => (v.x + v.y) ** 2, fB: (v) => v.x ** 2 + v.y ** 2,
      proof: [`Expand: $(x + y)^2 = x^2 + y^2 + 2xy$, so Quantity A − Quantity B $= 2xy$.`, `Since $xy ${sign} 0$, Quantity A is ${sign === '>' ? 'greater' : 'smaller'}.`],
      trap: 'Testing a single pair of numbers instead of comparing the expanded forms.',
      hints: H('Expand Quantity A.', 'Subtract the common part $x^2 + y^2$ from both quantities.', 'What remains is $2xy$ versus 0.'),
    });
  },
});

// ===================== Linear equations =====================
const linearSolve: Generator = gen({
  id: G('lin.solve'), unit: 'al.linear', subtopic: 'Linear equations', levels: [1, 2, 3],
  skills: ['isolating a variable'], concepts: ['Linear equations', 'Solving for a variable'],
  generate(rng, level) {
    if (level === 3) {
      const a = rng.int(2, 6), b = rng.int(2, 6), c = rng.int(1, 9), d = rng.int(1, 9), e = rng.int(2, 5);
      // x/a + (x - c)/b = d  -> solve with fractions
      const x = new Frac(d * a * b + a * c, a + b);
      return {
        format: 'numeric', stem: `If $\\dfrac{x}{${a}} + \\dfrac{x - ${c}}{${b}} = ${d}$, what is the value of $x$?`, answer: x.isInt() ? numAns(x.value) : fracAns(x.n, x.d),
        explanation: [`Multiply both sides by ${a * b}: $${b}x + ${a}(x - ${c}) = ${d * a * b}$.`, `$${a + b}x - ${a * c} = ${d * a * b}$, so $x = \\dfrac{${d * a * b + a * c}}{${a + b}} = ${x.tex()}$.`],
        trap: `Forgetting to multiply the constant ${c} by ${a} when clearing denominators.`,
        hints: H('Clear the fractions first.', `Multiply every term by the LCD, ${a * b}.`, `You get $${b}x + ${a}(x - ${c}) = ${d * a * b}$.`),
        timeSec: 90,
      };
    }
    const x = rng.intNot(-9, 12, [0]);
    const a = rng.int(2, 9), c = rng.intNot(-5, 8, [a, 0]);
    const b = rng.int(-15, 15);
    const d = a * x + b - c * x;
    const stem = level === 1 ? `$${lin(a, b)} = ${a * x + b}$` : `$${lin(a, b)} = ${lin(c, d)}$`;
    return {
      format: 'numeric', stem: `If ${stem}, what is the value of $x$?`, answer: numAns(x),
      explanation: level === 1 ? [`Subtract ${b} from both sides: $${a}x = ${a * x}$; divide by ${a}: $x = ${x}$.`] : [`Collect $x$ terms: $(${a} - ${c})x = ${d} - (${b})$, i.e. $${a - c}x = ${d - b}$.`, `$x = ${x}$.`],
      trap: 'Changing a sign incorrectly when moving a term across the equals sign.',
      hints: H('Get all x terms on one side and constants on the other.', 'Do the same operation to both sides.', level === 1 ? `Subtract ${b}.` : `Subtract $${c}x$ from both sides.`),
    };
  },
});

const literalEq: Generator = gen({
  id: G('lin.literal'), unit: 'al.linear', subtopic: 'Literal equations', levels: [3, 4],
  skills: ['rearranging formulas'], concepts: ['Literal equations', 'Solving for a variable'],
  generate(rng, level) {
    const forms = [
      { stem: 'A = P(1 + rt)', target: 't', ans: '\\dfrac{A - P}{Pr}', wrong: [{ t: '\\dfrac{A}{Pr} - 1', note: 'Divided before subtracting P correctly.' }, '\\dfrac{A - 1}{Pr}', '\\dfrac{A - P}{r}', 'A - P - Pr'] },
      { stem: '\\dfrac{1}{a} + \\dfrac{1}{b} = \\dfrac{1}{c}', target: 'c', ans: '\\dfrac{ab}{a + b}', wrong: [{ t: 'a + b', note: 'Inverted the sum, not the reciprocal of the sum.' }, '\\dfrac{a + b}{ab}', '\\dfrac{ab}{a - b}', '\\dfrac{1}{a + b}'] },
      { stem: 'y = \\dfrac{3x - k}{x + 2}', target: 'x', ans: '\\dfrac{2y + k}{3 - y}', wrong: [{ t: '\\dfrac{2y - k}{3 - y}', note: 'Sign error moving k.' }, '\\dfrac{2y + k}{y - 3}', '\\dfrac{y + k}{3}', '\\dfrac{k - 2y}{3 + y}'] },
      { stem: 'S = \\dfrac{n(a + l)}{2}', target: 'l', ans: '\\dfrac{2S}{n} - a', wrong: [{ t: '\\dfrac{2S - a}{n}', note: 'Subtracted a before dividing by n.' }, '\\dfrac{S}{2n} - a', '2Sn - a', '\\dfrac{2S}{n + a}'] },
      { stem: 'F = \\dfrac{9}{5}C + 32', target: 'C', ans: '\\dfrac{5}{9}(F - 32)', wrong: [{ t: '\\dfrac{5}{9}F - 32', note: 'Subtracted 32 after scaling.' }, '\\dfrac{9}{5}(F - 32)', '\\dfrac{5F - 32}{9}', '\\dfrac{5}{9}(F + 32)'] },
    ];
    const f = rng.pick(level === 3 ? [forms[0], forms[3], forms[4]] : [forms[1], forms[2]]);
    return {
      format: 'mcq', stem: `If $${f.stem}$, which of the following expresses $${f.target}$ in terms of the other variables? (Assume all denominators are nonzero.)`,
      ...textMcq(rng, `$${f.ans}$`, f.wrong.map((w) => (typeof w === 'string' ? `$${w}$` : { t: `$${w.t}$`, note: w.note }))),
      explanation: [`Isolate $${f.target}$ step by step, undoing operations in reverse order.`, `Result: $${f.target} = ${f.ans}$.`, 'Check by substituting simple numbers for the other variables.'],
      trap: 'Undoing operations in the wrong order.',
      hints: H(`Treat every letter except $${f.target}$ as a known number.`, 'Undo addition/subtraction before multiplication/division (reverse order of operations).', 'Multiply through by any denominator first.'),
      altMethod: 'Pick numbers for the other variables, compute the target, and test each choice.',
    };
  },
});

const solutionCount: Generator = gen({
  id: G('lin.special'), unit: 'al.linear', subtopic: 'Solving for a variable', levels: [4, 5],
  skills: ['no-solution and identity conditions'], concepts: ['Linear equations', 'Systems of equations'],
  generate(rng, level) {
    const a = rng.int(2, 6), b = rng.int(1, 9), c = rng.int(1, 9);
    if (level === 4) {
      return {
        format: 'numeric', stem: `For what value of $k$ does the equation $${a}(x + ${b}) = kx + ${a * b + c}$ have **no** solution?`, answer: numAns(a),
        explanation: [`Expand: $${a}x + ${a * b} = kx + ${a * b + c}$, so $(${a} - k)x = ${c}$.`, `If $k = ${a}$, the equation becomes $0 = ${c}$, which is false for every $x$ — no solution.`],
        trap: 'Setting the constants equal; no solution requires equal x-coefficients and different constants.',
        hints: H('When does $mx = n$ have no solution?', 'The coefficient of x must vanish while the constant does not.', `Collect x terms: $(${a} - k)x = ${c}$.`),
      };
    }
    const p = rng.int(2, 5), q = rng.int(2, 7), r = rng.int(1, 9);
    return {
      format: 'numeric', stem: `The system $${p}x + ${q}y = ${r}$ and $${2 * p}x + ky = ${2 * r}$ has infinitely many solutions. What is $k$?`, answer: numAns(2 * q),
      explanation: [`Infinitely many solutions means the second equation is a multiple of the first.`, `The first equation times 2 is $${2 * p}x + ${2 * q}y = ${2 * r}$, so $k = ${2 * q}$.`],
      trap: 'Confusing infinitely many solutions (same line) with no solution (parallel lines).',
      hints: H('Two equations of the same line give infinitely many solutions.', 'Compare the ratio of the x-coefficients with the constants.', 'The second equation must be exactly twice the first.'),
    };
  },
});

// ===================== Inequalities =====================
const ineqSolve: Generator = gen({
  id: G('ineq.solve'), unit: 'al.inequalities', subtopic: 'Linear inequalities', levels: [2, 3],
  skills: ['inequality sign flips'], concepts: ['Linear inequalities'],
  generate(rng, level) {
    const a = -rng.int(2, 7), b = rng.int(-10, 15), x0 = rng.int(-6, 8);
    const rhs = a * x0 + b;
    const op = rng.pick(['<', '\\le']);
    const flip = op === '<' ? '>' : '\\ge';
    if (level === 3) {
      const lo = rng.int(-8, 0), hi = rng.int(1, 8);
      const m = rng.int(2, 4), c = rng.int(-5, 5);
      // lo < (m x + c)... -> show compound: m*lo+c < m x + c <= m*hi + c
      return {
        format: 'numeric', stem: `How many integers $x$ satisfy $${m * lo + c} < ${lin(m, c)} \\le ${m * hi + c}$?`, answer: numAns(hi - lo),
        explanation: [`Subtract ${c} from all three parts: $${m * lo} < ${m}x \\le ${m * hi}$.`, `Divide by ${m}: $${lo} < x \\le ${hi}$.`, `Integers: ${lo + 1} through ${hi}: $${hi} - (${lo}) = ${hi - lo}$ integers.`],
        trap: 'Including the excluded endpoint or forgetting to apply the operation to all three parts.',
        hints: H('Treat a compound inequality as three parts.', 'Apply each operation to every part.', `Subtract ${c} first.`),
      };
    }
    return {
      format: 'mcq', stem: `Which of the following describes all solutions of $${lin(a, b)} ${op} ${rhs}$?`,
      ...textMcq(rng, `$x ${flip} ${x0}$`, [{ t: `$x ${op} ${x0}$`, note: 'Forgot to flip the inequality when dividing by a negative number.' }, `$x ${flip} ${-x0}$`, `$x ${op} ${-x0}$`, `$x ${flip} ${x0 + 1}$`]),
      explanation: [`Subtract ${b}: $${a}x ${op} ${rhs - b}$.`, `Divide by ${a} (negative) and **flip** the sign: $x ${flip} ${x0}$.`],
      trap: 'Not reversing the inequality after dividing by a negative.',
      hints: H('Isolate the x-term first.', 'Dividing or multiplying by a negative reverses the inequality.', `Subtract ${b} from both sides.`),
    };
  },
});

const absIneq: Generator = gen({
  id: G('ineq.abs'), unit: 'al.inequalities', subtopic: 'Absolute value equations and inequalities', levels: [3, 4, 5],
  skills: ['absolute value inequalities'], concepts: ['Absolute value equations and inequalities'],
  generate(rng, level) {
    const m = rng.pick([1, 2, 3]), c = rng.int(-6, 6), r = rng.int(2, 9);
    // |m x - c| < r  -> (c - r)/m < x < (c + r)/m
    const lo = (c - r) / m, hi = (c + r) / m;
    const greater = level === 5;
    const cands = rng.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, -7, 2.5, -1.5, 0.5], 6);
    const inside = (x: number) => (greater ? Math.abs(m * x - c) > r : Math.abs(m * x - c) < r);
    const opts = cands.map((x) => ({ t: `$${fmt(x)}$`, ok: inside(x), v: x, note: `$|${m === 1 ? '' : m}(${fmt(x)}) ${c < 0 ? '+' : '-'} ${Math.abs(c)}| = ${fmt(Math.abs(m * x - c))}$` }));
    if (!opts.some((o) => o.ok) || opts.every((o) => o.ok)) return absIneq.generate(rng, level);
    const expr = `${m === 1 ? '' : m}x ${c < 0 ? '+' : '-'} ${Math.abs(c)}`;
    return {
      format: 'multi', stem: `Which of the following values of $x$ satisfy $|${expr}| ${greater ? '>' : '<'} ${r}$? Indicate all such values.`, ...multiSel(rng, opts),
      explanation: [
        greater ? `$|${expr}| > ${r}$ means $${expr} > ${r}$ or $${expr} < -${r}$: $x > ${new Frac(c + r, m).tex()}$ or $x < ${new Frac(c - r, m).tex()}$.` : `$|${expr}| < ${r}$ means $-${r} < ${expr} < ${r}$, so $${new Frac(c - r, m).tex()} < x < ${new Frac(c + r, m).tex()}$.`,
        `Check: ${opts.map((o) => `${o.note} ${o.ok ? '✓' : '✗'}`).join('; ')}.`,
      ],
      trap: greater ? 'Writing a single “between” interval for a “greater than” absolute-value inequality.' : 'Solving only the positive case and missing the lower bound.',
      hints: H('Absolute value inequalities split into two conditions.', greater ? '$|u| > r$ ⇔ $u > r$ or $u < -r$.' : '$|u| < r$ ⇔ $-r < u < r$.', `The solution set is centered at $x = ${fmt(c / m)}$.`),
    };
  },
});

const ineqRange: Generator = gen({
  id: G('ineq.range'), unit: 'al.inequalities', subtopic: 'Compound inequalities', levels: [4, 5],
  skills: ['extreme values of expressions'], concepts: ['Compound inequalities', 'Testing boundary cases'],
  generate(rng, level) {
    const a1 = -rng.int(1, 5), a2 = rng.int(2, 7), b1 = -rng.int(1, 6), b2 = rng.int(1, 5);
    const prod = level === 5;
    const vals = prod ? [a1 * b1, a1 * b2, a2 * b1, a2 * b2] : [a1 - b2, a2 - b1];
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const cands = [...new Set([lo - 2, lo - 1, lo + 1, Math.round((lo + hi) / 2), hi - 1, hi, hi + 1, lo, 0])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 7);
    const opts = cands.map((v) => ({ t: `$${v}$`, ok: v > lo && v < hi, v, note: v > lo && v < hi ? `${v} lies strictly between ${lo} and ${hi}.` : `${v} is outside the open interval (${lo}, ${hi}).` }));
    if (!opts.some((o) => o.ok)) return ineqRange.generate(rng, level);
    return {
      format: 'multi', stem: `If $${a1} < x < ${a2}$ and $${b1} < y < ${b2}$, which of the following could be the value of $${prod ? 'xy' : 'x - y'}$? Indicate all such values.`, ...multiSel(rng, opts),
      explanation: prod
        ? [`The extreme values of $xy$ occur at the corner combinations: ${[[a1, b1], [a1, b2], [a2, b1], [a2, b2]].map(([p, q]) => `$(${p})(${q}) = ${p * q}$`).join(', ')}.`, `So $${lo} < xy < ${hi}$ (endpoints excluded because the inequalities are strict).`]
        : [`Minimum of $x - y$: smallest $x$ minus largest $y$: $${a1} - ${b2} = ${a1 - b2}$.`, `Maximum: largest $x$ minus smallest $y$: $${a2} - (${b1}) = ${a2 - b1}$.`, `So $${lo} < x - y < ${hi}$.`],
      trap: prod ? 'Multiplying the lower bounds together and the upper bounds together — with negatives, the extremes come from mixed corners.' : 'Subtracting lower bound from lower bound and upper from upper.',
      hints: H('Find the smallest and largest possible values.', prod ? 'Check all four corner products.' : 'To minimize x − y, make x small and y large.', 'Endpoints are excluded for strict inequalities.'),
    };
  },
});

// ===================== Systems =====================
const systemSolve: Generator = gen({
  id: G('sys.solve'), unit: 'al.systems', subtopic: 'Systems of equations', levels: [2, 3],
  skills: ['elimination', 'substitution'], concepts: ['Systems of equations', 'Elimination and substitution'],
  generate(rng, level) {
    const x = rng.int(-6, 9), y = rng.int(-6, 9);
    const a = rng.int(1, 5), b = rng.intNot(-5, 5, [0]), c = rng.int(1, 5), d = rng.intNot(-5, 5, [0]);
    if (a * d - b * c === 0) return systemSolve.generate(rng, level);
    const e = a * x + b * y, f = c * x + d * y;
    const ask = level === 2 ? 'x' : rng.pick(['y', 'x - y', 'xy']);
    const val = ask === 'x' ? x : ask === 'y' ? y : ask === 'x - y' ? x - y : x * y;
    return {
      format: 'numeric', stem: `If $${poly([[a, 'x'], [b, 'y']])} = ${e}$ and $${poly([[c, 'x'], [d, 'y']])} = ${f}$, what is the value of $${ask}$?`, answer: numAns(val),
      explanation: [`Eliminate a variable: multiply to match coefficients and subtract.`, `Determinant check: $${a}\\cdot${d} - ${b}\\cdot${c} = ${a * d - b * c}$ (nonzero, so there is a unique solution).`, `$x = \\dfrac{${e}\\cdot${d} - ${b}\\cdot${f}}{${a * d - b * c}} = ${x}$, $y = \\dfrac{${a}\\cdot${f} - ${e}\\cdot${c}}{${a * d - b * c}} = ${y}$.`, `So $${ask} = ${val}$.`],
      trap: 'Arithmetic sign errors during elimination; always check the solution in both equations.',
      hints: H('Eliminate one variable.', 'Multiply one equation so a coefficient matches the other.', `Multiply the first equation by ${c} and the second by ${a}.`),
    };
  },
});

const systemCombo: Generator = gen({
  id: G('sys.combo'), unit: 'al.systems', subtopic: 'Combination shortcuts', levels: [3, 4, 5],
  skills: ['adding/subtracting equations'], concepts: ['Simultaneous equations', 'Combination shortcuts'],
  generate(rng, level) {
    if (level === 5) {
      const x = rng.int(1, 9), y = rng.int(1, 9), z = rng.int(1, 9);
      return {
        format: 'numeric', stem: `If $x + y = ${x + y}$, $y + z = ${y + z}$, and $x + z = ${x + z}$, what is the value of $x + y + z$?`, answer: numAns(x + y + z),
        explanation: ['Add all three equations: $2x + 2y + 2z = ' + (2 * (x + y + z)) + '$.', `So $x + y + z = ${x + y + z}$.`],
        trap: 'Solving for each variable separately (slow) or forgetting to halve the total.',
        hints: H('Look at what happens when you add all three equations.', 'Each variable appears exactly twice.', `The sum of the right sides is ${2 * (x + y + z)}.`),
      };
    }
    const p = rng.int(2, 7), q = rng.int(1, 6);
    if (p === q) return systemCombo.generate(rng, level);
    const x = rng.int(-5, 9), y = rng.int(-5, 9);
    const e1 = p * x + q * y, e2 = q * x + p * y;
    if (level === 4) {
      return qcNumeric({
        given: `$${p}x + ${q}y = ${e1}$ and $${q}x + ${p}y = ${e2}$`, a: '$x + y$', b: '$x - y$', va: x + y, vb: x - y,
        proof: [`Add: $${p + q}(x + y) = ${e1 + e2}$, so $x + y = ${x + y}$.`, `Subtract: $${p - q}(x - y) = ${e1 - e2}$, so $x - y = ${x - y}$.`],
        trap: 'Solving for x and y separately — symmetric coefficients reward adding and subtracting the equations.',
        hints: H('The coefficients are swapped between the equations.', 'Add the equations; then subtract them.', `Adding gives $${p + q}x + ${p + q}y = ${e1 + e2}$.`),
      });
    }
    return {
      format: 'mcq', stem: `If $${p}x + ${q}y = ${e1}$ and $${q}x + ${p}y = ${e2}$, what is the value of $x + y$?`,
      ...numMcq(x + y, [{ v: (e1 + e2) / 2, note: 'Divided by 2 instead of by the sum of the coefficients.' }, x - y, e1 - e2, x * y]),
      explanation: [`Add the equations: $${p + q}x + ${p + q}y = ${e1 + e2}$.`, `Divide by ${p + q}: $x + y = ${x + y}$.`],
      trap: 'Solving the full system when a single addition suffices.',
      hints: H('Do not solve for x and y separately.', 'Add the two equations.', `Factor ${p + q} from the sum.`),
    };
  },
});

// ===================== Quadratics & polynomials =====================
const quadRoots: Generator = gen({
  id: G('quad.roots'), unit: 'al.quadratics', subtopic: 'Quadratic equations', levels: [2, 3, 4],
  skills: ['factoring quadratics'], concepts: ['Quadratic equations', 'Factoring'],
  generate(rng, level) {
    const r = rng.intNot(-9, 9, [0]), s = rng.intNot(-9, 9, [0, r]);
    const lead = level === 4 ? rng.pick([2, 3]) : 1;
    // lead (x - r)(x - s) ; for level 4 use (lead x - r)(x - s)
    let b: number, c: number, a: number, roots: Frac[];
    if (level === 4) {
      a = lead; b = -(r + lead * s); c = r * s; roots = [new Frac(r, lead), new Frac(s)];
    } else { a = 1; b = -(r + s); c = r * s; roots = [new Frac(r), new Frac(s)]; }
    const eq = `${poly([[a, 'x^2'], [b, 'x'], [c, '']])} = 0`;
    if (level === 2) {
      const cands = [r, s, -r, -s, r + s, rng.intNot(-9, 9, [r, s, -r, -s])].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 6);
      return {
        format: 'multi', stem: `Which of the following are solutions of $${eq}$? Indicate all such values.`,
        ...multiSel(rng, cands.map((v) => ({ t: `$${v}$`, ok: v === r || v === s, v, note: v === -r || v === -s ? 'Sign error: the factor $(x - r)$ gives root $r$, not $-r$.' : undefined }))),
        explanation: [`Factor: $(x ${r < 0 ? '+' : '-'} ${Math.abs(r)})(x ${s < 0 ? '+' : '-'} ${Math.abs(s)}) = 0$.`, `Roots: $x = ${r}$ and $x = ${s}$.`],
        trap: 'Taking the numbers in the factors with the wrong sign.',
        hints: H('Find two numbers whose product is c and whose sum is −b.', `Product ${c}, sum ${-b}.`, `Try ${r} and ${s}.`),
      };
    }
    const sum = roots[0].add(roots[1]);
    const ask = level === 3 ? 'pos' : 'sum';
    if (ask === 'pos' && Math.max(r, s) <= 0) return quadRoots.generate(rng, level);
    const val = ask === 'pos' ? Math.max(r, s) : sum.value;
    return {
      format: 'numeric', stem: ask === 'pos' ? `What is the positive solution of $${eq}$?${r > 0 && s > 0 ? ' (Give the larger solution.)' : ''}` : `What is the sum of the solutions of $${eq}$?`,
      answer: ask === 'pos' ? numAns(val) : sum.isInt() ? numAns(sum.value) : fracAns(sum.n, sum.d),
      explanation: ask === 'pos'
        ? [`Factor: product ${c}, sum ${-b} → roots ${r} and ${s}.`, `The ${r > 0 && s > 0 ? 'larger' : 'positive'} solution is ${val}.`]
        : [`For $ax^2 + bx + c = 0$, the sum of the roots is $-\\dfrac{b}{a} = ${new Frac(-b, a).tex()}$.`, `(Roots: $${roots[0].tex()}$ and $${roots[1].tex()}$.)`],
      trap: ask === 'sum' ? 'Forgetting to divide by the leading coefficient.' : 'Sign errors when reading roots from factors.',
      hints: H('Try factoring.', ask === 'sum' ? 'Sum of roots = −b/a.' : 'Find two numbers with the right product and sum.', `The constant term is ${c}.`),
    };
  },
});

const factoring: Generator = gen({
  id: G('quad.factor'), unit: 'al.quadratics', subtopic: 'Factoring', levels: [2, 3, 4],
  skills: ['factoring'], concepts: ['Factoring', 'Special products'],
  generate(rng, level) {
    if (level === 4) {
      const a = rng.int(2, 9), b = rng.int(1, 7);
      const n = rng.pick([3, 4, 5]);
      // x^4 - a^4 type or common factor: a^2 x^n - b^2 x^{n-2} = x^{n-2}(ax - b)(ax + b)
      return {
        format: 'mcq', stem: `Which of the following is a complete factorization of $${a * a}x^{${n}} - ${b * b}x^{${n - 2}}$?`,
        ...textMcq(rng, `$x^{${n - 2}}(${a}x - ${b})(${a}x + ${b})$`, [{ t: `$x^{${n - 2}}(${a}x - ${b})^2$`, note: 'A difference of squares is not a perfect square.' }, `$x^{${n}}(${a} - ${b}x)(${a} + ${b}x)$`, `$(${a}x^{${n - 1}} - ${b})(${a}x + ${b})$`, `$x^{${n - 2}}(${a * a}x - ${b * b})$`].map((d) => d)),
        explanation: [`Factor out the GCF $x^{${n - 2}}$: $x^{${n - 2}}(${a * a}x^2 - ${b * b})$.`, `Difference of squares: $${a * a}x^2 - ${b * b} = (${a}x - ${b})(${a}x + ${b})$.`],
        trap: 'Stopping after taking out the common factor.',
        hints: H('Start with the greatest common factor.', 'Look for a difference of squares.', `$${a * a}x^2 - ${b * b} = (${a}x)^2 - ${b}^2$.`),
      };
    }
    const r = rng.intNot(-8, 8, [0]), s = rng.intNot(-8, 8, [0, -r]);
    const b = r + s, c = r * s;
    const f = (u: number, v: number) => `$(x ${u < 0 ? '-' : '+'} ${Math.abs(u)})(x ${v < 0 ? '-' : '+'} ${Math.abs(v)})$`;
    const stem = poly([[1, 'x^2'], [b, 'x'], [c, '']]);
    return {
      format: 'mcq', stem: level === 2 ? `Which of the following is equal to $${stem}$?` : `If $${stem}$ is written as $(x + p)(x + q)$, which of the following is the factorization?`,
      ...textMcq(rng, f(r, s), [{ t: f(-r, -s), note: 'Both signs reversed: this gives the opposite middle term.' }, f(r, -s), f(-r, s), f(b, c === 0 ? 1 : c / (b || 1)).includes('NaN') ? f(r + 1, s - 1) : f(r + 1, s - 1)]),
      explanation: [`Find $p, q$ with $pq = ${c}$ and $p + q = ${b}$: $p = ${r}$, $q = ${s}$.`, `So $${stem} = ${f(r, s).slice(1, -1)}$.`],
      trap: 'Choosing factors with the right product but the wrong signs.',
      hints: H('Product of the constants = c; sum = b.', `Need product ${c} and sum ${b}.`, 'If c is negative the factors have opposite signs.'),
    };
  },
});

const diffSquares: Generator = gen({
  id: G('quad.diffsq'), unit: 'al.quadratics', subtopic: 'Special products', levels: [2, 3, 4],
  skills: ['difference of squares'], concepts: ['Special products', 'Avoiding unnecessary calculations'],
  generate(rng, level) {
    const n = rng.pick([50, 100, 200, 1000, 70, 30]), k = rng.int(1, level === 2 ? 3 : 9);
    if (level === 4) {
      const a = rng.int(60, 99), b = rng.int(10, 59);
      const ans = (a * a - b * b) / (a - b);
      return {
        format: 'numeric', stem: `What is the value of $\\dfrac{${a}^2 - ${b}^2}{${a - b}}$?`, answer: numAns(ans),
        explanation: [`$${a}^2 - ${b}^2 = (${a} - ${b})(${a} + ${b})$.`, `Dividing by ${a - b} leaves $${a} + ${b} = ${a + b}$.`],
        trap: 'Squaring both numbers — correct but slow and error-prone.',
        hints: H('Avoid computing the squares.', 'Factor the numerator as a difference of squares.', `$(${a} - ${b})(${a} + ${b})$.`),
      };
    }
    const v = (n + k) * (n - k);
    return {
      format: 'mcq', stem: `What is the value of $${n + k} \\times ${n - k}$?`,
      ...numMcq(v, [{ v: n * n, note: `Ignored the $-${k}^2$ term.` }, n * n + k * k, v - 2 * k, n * n - 2 * k]),
      explanation: [`$(${n} + ${k})(${n} - ${k}) = ${n}^2 - ${k}^2 = ${tnum(n * n)} - ${k * k} = ${tnum(v)}$.`],
      trap: 'Multiplying out longhand and making an arithmetic slip.',
      hints: H('Both numbers are equally far from a round number.', '$(a + b)(a - b) = a^2 - b^2$.', `Here $a = ${n}$ and $b = ${k}$.`),
    };
  },
});

const quadQc: Generator = gen({
  id: G('quad.qc'), unit: 'al.quadratics', subtopic: 'Quadratic equations', levels: [3, 4, 5],
  skills: ['root cases in QC'], concepts: ['Quadratic equations', 'Testing zero', 'Identifying hidden constraints'],
  generate(rng, level) {
    const k = rng.int(2, 9);
    const T = [
      { given: `$x^2 = ${k}x$`, a: '$x$', b: `$${k}$`, vars: ['x'], c: (v: any) => Math.abs(v.x * v.x - k * v.x) < 1e-9, fA: (v: any) => v.x, fB: () => k, intro: `$x^2 = ${k}x \\Rightarrow x(x - ${k}) = 0$, so $x = 0$ or $x = ${k}$. Never divide by $x$ — it might be 0.`, lv: 4, custom: [0, k] },
      { given: `$x^2 - ${k * k} = 0$`, a: '$x$', b: `$0$`, vars: ['x'], c: (v: any) => Math.abs(v.x * v.x - k * k) < 1e-9, fA: (v: any) => v.x, fB: () => 0, intro: `$x = ${k}$ or $x = -${k}$.`, lv: 3, custom: [k, -k] },
      { given: `$(x - ${k})(x + 1) = 0$`, a: '$x^2$', b: `$x$`, vars: ['x'], c: (v: any) => Math.abs((v.x - k) * (v.x + 1)) < 1e-9, fA: (v: any) => v.x * v.x, fB: (v: any) => v.x, intro: `$x = ${k}$ or $x = -1$.`, proof: [`If $x = ${k}$: $x^2 = ${k * k} > ${k}$. If $x = -1$: $x^2 = 1 > -1$.`], lv: 4, custom: [k, -1] },
      { given: `$x^2 + ${k + 1}x + ${k} = 0$`, a: '$x$', b: '$-1$', vars: ['x'], c: (v: any) => Math.abs(v.x * v.x + (k + 1) * v.x + k) < 1e-9, fA: (v: any) => v.x, fB: () => -1, intro: `$(x + 1)(x + ${k}) = 0$, so $x = -1$ or $x = -${k}$.`, proof: [`Both roots satisfy $x \\le -1$, but $x = -1$ gives equality and $x = -${k}$ gives $x < -1$.`], lv: 5, custom: [-1, -k] },
    ];
    const t = rng.pick(T.filter((x) => Math.abs(x.lv - level) <= 1));
    // QC engine needs candidate values; roots may not be in the pool, so evaluate on the explicit root set.
    const vals = t.custom;
    const rels = new Set(vals.map((x) => { const a = t.fA({ x }), b = t.fB({ x }); return Math.abs(a - b) < 1e-9 ? 'C' : a > b ? 'A' : 'B'; }));
    const rel = rels.size === 1 ? [...rels][0] : 'D';
    const expl = [t.intro, ...vals.map((x) => { const a = t.fA({ x }), b = t.fB({ x }); return `If $x = ${x}$: Quantity A $= ${a}$, Quantity B $= ${b}$ → ${Math.abs(a - b) < 1e-9 ? 'equal' : a > b ? 'A is greater' : 'B is greater'}.`; })];
    expl.push(rel === 'D' ? 'Different roots give different relationships, so the answer is **(D)**.' : `Every root gives the same relationship — answer **(${rel})**.`);
    return {
      format: 'qc', stem: '', qc: { given: t.given, a: t.a, b: t.b }, answer: { A: 0, B: 1, C: 2, D: 3 }[rel as 'A'],
      explanation: expl,
      trap: 'Dividing both sides by a variable (losing the root 0) or considering only one root.',
      hints: H('Solve the equation completely — find every root.', 'Set the equation equal to zero and factor.', 'Compare the quantities for each root separately.'),
    };
  },
});

const vieta: Generator = gen({
  id: G('quad.vieta'), unit: 'al.quadratics', subtopic: 'Sum and product of roots', levels: [4, 5],
  skills: ['sum/product of roots'], concepts: ['Sum and product of roots', 'Polynomials'],
  generate(rng, level) {
    const r = rng.intNot(-7, 7, [0]), s = rng.intNot(-7, 7, [0, r]);
    const b = -(r + s), c = r * s;
    if (level === 4) {
      return {
        format: 'numeric', stem: `One solution of $x^2 + bx ${c < 0 ? '-' : '+'} ${Math.abs(c)} = 0$ is $x = ${r}$. What is the value of $b$?`, answer: numAns(b),
        explanation: [`Product of roots $= ${c}$, so the other root is $${c}/${r} = ${s}$.`, `Sum of roots $= -b = ${r + s}$, so $b = ${b}$.`, `Check: $(${r})^2 + (${b})(${r}) ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${r * r + b * r + c}$ ✓.`],
        trap: 'Sign error: the sum of roots is $-b$, not $b$.',
        hints: H('Substitute the known root into the equation.', 'Or: product of roots = c, sum = −b.', `$${r * r} + ${r}b + ${c} = 0$.`),
      };
    }
    const val = r * r + s * s;
    return {
      format: 'numeric', stem: `If $r$ and $s$ are the two solutions of $${poly([[1, 'x^2'], [b, 'x'], [c, '']])} = 0$, what is $r^2 + s^2$?`, answer: numAns(val),
      explanation: [`$r + s = ${r + s}$ and $rs = ${c}$.`, `$r^2 + s^2 = (r + s)^2 - 2rs = ${(r + s) ** 2} - ${2 * c} = ${val}$.`],
      trap: 'Squaring the sum without subtracting 2rs.',
      hints: H('You do not need the individual roots.', 'Use $r^2 + s^2 = (r+s)^2 - 2rs$.', `$r + s = ${r + s}$, $rs = ${c}$.`),
    };
  },
});

// ===================== Exponents & radicals (algebraic) =====================
const expEquation: Generator = gen({
  id: G('exp.equation'), unit: 'al.exponents', subtopic: 'Exponential equations', levels: [3, 4, 5],
  skills: ['common base equations'], concepts: ['Exponential equations', 'Exponents'],
  generate(rng, level) {
    const base = rng.pick([2, 3]);
    const p = rng.pick([2, 3]), q = rng.pick([1, 2, 3].filter((x) => x !== p));
    const B1 = base ** p, B2 = base ** q;
    const a = rng.int(1, 4), b = rng.int(-4, 4);
    // B1^{x + a} = B2^{x + b}  ->  p(x + a) = q(x + b) -> x = (q b - p a)/(p - q)
    const x = new Frac(q * b - p * a, p - q);
    if (level === 5) {
      const n = rng.int(3, 9);
      return {
        format: 'numeric', stem: base === 3 ? `If $3^{x} + 3^{x} + 3^{x} = 3^{${n}}$, what is the value of $x$?` : `If $2^{x} + 2^{x} + 2^{x} + 2^{x} = 4^{${n}}$, what is the value of $x$?`,
        answer: numAns(base === 3 ? n - 1 : 2 * n - 2),
        explanation: base === 3 ? [`$3^x + 3^x + 3^x = 3\\cdot 3^x = 3^{x+1}$.`, `$3^{x+1} = 3^{${n}} \\Rightarrow x = ${n - 1}$.`] : [`Four copies: $4\\cdot 2^x = 2^{x+2}$.`, `$4^{${n}} = 2^{${2 * n}}$, so $x + 2 = ${2 * n}$ and $x = ${2 * n - 2}$.`],
        trap: 'Treating the sum of equal powers as a single power with a multiplied exponent.',
        hints: H('Combine the identical terms first.', 'k copies of $b^x$ equal $k\\cdot b^x$.', 'Rewrite everything with the same base.'),
      };
    }
    return {
      format: 'numeric', stem: `If $${B1}^{x ${a < 0 ? '-' : '+'} ${Math.abs(a)}} = ${B2}^{x ${b < 0 ? '-' : '+'} ${Math.abs(b)}}$, what is the value of $x$?${x.isInt() ? '' : ' Give your answer as a fraction.'}`.replace('+ 0', '').replace('- 0', ''),
      answer: x.isInt() ? numAns(x.value) : fracAns(x.n, x.d),
      explanation: [`Rewrite with base ${base}: $${B1} = ${base}^{${p}}$ and $${B2} = ${base}^{${q}}$.`, `$${p}(x + ${a}) = ${q}(x + ${b})$.`, `$${p - q}x = ${q * b - p * a}$, so $x = ${x.tex()}$.`],
      trap: 'Setting exponents equal before the bases match.',
      hints: H('Make the bases the same.', `Both ${B1} and ${B2} are powers of ${base}.`, 'Then set the exponents equal.'),
    };
  },
});

const expRules: Generator = gen({
  id: G('exp.rules'), unit: 'al.exponents', subtopic: 'Exponents', levels: [2, 3, 4],
  skills: ['power rules'], concepts: ['Exponents', 'Simplification'],
  generate(rng, level) {
    const a = rng.int(1, 5), b = rng.int(1, 4), c = rng.int(2, 3), d = rng.int(1, 6), e = rng.int(1, 8);
    const X = a * c - d, Y = b * c - e;
    const mono = (x: number, y: number) => {
      const t = (v: string, k: number) => (k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`);
      if (x >= 0 && y >= 0) return `${t('x', x)}${t('y', y)}` || '1';
      const num = `${x > 0 ? t('x', x) : ''}${y > 0 ? t('y', y) : ''}` || '1';
      const den = `${x < 0 ? t('x', -x) : ''}${y < 0 ? t('y', -y) : ''}`;
      return `\\dfrac{${num}}{${den}}`;
    };
    return {
      format: 'mcq', stem: `For nonzero $x$ and $y$, $\\dfrac{(x^{${a}}y^{${b}})^{${c}}}{x^{${d}}y^{${e}}} =$`,
      ...textMcq(rng, `$${mono(X, Y)}$`, [{ t: `$${mono(a + c - d, b + c - e)}$`, note: 'Added the outer exponent instead of multiplying.' }, `$${mono(a * c + d, b * c + e)}$`, `$${mono(X, b * c + e)}$`, `$${mono(Math.round(a * c / d) || 1, Y + 1)}$`]),
      explanation: [`Power of a power: $(x^{${a}}y^{${b}})^{${c}} = x^{${a * c}}y^{${b * c}}$.`, `Quotient rule: $x^{${a * c} - ${d}}y^{${b * c} - ${e}} = x^{${X}}y^{${Y}}$${X < 0 || Y < 0 ? ', and a negative exponent moves the factor to the denominator' : ''}.`],
      trap: 'Adding exponents when raising a power to a power.',
      hints: H('$(x^m)^n = x^{mn}$.', '$x^m / x^n = x^{m-n}$.', `Start with $(x^{${a}})^{${c}} = x^{${a * c}}$.`),
    };
  },
});

const fracExp: Generator = gen({
  id: G('exp.fractional'), unit: 'al.exponents', subtopic: 'Radicals', levels: [3, 4],
  skills: ['fractional & negative exponents'], concepts: ['Radicals', 'Exponents'],
  generate(rng, level) {
    const opts = [[8, 3], [27, 3], [16, 4], [32, 5], [64, 3], [64, 6], [81, 4], [125, 3], [4, 2], [9, 2], [25, 2], [16, 2]];
    const [n, r] = rng.pick(opts);
    const root = Math.round(n ** (1 / r));
    const p = rng.pick([1, 2, 3].filter((x) => gcd(x, r) === 1 || x === 1));
    const neg = level === 4;
    const val = root ** p;
    const ans = neg ? new Frac(1, val) : new Frac(val);
    return {
      format: 'numeric', stem: `What is the value of $${n}^{${neg ? '-' : ''}${p === 1 ? `1/${r}` : `${p}/${r}`}}$?${neg ? ' Give your answer as a fraction.' : ''}`,
      answer: neg ? fracAns(1, val) : numAns(val),
      explanation: [`The denominator ${r} means a ${r === 2 ? 'square' : r === 3 ? 'cube' : `${r}th`} root: $\\sqrt[${r}]{${n}} = ${root}$.`, `Raise to the power ${p}: $${root}^{${p}} = ${val}$.`, ...(neg ? [`The negative exponent takes the reciprocal: $${ans.tex()}$.`] : [])],
      trap: neg ? 'Treating the negative exponent as making the value negative.' : 'Multiplying the base by the fraction instead of taking a root.',
      hints: H('$a^{m/n} = (\\sqrt[n]{a})^m$.', neg ? '$a^{-k} = 1/a^k$.' : 'Take the root first, then the power.', `$\\sqrt[${r}]{${n}} = ${root}$.`),
    };
  },
});

// ===================== Rational expressions =====================
const rationalSimplify: Generator = gen({
  id: G('rat.simplify'), unit: 'al.rational', subtopic: 'Rational expressions', levels: [3, 4],
  skills: ['cancelling common factors'], concepts: ['Rational expressions', 'Factoring'],
  generate(rng, level) {
    const r = rng.intNot(-6, 6, [0]), s = rng.intNot(-6, 6, [0, r]), t = rng.intNot(-6, 6, [0, r, s]);
    const num = poly([[1, 'x^2'], [-(r + s), 'x'], [r * s, '']]);
    const den = poly([[1, 'x^2'], [-(r + t), 'x'], [r * t, '']]);
    const f = (u: number) => `x ${u < 0 ? '+' : '-'} ${Math.abs(u)}`;
    const restrict = level === 4;
    if (restrict) {
      const cands = [r, t, s, -r, -t, 0].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
      return {
        format: 'multi', stem: `For which of the following values of $x$ is $\\dfrac{${num}}{${den}}$ **undefined**? Indicate all such values.`,
        ...multiSel(rng, cands.map((v) => ({ t: `$${v}$`, ok: v === r || v === t, v, note: v === s ? `$x = ${s}$ makes the numerator zero (value 0), which is defined.` : undefined }))),
        explanation: [`Denominator: $${den} = (${f(r)})(${f(t)})$.`, `It is zero at $x = ${r}$ and $x = ${t}$. Cancelling the common factor does **not** remove the restriction $x \\ne ${r}$.`],
        trap: `Cancelling $(${f(r)})$ first and forgetting that $x = ${r}$ is still excluded.`,
        hints: H('A fraction is undefined when its denominator is 0.', 'Factor the denominator.', 'Restrictions come from the original expression, before cancelling.'),
      };
    }
    return {
      format: 'mcq', stem: `For all $x$ for which the expression is defined, $\\dfrac{${num}}{${den}} =$`,
      ...textMcq(rng, `$\\dfrac{${f(s)}}{${f(t)}}$`, [{ t: `$\\dfrac{${f(t)}}{${f(s)}}$`, note: 'Inverted the result.' }, `$\\dfrac{${f(-s)}}{${f(-t)}}$`, `$\\dfrac{${f(r)}}{${f(t)}}$`, `$\\dfrac{${s}}{${t}}$`]),
      explanation: [`Numerator: $(${f(r)})(${f(s)})$. Denominator: $(${f(r)})(${f(t)})$.`, `Cancel the common factor $(${f(r)})$: $\\dfrac{${f(s)}}{${f(t)}}$.`],
      trap: 'Cancelling individual terms (like $x^2$) instead of whole factors.',
      hints: H('Factor numerator and denominator.', 'Cancel only common factors, never terms.', `Both contain the factor $(${f(r)})$.`),
    };
  },
});

const rationalSolve: Generator = gen({
  id: G('rat.solve'), unit: 'al.rational', subtopic: 'Algebraic fractions', levels: [3, 4, 5],
  skills: ['cross-multiplication', 'extraneous roots'], concepts: ['Algebraic fractions', 'Restrictions on variables'],
  generate(rng, level) {
    if (level === 5) {
      // x/(x-a) + a/(x-a)... produce extraneous root: (x^2)/(x - a) = a^2/(x - a)  -> x = -a only
      const a = rng.int(2, 9);
      return {
        format: 'numeric', stem: `What value of $x$ satisfies $\\dfrac{x^2}{x - ${a}} = \\dfrac{${a * a}}{x - ${a}}$?`, answer: numAns(-a),
        explanation: [`Multiply by $x - ${a}$ (valid only if $x \\ne ${a}$): $x^2 = ${a * a}$, so $x = \\pm ${a}$.`, `$x = ${a}$ makes the denominators zero — it is extraneous. Only $x = -${a}$ works.`],
        trap: `Accepting $x = ${a}$, which makes the original expressions undefined.`,
        hints: H('Note any values that make a denominator zero.', 'Clear the denominators.', 'Check each candidate in the original equation.'),
      };
    }
    const a = rng.int(2, 7), b = rng.int(2, 9), c = rng.int(1, 6), d = rng.int(1, 6);
    if (a === b) return rationalSolve.generate(rng, level);
    // a/(x + c) = b/(x - d) -> a(x - d) = b(x + c) -> (a - b) x = a d + b c
    const x = new Frac(a * d + b * c, a - b);
    if (x.value === -c || x.value === d) return rationalSolve.generate(rng, level);
    return {
      format: 'numeric', stem: `If $\\dfrac{${a}}{x + ${c}} = \\dfrac{${b}}{x - ${d}}$, what is the value of $x$?${x.isInt() ? '' : ' Give your answer as a fraction.'}`, answer: x.isInt() ? numAns(x.value) : fracAns(x.n, x.d),
      explanation: [`Cross-multiply: $${a}(x - ${d}) = ${b}(x + ${c})$.`, `$${a}x - ${a * d} = ${b}x + ${b * c} \\Rightarrow ${a - b}x = ${a * d + b * c}$.`, `$x = ${x.tex()}$ (it does not make a denominator zero).`],
      trap: 'Distributing the constant only to the x-term.',
      hints: H('Cross-multiply.', 'Expand both sides carefully.', `$${a}(x - ${d}) = ${b}(x + ${c})$.`),
    };
  },
});

// ===================== Functions =====================
const fnEval: Generator = gen({
  id: G('fn.eval'), unit: 'al.functions', subtopic: 'Function notation', levels: [1, 2, 3, 4],
  skills: ['evaluating functions', 'composition'], concepts: ['Functions', 'Function notation', 'Composite functions'],
  generate(rng, level) {
    const a = rng.int(2, 5), b = rng.intNot(-6, 6, [0]), m = rng.int(2, 4), k = rng.int(-4, 5);
    const f = (x: number) => a * x * x + b;
    const g = (x: number) => m * x - 1;
    if (level === 1) {
      return { format: 'numeric', stem: `If $f(x) = ${a}x^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, what is $f(${k})$?`, answer: numAns(f(k)), explanation: [`$f(${k}) = ${a}(${k})^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${a * k * k} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${f(k)}$.`], trap: 'Squaring a negative input incorrectly.', hints: H(`Replace every $x$ with $(${k})$.`, 'Square before multiplying by the coefficient.', `$(${k})^2 = ${k * k}$.`) };
    }
    if (level === 2) {
      return { format: 'numeric', stem: `If $f(x) = ${a}x^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}$ and $g(x) = ${m}x - 1$, what is $f(g(${k}))$?`, answer: numAns(f(g(k))), explanation: [`Inner first: $g(${k}) = ${g(k)}$.`, `$f(${g(k)}) = ${a}(${g(k)})^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${f(g(k))}$.`], trap: 'Evaluating the outer function first, i.e. computing g(f(k)).', hints: H('Work from the inside out.', `Compute $g(${k})$ first.`, `$g(${k}) = ${g(k)}$.`) };
    }
    if (level === 3) {
      // f(x) = px + q; f(2x) in terms of f? Or f(t) = value find t
      const p = rng.int(2, 7), q = rng.int(-9, 9), t = rng.int(-5, 8);
      return { format: 'numeric', stem: `The function $h$ is defined by $h(x) = ${lin(p, q)}$. If $h(3t) = ${p * 3 * t + q}$, what is $h(t)$?`, answer: numAns(p * t + q), explanation: [`$h(3t) = ${3 * p}t ${q < 0 ? '-' : '+'} ${Math.abs(q)} = ${p * 3 * t + q} \\Rightarrow t = ${t}$.`, `$h(${t}) = ${p * t + q}$.`], trap: 'Answering t instead of h(t).', hints: H('Replace x with 3t in the rule.', 'Solve for t.', 'Then evaluate h(t).') };
    }
    // level 4: functional relation f(x+1) = f(x) + c
    const c = rng.int(2, 7), f0 = rng.int(-5, 10), n = rng.int(10, 40);
    return { format: 'numeric', stem: `A function $f$ satisfies $f(x + 1) = f(x) + ${c}$ for every $x$, and $f(0) = ${f0}$. What is $f(${n})$?`, answer: numAns(f0 + c * n), explanation: [`Each step of 1 in $x$ adds ${c} to $f$.`, `$f(${n}) = f(0) + ${n}\\cdot${c} = ${f0} + ${c * n} = ${f0 + c * n}$.`], trap: 'Off-by-one: there are n steps from 0 to n.', hints: H('Compute f(1), f(2), f(3) and look for a pattern.', `f increases by ${c} each step.`, `From 0 to ${n} there are ${n} steps.`) };
  },
});

const customOp: Generator = gen({
  id: G('fn.custom'), unit: 'al.functions', subtopic: 'Symbolic operators', levels: [2, 3, 4],
  skills: ['following a defined rule'], concepts: ['Symbolic operators', 'Substitution'],
  generate(rng, level) {
    const defs = [
      { tex: 'a \\star b = a^2 - ab', f: (a: number, b: number) => a * a - a * b, sym: '\\star' },
      { tex: 'a \\diamond b = 2a + b^2', f: (a: number, b: number) => 2 * a + b * b, sym: '\\diamond' },
      { tex: 'a \\odot b = \\dfrac{a + b}{ab}', f: (a: number, b: number) => (a + b) / (a * b), sym: '\\odot' },
      { tex: 'a \\# b = ab - a - b', f: (a: number, b: number) => a * b - a - b, sym: '\\#' },
    ];
    const d = rng.pick(level === 3 ? defs.slice(0, 2).concat(defs[3]) : defs.filter((x) => x.sym !== '\\odot' || level === 4));
    const x = rng.intNot(-4, 6, [0]), y = rng.intNot(-3, 5, [0]), z = rng.intNot(-3, 5, [0]);
    if (level <= 3) {
      const inner = d.f(y, z), v = d.f(x, inner);
      if (!Number.isFinite(v) || !Number.isInteger(v)) return customOp.generate(rng, level);
      return { format: 'numeric', stem: `For all numbers $a$ and $b$, $${d.tex}$. What is $${x} ${d.sym} (${y} ${d.sym} ${z})$?`, answer: numAns(v), explanation: [`Inner first: $${y} ${d.sym} ${z} = ${fmt(inner)}$.`, `Then $${x} ${d.sym} ${fmt(inner)} = ${fmt(v)}$.`], trap: 'Evaluating left to right instead of doing the parentheses first.', hints: H('Apply the definition to the parentheses first.', `Substitute $a = ${y}$, $b = ${z}$.`, `$${y} ${d.sym} ${z} = ${fmt(inner)}$.`) };
    }
    // level 4: solve for unknown: x ⋆ k = value
    const dd = defs[1];
    const k = rng.int(-5, 6), a = rng.int(1, 6);
    const v = dd.f(a, k);
    return {
      format: 'multi', stem: `For all numbers $a$ and $b$, $${dd.tex}$. If $${a} ${dd.sym} k = ${v}$, which of the following could be the value of $k$? Indicate all such values.`,
      ...multiSel(rng, [k, -k, k + 1, 2 * k || 3, -k - 1, v - 2 * a].filter((u, i, arr) => arr.indexOf(u) === i).slice(0, 6).map((u) => ({ t: `$${u}$`, ok: u * u === k * k, v: u, note: u === -k ? 'Both signs give the same square.' : undefined }))),
      explanation: [`$2(${a}) + k^2 = ${v} \\Rightarrow k^2 = ${v - 2 * a}$.`, `$k = \\pm ${Math.abs(k)}$${k === 0 ? ' (only 0)' : ''}.`],
      trap: 'Missing the negative square root.',
      hints: H('Write the definition with a = given value and b = k.', 'Solve the resulting equation for k.', `$k^2 = ${v - 2 * a}$.`),
    };
  },
});

// ===================== Coordinate lines =====================
const slope: Generator = gen({
  id: G('coord.slope'), unit: 'al.coordinate', subtopic: 'Slope', levels: [1, 2, 3],
  skills: ['slope formula', 'slope-intercept form'], concepts: ['Slope', 'Linear equations in graph form', 'Intercepts'],
  generate(rng, level) {
    const x1 = rng.int(-6, 6), y1 = rng.int(-6, 6);
    let x2 = rng.int(-6, 8); if (x2 === x1) x2 = x1 + 3;
    const y2 = rng.int(-6, 8);
    const m = new Frac(y2 - y1, x2 - x1);
    if (level === 1) {
      return { format: 'mcq', stem: `What is the slope of the line through $(${x1}, ${y1})$ and $(${x2}, ${y2})$?`, ...textMcq(rng, `$${m.tex()}$`, [{ t: `$${m.d === 0 ? 1 : new Frac(x2 - x1, (y2 - y1) || 1).tex()}$`, note: 'Computed run over rise.' }, `$${m.mul(-1).tex()}$`, `$${new Frac(y2 + y1, (x2 + x1) || 1).tex()}$`, `$${m.add(1).tex()}$`]), explanation: [`$m = \\dfrac{y_2 - y_1}{x_2 - x_1} = \\dfrac{${y2} - (${y1})}{${x2} - (${x1})} = ${m.tex()}$.`], trap: 'Putting the x-difference on top (run over rise).', hints: H('Slope = rise over run.', 'Subtract y-values on top and x-values on bottom in the same order.', `Rise $= ${y2 - y1}$.`) };
    }
    const b = new Frac(y1).sub(m.mul(x1));
    if (level === 2) {
      return { format: 'numeric', stem: `A line passes through $(${x1}, ${y1})$ and $(${x2}, ${y2})$. What is its $y$-intercept?${b.isInt() ? '' : ' Give your answer as a fraction.'}`, answer: b.isInt() ? numAns(b.value) : fracAns(b.n, b.d), explanation: [`Slope $m = ${m.tex()}$.`, `$y = mx + b$: $${y1} = ${m.tex()}(${x1}) + b$, so $b = ${b.tex()}$.`], trap: 'Using the x-intercept or mixing the order of coordinates.', hints: H('Find the slope first.', 'Substitute one point into y = mx + b.', `$m = ${m.tex()}$.`) };
    }
    // level 3: point on line - find k
    const xk = x1 + (x2 - x1) * rng.pick([2, 3, -1]);
    const yk = m.mul(xk).add(b);
    return { format: 'numeric', stem: `The points $(${x1}, ${y1})$, $(${x2}, ${y2})$, and $(${xk}, k)$ lie on the same line. What is $k$?${yk.isInt() ? '' : ' Give your answer as a fraction.'}`, answer: yk.isInt() ? numAns(yk.value) : fracAns(yk.n, yk.d), explanation: [`Slope $= ${m.tex()}$.`, `From $(${x1}, ${y1})$ to $(${xk}, k)$: $k = ${y1} + ${m.tex()}\\cdot(${xk - x1}) = ${yk.tex()}$.`], trap: 'Using a different slope for the second pair of points.', hints: H('Collinear points share one slope.', 'Set the slope from point 1 to point 3 equal to the known slope.', `The known slope is $${m.tex()}$.`) };
  },
});

const intercepts: Generator = gen({
  id: G('coord.intercepts'), unit: 'al.coordinate', subtopic: 'Intercepts', levels: [2, 3, 4],
  skills: ['intercepts', 'triangle area from a line'], concepts: ['Intercepts', 'Coordinate plane'],
  generate(rng, level) {
    const p = rng.int(2, 6), q = rng.int(2, 6), xi = rng.intNot(-6, 6, [0]), yi = rng.intNot(-6, 6, [0]);
    // line through (xi,0),(0,yi): x/xi + y/yi = 1 -> multiply by L
    const A = yi, B = xi, C = xi * yi; // yi x + xi y = xi yi
    const g = gcd(gcd(Math.abs(A), Math.abs(B)), Math.abs(C)) || 1;
    const eq = `${poly([[A / g, 'x'], [B / g, 'y']])} = ${C / g}`;
    void p; void q;
    if (level === 2) {
      return { format: 'numeric', stem: `What is the $x$-intercept of the line $${eq}$?`, answer: numAns(xi), explanation: ['Set $y = 0$ and solve for $x$.', `$${A / g}x = ${C / g} \\Rightarrow x = ${xi}$.`], trap: 'Setting x = 0 (that gives the y-intercept).', hints: H('The x-intercept has y = 0.', 'Substitute y = 0.', `$${A / g}x = ${C / g}$.`) };
    }
    if (level === 3) {
      const area = Math.abs(xi * yi) / 2;
      return { format: 'numeric', stem: `What is the area of the triangle bounded by the line $${eq}$ and the two coordinate axes?`, answer: numAns(area), explanation: [`x-intercept: $${xi}$; y-intercept: $${yi}$.`, `The triangle has legs $${Math.abs(xi)}$ and $${Math.abs(yi)}$: area $= \\tfrac12 \\cdot ${Math.abs(xi)} \\cdot ${Math.abs(yi)} = ${fmt(area)}$.`], trap: 'Using signed intercepts and getting a negative area.', hints: H('Find both intercepts.', 'The axes form a right angle.', 'Area = ½ × |x-intercept| × |y-intercept|.') };
    }
    return qcOutput({
      given: `Line $\\ell$ has a positive $y$-intercept and a negative $x$-intercept. Line $\\ell$ has slope $m$ and $y$-intercept $b$.`,
      a: '$m$', b: '$0$', vars: [{ name: 'x0', kind: 'real' }, { name: 'y0', kind: 'real' }],
      constraint: (v) => v.x0 < 0 && v.y0 > 0, fA: (v) => -v.y0 / v.x0, fB: () => 0,
      proof: ['The line passes through $(x_0, 0)$ with $x_0 < 0$ and $(0, b)$ with $b > 0$.', 'Slope $= \\dfrac{b - 0}{0 - x_0} = \\dfrac{b}{-x_0}$: positive over positive.'],
      trap: 'Guessing the sign of the slope without sketching the line.',
      hints: H('Sketch the two intercepts.', 'Moving right from the x-intercept to the y-intercept, does the line rise or fall?', 'Slope = rise/run between the intercepts.'),
    });
  },
});

const perpendicular: Generator = gen({
  id: G('coord.perp'), unit: 'al.coordinate', subtopic: 'Parallel and perpendicular slopes', levels: [3, 4],
  skills: ['negative reciprocal slopes'], concepts: ['Parallel and perpendicular slopes', 'Slope'],
  generate(rng, level) {
    const n = rng.intNot(-4, 4, [0]), d = rng.int(1, 4);
    const m = new Frac(n, d);
    const perp = new Frac(-d, n);
    const px = rng.int(-6, 6), py = rng.int(-6, 6);
    const isPerp = level === 4 || rng.bool();
    const slope = isPerp ? perp : m;
    const b = new Frac(py).sub(slope.mul(px));
    return {
      format: 'numeric', stem: `Line $k$ passes through $(${px}, ${py})$ and is ${isPerp ? 'perpendicular' : 'parallel'} to the line $y = ${m.tex()}x ${rng.bool() ? '+ 3' : '- 1'}$. What is the $y$-intercept of line $k$?${b.isInt() ? '' : ' Give your answer as a fraction.'}`,
      answer: b.isInt() ? numAns(b.value) : fracAns(b.n, b.d),
      explanation: [isPerp ? `Perpendicular slopes are negative reciprocals: $-\\dfrac{1}{${m.tex()}} = ${perp.tex()}$.` : `Parallel lines share the slope $${m.tex()}$.`, `$${py} = ${slope.tex()}(${px}) + b \\Rightarrow b = ${b.tex()}$.`],
      trap: isPerp ? 'Using the reciprocal without changing the sign (or the negative without inverting).' : 'Copying the y-intercept of the given line.',
      hints: H(isPerp ? 'Perpendicular slopes multiply to −1.' : 'Parallel lines have equal slopes.', 'Use point-slope form with the given point.', `The slope of k is $${slope.tex()}$.`),
    };
  },
});

// ===================== Algebra QC (variables) =====================
const algQc: Generator = gen({
  id: G('qc.vars'), unit: 'al.inequalities', subtopic: 'Comparing algebraic quantities', levels: [3, 4, 5],
  skills: ['case testing', 'algebraic comparison'], concepts: ['Testing positive and negative values', 'Testing fractions', 'Linear inequalities'],
  generate(rng, level) {
    const k = rng.int(2, 6);
    const T = [
      { given: `$x > ${k}$`, a: `$${k}x$`, b: '$x^2$', v: ['x'], c: (v: any) => v.x > k, fA: (v: any) => k * v.x, fB: (v: any) => v.x * v.x, proof: [`$x^2 - ${k}x = x(x - ${k})$, and both factors are positive when $x > ${k}$.`], lv: 3 },
      { given: '$x > y$', a: '$x - y$', b: '$y - x$', v: ['x', 'y'], c: (v: any) => v.x > v.y, fA: (v: any) => v.x - v.y, fB: (v: any) => v.y - v.x, proof: ['$x - y > 0$, and $y - x$ is its negative.'], lv: 3 },
      { given: '$0 < x < 1$', a: '$\\dfrac{1}{x}$', b: '$x^2$', v: ['x'], c: (v: any) => v.x > 0 && v.x < 1, fA: (v: any) => 1 / v.x, fB: (v: any) => v.x * v.x, proof: ['For $0 < x < 1$: $1/x > 1$ while $x^2 < 1$.'], lv: 3 },
      { given: '$x \\ne 0$', a: '$x + \\dfrac{1}{x}$', b: '$2$', v: ['x'], c: (v: any) => v.x !== 0, fA: (v: any) => v.x + 1 / v.x, fB: () => 2, lv: 4 },
      { given: '$x > 0$', a: '$x + \\dfrac{1}{x}$', b: '$2$', v: ['x'], c: (v: any) => v.x > 0, fA: (v: any) => v.x + 1 / v.x, fB: () => 2, lv: 5 },
      { given: '$a > b$', a: '$a^2$', b: '$b^2$', v: ['a', 'b'], c: (v: any) => v.a > v.b, fA: (v: any) => v.a ** 2, fB: (v: any) => v.b ** 2, lv: 4 },
      { given: `$${k}x + 3 > ${k}y + 3$`, a: '$x$', b: '$y$', v: ['x', 'y'], c: (v: any) => k * v.x + 3 > k * v.y + 3, fA: (v: any) => v.x, fB: (v: any) => v.y, proof: [`Subtract 3 and divide by the positive number ${k}: $x > y$.`], lv: 3 },
      { given: `$-${k}x > -${k}y$`, a: '$x$', b: '$y$', v: ['x', 'y'], c: (v: any) => -k * v.x > -k * v.y, fA: (v: any) => v.x, fB: (v: any) => v.y, proof: [`Divide by $-${k}$ and **reverse** the inequality: $x < y$.`], lv: 4 },
      { given: '$x < 0$', a: '$|x|$', b: '$-x$', v: ['x'], c: (v: any) => v.x < 0, fA: (v: any) => Math.abs(v.x), fB: (v: any) => -v.x, proof: ['For negative $x$, $|x| = -x$ by definition.'], lv: 4 },
      { given: '$x^2 > x$', a: '$x$', b: '$1$', v: ['x'], c: (v: any) => v.x * v.x > v.x, fA: (v: any) => v.x, fB: () => 1, lv: 5 },
      { given: '$xy \\ne 0$', a: '$\\dfrac{x}{y}$', b: '$\\dfrac{y}{x}$', v: ['x', 'y'], c: (v: any) => v.x * v.y !== 0, fA: (v: any) => v.x / v.y, fB: (v: any) => v.y / v.x, lv: 4 },
      { given: '$x$ is an integer and $x^3 < x^2$', a: '$x$', b: '$0$', v: ['x'], int: true, c: (v: any) => v.x ** 3 < v.x ** 2, fA: (v: any) => v.x, fB: () => 0, proof: ['$x^3 < x^2 \\Rightarrow x^2(x - 1) < 0$, so $x \\ne 0$ and $x < 1$. Among integers, that means $x \\le -1$.'], lv: 5 },
    ];
    const t = rng.pick(T.filter((x) => Math.abs(x.lv - level) <= 1));
    return qcOutput({
      given: t.given, a: t.a, b: t.b, vars: t.v.map((n) => ({ name: n, kind: (t as any).int ? 'int' : 'real' })),
      constraint: t.c, fA: t.fA, fB: t.fB, proof: t.proof,
      trap: 'Plugging in only one convenient number (like 2) and declaring a relationship. Always test negatives, fractions, and zero when allowed.',
      hints: H('What values are actually allowed by the given condition?', 'Try a positive integer, a fraction between 0 and 1, and a negative number.', 'If two allowed values give different relationships, the answer is (D).'),
    });
  },
});

export const ALGEBRA: Generator[] = [substitution, expandSimplify, combination, identities, linearSolve, literalEq, solutionCount, ineqSolve, absIneq, ineqRange, systemSolve, systemCombo, quadRoots, factoring, diffSquares, quadQc, vieta, expEquation, expRules, fracExp, rationalSimplify, rationalSolve, fnEval, customOp, slope, intercepts, perpendicular, algQc];
void tnum;
