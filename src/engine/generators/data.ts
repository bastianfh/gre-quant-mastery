import { Frac, fmt, mean, median, nCr, nPr, fact, round, sd, sum, tnum, money } from '../../lib/math';
import type { ChartDiagram, Generator } from '../types';
import { H, fracAns, gen, multiSel, numAns, numMcq, textMcq } from './helpers';
import { qcNumeric, qcOutput } from './qc';

const Dt = (id: string) => `da.${id}`;
const list = (xs: number[]) => xs.join(', ');

// ===================== Mean, median, mode, range =====================
const meanGen: Generator = gen({
  id: Dt('stats.mean'), unit: 'da.stats', subtopic: 'Mean', levels: [1, 2, 3, 4],
  skills: ['mean via totals'], concepts: ['Mean', 'Weighted averages'],
  generate(rng, level) {
    const n = rng.int(4, 7);
    const xs = Array.from({ length: n }, () => rng.int(5, 40));
    const s = sum(xs);
    if (level === 1) {
      const pad = (n - (s % n)) % n; xs[0] += pad;
      return { format: 'numeric', stem: `What is the arithmetic mean of ${list(xs)}?`, answer: numAns(sum(xs) / n), explanation: [`Sum $= ${sum(xs)}$; mean $= ${sum(xs)}/${n} = ${fmt(sum(xs) / n)}$.`], trap: 'Dividing by the wrong count.', hints: H('Mean = sum ÷ count.', `There are ${n} values.`, `Sum = ${sum(xs)}.`) };
    }
    if (level === 2) {
      const target = Math.ceil(s / n) + rng.int(1, 6);
      const need = target * (n + 1) - s;
      return { format: 'numeric', stem: `The scores on ${n} tests were ${list(xs)}. What score is needed on the next test to make the average of all ${n + 1} tests exactly ${target}?`, answer: numAns(need), explanation: [`Required total: $${target}\\times${n + 1} = ${target * (n + 1)}$.`, `Current total: ${s}. Needed: $${target * (n + 1)} - ${s} = ${need}$.`], trap: 'Using the old count instead of the new count.', hints: H('Think in totals.', `New total must be ${target} × ${n + 1}.`, `Current total is ${s}.`) };
    }
    if (level === 3) {
      const m = rng.int(20, 60), k = rng.int(5, 10), out = rng.int(m + 5, m + 40);
      const newMean = new Frac(m * k - out, k - 1);
      return { format: 'numeric', stem: `The average of ${k} numbers is ${m}. When one number, ${out}, is removed, what is the average of the remaining numbers?${newMean.isInt() ? '' : ' Give your answer as a fraction.'}`, answer: newMean.isInt() ? numAns(newMean.value) : fracAns(newMean.n, newMean.d), explanation: [`Total $= ${k}\\times${m} = ${k * m}$.`, `After removal: $(${k * m} - ${out})/${k - 1} = ${newMean.tex()}$.`], trap: 'Subtracting the removed value from the mean.', hints: H('Convert the mean to a total.', 'Remove the value from the total.', `Divide by ${k - 1}.`) };
    }
    // level 4: average of consecutive/evenly spaced set & shift
    const a = rng.int(10, 50), d = rng.pick([2, 3, 5]), cnt = rng.int(5, 15);
    const avg = a + ((cnt - 1) * d) / 2;
    return qcNumeric({
      given: `Set $S$ consists of the ${cnt} numbers ${a}, ${a + d}, ${a + 2 * d}, …, ${a + (cnt - 1) * d}.`,
      a: 'The mean of $S$', b: 'The median of $S$', va: avg, vb: median(Array.from({ length: cnt }, (_, i) => a + i * d)),
      proof: ['For an evenly spaced set, the mean equals the median (both are the average of the first and last terms).', `$\\dfrac{${a} + ${a + (cnt - 1) * d}}{2} = ${fmt(avg)}$.`],
      trap: 'Computing both quantities in full instead of using the evenly spaced property.',
      hints: H('Is the set evenly spaced?', 'In an evenly spaced set, mean = median.', '(first + last)/2.'),
    });
  },
});

const medianMode: Generator = gen({
  id: Dt('stats.median'), unit: 'da.stats', subtopic: 'Median', levels: [1, 2, 3],
  skills: ['ordering data'], concepts: ['Median', 'Mode', 'Range'],
  generate(rng, level) {
    const n = rng.pick(level === 1 ? [5, 7] : [6, 8, 9]);
    const xs = Array.from({ length: n }, () => rng.int(1, 20));
    xs[1] = xs[0];
    const sorted = [...xs].sort((a, b) => a - b);
    const med = median(xs), mn = mean(xs), rg = sorted[n - 1] - sorted[0];
    const counts = new Map<number, number>(); xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
    const maxC = Math.max(...counts.values());
    const modes = [...counts.entries()].filter(([, c]) => c === maxC).map(([v]) => v);
    if (level <= 2) {
      return { format: 'numeric', stem: `What is the median of the following data? ${list(rng.shuffle(xs))}`, answer: numAns(med), explanation: [`Sorted: ${list(sorted)}.`, n % 2 ? `Middle (${(n + 1) / 2}th) value: ${med}.` : `Average of the ${n / 2}th and ${n / 2 + 1}th values: $(${sorted[n / 2 - 1]} + ${sorted[n / 2]})/2 = ${fmt(med)}$.`], trap: 'Taking the middle of the unsorted list.', hints: H('Sort the data first.', n % 2 ? 'Odd count: take the middle value.' : 'Even count: average the two middle values.', `Sorted: ${list(sorted)}.`) };
    }
    const opts = [
      { t: `The median is ${fmt(med)}.`, ok: true },
      { t: `The mean is greater than the median.`, ok: mn > med + 1e-9 },
      { t: `The range is ${rg}.`, ok: true },
      { t: `The mode is ${modes.length === 1 ? modes[0] : modes[0]}.`, ok: modes.length === 1 },
      { t: `The mean is ${fmt(mn + 1, 2)}.`, ok: false, note: `The mean is ${fmt(mn, 2)}.` },
      { t: `The median equals the mean.`, ok: Math.abs(mn - med) < 1e-9 },
    ];
    return { format: 'multi', stem: `For the data set ${list(xs)}, which of the following statements are true? Indicate all such statements.`, ...multiSel(rng, opts), explanation: [`Sorted: ${list(sorted)}.`, `Median $= ${fmt(med)}$; mean $= ${sum(xs)}/${n} = ${fmt(mn, 3)}$; range $= ${sorted[n - 1]} - ${sorted[0]} = ${rg}$; mode${modes.length > 1 ? 's' : ''}: ${modes.join(', ')}.`], trap: 'Forgetting to sort, or assuming the mean and median coincide.', hints: H('Sort the list.', 'Compute each statistic separately.', `Sum = ${sum(xs)}.`) };
  },
});

const statsChange: Generator = gen({
  id: Dt('stats.change'), unit: 'da.stats', subtopic: 'Effect of changes on statistics', levels: [3, 4, 5],
  skills: ['how statistics respond to changes'], concepts: ['Effect of changes on statistics', 'Mean', 'Median', 'Range'],
  generate(rng, level) {
    const xs = Array.from({ length: rng.pick([5, 7]) }, () => rng.int(10, 50)).sort((a, b) => a - b);
    const add = level === 5 ? rng.int(xs[0], xs[xs.length - 1]) : rng.int(xs[xs.length - 1] + 5, 99);
    const ys = [...xs, add];
    const T = [
      { a: 'The mean of the new list', b: 'The mean of the original list', va: mean(ys), vb: mean(xs) },
      { a: 'The median of the new list', b: 'The median of the original list', va: median(ys), vb: median(xs) },
      { a: 'The range of the new list', b: 'The range of the original list', va: Math.max(...ys) - Math.min(...ys), vb: Math.max(...xs) - Math.min(...xs) },
    ];
    const t = rng.pick(level === 5 ? T : T.slice(0, 2));
    return qcNumeric({
      given: `The list ${list(xs)} has the number ${add} added to it.`, a: t.a, b: t.b, va: t.va, vb: t.vb,
      proof: [`Original: mean $= ${fmt(mean(xs), 3)}$, median $= ${fmt(median(xs))}$, range $= ${xs[xs.length - 1] - xs[0]}$.`, `New list: mean $= ${fmt(mean(ys), 3)}$, median $= ${fmt(median(ys))}$, range $= ${Math.max(...ys) - Math.min(...ys)}$.`, add > mean(xs) ? `Adding a value above the mean raises the mean.` : add < mean(xs) ? 'Adding a value below the mean lowers the mean.' : 'Adding a value equal to the mean leaves it unchanged.'],
      trap: 'Assuming every statistic changes in the same direction.',
      hints: H('Compare the new value to the mean and the median.', 'A value above the mean pulls the mean up.', 'The median moves to a neighbour of the old middle position.'),
    });
  },
});

