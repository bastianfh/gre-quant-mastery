import { Frac, fmt, gcd, round, simplifySqrt, sqrtStr, tnum } from '../../lib/math';
import type { GeoDiagram, Generator, Pt } from '../types';
import { H, fracAns, gen, multiSel, numAns, numMcq, textMcq } from './helpers';
import { qcNumeric, qcOutput } from './qc';

const Gm = (id: string) => `ge.${id}`;
const P = (x: number, y: number): Pt => ({ x, y });
const rad = (d: number) => (d * Math.PI) / 180;
const piTex = (k: Frac | number) => {
  const f = k instanceof Frac ? k : new Frac(k);
  if (f.n === 0) return '0';
  if (f.d === 1) return f.n === 1 ? '\\pi' : `${f.n}\\pi`;
  return `${f.n === 1 ? '' : f.n}\\pi/${f.d}`.replace(/^\\pi/, '\\pi');
};
const piFrac = (k: Frac) => (k.d === 1 ? (k.n === 1 ? '\\pi' : `${k.n}\\pi`) : `\\dfrac{${k.n === 1 ? '' : k.n}\\pi}{${k.d}}`);
const NOTE = 'Note: Figure not necessarily drawn to scale.';

function triangle(A: Pt, B: Pt, C: Pt, opts: Partial<GeoDiagram> = {}): GeoDiagram {
  return { kind: 'geo', width: 320, height: 220, polygons: [{ pts: [A, B, C] }], ...opts };
}

// ===================== Lines & angles =====================
const parallel: Generator = gen({
  id: Gm('lines.parallel'), unit: 'ge.lines', subtopic: 'Parallel and perpendicular lines', levels: [1, 2, 3],
  skills: ['corresponding/alternate angles'], concepts: ['Parallel and perpendicular lines', 'Transversals'],
  generate(rng, level) {
    const a = rng.int(35, 80);
    const xs = 1 / Math.tan(rad(a));
    const L1 = 0, L2 = 2.2;
    const p1 = P(2, L1), p2 = P(2 + xs * L2, L2);
    const kind = rng.pick(level === 1 ? ['corresponding', 'alternate'] : ['co-interior', 'alternate', 'vertical-supp']);
    let ans: number, rel: string;
    if (kind === 'corresponding') { ans = a; rel = 'Corresponding angles are equal.'; }
    else if (kind === 'alternate') { ans = a; rel = 'Alternate interior angles are equal.'; }
    else if (kind === 'co-interior') { ans = 180 - a; rel = 'Co-interior (same-side interior) angles are supplementary.'; }
    else { ans = 180 - a; rel = 'The marked angle forms a linear pair with an angle equal to the given one.'; }
    // label positions
    const labelA = { at: P(p1.x + 0.55, p1.y + 0.25), text: `${a}°` }; // angle above line 1, right of transversal (interior)
    const labelX = kind === 'corresponding' ? { at: P(p2.x + 0.55, p2.y + 0.25), text: 'x°' }
      : kind === 'alternate' ? { at: P(p2.x - 0.6, p2.y - 0.3), text: 'x°' }
      : kind === 'co-interior' ? { at: P(p2.x + 0.4, p2.y - 0.35), text: 'x°' }
      : { at: P(p1.x - 0.6, p1.y + 0.25), text: 'x°' };
    const diagram: GeoDiagram = {
      kind: 'geo', width: 340, height: 200,
      segments: [{ a: P(-0.5, L1), b: P(6.5, L1) }, { a: P(-0.5, L2), b: P(6.5, L2) }, { a: P(2 - xs * 0.8, -0.8), b: P(2 + xs * 3, L2 + 0.8) }],
      labels: [labelA, labelX, { at: P(6.6, L1), text: 'ℓ', anchor: 'start' }, { at: P(6.6, L2), text: 'm', anchor: 'start' }],
      note: level >= 2 ? NOTE : undefined,
    };
    if (level === 3) {
      const k = rng.int(2, 4), c = ans - k * Math.floor(ans / k / 2) * 2;
      // express x as (k y + c) and ask y
      const y = (ans - c) / k;
      return {
        format: 'numeric', stem: `In the figure, line $\\ell$ is parallel to line $m$. If $x = ${k}y + ${c}$, what is the value of $y$?`, diagram, answer: numAns(y),
        explanation: [rel, `So $x = ${ans}$, and $${k}y + ${c} = ${ans} \\Rightarrow y = ${fmt(y)}$.`],
        trap: 'Treating supplementary angles as equal (or vice versa).',
        hints: H('Identify the angle relationship created by the transversal.', 'Equal angles look alike (both acute or both obtuse); otherwise they are supplementary.', rel),
      };
    }
    return {
      format: 'numeric', stem: 'In the figure, line $\\ell$ is parallel to line $m$. What is the value of $x$?', diagram, answer: numAns(ans),
      explanation: [rel, `Therefore $x = ${ans}$.`],
      trap: 'Assuming every pair of angles at a transversal is equal; one acute and one obtuse angle are supplementary.',
      hints: H('With parallel lines, every acute angle is equal and every obtuse angle is equal.', 'An acute angle and an obtuse angle sum to 180°.', `Is $x$ acute or obtuse?`),
    };
  },
});

const anglesAlgebra: Generator = gen({
  id: Gm('lines.angles'), unit: 'ge.lines', subtopic: 'Vertical and supplementary angles', levels: [2, 3],
  skills: ['angle equations'], concepts: ['Lines and angles', 'Vertical and supplementary angles'],
  generate(rng, level) {
    const n = level === 2 ? 2 : 3;
    const xs = Array.from({ length: n }, () => rng.int(2, 6));
    const cs = Array.from({ length: n }, () => rng.int(-15, 25));
    const total = level === 2 ? 180 : 360;
    // sum(xs) x + sum(cs) = total
    const sx = xs.reduce((a, b) => a + b, 0), sc = cs.reduce((a, b) => a + b, 0);
    const x = new Frac(total - sc, sx);
    if (!x.isInt() || x.value <= 0) return anglesAlgebra.generate(rng, level);
    const angles = xs.map((k, i) => k * x.value + cs[i]);
    if (angles.some((a) => a <= 5 || a >= 175)) return anglesAlgebra.generate(rng, level);
    const exprs = xs.map((k, i) => `(${k}x ${cs[i] < 0 ? '-' : '+'} ${Math.abs(cs[i])})°`);
    const target = rng.int(0, n - 1);
    // diagram: rays from origin
    let acc = 0;
    const rays: Pt[] = [P(2, 0)];
    const labels = [] as GeoDiagram['labels'] & object[];
    for (let i = 0; i < n; i++) {
      const mid = acc + angles[i] / 2;
      labels.push({ at: P(0.9 * Math.cos(rad(mid)), 0.9 * Math.sin(rad(mid))), text: exprs[i].replace(/[()]/g, '') });
      acc += angles[i];
      rays.push(P(2 * Math.cos(rad(acc)), 2 * Math.sin(rad(acc))));
    }
    const diagram: GeoDiagram = {
      kind: 'geo', width: 320, height: level === 2 ? 170 : 260,
      segments: level === 2 ? [{ a: P(-2, 0), b: P(2, 0) }, { a: P(0, 0), b: rays[1] }] : rays.slice(0, n).map((r) => ({ a: P(0, 0), b: r })),
      points: [{ p: P(0, 0) }], labels, note: NOTE,
    };
    return {
      format: 'numeric', stem: level === 2 ? 'In the figure, the two angles lie on a straight line. What is the measure, in degrees, of the larger angle?' : `In the figure, three angles meet at a point and fill the full turn around it. What is the value of $${xs[target]}x ${cs[target] < 0 ? '-' : '+'} ${Math.abs(cs[target])}$?`,
      diagram, answer: numAns(level === 2 ? Math.max(...angles) : angles[target]),
      explanation: [`The angles sum to ${total}°: $${xs.map((k, i) => `(${k}x ${cs[i] < 0 ? '-' : '+'} ${Math.abs(cs[i])})`).join(' + ')} = ${total}$.`, `$${sx}x ${sc < 0 ? '-' : '+'} ${Math.abs(sc)} = ${total} \\Rightarrow x = ${x.value}$.`, `Angles: ${angles.join('°, ')}°.`],
      trap: 'Solving for x and reporting x instead of the requested angle.',
      hints: H(level === 2 ? 'Angles on a straight line sum to 180°.' : 'Angles around a point sum to 360°.', 'Write one equation in x.', `Combine: $${sx}x ${sc < 0 ? '-' : '+'} ${Math.abs(sc)}$.`),
    };
  },
});

// ===================== Triangles =====================
const triAngles: Generator = gen({
  id: Gm('tri.angles'), unit: 'ge.triangles', subtopic: 'Triangles', levels: [1, 2, 3],
  skills: ['angle sum', 'exterior angle theorem'], concepts: ['Triangles', 'Isosceles and equilateral triangles'],
  generate(rng, level) {
    if (level === 1) {
      const a = rng.int(30, 80), b = rng.int(30, 140 - a);
      const c = 180 - a - b;
      const A = P(0, 0), B = P(4, 0);
      const C = P((4 * Math.tan(rad(b))) / (Math.tan(rad(a)) + Math.tan(rad(b))), (4 * Math.tan(rad(a)) * Math.tan(rad(b))) / (Math.tan(rad(a)) + Math.tan(rad(b))));
      return {
        format: 'numeric', stem: 'In the triangle shown, what is the value of $x$?', answer: numAns(c),
        diagram: triangle(A, B, C, { labels: [{ at: P(A.x + 0.55, A.y + 0.18), text: `${a}°` }, { at: P(B.x - 0.55, B.y + 0.18), text: `${b}°` }, { at: P(C.x, C.y - 0.4), text: 'x°' }] }),
        explanation: [`Angles in a triangle sum to 180°: $x = 180 - ${a} - ${b} = ${c}$.`], trap: 'Using 360° instead of 180°.',
        hints: H('What do the angles of a triangle add to?', '180°.', `$180 - ${a} - ${b}$.`),
      };
    }
    if (level === 2) {
      const ext = rng.int(100, 160), a = rng.int(25, ext - 25);
      return {
        format: 'numeric', stem: `In triangle $PQR$, side $QR$ is extended past $R$ to point $S$. If $\\angle PRS = ${ext}°$ and $\\angle QPR = ${a}°$, what is the measure of $\\angle PQR$, in degrees?`, answer: numAns(ext - a),
        explanation: ['An exterior angle equals the sum of the two remote interior angles.', `$\\angle PQR = ${ext} - ${a} = ${ext - a}$.`],
        trap: 'Subtracting the exterior angle from 180° and stopping there.',
        hints: H('Use the exterior angle theorem.', 'Exterior angle = sum of the two non-adjacent interior angles.', `$${ext} = ${a} + \\angle PQR$.`),
      };
    }
    // isosceles with ratio
    const apex = rng.pick([20, 30, 36, 40, 44, 50, 70, 80, 100, 110, 120]);
    const base = (180 - apex) / 2;
    const askBase = rng.bool();
    return {
      format: 'numeric', stem: `In isosceles triangle $ABC$, $AB = AC$ and $\\angle ${askBase ? 'A' : 'B'} = ${askBase ? apex : base}°$. What is the measure of $\\angle ${askBase ? 'B' : 'A'}$, in degrees?`, answer: numAns(askBase ? base : apex),
      explanation: ['Equal sides are opposite equal angles, so $\\angle B = \\angle C$.', askBase ? `$\\angle B = (180 - ${apex})/2 = ${base}$.` : `$\\angle A = 180 - 2(${base}) = ${apex}$.`],
      trap: 'Making the wrong pair of angles equal — the equal angles are opposite the equal sides.',
      hints: H('Which angles are equal in an isosceles triangle?', 'The base angles (opposite the equal sides) are equal.', 'Here the base angles are B and C.'),
    };
  },
});

