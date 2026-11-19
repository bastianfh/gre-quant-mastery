// Data-interpretation SETS: like the GRE, one chart supports a set of three questions.
// Each family is a builder returning all three questions; three member generators share the base's seed
// (see Generator.setOf), so every member is built from identical data.
import type { RNG } from '../../lib/rng';
import { fmt, gcd, median, round, sum } from '../../lib/math';
import type { ChartDiagram, GenOutput, Generator, Level } from '../types';
import { H, multiSel, numAns, numMcq, textMcq } from './helpers';

type Builder = (rng: RNG, level: Level) => [GenOutput, GenOutput, GenOutput];

function family(base: string, subtopic: string, concepts: string[], build: Builder): Generator[] {
  return [0, 1, 2].map((index) => ({
    id: `${base}.q${index + 1}`, unit: 'da.interpretation', subtopic, levels: [3, 4, 5] as Level[],
    skills: ['reading charts', 'multi-step data reasoning'], concepts,
    setOf: { base, index, size: 3 },
    generate: (rng: RNG, level: Level) => ({ ...build(rng, level)[index], di: true }),
  }));
}
const setNote = (k: number) => `**Question ${k} of 3** refers to the chart above. `;
const pctRender = (v: number) => `$${fmt(v)}\\%$`;

// ---------------- A. Grouped bar chart ----------------
const YEARS = ['2020', '2021', '2022', '2023', '2024'];
const barSet: Builder = (rng, level) => {
  let A: number[], B: number[];
  for (;;) {
    A = YEARS.map(() => rng.int(12, 48) * 10); B = YEARS.map(() => rng.int(10, 45) * 10);
    const aheadK = (k: number) => A.map((a, i) => a > B[i] * (1 + k / 100));
    const k = level === 5 ? 20 : 0;
    const n = aheadK(k).filter(Boolean).length;
    if (n >= 1 && n <= 4 && A.some((a, i) => i > 0 && a !== A[i - 1])) break;
  }
  const diagram: ChartDiagram = { kind: 'bar', title: 'Enrollment by department (students)', categories: YEARS, series: [{ name: 'Engineering', values: A }, { name: 'Business', values: B }], yLabel: 'Students' };
  // Q1
  const yi = rng.int(0, 4);
  const q1: GenOutput = level === 3
    ? { format: 'numeric', diagram, stem: `${setNote(1)}What was the combined enrollment of the two departments in ${YEARS[yi]}?`, answer: numAns(A[yi] + B[yi]), explanation: [`Engineering ${A[yi]} + Business ${B[yi]} = ${A[yi] + B[yi]}.`], trap: 'Reading the wrong year or only one department.', hints: H('Find both bars for that year.', 'Add their heights.', `Engineering: ${A[yi]}.`) }
    : { format: 'numeric', diagram, stem: `${setNote(1)}What was the average (arithmetic mean) annual Business enrollment from 2020 to 2024?`, answer: numAns(sum(B) / 5), explanation: [`Business values: ${B.join(', ')}; sum $= ${sum(B)}$.`, `Mean $= ${sum(B)}/5 = ${fmt(sum(B) / 5)}$.`], trap: 'Averaging the Engineering bars, or dividing by the wrong count.', hints: H('Read all five Business bars.', 'Add them.', 'Divide by 5.') };
  // Q2: percent change of Engineering between two years with a change
  let i = 0, j = 4;
  for (let t = 0; t < 30; t++) { i = rng.int(0, 3); j = rng.int(i + 1, 4); if (A[i] !== A[j]) break; }
  const pc = ((A[j] - A[i]) / A[i]) * 100;
  const q2: GenOutput = {
    format: 'mcq', diagram, stem: `${setNote(2)}By approximately what percent did Engineering enrollment ${A[j] > A[i] ? 'increase' : 'decrease'} from ${YEARS[i]} to ${YEARS[j]}?`,
    ...numMcq(Math.round(Math.abs(pc)), [{ v: Math.round(Math.abs(((A[j] - A[i]) / A[j]) * 100)), note: 'Divided by the later year instead of the earlier one.' }, Math.abs(A[j] - A[i]) / 10, Math.round(Math.abs(pc) / 2), Math.round(Math.abs(pc)) + 12], { render: pctRender, allowNeg: false }),
    explanation: [`Engineering: ${A[i]} → ${A[j]} (change ${A[j] - A[i]}).`, `Percent change $= \\dfrac{${A[j] - A[i]}}{${A[i]}}\\times 100 \\approx ${fmt(round(pc, 1))}\\%$.`],
    trap: 'Using the later value as the base.', hints: H('Percent change uses the earlier value as the base.', '(new − old) / old.', `Old value: ${A[i]}.`),
  };
  // Q3: multi-select years
  const k = level === 5 ? 20 : 0;
  const ok = A.map((a, idx) => a > B[idx] * (1 + k / 100));
  const q3: GenOutput = {
    format: 'multi', diagram,
    stem: `${setNote(3)}${k ? `In which years was Engineering enrollment more than ${k}% greater than Business enrollment?` : 'In which years was Engineering enrollment greater than Business enrollment?'} Indicate all such years.`,
    ...multiSel(rng, YEARS.map((y, idx) => ({ t: y, ok: ok[idx], note: `${y}: ${A[idx]} vs ${B[idx]}${k ? ` (threshold ${fmt(B[idx] * (1 + k / 100))})` : ''}` })), true),
    explanation: [k ? `“More than ${k}% greater” means Engineering $> ${fmt(1 + k / 100)}\\times$ Business.` : 'Compare the two bars year by year.', ...YEARS.map((y, idx) => `${y}: Engineering ${A[idx]}, Business ${B[idx]}${k ? `, threshold ${fmt(B[idx] * (1 + k / 100))}` : ''} → ${ok[idx] ? 'yes' : 'no'}.`)],
    trap: k ? `Checking only whether Engineering is larger, not ${k}% larger.` : 'Misreading which bar belongs to which department.',
    hints: H('Check each year separately.', k ? `Multiply each Business value by ${fmt(1 + k / 100)}.` : 'Compare the two bars.', 'Use the legend to match colors.'),
  };
  return [q1, q2, q3];
};