// ===================== Spread, percentiles, distributions =====================
const sdGen: Generator = gen({
  id: Dt('spread.sd'), unit: 'da.spread', subtopic: 'Standard deviation', levels: [3, 4, 5],
  skills: ['comparing spreads'], concepts: ['Standard deviation', 'Statistical comparisons'],
  generate(rng, level) {
    const base = rng.int(10, 30), d = rng.int(2, 5);
    const A = [base - 2 * d, base - d, base, base + d, base + 2 * d];
    if (level === 3) {
      const B = [base - d, base - d, base, base + d, base + d];
      return qcNumeric({ a: `The standard deviation of ${list(A)}`, b: `The standard deviation of ${list(B)}`, va: sd(A), vb: sd(B), proof: ['Both lists have the same mean, ' + base + '.', `The first list has values farther from the mean (up to ${2 * d} away), so it is more spread out.`], trap: 'Thinking standard deviation depends on the size of the numbers rather than their spread.', hints: H('Standard deviation measures distance from the mean.', 'Find each list’s mean.', 'Which list has values farther from the mean?') });
    }
    if (level === 4) {
      const k = rng.int(5, 50);
      const B = A.map((x) => x + k);
      return qcNumeric({ a: `The standard deviation of ${list(A)}`, b: `The standard deviation of ${list(B)}`, va: sd(A), vb: sd(B), proof: [`Each value in the second list is the first list's value plus ${k}.`, 'Adding a constant shifts the data but does not change the spread, so the standard deviations are equal.'], trap: 'Thinking larger values mean larger standard deviation.', hints: H('How is the second list related to the first?', 'Adding a constant shifts every value equally.', 'Shifting does not change distances from the mean.') });
    }
    const m = rng.pick([2, 3]);
    const B = A.map((x) => m * x);
    const opts = [
      { t: `The mean of list $Q$ is ${m} times the mean of list $P$.`, ok: true },
      { t: `The standard deviation of list $Q$ is ${m} times that of list $P$.`, ok: true },
      { t: `The range of list $Q$ is ${m} times that of list $P$.`, ok: true },
      { t: `The standard deviation of list $Q$ equals that of list $P$.`, ok: false, note: 'Multiplying scales the spread.' },
      { t: `The median of list $Q$ is ${m} more than that of list $P$.`, ok: false, note: `The median is ${m} times as large, not ${m} more.` },
    ];
    return { format: 'multi', stem: `List $P$ is ${list(A)}. List $Q$ is formed by multiplying every number in $P$ by ${m}. Which statements are true? Indicate all such statements.`, ...multiSel(rng, opts), explanation: [`$Q = ${list(B)}$.`, `Multiplying every value by ${m} multiplies the mean, median, range, and standard deviation by ${m} (SD: ${fmt(sd(A), 3)} → ${fmt(sd(B), 3)}).`], trap: 'Treating multiplication like adding a constant.', hints: H('Write out list Q.', 'Multiplication stretches distances between values.', 'Adding shifts; multiplying scales.') };
  },
});

const normalDist: Generator = gen({
  id: Dt('spread.normal'), unit: 'da.spread', subtopic: 'Normal distribution', levels: [3, 4],
  skills: ['68-95-99.7 rule'], concepts: ['Normal distribution', 'Standard deviation', 'Percentiles'],
  generate(rng, level) {
    const m = rng.pick([50, 60, 70, 75, 100, 150, 500]), s = rng.pick([5, 8, 10, 12, 15, 20, 100].filter((x) => x < m / 2));
    // approx: within 1sd 68, 2sd 95; each band 34, 13.5, 2.35
    const band = [34, 13.5, 2.5];
    const cases = [
      { lo: -1, hi: 1, p: 68, t: `${m - s} and ${m + s}` },
      { lo: -2, hi: 2, p: 95, t: `${m - 2 * s} and ${m + 2 * s}` },
      { lo: 0, hi: 1, p: 34, t: `${m} and ${m + s}` },
      { lo: -1, hi: 2, p: 81.5, t: `${m - s} and ${m + 2 * s}` },
      { lo: 1, hi: 2, p: 13.5, t: `${m + s} and ${m + 2 * s}` },
    ];
    void band;
    if (level === 4) {
      const above = rng.pick([1, 2]);
      const p = above === 1 ? 16 : 2.5;
      return { format: 'mcq', stem: `A large set of measurements is approximately normally distributed with mean ${m} and standard deviation ${s}. Approximately what percent of the measurements are greater than ${m + above * s}?`, ...numMcq(p, [{ v: above === 1 ? 34 : 13.5, note: 'That is the percent between the mean and that value, not above it.' }, above === 1 ? 32 : 5, above === 1 ? 68 : 95, 50], { render: (v) => `$${fmt(v)}\\%$` }), explanation: [`About ${above === 1 ? 68 : 95}% of values lie within ${above} SD of the mean, leaving ${above === 1 ? 32 : 5}% in the two tails.`, `By symmetry, about ${fmt(p)}% lie above ${m + above * s}.`], trap: 'Forgetting to split the tails between the two sides.', hints: H('Use the 68-95 rule.', `${m + above * s} is ${above} SD above the mean.`, 'Half of what lies outside the band is above it.') };
    }
    const c = rng.pick(cases);
    return { format: 'mcq', stem: `The heights in a large population are approximately normally distributed with mean ${m} and standard deviation ${s}. Approximately what percent of the population has heights between ${c.t}?`, ...numMcq(c.p, [{ v: 50, note: 'Half the data is above the mean, but that is not this interval.' }, 68, 95, 34, 13.5, 81.5].filter((v) => v !== c.p), { render: (v) => `$${fmt(v)}\\%$` }), explanation: ['Normal distribution bands: about 34% between the mean and 1 SD on each side, 13.5% between 1 and 2 SD, and 2.5% beyond 2 SD.', `${c.t.replace(' and ', ' to ')} spans ${c.lo} to ${c.hi} SD: about ${fmt(c.p)}%.`], trap: 'Confusing the band percentages (34, 13.5, 2.5).', hints: H('Convert the endpoints to standard-deviation units.', `(value − ${m}) / ${s}.`, 'Add up the band percentages.') };
  },
});

const quartiles: Generator = gen({
  id: Dt('spread.quartiles'), unit: 'da.spread', subtopic: 'Quartiles', levels: [3, 4, 5],
  skills: ['quartiles', 'IQR', 'boxplots', 'percentiles'], concepts: ['Quartiles', 'Interquartile range', 'Boxplots', 'Percentiles'],
  generate(rng, level) {
    if (level === 5) {
      const boxes = ['City A', 'City B'].map((label) => { const mn = rng.int(10, 30); const q1 = mn + rng.int(5, 15), md = q1 + rng.int(3, 12), q3 = md + rng.int(3, 15), mx = q3 + rng.int(5, 20); return { label, min: mn, q1, median: md, q3, max: mx }; });
      const [a, b] = boxes;
      const diagram: ChartDiagram = { kind: 'boxplot', title: 'Daily commute times (minutes)', box: boxes, unit: 'min' };
      const opts = [
        { t: 'The interquartile range for City A is greater than that for City B.', ok: a.q3 - a.q1 > b.q3 - b.q1 },
        { t: 'The median commute in City B is greater than in City A.', ok: b.median > a.median },
        { t: 'The range for City A is greater than that for City B.', ok: a.max - a.min > b.max - b.min },
        { t: `At least 75% of City B commutes are at least ${b.q1} minutes.`, ok: true },
        { t: 'The mean commute in City A must be greater than its median.', ok: false, note: 'A boxplot does not determine the mean.' },
      ];
      if (!opts.some((o) => o.ok)) return quartiles.generate(rng, level);
      return { format: 'multi', di: true, stem: 'The boxplots summarize daily commute times in two cities. Which of the following statements must be true? Indicate all such statements.', diagram, ...multiSel(rng, opts), explanation: [`City A: min ${a.min}, Q1 ${a.q1}, median ${a.median}, Q3 ${a.q3}, max ${a.max} → IQR ${a.q3 - a.q1}, range ${a.max - a.min}.`, `City B: min ${b.min}, Q1 ${b.q1}, median ${b.median}, Q3 ${b.q3}, max ${b.max} → IQR ${b.q3 - b.q1}, range ${b.max - b.min}.`, '75% of values lie at or above Q1. A boxplot shows the five-number summary only — it does not show the mean.'], trap: 'Reading the mean from a boxplot.', hints: H('Read the five-number summary for each box.', 'IQR = Q3 − Q1; range = max − min.', 'Boxplots never show the mean.') };
    }
    const n = level === 3 ? 11 : 12;
    const xs = Array.from({ length: n }, () => rng.int(1, 60)).sort((a, b) => a - b);
    const lower = xs.slice(0, Math.floor(n / 2)), upper = xs.slice(Math.ceil(n / 2));
    const q1 = median(lower), q3 = median(upper);
    return { format: 'numeric', stem: `What is the interquartile range of the following ${n} numbers? ${list(xs)} (Use the convention that Q1 and Q3 are the medians of the lower and upper halves${n % 2 ? ', excluding the overall median' : ''}.)`, answer: numAns(q3 - q1), explanation: [`Lower half: ${list(lower)} → $Q_1 = ${fmt(q1)}$.`, `Upper half: ${list(upper)} → $Q_3 = ${fmt(q3)}$.`, `IQR $= ${fmt(q3)} - ${fmt(q1)} = ${fmt(q3 - q1)}$.`], trap: 'Using the range (max − min) instead of Q3 − Q1.', hints: H('Split the sorted data into lower and upper halves.', 'Q1 and Q3 are the medians of those halves.', `Lower half: ${list(lower)}.`) };
  },
});