const triInequality: Generator = gen({
  id: Gm('tri.inequality'), unit: 'ge.triangles', subtopic: 'Triangle inequalities', levels: [2, 3, 4],
  skills: ['triangle inequality'], concepts: ['Triangle inequalities'],
  generate(rng, level) {
    const a = rng.int(3, 12), b = rng.int(4, 15);
    const lo = Math.abs(a - b), hi = a + b;
    if (level === 2) {
      const cands = [lo - 1, lo, lo + 1, Math.round((lo + hi) / 2), hi - 1, hi, hi + 2].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);
      return {
        format: 'multi', stem: `Two sides of a triangle have lengths ${a} and ${b}. Which of the following could be the length of the third side? Indicate all such lengths.`,
        ...multiSel(rng, cands.map((v) => ({ t: `$${v}$`, ok: v > lo && v < hi, v, note: v === lo || v === hi ? 'Equality gives a degenerate (flat) triangle, so it is excluded.' : undefined }))),
        explanation: [`The third side must satisfy $|${a} - ${b}| < s < ${a} + ${b}$, i.e. $${lo} < s < ${hi}$.`], trap: 'Including the endpoints: a side equal to the sum or difference gives no triangle.',
        hints: H('Any side is less than the sum of the other two.', 'And greater than their difference.', `$${lo} < s < ${hi}$.`),
      };
    }
    if (level === 3) {
      return {
        format: 'numeric', stem: `Two sides of a triangle have lengths ${a} and ${b}. If the third side has integer length, how many different lengths are possible?`, answer: numAns(hi - lo - 1),
        explanation: [`$${lo} < s < ${hi}$; integers ${lo + 1} through ${hi - 1}: $${hi - 1} - ${lo + 1} + 1 = ${hi - lo - 1}$ values.`], trap: 'Including the endpoints.',
        hints: H('Use the triangle inequality.', `$${lo} < s < ${hi}$.`, 'Count integers strictly between the bounds.'),
      };
    }
    // perimeter range QC
    return qcOutput({
      given: `A triangle has sides of length ${a}, ${b}, and $s$.`, a: 'The perimeter of the triangle', b: `$${2 * Math.max(a, b)}$`,
      vars: [{ name: 's', kind: 'real' }], constraint: (v) => v.s > lo && v.s < hi, fA: (v) => a + b + v.s, fB: () => 2 * Math.max(a, b),
      proof: [`The perimeter is $${a + b} + s$ with $${lo} < s < ${hi}$, so it lies strictly between ${a + b + lo} and ${2 * hi}.`, `${a + b + lo} = $2\\cdot${Math.max(a, b)}$, and the perimeter is strictly greater.`],
      trap: 'Forgetting that the lower bound for s is strict, which makes the perimeter strictly greater.',
      hints: H('Find the range of the third side.', 'Add the known sides to each bound.', `Lower bound for perimeter: ${a + b} + ${lo}.`),
    });
  },
});

const similar: Generator = gen({
  id: Gm('tri.similar'), unit: 'ge.triangles', subtopic: 'Similar triangles', levels: [3, 4, 5],
  skills: ['similarity ratios'], concepts: ['Similar triangles'],
  generate(rng, level) {
    const k = rng.pick([new Frac(1, 2), new Frac(1, 3), new Frac(2, 3), new Frac(2, 5), new Frac(3, 4), new Frac(3, 5)]);
    const AB = k.d * rng.int(2, 5);
    const AD = k.mul(AB).value;
    const BC = k.d * rng.int(2, 4) + rng.int(0, 1) * k.d;
    const DE = k.mul(BC).value;
    const A = P(1.6, 3), B = P(0, 0), C = P(5, 0);
    const D = P(A.x + (B.x - A.x) * k.value, A.y + (B.y - A.y) * k.value), E = P(A.x + (C.x - A.x) * k.value, A.y + (C.y - A.y) * k.value);
    const diagram: GeoDiagram = { kind: 'geo', width: 320, height: 210, polygons: [{ pts: [A, B, C] }], segments: [{ a: D, b: E }], points: [{ p: A, label: 'A', dy: -10 }, { p: B, label: 'B', dx: -10, dy: 10 }, { p: C, label: 'C', dx: 10, dy: 10 }, { p: D, label: 'D', dx: -12 }, { p: E, label: 'E', dx: 12 }], note: NOTE };
    if (level === 5) {
      // area ratio: area of trapezoid DBCE / area ADE
      const r = k.mul(k);
      const trap = new Frac(1).sub(r).div(r);
      return {
        format: 'numeric', stem: `In the figure, $DE \\parallel BC$, $AD = ${AD}$, and $DB = ${AB - AD}$. If the area of triangle $ADE$ is ${r.d * 2}, what is the area of quadrilateral $DBCE$?`, diagram,
        answer: trap.mul(r.d * 2).isInt() ? numAns(trap.mul(r.d * 2).value) : fracAns(trap.mul(r.d * 2).n, trap.mul(r.d * 2).d),
        explanation: [`$\\triangle ADE \\sim \\triangle ABC$ with ratio $AD/AB = ${AD}/${AB} = ${k.tex()}$.`, `Areas scale by the square: $\\dfrac{[ADE]}{[ABC]} = ${r.tex()}$, so $[ABC] = ${r.d * 2} \\div ${r.tex()} = ${new Frac(r.d * 2).div(r).tex()}$.`, `$[DBCE] = ${new Frac(r.d * 2).div(r).tex()} - ${r.d * 2} = ${trap.mul(r.d * 2).tex()}$.`],
        trap: 'Scaling area by the linear ratio instead of its square.',
        hints: H('Parallel lines create similar triangles.', 'Area ratio = (side ratio)².', `Side ratio $AD:AB = ${AD}:${AB}$.`),
      };
    }
    const askDE = level === 3;
    return {
      format: 'numeric', stem: askDE ? `In the figure, $DE \\parallel BC$, $AD = ${AD}$, $DB = ${AB - AD}$, and $BC = ${BC}$. What is the length of $DE$?` : `In the figure, $DE \\parallel BC$, $AD = ${AD}$, $DE = ${fmt(DE)}$, and $BC = ${BC}$. What is the length of $DB$?`,
      diagram, answer: askDE ? (Number.isInteger(DE) ? numAns(DE) : fracAns(k.mul(BC).n, k.mul(BC).d)) : numAns(AB - AD),
      explanation: askDE
        ? [`$DE \\parallel BC$ makes $\\triangle ADE \\sim \\triangle ABC$ (AA).`, `$\\dfrac{DE}{BC} = \\dfrac{AD}{AB} = \\dfrac{${AD}}{${AB}}$, so $DE = ${BC}\\cdot${k.tex()} = ${k.mul(BC).tex()}$.`]
        : [`$\\triangle ADE \\sim \\triangle ABC$, so $\\dfrac{AD}{AB} = \\dfrac{DE}{BC} = \\dfrac{${fmt(DE)}}{${BC}} = ${k.tex()}$.`, `$AB = ${AD} \\div ${k.tex()} = ${AB}$, so $DB = ${AB} - ${AD} = ${AB - AD}$.`],
      trap: 'Using $AD/DB$ instead of $AD/AB$ as the scale factor.',
      hints: H('Find the similar triangles.', 'Corresponding sides: AD ↔ AB and DE ↔ BC.', 'The scale factor uses the whole side AB, not DB.'),
    };
  },
});