// ---------------- B. Table ----------------
const DIVS = ['Retail', 'Online', 'Wholesale', 'Services', 'Licensing'];
const tableSet: Builder = (rng, level) => {
  let R: number[], C: number[], margins: number[];
  for (;;) {
    R = DIVS.map(() => rng.int(20, 90) * 2); C = R.map((r) => Math.round(r * (rng.int(45, 90) / 100)));
    margins = R.map((r, i) => (r - C[i]) / r);
    const mx = Math.max(...margins);
    if (margins.filter((m) => Math.abs(m - mx) < 1e-9).length === 1 && C.every((c, i) => c < R[i])) break;
  }
  const diagram: ChartDiagram = { kind: 'table', title: 'Division results, last fiscal year (millions of dollars)', columns: ['Division', 'Revenue', 'Cost'], rows: DIVS.map((d, i) => [d, R[i], C[i]]) };
  const P = R.map((r, i) => r - C[i]);
  const k = rng.int(0, 4);
  const q1: GenOutput = level === 3
    ? { format: 'numeric', diagram, stem: `${setNote(1)}What was the total profit (revenue minus cost) of all five divisions, in millions of dollars?`, answer: numAns(sum(P)), explanation: [`Profits: ${DIVS.map((d, i) => `${d} ${P[i]}`).join(', ')}.`, `Total $= ${sum(P)}$.`], trap: 'Adding revenues instead of profits.', hints: H('Profit = revenue − cost for each division.', 'Or: total revenue − total cost.', `Total revenue = ${sum(R)}.`) }
    : { format: 'numeric', diagram, stem: `${setNote(1)}${DIVS[k]}'s profit was what percent of its revenue? (Round to the nearest whole percent.)`, answer: numAns(Math.round((P[k] / R[k]) * 100), 0.5), unitLabel: '%', explanation: [`Profit $= ${R[k]} - ${C[k]} = ${P[k]}$.`, `$${P[k]}/${R[k]} \\approx ${((P[k] / R[k]) * 100).toFixed(1)}\\%$.`], trap: 'Dividing profit by cost instead of revenue.', hints: H('Compute the profit first.', 'Profit margin = profit ÷ revenue.', `Profit = ${P[k]}.`) };
  const best = margins.indexOf(Math.max(...margins));
  const biggest = P.indexOf(Math.max(...P));
  const q2: GenOutput = {
    format: 'mcq', diagram, stem: `${setNote(2)}Which division had the greatest profit margin (profit as a percent of revenue)?`,
    choices: DIVS, answer: best,
    distractorNotes: biggest !== best ? { [biggest]: 'This division has the largest profit in dollars, not the largest margin.' } : {},
    explanation: [`Margins: ${DIVS.map((d, i) => `${d} ${P[i]}/${R[i]} ≈ ${(margins[i] * 100).toFixed(1)}%`).join('; ')}.`, `Greatest: ${DIVS[best]}.`],
    trap: 'Choosing the division with the largest dollar profit.', hints: H('Margin is a ratio, not a dollar amount.', 'Compute profit ÷ revenue for each.', 'Estimate each to the nearest percent.'),
  };
  const raise = level === 5 ? rng.pick([8, 12, 15]) : 10;
  const newP = sum(R) - sum(C) * (1 + raise / 100);
  const q3: GenOutput = level === 5
    ? { format: 'numeric', diagram, stem: `${setNote(3)}If every division's cost rose by ${raise}% while revenues stayed the same, by what percent would total profit decrease? (Round to the nearest tenth of a percent.)`, answer: numAns(round(((sum(P) - newP) / sum(P)) * 100, 1), 0.051), unitLabel: '%', explanation: [`Total cost ${sum(C)} rises by ${raise}%: an extra $${fmt(sum(C) * raise / 100)}$.`, `Profit falls from ${sum(P)} to ${fmt(newP)}: a decrease of $${fmt((sum(P) - newP) / sum(P) * 100, 2)}\\%$.`], trap: `Answering ${raise}% — the cost increase is a different percent of profit.`, hints: H('Find total profit before and after.', `Extra cost = ${raise}% of total cost.`, `Total cost = ${sum(C)}.`) }
    : { format: 'numeric', diagram, stem: `${setNote(3)}If every division's cost rose by ${raise}% while revenues stayed the same, what would total profit be, in millions of dollars?`, answer: numAns(round(newP, 2), 0.01), explanation: [`Total revenue ${sum(R)}; total cost ${sum(C)} × ${fmt(1 + raise / 100)} = ${fmt(sum(C) * (1 + raise / 100))}.`, `Profit $= ${sum(R)} - ${fmt(sum(C) * (1 + raise / 100))} = ${fmt(newP)}$.`], trap: 'Raising profit or revenue by the percent instead of cost.', hints: H('Work with totals.', 'New cost = 1.1 × old cost.', `Total cost = ${sum(C)}.`) };
  return [q1, q2, q3];
};