const freqTable: Generator = gen({
  id: Dt('spread.freq'), unit: 'da.spread', subtopic: 'Frequency distributions', levels: [3, 4],
  skills: ['statistics from a frequency table'], concepts: ['Frequency distributions', 'Median', 'Mean'],
  generate(rng, level) {
    const vals = [0, 1, 2, 3, 4, 5].slice(0, rng.pick([5, 6]));
    const freq = vals.map(() => rng.int(1, 9));
    const total = sum(freq);
    const data = vals.flatMap((v, i) => Array(freq[i]).fill(v));
    const med = median(data), mn = mean(data);
    const diagram: ChartDiagram = { kind: 'table', title: 'Number of books read last month', columns: ['Books', 'Number of students'], rows: vals.map((v, i) => [v, freq[i]]) };
    if (level === 3) return { format: 'numeric', di: true, stem: 'The table shows how many books each student in a class read last month. What is the median number of books read?', diagram, answer: numAns(med), explanation: [`There are ${total} students.`, total % 2 ? `The median is the ${(total + 1) / 2}th value.` : `The median is the average of the ${total / 2}th and ${total / 2 + 1}th values.`, `Cumulative counts: ${vals.map((v, i) => `${v}: ${sum(freq.slice(0, i + 1))}`).join(', ')} → median $= ${fmt(med)}$.`], trap: 'Taking the median of the frequency column instead of the data.', hints: H('Count the total number of students.', 'Locate the middle position using cumulative frequencies.', `Total = ${total}.`) };
    return { format: 'numeric', di: true, stem: 'The table shows how many books each student in a class read last month. What is the average (arithmetic mean) number of books read per student? (Round to the nearest hundredth.)', diagram, answer: numAns(round(mn, 2), 0.006), explanation: [`Total books $= ${vals.map((v, i) => `${v}\\cdot${freq[i]}`).join(' + ')} = ${sum(data)}$.`, `Mean $= ${sum(data)}/${total} \\approx ${mn.toFixed(2)}$.`], trap: 'Averaging the frequency column.', hints: H('Weight each value by its frequency.', 'Total books ÷ total students.', `Total students = ${total}.`) };
  },
});

// ===================== Counting =====================
const countBasic: Generator = gen({
  id: Dt('count.basic'), unit: 'da.counting', subtopic: 'Counting principles', levels: [1, 2, 3],
  skills: ['multiplication principle'], concepts: ['Counting principles'],
  generate(rng, level) {
    if (level === 3) {
      const L = rng.int(2, 3), D = rng.int(2, 4);
      const noRepeat = rng.bool();
      const ans = noRepeat ? nPr(26, L) * nPr(10, D) : 26 ** L * 10 ** D;
      return { format: 'mcq', stem: `A code consists of ${L} letters followed by ${D} digits${noRepeat ? ', with no letter or digit repeated' : ''}. How many different codes are possible?`, ...textMcq(rng, `$${noRepeat ? `${Array.from({ length: L }, (_, i) => 26 - i).join('\\cdot')}\\cdot${Array.from({ length: D }, (_, i) => 10 - i).join('\\cdot')}` : `26^{${L}}\\cdot 10^{${D}}`}$`, [{ t: `$${noRepeat ? `26^{${L}}\\cdot 10^{${D}}` : `${Array.from({ length: L }, (_, i) => 26 - i).join('\\cdot')}\\cdot${Array.from({ length: D }, (_, i) => 10 - i).join('\\cdot')}`}$`, note: noRepeat ? 'That allows repetition.' : 'That forbids repetition, which is not required.' }, `$${26 * L}\\cdot${10 * D}$`, `$\\binom{26}{${L}}\\binom{10}{${D}}$`, `$36^{${L + D}}$`]), explanation: [`Multiply the choices for each position: ${noRepeat ? 'each choice reduces the pool by one' : 'every position has the full pool'}.`, `Total $= ${tnum(ans)}$.`], trap: noRepeat ? 'Forgetting that the pool shrinks without repetition.' : 'Using combinations when order matters.', hints: H('Count options position by position.', 'Multiply the counts.', noRepeat ? 'Each pick removes one option.' : 'Repetition is allowed.') };
    }
    const a = rng.int(2, 6), b = rng.int(2, 5), c = rng.int(2, 4);
    return { format: 'numeric', stem: `A menu offers ${a} appetizers, ${b} main courses, and ${c} desserts. ${level === 1 ? 'How many different meals consisting of one of each are possible?' : 'A meal consists of one main course and one dessert, and may or may not include one appetizer. How many different meals are possible?'}`, answer: numAns(level === 1 ? a * b * c : (a + 1) * b * c), explanation: [level === 1 ? `$${a}\\times${b}\\times${c} = ${a * b * c}$.` : `Appetizer choice: ${a} options or none → ${a + 1}. Total $= ${a + 1}\\times${b}\\times${c} = ${(a + 1) * b * c}$.`], trap: level === 1 ? 'Adding instead of multiplying.' : 'Forgetting the “no appetizer” option.', hints: H('Independent choices multiply.', level === 1 ? 'One choice from each category.' : '“May or may not” adds a “none” option.', level === 1 ? `$${a}\\cdot${b}\\cdot${c}$` : `$(${a} + 1)\\cdot${b}\\cdot${c}$`) };
  },
});

const permutations: Generator = gen({
  id: Dt('count.perm'), unit: 'da.counting', subtopic: 'Permutations', levels: [2, 3, 4, 5],
  skills: ['arrangements', 'restrictions'], concepts: ['Permutations', 'Restrictions and complements'],
  generate(rng, level) {
    const n = rng.int(4, 7);
    if (level === 2) return { format: 'numeric', stem: `In how many different orders can ${n} different books be arranged on a shelf?`, answer: numAns(fact(n)), explanation: [`$${n}! = ${fact(n)}$.`], trap: 'Using combinations (order matters here).', hints: H('Fill positions one at a time.', `${n} choices, then ${n - 1}, ...`, `$${n}!$`) };
    if (level === 3) { const k = rng.int(2, 3), m = n + rng.int(1, 4); return { format: 'numeric', stem: `From ${m} runners, gold, silver, and bronze${k === 2 ? ' — actually just gold and silver —' : ''} medals are awarded. How many different outcomes are possible?`.replace(' and bronze — actually just gold and silver —', ' and silver'), answer: numAns(nPr(m, k === 2 ? 2 : 3)), explanation: [`Order matters: $${m}\\cdot${m - 1}${k === 2 ? '' : `\\cdot${m - 2}`} = ${nPr(m, k === 2 ? 2 : 3)}$.`], trap: 'Using combinations — different medals make order matter.', hints: H('Does the order of selection matter?', 'Yes: gold differs from silver.', `$${m}\\cdot${m - 1}\\cdots$`) }; }
    if (level === 4) {
      const together = rng.bool();
      const total = fact(n), tog = 2 * fact(n - 1);
      return { format: 'numeric', stem: `${n} people, including Ana and Ben, stand in a row. In how many arrangements are Ana and Ben ${together ? 'next to each other' : '**not** next to each other'}?`, answer: numAns(together ? tog : total - tog), explanation: [`Treat Ana-Ben as one block: $(${n} - 1)! = ${fact(n - 1)}$ arrangements, times 2 for the order inside the block: ${tog}.`, ...(together ? [] : [`Not together = total − together $= ${n}! - ${tog} = ${total} - ${tog} = ${total - tog}$.`])], trap: together ? 'Forgetting the two internal orders of the block.' : 'Trying to count “apart” directly instead of using the complement.', hints: H('Glue the pair into a single unit.', 'Then multiply by the internal arrangements.', together ? `$${n - 1}!\\times 2$` : 'Use total minus together.') };
    }
    // level 5: letters with repeats
    const words = [['LEVEL', 5, [2, 2]], ['BANANA', 6, [3, 2]], ['COOKIE', 6, [2]], ['TATTOO', 6, [3, 2]], ['SEESAW', 6, [2, 2]], ['PEPPER', 6, [3, 2]]] as const;
    const [w, len, reps] = rng.pick(words);
    const ans = fact(len) / reps.reduce((a, r) => a * fact(r), 1);
    return { format: 'numeric', stem: `How many distinct arrangements of the letters in the word ${w} are there?`, answer: numAns(ans), explanation: [`$${len}!$ arrangements, divided by the factorials of repeated letters: $\\dfrac{${len}!}{${reps.map((r) => `${r}!`).join('\\,')}} = ${ans}$.`], trap: 'Forgetting to divide for repeated letters.', hints: H('Identical letters swapped do not create a new arrangement.', 'Divide n! by the factorial of each letter’s count.', `${w} has ${len} letters.`) };
  },
});