const triArea: Generator = gen({
  id: Gm('tri.area'), unit: 'ge.triangles', subtopic: 'Area of triangles', levels: [1, 2, 3, 4, 5],
  skills: ['area formula', 'maximum area'], concepts: ['Area of triangles', 'Triangles'],
  generate(rng, level) {
    if (level === 5) {
      const a = rng.int(4, 9), b = rng.int(5, 12);
      return {
        format: 'qc', stem: '', qc: { given: `Triangle $T$ has two sides of lengths ${a} and ${b}.`, a: 'The area of $T$', b: `$${fmt((a * b) / 2)}$` }, answer: 3,
        explanation: [
          `Use side ${b} as the base. The height to that base is at most ${a} (the other side), with equality exactly when the two sides are perpendicular.`,
          `If the sides are perpendicular, the area is $\\tfrac12\\cdot${a}\\cdot${b} = ${fmt((a * b) / 2)}$ — the quantities are equal.`,
          `If the angle between them is 30°, the height is $${fmt(a / 2)}$ and the area is $\\tfrac12\\cdot${b}\\cdot${fmt(a / 2)} = ${fmt((a * b) / 4)}$ — Quantity B is greater.`,
          'Both triangles are possible, so the answer is **(D)**.',
        ],
        trap: 'Assuming the triangle is a right triangle. The area equals ab/2 only when the two sides are perpendicular.',
        hints: H('The height on one side can be at most the length of the other side.', 'Maximum area occurs when the sides are perpendicular.', 'Could the area equal the maximum? Could it be smaller?'),
      };
    }
    const b = rng.int(4, 16), h = rng.int(3, 12);
    if (level <= 2) {
      const A = P(0, 0), B = P(b, 0), C = P(rng.int(1, b - 1), h);
      return {
        format: 'numeric', stem: `In the figure, the base of the triangle is ${b} and the height is ${h}. What is the area of the triangle?`, answer: numAns((b * h) / 2),
        diagram: triangle(A, B, C, { segments: [{ a: C, b: P(C.x, 0), dashed: true }], rightAngles: [{ at: P(C.x, 0), dir1: P(1, 0), dir2: P(0, 1) }], labels: [{ at: P(b / 2, -h * 0.12), text: `${b}` }, { at: P(C.x + b * 0.05, h / 2), text: `${h}`, anchor: 'start' }], note: NOTE }),
        explanation: [`Area $= \\tfrac12 bh = \\tfrac12 \\cdot ${b} \\cdot ${h} = ${fmt((b * h) / 2)}$.`], trap: 'Forgetting the factor ½.',
        hints: H('Area of a triangle uses base and perpendicular height.', '½ × base × height.', `$\\tfrac12\\cdot${b}\\cdot${h}$.`),
      };
    }
    if (level === 3) {
      const s = rng.pick([2, 4, 6, 8, 10, 12]);
      const [o, i] = simplifySqrt(3);
      void o; void i;
      return {
        format: 'mcq', stem: `What is the area of an equilateral triangle with side length ${s}?`,
        ...textMcq(rng, `$${s * s / 4 === 1 ? '' : fmt((s * s) / 4)}\\sqrt{3}$`, [{ t: `$${fmt((s * s) / 2)}\\sqrt{3}$`, note: 'Used the full side as the height multiplier.' }, `$${fmt((s * s) / 2)}$`, `$${fmt((s * s) / 4)}$`, `$${fmt((s * s) / 4)}\\sqrt{2}$`]),
        explanation: [`Height $= \\dfrac{\\sqrt3}{2}\\cdot ${s} = ${fmt(s / 2)}\\sqrt3$.`, `Area $= \\tfrac12 \\cdot ${s} \\cdot ${fmt(s / 2)}\\sqrt3 = ${fmt((s * s) / 4)}\\sqrt3$ (formula $\\tfrac{\\sqrt3}{4}s^2$).`],
        trap: 'Using the side length as the height.',
        hints: H('Drop an altitude to split it into two 30-60-90 triangles.', 'Height = (√3/2)·side.', 'Area = (√3/4)s².'),
      };
    }
    // level 4: area via two different altitudes
    const a = rng.int(6, 15), ha = rng.int(4, 12), bb = rng.pick([8, 10, 12, 15, 16, 20].filter((x) => x !== a));
    const hb = new Frac(a * ha, bb);
    return {
      format: 'numeric', stem: `In triangle $ABC$, the altitude to side $BC$ (length ${a}) has length ${ha}. If $AC = ${bb}$, what is the length of the altitude from $B$ to side $AC$?${hb.isInt() ? '' : ' Give your answer as a fraction.'}`, answer: hb.isInt() ? numAns(hb.value) : fracAns(hb.n, hb.d),
      explanation: [`Area $= \\tfrac12\\cdot${a}\\cdot${ha} = ${fmt((a * ha) / 2)}$.`, `Same area with base $AC$: $\\tfrac12\\cdot${bb}\\cdot h = ${fmt((a * ha) / 2)} \\Rightarrow h = ${hb.tex()}$.`],
      trap: 'Assuming altitudes are equal or proportional to the sides they meet.',
      hints: H('A triangle has one area, no matter which side is the base.', 'Compute the area with the given base and altitude.', 'Set that equal to ½ · AC · h.'),
    };
  },
});

// ===================== Right triangles =====================
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
const pythag: Generator = gen({
  id: Gm('right.pyth'), unit: 'ge.right', subtopic: 'Pythagorean theorem', levels: [1, 2, 3],
  skills: ['Pythagorean theorem', 'triples'], concepts: ['Pythagorean theorem', 'Pythagorean triples'],
  generate(rng, level) {
    const t = rng.pick(level === 1 ? TRIPLES.slice(0, 2) : TRIPLES), m = rng.int(1, level === 1 ? 2 : 4);
    const [a, b, c] = t.map((x) => x * m);
    const askHyp = level === 1 || rng.bool();
    const A = P(0, 0), B = P(b, 0), C = P(0, a);
    const diagram = triangle(A, B, C, { rightAngles: [{ at: A, dir1: P(1, 0), dir2: P(0, 1) }], labels: [{ at: P(-c * 0.06, a / 2), text: askHyp ? `${a}` : `${a}`, anchor: 'end' }, { at: P(b / 2, -c * 0.07), text: askHyp ? `${b}` : 'x' }, { at: P(b / 2 + c * 0.05, a / 2 + c * 0.05), text: askHyp ? 'x' : `${c}`, anchor: 'start' }], note: NOTE });
    if (level === 3) {
      // non-triple: answer as radical
      const p = rng.int(2, 9), q = rng.int(2, 9);
      const s = p * p + q * q;
      const [o, i] = simplifySqrt(s);
      if (i === 1) return pythag.generate(rng, level);
      return {
        format: 'mcq', stem: `A right triangle has legs of lengths ${p} and ${q}. What is the length of the hypotenuse?`,
        ...textMcq(rng, `$${sqrtStr(s)}$`, [{ t: `$${p + q}$`, note: 'Added the legs.' }, `$\\sqrt{${p + q}}$`, `$${sqrtStr(Math.abs(p * p - q * q) || 2)}$`, `$${o + 1}\\sqrt{${i}}$`]),
        explanation: [`$c^2 = ${p}^2 + ${q}^2 = ${s}$, so $c = \\sqrt{${s}} = ${sqrtStr(s)}$.`], trap: 'Adding the legs or subtracting the squares.',
        hints: H('Use $a^2 + b^2 = c^2$.', 'Square each leg and add.', `$${p * p} + ${q * q} = ${s}$.`),
      };
    }
    return {
      format: 'numeric', stem: `In the right triangle shown, what is the value of $x$?`, diagram, answer: numAns(askHyp ? c : b),
      explanation: [askHyp ? `$x^2 = ${a}^2 + ${b}^2 = ${a * a + b * b}$, so $x = ${c}$.` : `$x^2 = ${c}^2 - ${a}^2 = ${c * c - a * a}$, so $x = ${b}$.`, `This is the ${t.join('-')} triple${m > 1 ? ` scaled by ${m}` : ''}.`],
      trap: 'Adding squares when looking for a leg (subtract instead).',
      hints: H('$a^2 + b^2 = c^2$ where c is the hypotenuse.', 'Recognize common triples: 3-4-5, 5-12-13, 8-15-17.', `Is the unknown the hypotenuse or a leg?`),
    };
  },
});

const special: Generator = gen({
  id: Gm('right.special'), unit: 'ge.right', subtopic: 'Special right triangles (30-60-90, 45-45-90)', levels: [2, 3, 4],
  skills: ['30-60-90', '45-45-90'], concepts: ['Special right triangles (30-60-90, 45-45-90)'],
  generate(rng, level) {
    const kind = rng.pick(['30', '45']);
    const s = rng.int(2, 10);
    if (level === 4) {
      // square diagonal / equilateral height combos
      const d = rng.int(3, 12);
      return {
        format: 'numeric', stem: `The diagonal of a square has length $${d}\\sqrt{2}$. What is the area of the square?`, answer: numAns(d * d),
        explanation: [`A square's diagonal is $s\\sqrt2$, so $s = ${d}$.`, `Area $= ${d}^2 = ${d * d}$.`, `Shortcut: area $= \\dfrac{\\text{diagonal}^2}{2} = \\dfrac{${2 * d * d}}{2}$.`],
        trap: 'Squaring the diagonal and forgetting to halve.',
        hints: H('The diagonal splits a square into two 45-45-90 triangles.', 'Diagonal = side × √2.', `Side $= ${d}$.`),
      };
    }
    if (kind === '45') {
      const A = P(0, 0), B = P(3, 0), C = P(0, 3);
      return {
        format: 'mcq', stem: `An isosceles right triangle has legs of length ${s}. What is the length of its hypotenuse?`,
        diagram: triangle(A, B, C, { rightAngles: [{ at: A, dir1: P(1, 0), dir2: P(0, 1) }], labels: [{ at: P(-0.25, 1.5), text: `${s}`, anchor: 'end' }, { at: P(1.5, -0.3), text: `${s}` }, { at: P(2.6, 0.35), text: '45°' }], note: NOTE }),
        ...textMcq(rng, `$${s}\\sqrt{2}$`, [{ t: `$${2 * s}$`, note: 'Added the legs.' }, `$${s}\\sqrt{3}$`, `$${s * s}$`, `$\\dfrac{${s}\\sqrt{2}}{2}$`]),
        explanation: ['45-45-90 sides are in ratio $1 : 1 : \\sqrt2$.', `Hypotenuse $= ${s}\\sqrt2$.`], trap: 'Mixing up the 45-45-90 and 30-60-90 ratios.',
        hints: H('This is a 45-45-90 triangle.', 'Ratio $1:1:\\sqrt2$.', 'Multiply a leg by √2.'),
      };
    }
    const shortSide = s;
    const ask = level === 2 ? 'long' : 'hyp-from-long';
    const A = P(0, 0), B = P(Math.sqrt(3) * 1.6, 0), C = P(0, 1.6);
    if (ask === 'long') {
      return {
        format: 'mcq', stem: `In a 30°-60°-90° triangle, the side opposite the 30° angle has length ${shortSide}. What is the length of the side opposite the 60° angle?`,
        diagram: triangle(A, B, C, { rightAngles: [{ at: A, dir1: P(1, 0), dir2: P(0, 1) }], labels: [{ at: P(-0.2, 0.8), text: `${shortSide}`, anchor: 'end' }, { at: P(B.x - 0.65, 0.15), text: '30°' }, { at: P(0.25, C.y - 0.45), text: '60°', anchor: 'start' }], note: NOTE }),
        ...textMcq(rng, `$${shortSide}\\sqrt{3}$`, [{ t: `$${2 * shortSide}$`, note: 'That is the hypotenuse.' }, `$${shortSide}\\sqrt{2}$`, `$\\dfrac{${shortSide}\\sqrt{3}}{2}$`, `$${3 * shortSide}$`]),
        explanation: ['30-60-90 sides are in ratio $1 : \\sqrt3 : 2$ (opposite 30°, 60°, 90°).', `Side opposite 60° $= ${shortSide}\\sqrt3$.`], trap: 'Giving the hypotenuse (2 × short side) instead.',
        hints: H('30-60-90 ratio: $1 : \\sqrt3 : 2$.', 'The shortest side is opposite 30°.', 'Multiply the short side by √3.'),
      };
    }
    return {
      format: 'numeric', stem: `In a 30°-60°-90° triangle, the side opposite the 60° angle has length $${s}\\sqrt{3}$. What is the length of the hypotenuse?`, answer: numAns(2 * s),
      explanation: [`Long leg $= \\sqrt3 \\times$ short leg, so the short leg is ${s}.`, `Hypotenuse $= 2 \\times ${s} = ${2 * s}$.`], trap: 'Multiplying the long leg by 2.',
      hints: H('Find the short leg first.', 'Long leg = short leg × √3.', `Short leg $= ${s}$.`),
    };
  },
});