// ---------------- C. Line chart ----------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const lineSet: Builder = (rng, level) => {
  let v: number[], drops: number[];
  for (;;) {
    v = [rng.int(30, 70)]; for (let i = 1; i < 6; i++) v.push(Math.max(8, v[i - 1] + rng.int(-14, 14)));
    drops = v.slice(1).map((x, i) => v[i] - x);
    const mx = Math.max(...drops);
    if (mx > 0 && drops.filter((d) => d === mx).length === 1 && v[5] !== v[0]) break;
  }
  const diagram: ChartDiagram = { kind: 'line', title: 'Average daily users of a study app (thousands)', categories: MONTHS, series: [{ name: 'Users', values: v }], yLabel: 'Thousands' };
  const bi = drops.indexOf(Math.max(...drops));
  const q1: GenOutput = { format: 'mcq', diagram, stem: `${setNote(1)}Between which two consecutive months did average daily users decrease the most?`, choices: MONTHS.slice(1).map((m, i) => `${MONTHS[i]} to ${m}`), answer: bi, explanation: [`Changes: ${drops.map((d, i) => `${MONTHS[i]}→${MONTHS[i + 1]}: ${d > 0 ? '−' + d : '+' + -d}`).join(', ')}.`, `Largest decrease: ${MONTHS[bi]} to ${MONTHS[bi + 1]}.`], trap: 'Picking the lowest point instead of the steepest drop.', hints: H('Look for the steepest downward segment.', 'Compute each month-to-month change.', 'Compare only the decreases.') };
  const med = median(v);
  const q2: GenOutput = { format: 'numeric', diagram, stem: `${setNote(2)}What was the median of the six monthly values, in thousands?`, answer: numAns(med), explanation: [`Sorted: ${[...v].sort((a, b) => a - b).join(', ')}.`, `Median $= (${[...v].sort((a, b) => a - b)[2]} + ${[...v].sort((a, b) => a - b)[3]})/2 = ${fmt(med)}$.`], trap: 'Taking the middle month (Mar/Apr) without sorting.', hints: H('Sort the six values.', 'With an even count, average the middle two.', 'The 3rd and 4th sorted values.') };
  const pc = ((v[5] - v[0]) / v[0]) * 100;
  const q3: GenOutput = level === 5
    ? { format: 'numeric', diagram, stem: `${setNote(3)}If users grow from the June level by the same percent as the January-to-June change, what will average daily users be six months later, in thousands? (Round to the nearest whole number.)`, answer: numAns(Math.round(v[5] * (v[5] / v[0])), 0.5), explanation: [`January→June multiplier: $${v[5]}/${v[0]} \\approx ${(v[5] / v[0]).toFixed(4)}$.`, `Apply it again: $${v[5]}\\times${(v[5] / v[0]).toFixed(4)} \\approx ${(v[5] * (v[5] / v[0])).toFixed(2)}$ → ${Math.round(v[5] * (v[5] / v[0]))}.`], trap: 'Adding the same absolute change instead of applying the same percent.', hints: H('Same percent change = same multiplier.', `Multiplier = ${v[5]}/${v[0]}.`, 'Multiply the June value by it.') }
    : { format: 'numeric', diagram, stem: `${setNote(3)}By what percent did average daily users change from January to June? (Round to the nearest whole percent; enter a negative number for a decrease.)`, answer: numAns(Math.round(pc), 0.5), unitLabel: '%', explanation: [`$\\dfrac{${v[5]} - ${v[0]}}{${v[0]}}\\times 100 \\approx ${pc.toFixed(1)}\\%$.`], trap: 'Using June as the base.', hints: H('Percent change from January.', '(June − Jan) / Jan.', `Jan = ${v[0]}.`) };
  return [q1, q2, q3];
};