const combinations: Generator = gen({
  id: Dt('count.comb'), unit: 'da.counting', subtopic: 'Combinations', levels: [2, 3, 4, 5],
  skills: ['choosing groups', 'at-least-one complements'], concepts: ['Combinations', 'Restrictions and complements'],
  generate(rng, level) {
    const n = rng.int(6, 12), k = rng.int(2, 4);
    if (level === 2) return { format: 'mcq', stem: `How many different ${k}-person committees can be chosen from ${n} people?`, ...numMcq(nCr(n, k), [{ v: nPr(n, k), note: 'Counted ordered selections; committees are unordered.' }, n * k, nCr(n, k - 1), nCr(n, k) * 2]), explanation: [`$\\binom{${n}}{${k}} = \\dfrac{${n}!}{${k}!\\,${n - k}!} = ${nCr(n, k)}$.`], trap: 'Using permutations — committee order does not matter.', hints: H('Order does not matter in a committee.', 'Use combinations.', `$\\binom{${n}}{${k}}$.`) };
    const m = rng.int(3, 6), w = rng.int(3, 6);
    if (level === 3) { const a = rng.int(1, 2), b = rng.int(1, 3); return { format: 'numeric', stem: `A team of ${a} managers and ${b} engineers is chosen from ${m} managers and ${w} engineers. How many different teams are possible?`, answer: numAns(nCr(m, a) * nCr(w, b)), explanation: [`$\\binom{${m}}{${a}}\\times\\binom{${w}}{${b}} = ${nCr(m, a)}\\times${nCr(w, b)} = ${nCr(m, a) * nCr(w, b)}$.`], trap: 'Adding the two counts instead of multiplying.', hints: H('Choose each group separately.', 'Independent choices multiply.', `$\\binom{${m}}{${a}}\\binom{${w}}{${b}}$.`) }; }
    if (level === 4) { const kk = 3, total = nCr(m + w, kk), none = nCr(w, kk); return { format: 'numeric', stem: `A committee of ${kk} is chosen from ${m} women and ${w} men. How many committees include at least one woman?`, answer: numAns(total - none), explanation: [`Total committees: $\\binom{${m + w}}{${kk}} = ${total}$.`, `All-men committees: $\\binom{${w}}{${kk}} = ${none}$.`, `At least one woman: $${total} - ${none} = ${total - none}$.`], trap: 'Fixing one woman and choosing the rest freely — that double counts.', hints: H('“At least one” suggests the complement.', 'Count committees with no women.', 'Subtract from the total.') }; }
    // level 5: handshakes / diagonals / lines through points
    const p = rng.int(6, 15);
    const kind = rng.pick(['diagonals', 'handshakes']);
    const ans = kind === 'diagonals' ? nCr(p, 2) - p : nCr(p, 2);
    return { format: 'numeric', stem: kind === 'diagonals' ? `How many diagonals does a convex polygon with ${p} sides have?` : `At a meeting, each of ${p} people shakes hands exactly once with each other person. How many handshakes take place?`, answer: numAns(ans), explanation: kind === 'diagonals' ? [`Pairs of vertices: $\\binom{${p}}{2} = ${nCr(p, 2)}$.`, `Subtract the ${p} sides: ${ans} diagonals (formula $\\tfrac{n(n-3)}{2}$).`] : [`Each handshake is a pair: $\\binom{${p}}{2} = ${ans}$.`], trap: kind === 'diagonals' ? 'Forgetting to remove the sides.' : 'Counting each handshake twice ($n(n-1)$).', hints: H('Each item corresponds to a pair of points/people.', `Count pairs: $\\binom{${p}}{2}$.`, kind === 'diagonals' ? 'Sides are pairs too — remove them.' : 'A handshake between A and B is the same as between B and A.') };
  },
});

// ===================== Probability =====================
const probBasic: Generator = gen({
  id: Dt('prob.basic'), unit: 'da.probability', subtopic: 'Probability', levels: [1, 2, 3],
  skills: ['favorable over total'], concepts: ['Probability', 'Complement rule'],
  generate(rng, level) {
    if (level === 3) {
      const n = rng.pick([20, 30, 40, 50, 60]), k = rng.pick([3, 4, 5, 6]), j = rng.pick([2, 5, 7].filter((x) => x !== k));
      const cnt = Math.floor(n / k) + Math.floor(n / j) - Math.floor(n / (k * j));
      const p = new Frac(cnt, n);
      return { format: 'numeric', stem: `An integer is chosen at random from 1 to ${n}, inclusive. What is the probability that it is a multiple of ${k} or a multiple of ${j}? Give your answer as a fraction.`, answer: fracAns(p.n, p.d), explanation: [`Multiples of ${k}: ${Math.floor(n / k)}; of ${j}: ${Math.floor(n / j)}; of both (${k * j}): ${Math.floor(n / (k * j))}.`, `Count $= ${Math.floor(n / k)} + ${Math.floor(n / j)} - ${Math.floor(n / (k * j))} = ${cnt}$; probability $= ${p.tex()}$.`], trap: 'Double-counting multiples of both numbers.', hints: H('Count favorable outcomes with inclusion–exclusion.', 'Add the two counts and subtract the overlap.', `Multiples of both are multiples of ${k * j}.`) };
    }
    const r = rng.int(2, 9), b = rng.int(2, 9), g = rng.int(1, 7);
    const t = r + b + g;
    const not = level === 2;
    const p = not ? new Frac(t - r, t) : new Frac(r, t);
    return { format: 'mcq', stem: `A bag contains ${r} red, ${b} blue, and ${g} green marbles. If one marble is drawn at random, what is the probability that it is ${not ? '**not** red' : 'red'}?`, ...textMcq(rng, `$${p.tex()}$`, [{ t: `$${new Frac(not ? r : t - r, t).tex()}$`, note: not ? 'That is the probability of red.' : 'That is the probability of not red.' }, `$${new Frac(r, b + g).tex()}$`, `$${new Frac(1, 3).tex()}$`, `$${new Frac(b, t).tex()}$`, `$${new Frac(g + 1, t).tex()}$`]), explanation: [`Total marbles: ${t}.`, not ? `Not red: $${b} + ${g} = ${t - r}$, so $P = ${p.tex()}$.` : `$P(\\text{red}) = ${p.tex()}$.`], trap: 'Using odds (red : not red) instead of probability.', hints: H('Probability = favorable ÷ total.', `Total = ${t}.`, not ? 'Not red = everything else.' : `${r} red marbles.`) };
  },
});