const rightApplied: Generator = gen({
  id: Gm('right.applied'), unit: 'ge.right', subtopic: 'Pythagorean theorem', levels: [3, 4, 5],
  skills: ['modeling with right triangles'], concepts: ['Pythagorean theorem', 'Geometric relationships'],
  generate(rng, level) {
    const k3 = rng.int(1, 3); const [a, b, c] = rng.pick(TRIPLES.slice(0, 3)).map((x) => x * k3);
    if (level === 5) {
      const n = rng.int(3, 6), m = rng.int(2, 5);
      // walk n north, m east, n north, m east...: total displacement
      const north = 2 * a, east = 2 * b;
      return {
        format: 'numeric', stem: `A hiker walks ${a} km north, then ${b} km east, then ${a} km north, then ${b} km east. How far, in kilometers, is the hiker from the starting point?`, answer: numAns(2 * c),
        explanation: [`Total north: ${north} km; total east: ${east} km.`, `Distance $= \\sqrt{${north}^2 + ${east}^2} = ${2 * c}$ (a ${a}-${b}-${c} triangle doubled).`],
        trap: `Adding all the legs (${2 * a + 2 * b} km) — that is the path length, not the displacement.`,
        hints: H('Combine the moves in each direction.', 'The net displacement forms one right triangle.', `Net: ${north} north, ${east} east.`),
      };
    }
    if (level === 4) {
      const drop = rng.int(1, a - 1);
      const newBase = Math.sqrt(c * c - (a - drop) ** 2);
      return {
        format: 'mcq', stem: `A ${c}-foot ladder leans against a vertical wall with its top ${a} feet above the ground. If the top slides down ${drop} ${drop > 1 ? 'feet' : 'foot'}, how far, in feet, does the bottom of the ladder slide away from the wall? (Round to the nearest tenth.)`,
        ...numMcq(round(newBase - b, 1), [{ v: drop, note: 'Assumed the bottom moves as much as the top.' }, round(newBase, 1), round(b - (a - drop) / 2, 1), round(newBase - b + 1, 1)], { render: (n) => `$${n.toFixed(1)}$` }),
        explanation: [`Initially the base is $\\sqrt{${c}^2 - ${a}^2} = ${b}$ feet from the wall.`, `After sliding, the top is ${a - drop} ft high: base $= \\sqrt{${c * c} - ${(a - drop) ** 2}} \\approx ${newBase.toFixed(2)}$.`, `The bottom moves $\\approx ${(newBase - b).toFixed(1)}$ feet.`],
        trap: 'Assuming equal movement at the top and bottom.',
        hints: H('The ladder length stays fixed — it is the hypotenuse.', 'Compute the base distance before and after.', `Before: base = ${b}.`),
      };
    }
    return {
      format: 'numeric', stem: `A rectangle has length ${b} and width ${a}. What is the length of its diagonal?`, answer: numAns(c),
      diagram: { kind: 'geo', width: 300, height: 200, polygons: [{ pts: [P(0, 0), P(b, 0), P(b, a), P(0, a)] }], segments: [{ a: P(0, 0), b: P(b, a), dashed: true }], labels: [{ at: P(b / 2, -c * 0.07), text: `${b}` }, { at: P(b + c * 0.04, a / 2), text: `${a}`, anchor: 'start' }] },
      explanation: [`The diagonal is the hypotenuse of a right triangle with legs ${a} and ${b}: $\\sqrt{${a * a} + ${b * b}} = ${c}$.`], trap: 'Adding length and width.',
      hints: H('The diagonal splits the rectangle into right triangles.', 'Use the Pythagorean theorem.', `$\\sqrt{${a}^2 + ${b}^2}$.`),
    };
  },
});

// ===================== Quadrilaterals & polygons =====================
const quadArea: Generator = gen({
  id: Gm('quad.area'), unit: 'ge.quads', subtopic: 'Area', levels: [1, 2, 3],
  skills: ['area formulas'], concepts: ['Rectangles', 'Parallelograms', 'Trapezoids', 'Area', 'Perimeter'],
  generate(rng, level) {
    if (level === 1) {
      const l = rng.int(4, 20), w = rng.int(2, 15);
      const askP = rng.bool();
      return {
        format: 'numeric', stem: `A rectangle has length ${l} and width ${w}. What is its ${askP ? 'perimeter' : 'area'}?`, answer: numAns(askP ? 2 * (l + w) : l * w),
        explanation: [askP ? `Perimeter $= 2(l + w) = 2(${l} + ${w}) = ${2 * (l + w)}$.` : `Area $= lw = ${l}\\cdot${w} = ${l * w}$.`], trap: 'Confusing area and perimeter.',
        hints: H(askP ? 'Perimeter is the distance around.' : 'Area is length times width.', askP ? 'Add all four sides.' : 'Multiply.', askP ? `$2(${l} + ${w})$` : `$${l}\\times${w}$`),
      };
    }
    if (level === 2) {
      const b1 = rng.int(4, 12), b2 = b1 + rng.int(2, 10), h = rng.int(3, 10);
      const off = rng.int(1, b2 - b1 - 1 || 1);
      return {
        format: 'numeric', stem: `The trapezoid shown has parallel sides of lengths ${b1} and ${b2} and height ${h}. What is its area?`, answer: numAns(((b1 + b2) * h) / 2),
        diagram: { kind: 'geo', width: 320, height: 190, polygons: [{ pts: [P(0, 0), P(b2, 0), P(off + b1, h), P(off, h)] }], segments: [{ a: P(off, h), b: P(off, 0), dashed: true }], rightAngles: [{ at: P(off, 0), dir1: P(1, 0), dir2: P(0, 1) }], labels: [{ at: P(b2 / 2, -h * 0.13), text: `${b2}` }, { at: P(off + b1 / 2, h * 1.09), text: `${b1}` }, { at: P(off - b2 * 0.02, h / 2), text: `${h}`, anchor: 'end' }], note: NOTE },
        explanation: [`Area $= \\tfrac12(b_1 + b_2)h = \\tfrac12(${b1} + ${b2})(${h}) = ${fmt(((b1 + b2) * h) / 2)}$.`], trap: 'Multiplying the two bases.',
        hints: H('Trapezoid area uses the average of the parallel sides.', '½(b₁ + b₂)·h.', `Average base: ${fmt((b1 + b2) / 2)}.`),
      };
    }
    // level 3: parallelogram with slanted side and angle 30/45/60
    const base = rng.int(6, 14), side = rng.pick([4, 6, 8, 10]), ang = rng.pick([30, 45, 60]);
    const hTex = ang === 30 ? `${side / 2}` : ang === 45 ? `${fmt(side / 2)}\\sqrt{2}` : `${fmt(side / 2)}\\sqrt{3}`;
    const area = ang === 30 ? `${(base * side) / 2}` : ang === 45 ? `${fmt((base * side) / 2)}\\sqrt{2}` : `${fmt((base * side) / 2)}\\sqrt{3}`;
    const dx = side * Math.cos(rad(ang)), dy = side * Math.sin(rad(ang));
    return {
      format: 'mcq', stem: `A parallelogram has sides of length ${base} and ${side}, and one interior angle measures ${ang}°. What is its area?`,
      diagram: { kind: 'geo', width: 320, height: 170, polygons: [{ pts: [P(0, 0), P(base, 0), P(base + dx, dy), P(dx, dy)] }], labels: [{ at: P(base / 2, -dy * 0.2), text: `${base}` }, { at: P(dx / 2 - 0.4, dy / 2), text: `${side}`, anchor: 'end' }, { at: P(1.2, 0.35), text: `${ang}°`, anchor: 'start' }], note: NOTE },
      ...textMcq(rng, `$${area}$`, [{ t: `$${base * side}$`, note: 'Multiplied the sides — the slanted side is not the height.' }, `$${fmt(base * side / 2)}$`.replace(`$${area}$`, `$${base + side}$`), `$${2 * (base + side)}$`, ang === 30 ? `$${fmt((base * side) / 2)}\\sqrt{3}$` : `$${(base * side) / 2}$`]),
      explanation: [`Height $= ${side}\\sin ${ang}° = ${hTex}$ (from a special right triangle).`, `Area $= \\text{base}\\times\\text{height} = ${base}\\times ${hTex} = ${area}$.`],
      trap: 'Using the slanted side as the height.',
      hints: H('Area of a parallelogram = base × perpendicular height.', `Drop a perpendicular to form a ${ang === 45 ? '45-45-90' : '30-60-90'} triangle.`, `The height is $${hTex}$.`),
    };
  },
});