// ---------------- D. Pie chart ----------------
const CATS = ['Housing', 'Food', 'Transport', 'Savings', 'Other'];
const pieSet: Builder = (rng, level) => {
  let p: number[];
  for (;;) { p = [rng.int(25, 40), rng.int(10, 22), rng.int(6, 15), rng.int(5, 15)]; p.push(100 - sum(p)); if (p[4] >= 4 && new Set(p).size === 5) break; }
  const total = rng.pick([3600, 4000, 4800, 5000, 6000]);
  const diagram: ChartDiagram = { kind: 'pie', title: `Monthly household budget, Year 1 (total $${total.toLocaleString()})`, slices: CATS.map((c, i) => ({ label: c, value: p[i] })) };
  const c1 = rng.int(1, 4);
  const q1: GenOutput = { format: 'numeric', diagram, stem: `${setNote(1)}How many dollars per month went to ${CATS[c1].toLowerCase()} in Year 1?`, answer: numAns((p[c1] * total) / 100), unitLabel: 'dollars', explanation: [`$${p[c1]}\\%$ of \\$${total.toLocaleString()} $= ${fmt((p[c1] * total) / 100)}$.`], trap: 'Reading the percent as dollars.', hints: H('Slices are percents of the total.', `${CATS[c1]}: ${p[c1]}%.`, `${p[c1] / 100} × ${total}.`) };
  const g = gcd(p[0], p[1]);
  const q2: GenOutput = { format: 'mcq', diagram, stem: `${setNote(2)}What was the ratio of Housing spending to Food spending in Year 1?`, ...textMcq(rng, `$${p[0] / g}:${p[1] / g}$`, [{ t: `$${p[1] / g}:${p[0] / g}$`, note: 'Reversed the order of the ratio.' }, `$${p[0]}:100$`, `$${p[0] + p[1]}:${p[1]}$`, `$${p[0] / g + 1}:${p[1] / g}$`]), explanation: [`Housing ${p[0]}%, Food ${p[1]}%: the ratio of dollars equals the ratio of percents (same total).`, `$${p[0]}:${p[1]} = ${p[0] / g}:${p[1] / g}$.`], trap: 'Reversing the order, or comparing a slice with the whole.', hints: H('Both slices come from the same total.', 'So compare the percents directly.', 'Reduce the ratio.') };
  const gr = level === 5 ? rng.pick([5, 10, 20]) : 10, hr = level === 5 ? rng.pick([2, 4, 8]) : 0;
  const housing2 = (p[0] * total) / 100 * (1 + hr / 100), total2 = total * (1 + gr / 100);
  const q3: GenOutput = { format: 'numeric', diagram,
    stem: `${setNote(3)}In Year 2 the total budget increased by ${gr}%${hr ? ` and Housing spending increased by ${hr}%` : ' while Housing spending stayed the same in dollars'}. What percent of the Year 2 budget went to Housing? (Round to the nearest tenth of a percent.)`,
    answer: numAns(round((housing2 / total2) * 100, 1), 0.051), unitLabel: '%',
    explanation: [`Year 1 Housing: $${fmt((p[0] * total) / 100)}$; Year 2 Housing: $${fmt(housing2)}$.`, `Year 2 total: $${fmt(total2)}$.`, `Share $= ${fmt(housing2)}/${fmt(total2)} \\approx ${((housing2 / total2) * 100).toFixed(2)}\\%$.`],
    trap: `Keeping the Year 1 percent (${p[0]}%) even though the total changed${hr ? ', or subtracting the two growth rates' : ''}.`,
    hints: H('Work in dollars, not percents.', 'Compute Year 2 Housing and Year 2 total separately.', `Year 1 Housing = ${fmt((p[0] * total) / 100)}.`) };
  return [q1, q2, q3];
};

export const DI_SETS: Generator[] = [
  ...family('da.set.bar', 'Bar graphs', ['Bar graphs', 'Percent change from charts', 'Data interpretation'], barSet),
  ...family('da.set.table', 'Data tables', ['Data tables', 'Percentages', 'Data interpretation'], tableSet),
  ...family('da.set.line', 'Line graphs', ['Line graphs', 'Median', 'Data interpretation'], lineSet),
  ...family('da.set.pie', 'Pie charts', ['Pie charts', 'Ratios', 'Data interpretation'], pieSet),
];
export const DI_SET_BASES = ['da.set.bar', 'da.set.table', 'da.set.line', 'da.set.pie'];