const probIndep: Generator = gen({
  id: Dt('prob.independent'), unit: 'da.probability', subtopic: 'Independent events', levels: [2, 3, 4, 5],
  skills: ['multiplication rule', 'complement of at least one'], concepts: ['Independent events', 'Complement rule'],
  generate(rng, level) {
    const pA = new Frac(rng.int(1, 4), 5), pB = new Frac(rng.int(1, 3), 4);
    if (level === 2) { const p = pA.mul(pB); return { format: 'numeric', stem: `Events $A$ and $B$ are independent, with $P(A) = ${pA.tex()}$ and $P(B) = ${pB.tex()}$. What is $P(A \\text{ and } B)$? Give your answer as a fraction.`, answer: fracAns(p.n, p.d), explanation: [`Independent: $P(A \\cap B) = P(A)P(B) = ${pA.tex()}\\cdot${pB.tex()} = ${p.tex()}$.`], trap: 'Adding the probabilities.', hints: H('For independent events, multiply.', '$P(A)\\cdot P(B)$.', `$${pA.tex()}\\times${pB.tex()}$.`) }; }
    if (level === 3) { const p = pA.add(pB).sub(pA.mul(pB)); return { format: 'mcq', stem: `Events $A$ and $B$ are independent, with $P(A) = ${pA.tex()}$ and $P(B) = ${pB.tex()}$. What is the probability that $A$ or $B$ (or both) occurs?`, ...textMcq(rng, `$${p.tex()}$`, [{ t: `$${pA.add(pB).tex()}$`, note: 'Did not subtract the overlap P(A and B).' }, `$${pA.mul(pB).tex()}$`, `$${new Frac(1).sub(pA.mul(pB)).tex()}$`, `$${new Frac(1).sub(p).tex()}$`]), explanation: [`$P(A \\cup B) = P(A) + P(B) - P(A)P(B) = ${pA.tex()} + ${pB.tex()} - ${pA.mul(pB).tex()} = ${p.tex()}$.`, `Alternatively $1 - P(\\text{neither}) = 1 - ${new Frac(1).sub(pA).tex()}\\cdot${new Frac(1).sub(pB).tex()}$.`], trap: 'Adding probabilities of events that can occur together.', hints: H('“Or” for overlapping events needs inclusion–exclusion.', 'Subtract P(A and B).', 'Or compute 1 − P(neither).') }; }
    const k = rng.int(3, 5);
    const pr = new Frac(rng.int(1, 2), rng.pick([3, 4, 6]));
    const ans = new Frac(1).sub(new Frac(pr.d - pr.n, pr.d).mul(1) && new Frac((pr.d - pr.n) ** k, pr.d ** k));
    if (level === 4) return { format: 'numeric', stem: `A player has a $${pr.tex()}$ chance of winning each game, independently. If the player plays ${k} games, what is the probability of winning at least one game? Give your answer as a fraction.`, answer: fracAns(ans.n, ans.d), explanation: [`$P(\\text{lose all}) = \\left(${new Frac(pr.d - pr.n, pr.d).tex()}\\right)^{${k}} = ${new Frac((pr.d - pr.n) ** k, pr.d ** k).tex()}$.`, `$P(\\text{at least one win}) = 1 - ${new Frac((pr.d - pr.n) ** k, pr.d ** k).tex()} = ${ans.tex()}$.`], trap: `Multiplying ${k} × ${pr.tex()} — probabilities of “at least one” are not additive.`, hints: H('“At least one” → use the complement.', 'Find the probability of losing every game.', `$(1 - ${pr.tex()})^{${k}}$.`) };
    // level 5: exactly 2 heads in n coin flips / dice
    const nn = rng.int(4, 6), kk = rng.int(1, nn - 1);
    const pe = new Frac(nCr(nn, kk), 2 ** nn);
    return { format: 'numeric', stem: `A fair coin is tossed ${nn} times. What is the probability of getting exactly ${kk} head${kk > 1 ? 's' : ''}? Give your answer as a fraction.`, answer: fracAns(pe.n, pe.d), explanation: [`Total outcomes: $2^{${nn}} = ${2 ** nn}$.`, `Ways to choose which ${kk} tosses are heads: $\\binom{${nn}}{${kk}} = ${nCr(nn, kk)}$.`, `$P = \\dfrac{${nCr(nn, kk)}}{${2 ** nn}} = ${pe.tex()}$.`], trap: `Using $(1/2)^{${nn}}$ alone and forgetting the $\\binom{${nn}}{${kk}}$ arrangements.`, hints: H('Every sequence of tosses is equally likely.', 'Count sequences with exactly the right number of heads.', `$\\binom{${nn}}{${kk}}$ sequences.`) };
  },
});

const probDependent: Generator = gen({
  id: Dt('prob.dependent'), unit: 'da.probability', subtopic: 'Dependent events', levels: [3, 4, 5],
  skills: ['without replacement'], concepts: ['Dependent events', 'Combinations'],
  generate(rng, level) {
    const r = rng.int(3, 7), b = rng.int(2, 6), t = r + b;
    if (level === 3) { const p = new Frac(r * (r - 1), t * (t - 1)); return { format: 'numeric', stem: `A box holds ${r} red and ${b} blue chips. Two chips are drawn at random without replacement. What is the probability that both are red? Give your answer as a fraction.`, answer: fracAns(p.n, p.d), explanation: [`$P = \\dfrac{${r}}{${t}}\\cdot\\dfrac{${r - 1}}{${t - 1}} = ${p.tex()}$.`], trap: 'Using the same probability twice (that would be with replacement).', hints: H('After the first draw there is one fewer chip.', 'Multiply the conditional probabilities.', `First: $${r}/${t}$.`) }; }
    if (level === 4) { const p = new Frac(2 * r * b, t * (t - 1)); return { format: 'mcq', stem: `A box holds ${r} red and ${b} blue chips. Two chips are drawn at random without replacement. What is the probability that the chips are different colors?`, ...textMcq(rng, `$${p.tex()}$`, [{ t: `$${new Frac(r * b, t * (t - 1)).tex()}$`, note: 'Counted only red-then-blue; blue-then-red is also possible.' }, `$${new Frac(2 * r * b, t * t).tex()}$`, `$${new Frac(r * b, t * t).tex()}$`, `$${new Frac(1).sub(p).tex()}$`]), explanation: [`Red then blue: $\\tfrac{${r}}{${t}}\\cdot\\tfrac{${b}}{${t - 1}}$; blue then red: $\\tfrac{${b}}{${t}}\\cdot\\tfrac{${r}}{${t - 1}}$.`, `Sum $= ${p.tex()}$. (Or $\\binom{${r}}{1}\\binom{${b}}{1}/\\binom{${t}}{2}$.)`], trap: 'Ignoring the second order (blue first).', hints: H('There are two orders that give different colors.', 'Add the probabilities of both orders.', 'Or count pairs with combinations.') }; }
    const k = 3, w = rng.int(2, 4);
    const p = new Frac(nCr(r, 2) * nCr(b, 1), nCr(t, 3));
    void w;
    return { format: 'numeric', stem: `${k} chips are drawn at random without replacement from a box of ${r} red and ${b} blue chips. What is the probability that exactly 2 are red? Give your answer as a fraction.`, answer: fracAns(p.n, p.d), explanation: [`Favorable: $\\binom{${r}}{2}\\binom{${b}}{1} = ${nCr(r, 2)}\\cdot${b} = ${nCr(r, 2) * b}$.`, `Total: $\\binom{${t}}{3} = ${nCr(t, 3)}$.`, `$P = ${p.tex()}$.`], trap: 'Multiplying sequential probabilities for one order only.', hints: H('Count unordered selections.', 'Choose 2 of the reds and 1 of the blues.', `Total selections: $\\binom{${t}}{3}$.`) };
  },
});

const conditional: Generator = gen({
  id: Dt('prob.conditional'), unit: 'da.probability', subtopic: 'Conditional probability', levels: [3, 4, 5],
  skills: ['conditional probability from tables'], concepts: ['Conditional probability', 'Data tables'],
  generate(rng, level) {
    const a = rng.int(10, 60), b = rng.int(10, 60), c = rng.int(10, 60), d = rng.int(10, 60);
    const diagram: ChartDiagram = { kind: 'table', title: 'Survey of employees', columns: ['', 'Drives to work', 'Does not drive', 'Total'], rows: [['Full-time', a, b, a + b], ['Part-time', c, d, c + d], ['Total', a + c, b + d, a + b + c + d]] };
    const T = a + b + c + d;
    if (level === 3) { const p = new Frac(a, a + b); return { format: 'numeric', di: true, stem: 'Based on the table, if a full-time employee is selected at random, what is the probability that the employee drives to work? Give your answer as a fraction.', diagram, answer: fracAns(p.n, p.d), explanation: [`Restrict to full-time employees: ${a + b}.`, `Of these, ${a} drive: $P = \\dfrac{${a}}{${a + b}} = ${p.tex()}$.`], trap: `Dividing by the grand total (${T}).`, hints: H('“Given full-time” shrinks the sample space.', 'Use the full-time row only.', `Full-time total: ${a + b}.`) }; }
    if (level === 4) { const p = new Frac(c, a + c); return { format: 'numeric', di: true, stem: 'Based on the table, if an employee who drives to work is selected at random, what is the probability that the employee is part-time? Give your answer as a fraction.', diagram, answer: fracAns(p.n, p.d), explanation: [`Drivers: ${a + c}. Part-time drivers: ${c}.`, `$P(\\text{part-time} \\mid \\text{drives}) = ${p.tex()}$.`], trap: 'Confusing P(part-time | drives) with P(drives | part-time).', hints: H('Which group is “given”?', 'The condition is “drives to work”.', `Drivers total: ${a + c}.`) }; }
    return { ...qcNumeric({ given: 'Refer to the table of survey results.', a: 'The probability that a randomly chosen full-time employee drives', b: 'The probability that a randomly chosen part-time employee drives', va: a / (a + b), vb: c / (c + d), proof: [`Full-time: $${a}/${a + b} \\approx ${(a / (a + b)).toFixed(3)}$.`, `Part-time: $${c}/${c + d} \\approx ${(c / (c + d)).toFixed(3)}$.`], trap: 'Comparing raw counts instead of rates.', hints: H('Compare rates within each row.', 'Each rate uses its own row total.', 'Compute both fractions.'), ...{} }), diagram, di: true };
  },
});