const polygonAngles: Generator = gen({
  id: Gm('quad.polygons'), unit: 'ge.quads', subtopic: 'Interior and exterior angles', levels: [2, 3, 4],
  skills: ['polygon angle sums'], concepts: ['Polygons', 'Interior and exterior angles'],
  generate(rng, level) {
    const n = rng.pick([5, 6, 8, 9, 10, 12, 15, 18, 20]);
    const S = (n - 2) * 180, each = S / n, ext = 360 / n;
    if (level === 2) {
      return { format: 'numeric', stem: `What is the sum of the interior angles of a polygon with ${n} sides, in degrees?`, answer: numAns(S), explanation: [`Sum $= (n - 2)\\cdot 180 = ${n - 2}\\cdot 180 = ${S}$.`], trap: 'Using n × 180.', hints: H('Split the polygon into triangles from one vertex.', 'An n-gon splits into n − 2 triangles.', `$(${n} - 2)\\times 180$.`) };
    }
    if (level === 3) {
      return {
        format: 'mcq', stem: `What is the measure of each interior angle of a regular ${n}-sided polygon?`,
        ...numMcq(each, [{ v: ext, note: 'That is the exterior angle.' }, S / (n - 2), 180 - ext / 2, each + 10], { render: (v) => `$${fmt(v)}°$` }),
        explanation: [`Each exterior angle $= 360/${n} = ${fmt(ext)}°$.`, `Interior $= 180 - ${fmt(ext)} = ${fmt(each)}°$.`], trap: 'Confusing interior and exterior angles.',
        hints: H('Exterior angles of any polygon sum to 360°.', 'Interior + exterior = 180°.', `Exterior $= 360/${n}$.`),
      };
    }
    const intA = rng.pick([140, 150, 156, 160, 162, 165, 168, 170]);
    const nn = 360 / (180 - intA);
    return {
      format: 'numeric', stem: `Each interior angle of a regular polygon measures ${intA}°. How many sides does the polygon have?`, answer: numAns(nn),
      explanation: [`Exterior angle $= 180 - ${intA} = ${180 - intA}°$.`, `Sides $= 360/${180 - intA} = ${nn}$.`], trap: 'Solving (n − 2)·180 = interior angle (that equation is for the sum).',
      hints: H('Work with the exterior angle.', 'Exterior angles total 360°.', `Exterior $= ${180 - intA}°$.`),
    };
  },
});

const rectPerimArea: Generator = gen({
  id: Gm('quad.rectdiag'), unit: 'ge.quads', subtopic: 'Rectangles', levels: [3, 4, 5],
  skills: ['perimeter-area-diagonal relations'], concepts: ['Rectangles', 'Squares', 'Algebraic manipulation'],
  generate(rng, level) {
    const k2 = rng.int(1, 2); const [a, b, c] = rng.pick(TRIPLES.slice(0, 4)).map((x) => x * k2);
    if (level === 3) {
      const s = rng.int(3, 15);
      return {
        format: 'numeric', stem: `A square has the same perimeter as a ${s + 2}-by-${s - 2} rectangle. What is the positive difference between the area of the square and the area of the rectangle?`, answer: numAns(4),
        explanation: [`Rectangle perimeter: $2(${s + 2} + ${s - 2}) = ${4 * s}$, so the square has side ${s}.`, `Areas: square $${s * s}$, rectangle $${(s + 2) * (s - 2)}$; difference $= 4$.`, 'In general $s^2 - (s + 2)(s - 2) = 4$.'],
        trap: 'Assuming equal perimeters mean equal areas.',
        hints: H('Find the square’s side from the perimeter.', 'Compare $s^2$ with $(s+2)(s-2)$.', 'Difference of squares.'),
      };
    }
    if (level === 4) {
      return {
        format: 'numeric', stem: `A rectangle has perimeter ${2 * (a + b)} and area ${a * b}. What is the length of its diagonal?`, answer: numAns(c),
        explanation: [`$l + w = ${a + b}$ and $lw = ${a * b}$.`, `$d^2 = l^2 + w^2 = (l + w)^2 - 2lw = ${(a + b) ** 2} - ${2 * a * b} = ${c * c}$, so $d = ${c}$.`],
        trap: 'Solving for l and w separately (slower) or forgetting to subtract 2lw.',
        hints: H('The diagonal satisfies $d^2 = l^2 + w^2$.', 'Express $l^2 + w^2$ through $l + w$ and $lw$.', `$(l + w)^2 = ${(a + b) ** 2}$.`),
      };
    }
    return qcNumeric({
      given: `A rectangle and a square have the same perimeter, ${4 * (a + b) / 2}. The rectangle is not a square.`,
      a: 'The area of the rectangle', b: 'The area of the square', va: 1, vb: 2,
      proof: ['For a fixed perimeter $2(l + w)$, the area $lw$ is maximized when $l = w$.', `Square area $= \\left(\\tfrac{${(a + b)}}{2}\\right)^2 = ${fmt(((a + b) / 2) ** 2)}$; any non-square rectangle has $lw = \\left(\\tfrac{l+w}{2}\\right)^2 - \\left(\\tfrac{l-w}{2}\\right)^2$, which is smaller.`],
      trap: 'Assuming equal perimeters imply equal areas.',
      hints: H('Try a 1-by-(big) rectangle with the same perimeter.', 'For fixed perimeter, which shape has the largest area?', '$lw = (\\frac{l+w}{2})^2 - (\\frac{l-w}{2})^2$.'),
    });
  },
});

const rhombus: Generator = gen({
  id: Gm('quad.rhombus'), unit: 'ge.quads', subtopic: 'Rhombuses', levels: [3, 4],
  skills: ['rhombus diagonals'], concepts: ['Rhombuses', 'Pythagorean theorem'],
  generate(rng, level) {
    const k2 = rng.int(1, 2); const [a, b, c] = rng.pick(TRIPLES.slice(0, 3)).map((x) => x * k2);
    const d1 = 2 * a, d2 = 2 * b;
    const diagram: GeoDiagram = { kind: 'geo', width: 300, height: 200, polygons: [{ pts: [P(-b, 0), P(0, a), P(b, 0), P(0, -a)] }], segments: [{ a: P(-b, 0), b: P(b, 0), dashed: true }, { a: P(0, a), b: P(0, -a), dashed: true }], rightAngles: [{ at: P(0, 0), dir1: P(1, 0), dir2: P(0, 1) }], note: NOTE };
    if (level === 3) {
      return { format: 'numeric', stem: `The diagonals of a rhombus have lengths ${d1} and ${d2}. What is the area of the rhombus?`, diagram, answer: numAns((d1 * d2) / 2), explanation: [`Area of a rhombus $= \\tfrac12 d_1 d_2 = \\tfrac12\\cdot${d1}\\cdot${d2} = ${(d1 * d2) / 2}$.`], trap: 'Multiplying the diagonals without halving.', hints: H('A rhombus is made of four right triangles.', 'Area = ½ × d₁ × d₂.', `$\\tfrac12 \\cdot ${d1}\\cdot ${d2}$.`) };
    }
    return { format: 'numeric', stem: `The diagonals of a rhombus have lengths ${d1} and ${d2}. What is the perimeter of the rhombus?`, diagram, answer: numAns(4 * c), explanation: ['The diagonals of a rhombus bisect each other at right angles.', `Each side is the hypotenuse of a right triangle with legs ${a} and ${b}: side $= ${c}$.`, `Perimeter $= 4\\cdot${c} = ${4 * c}$.`], trap: 'Using the full diagonals as legs instead of half-diagonals.', hints: H('The diagonals are perpendicular bisectors.', 'Half-diagonals are the legs.', `Legs ${a} and ${b}.`) };
  },
});

// ===================== Circles =====================
const circleBasic: Generator = gen({
  id: Gm('circ.basic'), unit: 'ge.circles', subtopic: 'Circumference', levels: [1, 2, 3],
  skills: ['C = 2πr', 'A = πr²'], concepts: ['Circles', 'Circumference', 'Area'],
  generate(rng, level) {
    const r = rng.int(2, 12);
    if (level === 1) {
      const askA = rng.bool();
      return { format: 'mcq', stem: `A circle has radius ${r}. What is its ${askA ? 'area' : 'circumference'}?`, ...textMcq(rng, `$${askA ? r * r : 2 * r}\\pi$`, [{ t: `$${askA ? 2 * r : r * r}\\pi$`, note: askA ? 'That is the circumference.' : 'That is the area.' }, `$${askA ? 4 * r * r : r}\\pi$`, `$${r * 4}\\pi$`.replace(`$${askA ? r * r : 2 * r}\\pi$`, `$${3 * r}\\pi$`), `$${askA ? r * r * 2 : 4 * r}\\pi$`]), explanation: [askA ? `$A = \\pi r^2 = ${r * r}\\pi$.` : `$C = 2\\pi r = ${2 * r}\\pi$.`], trap: 'Mixing up area and circumference formulas.', hints: H('Area: πr². Circumference: 2πr.', `r = ${r}.`, askA ? `$${r}^2 = ${r * r}$.` : `$2 \\cdot ${r}$.`) };
    }
    if (level === 2) {
      const C = 2 * r;
      return { format: 'numeric', stem: `The circumference of a circle is $${C}\\pi$. What is the area of the circle? (Enter the coefficient of $\\pi$.)`, answer: numAns(r * r), explanation: [`$2\\pi r = ${C}\\pi \\Rightarrow r = ${r}$.`, `$A = \\pi r^2 = ${r * r}\\pi$, so the coefficient is ${r * r}.`], trap: 'Using the circumference value as the diameter or radius directly.', hints: H('Find the radius first.', '$C = 2\\pi r$.', `$r = ${r}$.`) };
    }
    const k = rng.pick([2, 3, 4]);
    return { format: 'mcq', stem: `If the radius of a circle is multiplied by ${k}, the area of the circle is multiplied by`, ...numMcq(k * k, [{ v: k, note: 'Area scales with the square of the radius.' }, 2 * k, k ** 3, k + 1]), explanation: [`$A = \\pi r^2$; replacing $r$ by $${k}r$ gives $\\pi(${k}r)^2 = ${k * k}\\pi r^2$.`], trap: 'Assuming area scales linearly with radius.', hints: H('Write the area with the new radius.', 'Square the scale factor.', `$(${k}r)^2$.`) };
  },
});

const arcSector: Generator = gen({
  id: Gm('circ.arc'), unit: 'ge.circles', subtopic: 'Arc length', levels: [2, 3, 4, 5],
  skills: ['arc length', 'sector area'], concepts: ['Arc length', 'Sector area'],
  generate(rng, level) {
    const ang = rng.pick([30, 40, 45, 60, 72, 90, 120, 135, 150, 240]);
    const r = rng.pick([3, 4, 6, 8, 9, 10, 12]);
    const frac = new Frac(ang, 360);
    const arc = frac.mul(2 * r), sector = frac.mul(r * r);
    const diagram: GeoDiagram = { kind: 'geo', width: 240, height: 240, circles: [{ c: P(0, 0), r: 1 }], arcs: [{ c: P(0, 0), r: 1, from: 0, to: ang, sector: true }], segments: [{ a: P(0, 0), b: P(1, 0) }, { a: P(0, 0), b: P(Math.cos(rad(ang)), Math.sin(rad(ang))) }], points: [{ p: P(0, 0), label: 'O', dx: -10, dy: 12 }], labels: [{ at: P(0.32 * Math.cos(rad(ang / 2)) , 0.32 * Math.sin(rad(ang / 2))), text: `${ang}°` }, { at: P(0.55, -0.12), text: `${r}` }], note: NOTE };
    if (level === 5) {
      // inscribed angle: central = 2*inscribed; arc length given inscribed angle
      const ins = rng.pick([20, 30, 36, 45, 60]);
      const cen = 2 * ins;
      const a2 = new Frac(cen, 360).mul(2 * r);
      return { format: 'mcq', stem: `Points $A$, $B$, and $C$ lie on a circle of radius ${r}. If inscribed angle $\\angle ACB = ${ins}°$, what is the length of minor arc $AB$?`, ...textMcq(rng, `$${piFrac(a2)}$`, [{ t: `$${piFrac(new Frac(ins, 360).mul(2 * r))}$`, note: 'Used the inscribed angle as the central angle (it is half).' }, `$${piFrac(new Frac(cen, 360).mul(r * r))}$`, `$${piFrac(a2.mul(2))}$`, `$${piFrac(new Frac(ins, 180).mul(r * r))}$`, `$${piFrac(a2.mul(3))}$`, `$${piFrac(a2.add(1))}$`]), explanation: [`The central angle subtending arc $AB$ is twice the inscribed angle: ${cen}°.`, `Arc $= \\dfrac{${cen}}{360}\\cdot 2\\pi(${r}) = ${piFrac(a2)}$.`], trap: 'Treating an inscribed angle as a central angle.', hints: H('Inscribed angle = half the central angle on the same arc.', `Central angle = ${cen}°.`, 'Arc = (central/360)·2πr.') };
    }
    if (level === 4) {
      // given arc length, find radius or angle
      return { format: 'numeric', stem: `In a circle, a central angle of ${ang}° intercepts an arc of length $${piFrac(arc)}$. What is the radius of the circle?`, answer: numAns(r), explanation: [`$\\dfrac{${ang}}{360}\\cdot 2\\pi r = ${piFrac(arc)}$.`, `$r = ${r}$.`], trap: 'Using the area formula for an arc.', hints: H('Arc length is a fraction of the circumference.', `Fraction $= ${frac.tex()}$.`, `$${frac.tex()}\\cdot 2\\pi r = ${piFrac(arc)}$.`) };
    }
    const askSector = level === 3;
    const val = askSector ? sector : arc;
    return {
      format: 'mcq', stem: `In the figure, $O$ is the center of the circle, the radius is ${r}, and the central angle is ${ang}°. What is the ${askSector ? 'area of the shaded sector' : 'length of the arc of the shaded sector'}?`, diagram,
      ...textMcq(rng, `$${piFrac(val)}$`, [{ t: `$${piFrac(askSector ? arc : sector)}$`, note: askSector ? 'That is the arc length.' : 'That is the sector area.' }, `$${piFrac(val.mul(2))}$`, `$${piFrac(new Frac(1).sub(frac).mul(askSector ? r * r : 2 * r))}$`, { t: `$${piFrac(new Frac(ang, 180).mul(askSector ? r * r : 2 * r))}$`, note: 'Divided the angle by 180 instead of 360.' }, `$${piFrac(val.mul(new Frac(1, 2)))}$`, `$${piFrac(val.mul(3))}$`, `$${piFrac(val.add(1))}$`]),
      explanation: [`The sector is $\\dfrac{${ang}}{360} = ${frac.tex()}$ of the circle.`, askSector ? `Area $= ${frac.tex()}\\cdot\\pi(${r})^2 = ${piFrac(sector)}$.` : `Arc $= ${frac.tex()}\\cdot 2\\pi(${r}) = ${piFrac(arc)}$.`],
      trap: 'Using 180 instead of 360 in the fraction, or mixing the arc and area formulas.',
      hints: H('A sector is a fraction of the whole circle.', `Fraction = angle/360 = ${frac.tex()}.`, askSector ? 'Multiply by πr².' : 'Multiply by 2πr.'),
    };
  },
});

const inscribed: Generator = gen({
  id: Gm('circ.inscribed'), unit: 'ge.circles', subtopic: 'Inscribed figures', levels: [3, 4, 5],
  skills: ['inscribed squares and circles', 'shaded regions'], concepts: ['Inscribed figures', 'Area', 'Special right triangles (30-60-90, 45-45-90)'],
  generate(rng, level) {
    const s = rng.pick([2, 4, 6, 8, 10]);
    if (level === 3) {
      // circle inscribed in square: shaded corners area = s^2 - π(s/2)^2
      return {
        format: 'mcq', stem: `A circle is inscribed in a square with side length ${s}. What is the area of the region inside the square but outside the circle?`,
        diagram: { kind: 'geo', width: 220, height: 220, polygons: [{ pts: [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], shaded: true }], circles: [{ c: P(0, 0), r: 1 }], labels: [{ at: P(0, -1.18), text: `${s}` }] },
        ...textMcq(rng, `$${s * s} - ${(s * s) / 4 === 1 ? '' : (s * s) / 4}\\pi$`, [{ t: `$${s * s} - ${s * s}\\pi$`, note: 'Used the side as the radius.' }, `$${s * s}\\pi - ${s * s}$`, `$${4 * s} - ${s}\\pi$`, `$${s * s} - ${s}\\pi$`]),
        explanation: [`The circle's diameter equals the side ${s}, so $r = ${s / 2}$.`, `Shaded $= ${s}^2 - \\pi(${s / 2})^2 = ${s * s} - ${(s * s) / 4 === 1 ? '' : (s * s) / 4}\\pi$.`], trap: 'Using the side length as the radius.',
        hints: H('The circle touches all four sides.', 'Diameter = side of the square.', `r = ${s / 2}.`),
      };
    }
    if (level === 4) {
      const r = rng.int(2, 9);
      return {
        format: 'numeric', stem: `A square is inscribed in a circle of radius ${r} (all four vertices lie on the circle). What is the area of the square?`, answer: numAns(2 * r * r),
        diagram: { kind: 'geo', width: 220, height: 220, circles: [{ c: P(0, 0), r: 1 }], polygons: [{ pts: [P(1, 0), P(0, 1), P(-1, 0), P(0, -1)] }], segments: [{ a: P(-1, 0), b: P(1, 0), dashed: true }] },
        explanation: [`The square's diagonal is a diameter: $${2 * r}$.`, `Area $= \\dfrac{d^2}{2} = \\dfrac{${4 * r * r}}{2} = ${2 * r * r}$.`], trap: 'Using the radius or diameter as the side length.',
        hints: H('The diagonal of the square passes through the center.', 'Diagonal = diameter.', 'Area of a square = diagonal²/2.'),
      };
    }
    // level 5: equilateral triangle inscribed in circle radius r -> side r√3; area
    const r = rng.pick([2, 4, 6]);
    return {
      format: 'mcq', stem: `An equilateral triangle is inscribed in a circle of radius ${r}. What is the area of the triangle?`,
      ...textMcq(rng, `$${fmt((3 * Math.sqrt(3) * r * r) / 4 / Math.sqrt(3))}\\sqrt{3}$`, [{ t: `$${fmt((r * r) / 4 * 3)}\\sqrt{3}$`.replace(`$${fmt((3 * r * r) / 4)}\\sqrt{3}$`, `$${fmt((r * r) / 2)}\\sqrt{3}$`), note: 'Used the radius as the side length.' }, `$${3 * r * r}\\sqrt{3}$`, `$${fmt((9 * r * r) / 4)}$`, `$${r * r}\\pi$`]),
      explanation: [`The side of an inscribed equilateral triangle is $r\\sqrt3 = ${r}\\sqrt3$ (the center is $\\tfrac23$ of the way down each median, which has length $\\tfrac32 r = ${fmt(1.5 * r)}$).`, `Area $= \\dfrac{\\sqrt3}{4}(${r}\\sqrt3)^2 = \\dfrac{\\sqrt3}{4}\\cdot ${3 * r * r} = ${fmt((3 * r * r) / 4)}\\sqrt3$.`],
      trap: 'Assuming the side equals the radius.',
      hints: H('The center of the circle is the centroid of the triangle.', 'Each median is 3/2 of the radius.', 'The height is $\\frac32 r$; side = height·(2/√3).'),
    };
  },
});

// ===================== Solids =====================
const box: Generator = gen({
  id: Gm('solid.box'), unit: 'ge.solids', subtopic: 'Volume', levels: [1, 2, 3, 4],
  skills: ['volume and surface area of boxes'], concepts: ['Volume', 'Surface area', 'Cubes, prisms, cylinders'],
  generate(rng, level) {
    const l = rng.int(2, 12), w = rng.int(2, 9), h = rng.int(2, 10);
    if (level === 1) return { format: 'numeric', stem: `What is the volume of a rectangular box that is ${l} cm long, ${w} cm wide, and ${h} cm high?`, answer: numAns(l * w * h), unitLabel: 'cm³', explanation: [`$V = lwh = ${l}\\cdot${w}\\cdot${h} = ${l * w * h}$ cm³.`], trap: 'Adding the dimensions.', hints: H('Volume of a box = length × width × height.', 'Multiply all three.', `$${l}\\cdot${w} = ${l * w}$.`) };
    if (level === 2) return { format: 'numeric', stem: `What is the total surface area of a rectangular box with dimensions ${l} by ${w} by ${h}?`, answer: numAns(2 * (l * w + l * h + w * h)), explanation: [`$SA = 2(lw + lh + wh) = 2(${l * w} + ${l * h} + ${w * h}) = ${2 * (l * w + l * h + w * h)}$.`], trap: 'Counting each face once instead of twice.', hints: H('A box has 3 pairs of identical faces.', '$SA = 2(lw + lh + wh)$.', `$lw = ${l * w}$.`) };
    if (level === 3) {
      const e = rng.int(2, 6);
      return { format: 'mcq', stem: `A cube has a surface area of ${6 * e * e}. What is its volume?`, ...numMcq(e ** 3, [{ v: 6 * e * e, note: 'Reported the surface area.' }, e * e, e ** 3 * 2, (6 * e * e) ** 1.5 > 1e6 ? e ** 3 + e : e ** 3 + e]), explanation: [`Each face has area $${6 * e * e}/6 = ${e * e}$, so the edge is ${e}.`, `$V = ${e}^3 = ${e ** 3}$.`], trap: 'Taking the cube root of the surface area.', hints: H('A cube has 6 congruent square faces.', 'Find one face’s area, then the edge.', `Face area $= ${e * e}$.`) };
    }
    const k = rng.pick([2, 3]);
    return { format: 'numeric', stem: `Each edge of a rectangular box is multiplied by ${k}. The new volume is how many times the original volume?`, answer: numAns(k ** 3), explanation: [`Volume scales with the cube of the linear factor: $${k}^3 = ${k ** 3}$.`], trap: `Answering ${k} or ${k * k} (that is how area scales).`, hints: H('Write V = lwh with each dimension scaled.', `$(${k}l)(${k}w)(${k}h)$.`, `$= ${k ** 3}lwh$.`) };
  },
});