// ===================== Sets =====================
const sets2: Generator = gen({
  id: Dt('sets.two'), unit: 'da.sets', subtopic: 'Venn diagrams', levels: [2, 3, 4],
  skills: ['two-set inclusion–exclusion'], concepts: ['Sets', 'Venn diagrams', 'Overlapping groups'],
  generate(rng, level) {
    const both = rng.int(3, 20), onlyA = rng.int(5, 30), onlyB = rng.int(5, 30), neither = rng.int(2, 20);
    const A = onlyA + both, B = onlyB + both, T = A + onlyB + neither;
    if (level === 2) return { format: 'numeric', stem: `Of ${T} students, ${A} study French, ${B} study Spanish, and ${both} study both. How many study neither language?`, answer: numAns(neither), explanation: [`At least one: $${A} + ${B} - ${both} = ${A + B - both}$.`, `Neither: $${T} - ${A + B - both} = ${neither}$.`], trap: 'Forgetting to subtract the overlap.', hints: H('Total = A + B − both + neither.', `$${A} + ${B} - ${both}$ study at least one.`, 'Subtract from the total.') };
    if (level === 3) return { format: 'numeric', stem: `Of ${T} students, ${A} study French, ${B} study Spanish, and ${neither} study neither. How many study both?`, answer: numAns(both), explanation: [`$${T} = ${A} + ${B} - x + ${neither} \\Rightarrow x = ${A} + ${B} + ${neither} - ${T} = ${both}$.`], trap: 'Ignoring the “neither” group.', hints: H('Use Total = A + B − Both + Neither.', 'Solve for Both.', `$${T} = ${A + B + neither} - x$.`) };
    // level 4: max/min overlap
    const a2 = rng.int(40, 80), b2 = rng.int(30, 70), t2 = 100;
    const minBoth = Math.max(0, a2 + b2 - t2), maxBoth = Math.min(a2, b2);
    const askMin = rng.bool();
    return { format: 'numeric', stem: `In a survey, ${a2}% of respondents own a car and ${b2}% own a bicycle. What is the ${askMin ? 'least' : 'greatest'} possible percent of respondents who own both?`, answer: numAns(askMin ? minBoth : maxBoth), explanation: askMin ? [`Overlap is smallest when as few people as possible own neither: $${a2} + ${b2} - 100 = ${a2 + b2 - 100}$${a2 + b2 - 100 < 0 ? ', which is negative, so the minimum is 0' : ''}.`] : [`The overlap cannot exceed the smaller group: $\\min(${a2}, ${b2}) = ${maxBoth}$.`], trap: askMin ? 'Assuming the overlap must be positive or using the smaller percent.' : 'Adding the percents.', hints: H(askMin ? 'Minimize overlap by maximizing the union.' : 'Every bicycle owner could also own a car.', askMin ? 'The union is at most 100%.' : 'The overlap is limited by the smaller set.', askMin ? `$${a2} + ${b2} - 100$` : `$\\min(${a2}, ${b2})$`) };
  },
});

const sets3: Generator = gen({
  id: Dt('sets.three'), unit: 'da.sets', subtopic: 'Inclusion–exclusion', levels: [4, 5],
  skills: ['three-set inclusion–exclusion'], concepts: ['Inclusion–exclusion', 'Venn diagrams'],
  generate(rng, level) {
    const abc = rng.int(2, 6), ab = rng.int(2, 8), ac = rng.int(2, 8), bc = rng.int(2, 8);
    const a = rng.int(5, 15), b = rng.int(5, 15), c = rng.int(5, 15), none = rng.int(3, 12);
    const A = a + ab + ac + abc, B = b + ab + bc + abc, C = c + ac + bc + abc;
    const AB = ab + abc, AC = ac + abc, BC = bc + abc;
    const T = a + b + c + ab + ac + bc + abc + none;
    if (level === 4) return { format: 'numeric', stem: `In a group of ${T} people, ${A} like tea, ${B} like coffee, and ${C} like juice. ${AB} like tea and coffee, ${AC} like tea and juice, ${BC} like coffee and juice, and ${abc} like all three. How many like none of the three?`, answer: numAns(none), explanation: [`At least one $= ${A} + ${B} + ${C} - ${AB} - ${AC} - ${BC} + ${abc} = ${T - none}$.`, `None $= ${T} - ${T - none} = ${none}$.`], trap: 'Forgetting to add back the triple overlap.', hints: H('Inclusion–exclusion for three sets.', 'Add singles, subtract pairs, add the triple.', `$${A} + ${B} + ${C} - (${AB} + ${AC} + ${BC}) + ${abc}$.`) };
    const exactlyTwo = ab + ac + bc;
    return { format: 'numeric', stem: `In a group of ${T} people, ${A} like tea, ${B} like coffee, and ${C} like juice. ${none} like none of the three and ${abc} like all three. How many people like exactly two of the three drinks?`, answer: numAns(exactlyTwo), explanation: [`Let $x$ = exactly two. Sum of single-set counts $= (\\text{exactly one}) + 2x + 3(${abc})$.`, `At least one $= ${T} - ${none} = ${T - none} = (\\text{exactly one}) + x + ${abc}$.`, `Subtract: $${A + B + C} - ${T - none} = x + 2(${abc})$, so $x = ${A + B + C - (T - none) - 2 * abc}$.`], trap: 'Using the standard formula, which needs pairwise overlaps that are not given.', hints: H('Count how many times each region is counted in A + B + C.', 'Exactly-two people are counted twice; all-three are counted three times.', `$A + B + C = ${A + B + C}$.`) };
  },
});

const matrix: Generator = gen({
  id: Dt('sets.matrix'), unit: 'da.sets', subtopic: 'Double-matrix method', levels: [3, 4],
  skills: ['two-way tables'], concepts: ['Double-matrix method', 'Overlapping groups', 'Percentages'],
  generate(rng, level) {
    const total = rng.pick([200, 400, 500, 800, 1000]);
    const pW = rng.pick([40, 50, 60]), pWg = rng.pick([20, 25, 40, 50]), pMg = rng.pick([10, 20, 30]);
    const W = (total * pW) / 100, M = total - W, Wg = (W * pWg) / 100, Mg = (M * pMg) / 100;
    if (!Number.isInteger(Wg) || !Number.isInteger(Mg)) return matrix.generate(rng, level);
    if (level === 3) return { format: 'numeric', stem: `At a company of ${total} employees, ${pW}% are women. ${pWg}% of the women and ${pMg}% of the men have graduate degrees. How many employees have graduate degrees?`, answer: numAns(Wg + Mg), explanation: [`Women: ${W}; with degrees: ${Wg}. Men: ${M}; with degrees: ${Mg}.`, `Total: ${Wg + Mg}.`], trap: `Averaging the percents (${(pWg + pMg) / 2}%) without weighting.`, hints: H('Build a 2×2 table: gender × degree.', 'Compute each group size first.', `Women: ${W}.`) };
    const p = new Frac(Wg, Wg + Mg);
    return { format: 'numeric', stem: `At a company of ${total} employees, ${pW}% are women. ${pWg}% of the women and ${pMg}% of the men have graduate degrees. If an employee with a graduate degree is selected at random, what is the probability that the employee is a woman? Give your answer as a fraction.`, answer: fracAns(p.n, p.d), explanation: [`Graduate-degree women: ${Wg}; men: ${Mg}.`, `$P = \\dfrac{${Wg}}{${Wg + Mg}} = ${p.tex()}$.`], trap: `Answering ${pW}% — the condition changes the reference group.`, hints: H('Fill in a 2×2 table.', 'Restrict to employees with degrees.', `Degree holders: ${Wg + Mg}.`) };
  },
});

// ===================== Data interpretation =====================
const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024'];
const diBar: Generator = gen({
  id: Dt('di.bar'), unit: 'da.interpretation', subtopic: 'Bar graphs', levels: [2, 3, 4, 5],
  skills: ['reading bar graphs', 'percent change'], concepts: ['Bar graphs', 'Percent change from charts', 'Data interpretation'],
  generate(rng, level) {
    const n = 5;
    const cats = YEARS.slice(0, n);
    const A = cats.map(() => rng.int(4, 18) * 10), B = cats.map(() => rng.int(3, 16) * 10);
    const diagram: ChartDiagram = { kind: 'bar', title: 'Annual sales by region (thousands of units)', categories: cats, series: [{ name: 'North', values: A }, { name: 'South', values: B }], yLabel: 'Units (thousands)' };
    const i = rng.int(0, n - 2), j = i + rng.int(1, n - 1 - i);
    if (level === 2) { const tot = A[i] + B[i]; return { format: 'numeric', di: true, stem: `According to the graph, what were the total sales for both regions in ${cats[i]}, in thousands of units?`, diagram, answer: numAns(tot), explanation: [`North ${A[i]} + South ${B[i]} = ${tot}.`], trap: 'Reading the wrong year or a single region.', hints: H('Find both bars for that year.', 'Add them.', `North: ${A[i]}.`) }; }
    if (level === 3) { const pc = ((A[j] - A[i]) / A[i]) * 100; return { format: 'mcq', di: true, stem: `By approximately what percent did North sales change from ${cats[i]} to ${cats[j]}?`, diagram, ...numMcq(round(pc, 0), [{ v: round(((A[j] - A[i]) / A[j]) * 100, 0), note: 'Divided by the later value instead of the earlier one.' }, round(A[j] - A[i], 0), round(pc / 2, 0), round(pc + 15, 0)], { render: (v) => `${v >= 0 ? '' : ''}$${fmt(v)}\\%$` }), explanation: [`North: ${A[i]} → ${A[j]}.`, `Percent change $= \\dfrac{${A[j]} - ${A[i]}}{${A[i]}}\\times100 \\approx ${fmt(round(pc, 1))}\\%$.`], trap: 'Using the later year as the base.', hints: H('Percent change = (new − old)/old.', `Old = ${A[i]}.`, `Change = ${A[j] - A[i]}.`) }; }
    if (level === 4) {
      const ratios = cats.map((_, k) => A[k] / B[k]);
      const best = ratios.indexOf(Math.max(...ratios));
      if (ratios.filter((r) => Math.abs(r - ratios[best]) < 1e-9).length > 1) return diBar.generate(rng, level);
      return { format: 'mcq', di: true, stem: 'In which year was the ratio of North sales to South sales the greatest?', diagram, choices: cats.map((c) => c), answer: best, explanation: [`Ratios: ${cats.map((c, k) => `${c}: ${A[k]}/${B[k]} ≈ ${ratios[k].toFixed(2)}`).join('; ')}.`, `Greatest: ${cats[best]}.`], trap: 'Choosing the year with the largest North bar or the largest difference instead of the largest ratio.', hints: H('Compute North ÷ South for each year.', 'A ratio is not the same as a difference.', 'Estimate each ratio to one decimal.') };
    }
    const opts = cats.map((c, k) => ({ t: c, ok: A[k] + B[k] > mean(A.map((x, q) => x + B[q])), note: `Total ${A[k] + B[k]}` }));
    if (!opts.some((o) => o.ok) || opts.every((o) => o.ok)) return diBar.generate(rng, level);
    const avg = mean(A.map((x, q) => x + B[q]));
    return { format: 'multi', di: true, stem: `In which years were the combined sales of the two regions greater than the average annual combined sales for ${cats[0]}–${cats[n - 1]}? Indicate all such years.`, diagram, ...multiSel(rng, opts, true), explanation: [`Combined totals: ${cats.map((c, k) => `${c}: ${A[k] + B[k]}`).join(', ')}.`, `Average $= ${sum(A) + sum(B)}/${n} = ${fmt(avg, 2)}$.`, `Years above average: ${opts.filter((o) => o.ok).map((o) => o.t).join(', ')}.`], trap: 'Comparing a single region to the combined average.', hints: H('Compute each year’s combined total.', 'Average those totals.', 'Compare each year to the average.') };
  },
});

const diPie: Generator = gen({
  id: Dt('di.pie'), unit: 'da.interpretation', subtopic: 'Pie charts', levels: [2, 3, 4],
  skills: ['percent of total', 'central angles'], concepts: ['Pie charts', 'Percentages', 'Data interpretation'],
  generate(rng, level) {
    const labels = ['Housing', 'Food', 'Transport', 'Savings', 'Other'];
    let ps = [rng.int(25, 40), rng.int(10, 20), rng.int(8, 16), rng.int(5, 15)];
    ps.push(100 - sum(ps));
    if (ps[4] <= 2) return diPie.generate(rng, level);
    const total = rng.pick([3000, 4000, 4800, 5000, 6000]);
    const diagram: ChartDiagram = { kind: 'pie', title: `Monthly budget (total ${money(total).replace('\\$', '$')})`, slices: labels.map((l, i) => ({ label: l, value: ps[i] })) };
    const i = rng.int(0, 4), j = rng.intNot(0, 4, [i]);
    if (level === 2) return { format: 'numeric', di: true, stem: `How many dollars per month are budgeted for ${labels[i].toLowerCase()}?`, diagram, answer: numAns((ps[i] * total) / 100), unitLabel: 'dollars', explanation: [`$${ps[i]}\\%$ of ${money(total)} $= ${fmt((ps[i] * total) / 100)}$.`], trap: 'Reading the percent as dollars.', hints: H('Slices are percents of the total.', `${labels[i]}: ${ps[i]}%.`, `$${ps[i] / 100}\\times${total}$.`) };
    if (level === 3) return { format: 'numeric', di: true, stem: `What is the measure, in degrees, of the central angle of the ${labels[i]} sector?`, diagram, answer: numAns(round((ps[i] / 100) * 360, 2)), explanation: [`A full circle is 360°; ${ps[i]}% of 360 $= ${fmt((ps[i] / 100) * 360)}$°.`], trap: 'Using 100 or 180 as the total angle.', hints: H('A whole pie is 360°.', 'Multiply the fraction by 360.', `${ps[i]}% = ${ps[i] / 100}.`) };
    const newTotal = total * rng.pick([1.1, 1.2, 1.25]);
    return { format: 'numeric', di: true, stem: `Next year the total budget increases to ${money(newTotal)}, and the dollar amount for ${labels[j].toLowerCase()} stays the same. What percent of the new budget will ${labels[j].toLowerCase()} be? (Round to the nearest tenth of a percent.)`, diagram, answer: numAns(round(((ps[j] * total) / newTotal), 1), 0.051), unitLabel: '%', explanation: [`Dollar amount: $${ps[j] / 100}\\times${total} = ${fmt((ps[j] * total) / 100)}$.`, `New percent $= ${fmt((ps[j] * total) / 100)}/${fmt(newTotal)} \\approx ${((ps[j] * total) / newTotal).toFixed(2)}\\%$.`], trap: 'Keeping the same percent even though the total changed.', hints: H('Convert the slice to dollars first.', 'Divide by the new total.', `${labels[j]} = ${money((ps[j] * total) / 100)}.`) };
  },
});

const diLine: Generator = gen({
  id: Dt('di.line'), unit: 'da.interpretation', subtopic: 'Line graphs', levels: [3, 4, 5],
  skills: ['reading trends', 'largest change'], concepts: ['Line graphs', 'Percent change from charts', 'Data interpretation'],
  generate(rng, level) {
    const cats = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const v = [rng.int(20, 50)];
    for (let k = 1; k < 6; k++) v.push(Math.max(5, v[k - 1] + rng.int(-12, 15)));
    const diagram: ChartDiagram = { kind: 'line', title: 'Website visitors (thousands)', categories: cats, series: [{ name: 'Visitors', values: v }], yLabel: 'Thousands' };
    const diffs = v.slice(1).map((x, k) => x - v[k]);
    if (level === 3) {
      const mx = Math.max(...diffs); const k = diffs.indexOf(mx);
      if (diffs.filter((d) => d === mx).length > 1 || mx <= 0) return diLine.generate(rng, level);
      return { format: 'mcq', di: true, stem: 'Between which two consecutive months was the increase in visitors the greatest?', diagram, choices: cats.slice(1).map((c, q) => `${cats[q]} to ${c}`), answer: k, explanation: [`Monthly changes: ${diffs.map((d, q) => `${cats[q]}→${cats[q + 1]}: ${d > 0 ? '+' : ''}${d}`).join(', ')}.`, `Greatest increase: ${cats[k]} to ${cats[k + 1]}.`], trap: 'Picking the highest point rather than the steepest rise.', hints: H('Look for the steepest upward segment.', 'Compute each month-to-month change.', 'Compare the positive changes.') };
    }
    const pcs = v.slice(1).map((x, k) => (x - v[k]) / v[k]);
    if (level === 4) {
      const mx = Math.max(...pcs), k = pcs.indexOf(mx);
      if (mx <= 0 || pcs.filter((p) => Math.abs(p - mx) < 1e-9).length > 1) return diLine.generate(rng, level);
      return { format: 'mcq', di: true, stem: 'Between which two consecutive months was the **percent** increase in visitors the greatest?', diagram, choices: cats.slice(1).map((c, q) => `${cats[q]} to ${c}`), answer: k, explanation: [`Percent changes: ${pcs.map((p, q) => `${cats[q]}→${cats[q + 1]}: ${(p * 100).toFixed(1)}%`).join(', ')}.`, `Greatest: ${cats[k]} to ${cats[k + 1]}. A smaller starting value can produce a larger percent increase.`], trap: 'Choosing the largest absolute increase; percent change also depends on the starting value.', hints: H('Percent change = change ÷ starting value.', 'Small bases inflate percent changes.', 'Compute each ratio.') };
    }
    const avg = mean(v);
    return { format: 'numeric', di: true, stem: 'What was the average (arithmetic mean) number of monthly visitors, in thousands, over the six months? (Round to the nearest tenth.)', diagram, answer: numAns(round(avg, 1), 0.051), explanation: [`Sum $= ${v.join(' + ')} = ${sum(v)}$.`, `Mean $= ${sum(v)}/6 \\approx ${avg.toFixed(2)}$.`], trap: 'Misreading a point on the graph.', hints: H('Read all six values carefully.', 'Add them.', 'Divide by 6.') };
  },
});