const cylinder: Generator = gen({
  id: Gm('solid.cylinder'), unit: 'ge.solids', subtopic: 'Cubes, prisms, cylinders', levels: [2, 3, 4],
  skills: ['cylinder volume', 'volume transfer'], concepts: ['Volume', 'Cubes, prisms, cylinders', 'Three-dimensional geometry'],
  generate(rng, level) {
    const r = rng.int(2, 6), h = rng.int(3, 12);
    if (level === 2) return { format: 'mcq', stem: `What is the volume of a right circular cylinder with radius ${r} and height ${h}?`, ...textMcq(rng, `$${r * r * h}\\pi$`, [{ t: `$${2 * r * h}\\pi$`, note: 'That is the lateral surface area.' }, `$${r * h}\\pi$`, `$${4 * r * r * h}\\pi$`, `$${r * r * h}$`]), explanation: [`$V = \\pi r^2 h = \\pi(${r})^2(${h}) = ${r * r * h}\\pi$.`], trap: 'Using the diameter in place of the radius.', hints: H('Volume = base area × height.', 'Base is a circle: πr².', `$\\pi\\cdot${r * r}\\cdot${h}$.`) };
    if (level === 3) {
      const h2 = new Frac(h, 4);
      return { format: 'numeric', stem: `Water fills a cylinder of radius ${r} to a height of ${h}. All the water is poured into a second cylinder with radius ${2 * r}. To what height does the water rise?${h2.isInt() ? '' : ' Give your answer as a fraction.'}`, answer: h2.isInt() ? numAns(h2.value) : fracAns(h2.n, h2.d), explanation: [`Volume is preserved: $\\pi(${r})^2(${h}) = \\pi(${2 * r})^2 H$.`, `$H = \\dfrac{${r * r}\\cdot${h}}{${4 * r * r}} = ${h2.tex()}$.`], trap: 'Halving the height when the radius doubles — area scales with r², so the height is divided by 4.', hints: H('The volume of water does not change.', 'Doubling the radius multiplies the base area by 4.', `$H = ${h}/4$.`) };
    }
    const L = rng.pick([10, 12, 15, 20]), W = rng.pick([5, 8, 10]);
    const vol = r * r * h; // in π units
    void L; void W;
    return { format: 'numeric', stem: `A cylindrical tank with radius ${r} m and height ${h} m is completely full. Approximately how many cubic meters of water does it hold? (Use $\\pi \\approx 3.14$ and round to the nearest whole number.)`, answer: numAns(Math.round(3.14 * vol)), explanation: [`$V = \\pi r^2 h = ${vol}\\pi \\approx ${fmt(3.14 * vol)}$.`, `Rounded: ${Math.round(3.14 * vol)} m³.`], trap: 'Squaring the height instead of the radius.', hints: H('V = πr²h.', `$r^2 h = ${vol}$.`, `Multiply ${vol} by 3.14.`) };
  },
});

const spaceDiag: Generator = gen({
  id: Gm('solid.diagonal'), unit: 'ge.solids', subtopic: 'Space diagonals', levels: [4, 5],
  skills: ['3-D Pythagorean theorem'], concepts: ['Space diagonals', 'Three-dimensional geometry', 'Pythagorean theorem'],
  generate(rng, level) {
    const sets = [[2, 3, 6, 7], [1, 4, 8, 9], [2, 6, 9, 11], [4, 4, 7, 9], [3, 4, 12, 13], [2, 10, 11, 15], [6, 6, 7, 11]];
    const kd = level === 5 ? 1 : rng.int(1, 2); const [a, b, c, d] = rng.pick(sets).map((x) => x * kd);
    if (level === 5) {
      const e = rng.int(2, 7);
      return { format: 'mcq', stem: `What is the length of the longest line segment that can be drawn between two vertices of a cube with edge length ${e}?`, ...textMcq(rng, `$${e}\\sqrt{3}$`, [{ t: `$${e}\\sqrt{2}$`, note: 'That is a face diagonal, not the space diagonal.' }, `$${3 * e}$`, `$${e * e}$`, `$${2 * e}$`]), explanation: [`Face diagonal $= ${e}\\sqrt2$; space diagonal $= \\sqrt{(${e}\\sqrt2)^2 + ${e}^2} = ${e}\\sqrt3$.`], trap: 'Stopping at the face diagonal.', hints: H('The longest segment joins opposite corners through the interior.', '$d = \\sqrt{l^2 + w^2 + h^2}$.', `$\\sqrt{3\\cdot ${e * e}}$.`) };
    }
    return { format: 'numeric', stem: `A rectangular box measures ${a} by ${b} by ${c}. What is the length of the diagonal connecting opposite corners of the box?`, answer: numAns(d), explanation: [`$d = \\sqrt{${a}^2 + ${b}^2 + ${c}^2} = \\sqrt{${a * a + b * b + c * c}} = ${d}$.`], trap: 'Using only two dimensions.', hints: H('Apply the Pythagorean theorem twice.', '$d^2 = l^2 + w^2 + h^2$.', `Sum of squares: ${a * a + b * b + c * c}.`) };
  },
});

// ===================== Coordinate geometry =====================
const distMid: Generator = gen({
  id: Gm('coord.distance'), unit: 'ge.coordinate', subtopic: 'Distance formula', levels: [1, 2, 3],
  skills: ['distance formula', 'midpoint formula'], concepts: ['Distance formula', 'Midpoint formula'],
  generate(rng, level) {
    const [a, b, c] = rng.pick(TRIPLES.slice(0, 3));
    const x1 = rng.int(-6, 6), y1 = rng.int(-6, 6);
    const sx = rng.pick([1, -1]), sy = rng.pick([1, -1]);
    const x2 = x1 + sx * a, y2 = y1 + sy * b;
    if (level === 2) {
      const mx = new Frac(x1 + x2, 2), my = new Frac(y1 + y2, 2);
      return { format: 'mcq', stem: `What is the midpoint of the segment joining $(${x1}, ${y1})$ and $(${x2}, ${y2})$?`, ...textMcq(rng, `$\\left(${mx.tex()}, ${my.tex()}\\right)$`, [{ t: `$\\left(${new Frac(x2 - x1, 2).tex()}, ${new Frac(y2 - y1, 2).tex()}\\right)$`, note: 'Subtracted instead of averaging.' }, `$(${x1 + x2}, ${y1 + y2})$`, `$\\left(${my.tex()}, ${mx.tex()}\\right)$`, `$\\left(${mx.add(1).tex()}, ${my.tex()}\\right)$`]), explanation: [`Average the coordinates: $\\left(\\dfrac{${x1} + ${x2}}{2}, \\dfrac{${y1} + ${y2}}{2}\\right) = \\left(${mx.tex()}, ${my.tex()}\\right)$.`], trap: 'Subtracting coordinates instead of averaging.', hints: H('Midpoint = average of the endpoints.', 'Average x-values and y-values separately.', `$(${x1} + ${x2})/2$.`) };
    }
    if (level === 3) {
      // find missing endpoint from midpoint
      const mx = x1 + sx * a, my = y1 + sy * b; // treat (x1,y1) endpoint, (mx,my) midpoint
      return { format: 'numeric', stem: `The midpoint of segment $AB$ is $(${mx}, ${my})$. If $A = (${x1}, ${y1})$, what is the sum of the coordinates of $B$?`, answer: numAns(2 * mx - x1 + 2 * my - y1), explanation: [`$B = (2\\cdot${mx} - (${x1}),\\ 2\\cdot${my} - (${y1})) = (${2 * mx - x1}, ${2 * my - y1})$.`, `Sum: ${2 * mx - x1 + 2 * my - y1}.`], trap: 'Averaging the given point and the midpoint.', hints: H('The midpoint is halfway: B is as far beyond M as A is before it.', '$B = 2M - A$.', `x-coordinate: $2(${mx}) - (${x1})$.`) };
    }
    return { format: 'numeric', stem: `What is the distance between $(${x1}, ${y1})$ and $(${x2}, ${y2})$?`, answer: numAns(c), explanation: [`$d = \\sqrt{(${x2} - (${x1}))^2 + (${y2} - (${y1}))^2} = \\sqrt{${a * a} + ${b * b}} = ${c}$.`], trap: 'Adding the coordinate differences without squaring.', hints: H('Distance formula comes from the Pythagorean theorem.', 'Find the horizontal and vertical differences.', `Differences: ${a} and ${b}.`) };
  },
});

const coordArea: Generator = gen({
  id: Gm('coord.area'), unit: 'ge.coordinate', subtopic: 'Areas on the coordinate plane', levels: [3, 4, 5],
  skills: ['area from coordinates'], concepts: ['Areas on the coordinate plane', 'Coordinate geometry'],
  generate(rng, level) {
    let pts: Pt[];
    if (level === 3) {
      const x1 = rng.int(-5, 0), x2 = rng.int(2, 7), y0 = rng.int(-4, 0), yt = rng.int(2, 6), xt = rng.int(x1, x2);
      pts = [P(x1, y0), P(x2, y0), P(xt, yt)];
    } else {
      pts = [P(rng.int(-6, -1), rng.int(-5, 2)), P(rng.int(1, 6), rng.int(-6, 0)), P(rng.int(-2, 5), rng.int(2, 7))];
    }
    const [A, B, C] = pts;
    const area2 = Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    if (area2 === 0) return coordArea.generate(rng, level);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const diagram: GeoDiagram = { kind: 'geo', width: 280, height: 280, axes: { xMin: Math.min(-1, ...xs) - 1, xMax: Math.max(1, ...xs) + 1, yMin: Math.min(-1, ...ys) - 1, yMax: Math.max(1, ...ys) + 1 }, polygons: [{ pts, shaded: true }], points: pts.map((p, i) => ({ p, label: `${'ABC'[i]}(${p.x}, ${p.y})`, dy: p.y === Math.max(...ys) ? -10 : 14 })) };
    const area = area2 / 2;
    return {
      format: 'numeric', stem: `What is the area of the triangle with vertices $A(${A.x}, ${A.y})$, $B(${B.x}, ${B.y})$, and $C(${C.x}, ${C.y})$?`, diagram, answer: numAns(area),
      explanation: level === 3
        ? [`Side $AB$ is horizontal with length ${Math.abs(B.x - A.x)}; the height is the vertical distance from $C$: ${Math.abs(C.y - A.y)}.`, `Area $= \\tfrac12\\cdot${Math.abs(B.x - A.x)}\\cdot${Math.abs(C.y - A.y)} = ${fmt(area)}$.`]
        : [`Enclose the triangle in a rectangle ${Math.max(...xs) - Math.min(...xs)} by ${Math.max(...ys) - Math.min(...ys)} and subtract the three corner right triangles — or use the shoelace formula:`, `Area $= \\tfrac12|x_A(y_B - y_C) + x_B(y_C - y_A) + x_C(y_A - y_B)| = \\tfrac12\\cdot ${area2} = ${fmt(area)}$.`],
      trap: 'Using a slanted side as the base with a non-perpendicular “height”.',
      hints: H('Look for a horizontal or vertical side.', level === 3 ? 'Use the horizontal side as the base.' : 'Box the triangle in a rectangle and subtract the corners.', `The bounding rectangle is ${Math.max(...xs) - Math.min(...xs)} × ${Math.max(...ys) - Math.min(...ys)}.`),
    };
  },
});

const circleCoord: Generator = gen({
  id: Gm('coord.circle'), unit: 'ge.coordinate', subtopic: 'Geometric relationships', levels: [3, 4, 5],
  skills: ['circle equations', 'points inside a circle'], concepts: ['Coordinate geometry', 'Circles', 'Distance formula'],
  generate(rng, level) {
    const h = rng.int(-3, 3), k = rng.int(-3, 3), r = rng.pick([5, 10]);
    const cands = rng.sample([[h + 3, k + 4], [h + 4, k + 4], [h - 5, k], [h + 1, k + 4], [h - 2, k - 5], [h + 6, k + 1], [h, k - 4], [h - 3, k - 3]], 6).map(([x, y]) => [x * (r / 5) - h * (r / 5 - 1), y * (r / 5) - k * (r / 5 - 1)]);
    const inside = ([x, y]: number[]) => (x - h) ** 2 + (y - k) ** 2 < r * r;
    const on = ([x, y]: number[]) => (x - h) ** 2 + (y - k) ** 2 === r * r;
    if (level === 5) {
      const R = rng.pick([5, 10]);
      // lattice points on x^2+y^2=R^2
      let cnt = 0; for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x * x + y * y === R * R) cnt++;
      return { format: 'numeric', stem: `How many points $(x, y)$ with **both** coordinates integers lie on the circle $x^2 + y^2 = ${R * R}$?`, answer: numAns(cnt), explanation: [`Find integer solutions of $x^2 + y^2 = ${R * R}$: the axis points $(\\pm${R}, 0), (0, \\pm${R})$ give 4.`, R === 5 ? 'The 3-4-5 triple gives $(\\pm3, \\pm4)$ and $(\\pm4, \\pm3)$: 8 more.' : 'The 6-8-10 triple gives $(\\pm6, \\pm8), (\\pm8, \\pm6)$: 8 more.', `Total: ${cnt}.`], trap: 'Forgetting sign combinations or the swapped pairs.', hints: H('Use Pythagorean triples with hypotenuse ' + R + '.', 'Each nonzero pair yields 4 sign choices and can be swapped.', 'Do not forget the points on the axes.') };
    }
    const opts = cands.map(([x, y]) => ({ t: `$(${x}, ${y})$`, ok: level === 3 ? on([x, y]) : inside([x, y]), note: `distance² from center $= ${(x - h) ** 2 + (y - k) ** 2}$ vs $r^2 = ${r * r}$` }));
    if (!opts.some((o) => o.ok) || opts.every((o) => o.ok)) return circleCoord.generate(rng, level);
    return {
      format: 'multi', stem: `A circle in the $xy$-plane has center $(${h}, ${k})$ and radius ${r}. Which of the following points lie ${level === 3 ? '**on**' : 'strictly **inside**'} the circle? Indicate all such points.`, ...multiSel(rng, opts),
      explanation: [`A point $(x, y)$ is ${level === 3 ? 'on' : 'inside'} the circle when $(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})^2 + (y ${k < 0 ? '+' : '-'} ${Math.abs(k)})^2 ${level === 3 ? '=' : '<'} ${r * r}$.`, ...opts.map((o) => `${o.t}: ${o.note} → ${o.ok ? 'yes' : 'no'}.`)],
      trap: 'Comparing the distance (not squared) with r², or forgetting to subtract the center coordinates.',
      hints: H('Compute each point’s distance from the center.', 'Compare squared distances to avoid square roots.', `$r^2 = ${r * r}$.`),
    };
  },
});

// ===================== Geometry QC =====================
const geoQc: Generator = gen({
  id: Gm('qc.mixed'), unit: 'ge.triangles', subtopic: 'Geometric relationships', levels: [2, 3, 4, 5],
  skills: ['comparing geometric quantities'], concepts: ['Triangles', 'Circles', 'Geometric relationships'],
  generate(rng, level) {
    const d = rng.int(2, 9);
    const T = [
      { lv: 3, given: `The diagonal of a square and the diameter of a circle each have length ${d}.`, a: 'The perimeter of the square', b: 'The circumference of the circle', va: 4 * (d / Math.SQRT2), vb: Math.PI * d, proof: [`Square side $= ${d}/\\sqrt2$, perimeter $= ${2 * d}\\sqrt2 \\approx ${(2 * d * Math.SQRT2).toFixed(2)}$.`, `Circumference $= ${d}\\pi \\approx ${(Math.PI * d).toFixed(2)}$.`] },
      { lv: 2, given: `In triangle $XYZ$, $\\angle X = ${50 + d}°$ and $\\angle Y = ${70 - d}°$.`, a: 'The length of side $YZ$', b: 'The length of side $XZ$', va: 50 + d, vb: 70 - d, proof: ['The larger side is opposite the larger angle.', `$YZ$ is opposite $\\angle X = ${50 + d}°$; $XZ$ is opposite $\\angle Y = ${70 - d}°$.`] },
      { lv: 4, given: `The length of each side of an equilateral triangle is ${2 * d}.`, a: 'The area of the triangle', b: `$${d * d * 2}$`, va: Math.sqrt(3) * d * d, vb: 2 * d * d, proof: [`Area $= \\dfrac{\\sqrt3}{4}(${2 * d})^2 = ${d * d}\\sqrt3 \\approx ${(Math.sqrt(3) * d * d).toFixed(2)}$.`] },
      { lv: 4, given: `A rectangle has area ${d * d}.`, a: 'The perimeter of the rectangle', b: `$${4 * d}$`, va: 'D' },
      { lv: 5, given: `The radius of circle $C$ is $r$, and $r > 0$.`, a: 'The circumference of $C$', b: 'The area of $C$', va: 'D' },
      { lv: 3, given: `In a right triangle the legs have lengths ${d} and ${d + 1}.`, a: 'The length of the hypotenuse', b: `$${2 * d}$`, va: Math.sqrt(d * d + (d + 1) ** 2), vb: 2 * d, proof: [`Hypotenuse $= \\sqrt{${d * d} + ${(d + 1) ** 2}} = \\sqrt{${d * d + (d + 1) ** 2}}$; compare with $\\sqrt{${4 * d * d}}$.`] },
    ];
    const t = rng.pick(T.filter((x) => Math.abs(x.lv - level) <= 1));
    if (t.va === 'D') {
      if (t.b.includes(String(4 * d))) {
        return qcOutput({ given: t.given, a: t.a, b: t.b, vars: [{ name: 'l', kind: 'real' }], constraint: (v) => v.l > 0, fA: (v) => 2 * (v.l + (d * d) / v.l), fB: () => 4 * d, extra: [{ l: d }], trap: 'Assuming the rectangle is a square.', hints: H('For a fixed area, the perimeter is smallest for a square.', `A ${d}-by-${d} square has perimeter ${4 * d}.`, `Could the rectangle be long and thin?`), intro: `If the rectangle is $l$ by $\\frac{${d * d}}{l}$, the perimeter is $2\\left(l + \\frac{${d * d}}{l}\\right) \\ge ${4 * d}$, with equality only for the square.` });
      }
      return qcOutput({ given: t.given, a: t.a, b: t.b, vars: [{ name: 'r', kind: 'real' }], constraint: (v) => v.r > 0, fA: (v) => 2 * Math.PI * v.r, fB: (v) => Math.PI * v.r * v.r, intro: 'Compare $2\\pi r$ with $\\pi r^2$: divide by $\\pi r > 0$ to compare $2$ with $r$.', trap: 'Assuming a specific radius.', hints: H('Write both quantities in terms of r.', 'Divide both by πr (positive).', 'Compare 2 with r.') });
    }
    return qcNumeric({ given: t.given, a: t.a, b: t.b, va: t.va as number, vb: t.vb as number, proof: t.proof, trap: 'Trusting the appearance of a figure instead of computing.', hints: H('Write each quantity with a formula.', 'Compute or estimate both values.', 'Use √2 ≈ 1.41, √3 ≈ 1.73, π ≈ 3.14.') });
  },
});

export const GEOMETRY: Generator[] = [parallel, anglesAlgebra, triAngles, triInequality, similar, triArea, pythag, special, rightApplied, quadArea, polygonAngles, rectPerimArea, rhombus, circleBasic, arcSector, inscribed, box, cylinder, spaceDiag, distMid, coordArea, circleCoord, geoQc];
void gcd; void tnum; void piTex; void round;