const diTable: Generator = gen({
  id: Dt('di.table'), unit: 'da.interpretation', subtopic: 'Data tables', levels: [3, 4, 5],
  skills: ['table analysis', 'percent comparisons'], concepts: ['Data tables', 'Percentages', 'Statistical comparisons'],
  generate(rng, level) {
    const stores = ['Store A', 'Store B', 'Store C', 'Store D', 'Store E'];
    const y1 = stores.map(() => rng.int(20, 90) * 10), y2 = stores.map(() => rng.int(20, 95) * 10);
    const diagram: ChartDiagram = { kind: 'table', title: 'Revenue (thousands of dollars)', columns: ['Store', '2023', '2024'], rows: stores.map((s, i) => [s, y1[i], y2[i]]) };
    if (level === 3) { const tot1 = sum(y1); const k = rng.int(0, 4); return { format: 'numeric', di: true, stem: `${stores[k]}'s 2023 revenue was what percent of the total 2023 revenue for all five stores? (Round to the nearest whole percent.)`, diagram, answer: numAns(Math.round((y1[k] / tot1) * 100), 0.5), unitLabel: '%', explanation: [`Total 2023: ${tot1}.`, `$${y1[k]}/${tot1} \\approx ${((y1[k] / tot1) * 100).toFixed(1)}\\%$ → ${Math.round((y1[k] / tot1) * 100)}%.`], trap: 'Using the 2024 column.', hints: H('Find the column total first.', 'Part ÷ whole × 100.', `Total = ${tot1}.`) }; }
    const pc = stores.map((_, i) => (y2[i] - y1[i]) / y1[i]);
    const thr = rng.pick([10, 20, 25]);
    const opts = stores.map((s, i) => ({ t: s, ok: pc[i] * 100 > thr, note: `${(pc[i] * 100).toFixed(1)}%` }));
    if (!opts.some((o) => o.ok) || opts.every((o) => o.ok)) return diTable.generate(rng, level);
    if (level === 4) return { format: 'multi', di: true, stem: `For which stores did revenue increase by more than ${thr}% from 2023 to 2024? Indicate all such stores.`, diagram, ...multiSel(rng, opts, true), explanation: [`Percent changes: ${stores.map((s, i) => `${s}: ${(pc[i] * 100).toFixed(1)}%`).join('; ')}.`, `More than ${thr}%: ${opts.filter((o) => o.ok).map((o) => o.t).join(', ')}.`], trap: 'Using absolute increases instead of percent increases.', hints: H(`A ${thr}% increase means 2024 > ${1 + thr / 100} × 2023.`, `Compare each 2024 value with ${1 + thr / 100} × its 2023 value.`, 'Estimate quickly by multiplying.') };
    const tot1 = sum(y1), tot2 = sum(y2);
    return { ...qcNumeric({ given: 'Refer to the revenue table.', a: 'The percent change in total revenue from 2023 to 2024', b: 'The average of the five stores’ percent changes', va: (tot2 - tot1) / tot1, vb: mean(pc), proof: [`Total: ${tot1} → ${tot2}: $${(((tot2 - tot1) / tot1) * 100).toFixed(2)}\\%$.`, `Average of individual percent changes: $${(mean(pc) * 100).toFixed(2)}\\%$.`, 'The total change weights each store by its size; the simple average weights every store equally.'], trap: 'Assuming the average of percent changes equals the percent change of the total.', hints: H('Compute the total change first.', 'Then average the five individual percent changes.', 'Big stores dominate the total.') }), diagram, di: true };
  },
});

const diScatter: Generator = gen({
  id: Dt('di.scatter'), unit: 'da.interpretation', subtopic: 'Scatterplots', levels: [2, 3, 4],
  skills: ['reading scatterplots', 'correlation'], concepts: ['Scatterplots', 'Data interpretation'],
  generate(rng, level) {
    const n = 12;
    const slope = rng.pick([1, -1, 0.5]);
    const pts = Array.from({ length: n }, () => { const x = rng.int(1, 20); return { x, y: Math.max(1, Math.min(24, Math.round(slope * x + rng.int(-4, 4) + (slope < 0 ? 22 : 3)))) }; });
    const uniq = pts.filter((p, i, a) => a.findIndex((q) => q.x === p.x && q.y === p.y) === i);
    const diagram: ChartDiagram = { kind: 'scatter', title: 'Hours studied (x) vs. score points gained (y)', points: uniq, xLabel: 'Hours', yLabel: 'Points' };
    if (level === 2) { const above = uniq.filter((p) => p.y > p.x).length; return { format: 'numeric', di: true, stem: 'How many of the plotted points lie strictly above the line $y = x$ (points where $y > x$)?', diagram, answer: numAns(above), explanation: [`Points with $y > x$: ${uniq.filter((p) => p.y > p.x).map((p) => `(${p.x}, ${p.y})`).join(', ') || 'none'}.`, `Count: ${above}.`], trap: 'Counting points on the line itself.', hints: H('Compare each y to its x.', 'Points on y = x do not count.', 'Go point by point.') }; }
    if (level === 3) return { format: 'mcq', di: true, stem: 'Which of the following best describes the relationship between the two variables shown?', diagram, ...textMcq(rng, slope > 0 ? 'A positive association' : 'A negative association', [{ t: slope > 0 ? 'A negative association' : 'A positive association', note: 'Check whether y tends to rise or fall as x increases.' }, 'No association', 'A perfect linear relationship', 'A relationship that cannot be described from the graph']), explanation: [slope > 0 ? 'As x increases, y tends to increase: positive association.' : 'As x increases, y tends to decrease: negative association.'], trap: 'Confusing correlation strength with direction.', hints: H('Look at the overall trend.', 'Left-to-right rising means positive.', 'Ignore individual outliers.') };
    const xs = uniq.map((p) => p.x), ys = uniq.map((p) => p.y);
    const rg = Math.max(...ys) - Math.min(...ys);
    return { format: 'numeric', di: true, stem: 'What is the range of the $y$-values of the plotted points?', diagram, answer: numAns(rg), explanation: [`Largest y: ${Math.max(...ys)}; smallest y: ${Math.min(...ys)}.`, `Range $= ${rg}$.`], trap: 'Using the x-values.', hints: H('Range = max − min.', 'Use the vertical coordinates.', `Max y = ${Math.max(...ys)}.`) };
    void xs;
  },
});

const diHist: Generator = gen({
  id: Dt('di.histogram'), unit: 'da.interpretation', subtopic: 'Histograms', levels: [3, 4, 5],
  skills: ['reading histograms', 'median class'], concepts: ['Histograms', 'Frequency distributions', 'Median'],
  generate(rng, level) {
    const bins = ['0–9', '10–19', '20–29', '30–39', '40–49'];
    const f = bins.map(() => rng.int(2, 15));
    const N = sum(f);
    const diagram: ChartDiagram = { kind: 'histogram', title: 'Ages of museum visitors on one morning', categories: bins, series: [{ name: 'Visitors', values: f }], xLabel: 'Age (years)', yLabel: 'Number of visitors' };
    if (level === 3) { const k = rng.int(2, 4); const atLeast = sum(f.slice(k)); return { format: 'numeric', di: true, stem: `How many visitors were at least ${k * 10} years old?`, diagram, answer: numAns(atLeast), explanation: [`Add the bars from ${bins[k]} upward: ${f.slice(k).join(' + ')} = ${atLeast}.`], trap: `Starting from the wrong bar (the ${bins[k - 1]} bar contains ages below ${k * 10}).`, hints: H('Identify which bars meet the condition.', `Ages ${k * 10} and up start at the ${bins[k]} bar.`, 'Add those bar heights.') }; }
    const cum = f.map((_, i) => sum(f.slice(0, i + 1)));
    const pos = N % 2 ? [(N + 1) / 2] : [N / 2, N / 2 + 1];
    const binOf = (p: number) => cum.findIndex((c) => c >= p);
    const b1 = binOf(pos[0]), b2 = binOf(pos[pos.length - 1]);
    if (b1 !== b2) return diHist.generate(rng, level);
    if (level === 4) return { format: 'mcq', di: true, stem: 'Which age group contains the median age of the visitors?', diagram, choices: bins, answer: b1, explanation: [`There are ${N} visitors; the median is the ${N % 2 ? `${pos[0]}th value` : `average of the ${pos[0]}th and ${pos[1]}th values`}.`, `Cumulative counts: ${bins.map((b, i) => `${b}: ${cum[i]}`).join(', ')}.`, `That position falls in ${bins[b1]}.`], trap: 'Choosing the tallest bar (the mode class) instead of the median class.', hints: H('Find the total count.', 'Use cumulative counts to locate the middle position.', `N = ${N}.`) };
    const p = new Frac(sum(f.slice(0, 2)), N);
    return { format: 'numeric', di: true, stem: 'If one of these visitors is selected at random, what is the probability that the visitor is under 20 years old? Give your answer as a fraction.', diagram, answer: fracAns(p.n, p.d), explanation: [`Under 20: ${f[0]} + ${f[1]} = ${f[0] + f[1]}; total ${N}.`, `$P = ${p.tex()}$.`], trap: 'Including the 20–29 group.', hints: H('Which bars are under 20?', 'Add those bars.', `Total visitors: ${N}.`) };
  },
});

export const DATA: Generator[] = [meanGen, medianMode, statsChange, sdGen, normalDist, quartiles, freqTable, countBasic, permutations, combinations, probBasic, probIndep, probDependent, conditional, sets2, sets3, matrix, diBar, diPie, diLine, diTable, diScatter, diHist];
void qcOutput;
