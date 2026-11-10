import { Frac, fmt, money, round, tnum } from '../../lib/math';
import type { Generator } from '../types';
import { H, NAMES, fracAns, gen, numAns, numMcq, textMcq, twoNames } from './helpers';
import { qcNumeric } from './qc';

const W = (id: string) => `wp.${id}`;

// ===================== Translation, age, multi-step =====================
const age: Generator = gen({
  id: W('age'), unit: 'wp.translation', subtopic: 'Age problems', levels: [2, 3, 4],
  skills: ['age equations'], concepts: ['Age problems', 'Translating written information into mathematical expressions'],
  generate(rng, level) {
    const [p, q] = twoNames(rng);
    const child = rng.int(4, 15), k = rng.pick([2, 3, 4]);
    const parent = child * k + (level >= 3 ? rng.int(-3, 6) : 0);
    if (level === 2) {
      const yrs = rng.int(2, 8);
      return {
        format: 'numeric', stem: `${p} is ${k} times as old as ${q}. In ${yrs} years, the sum of their ages will be ${parent + child + 2 * yrs}. How old is ${q} now?`, answer: numAns(child),
        explanation: [`Let ${q}'s age be $a$; ${p}'s age is $${k}a$.`, `In ${yrs} years: $(a + ${yrs}) + (${k}a + ${yrs}) = ${parent + child + 2 * yrs}$.`, `$${k + 1}a = ${(k + 1) * child} \\Rightarrow a = ${child}$.`],
        trap: 'Adding the future years to only one person.',
        hints: H('Define a variable for the younger person’s current age.', 'Both people age by the same number of years.', `Write $(a + ${yrs}) + (${k}a + ${yrs})$.`),
      };
    }
    const yrsAgo = rng.int(2, Math.min(child - 1, 8));
    const m = rng.pick([2, 3, 4, 5]);
    // parent - y = m(child - y) for some child, parent: choose child, y, m; parent = m(child - y) + y ; with future condition parent + f = r(child + f)
    const c = rng.int(yrsAgo + 2, 16);
    const P = m * (c - yrsAgo) + yrsAgo;
    const diff = P - c;
    if (level === 3) {
      return {
        format: 'numeric', stem: `${p} is ${diff} years older than ${q}. ${yrsAgo} years ago, ${p} was ${m} times as old as ${q}. How old is ${p} now?`, answer: numAns(P),
        explanation: [`Let ${q} be $a$ now, so ${p} is $a + ${diff}$.`, `${yrsAgo} years ago: $a + ${diff} - ${yrsAgo} = ${m}(a - ${yrsAgo})$.`, `$a = ${c}$, so ${p} is ${P}.`],
        trap: 'Subtracting the years from only one of the ages.',
        hints: H('The age difference never changes.', `Write both ages ${yrsAgo} years ago.`, `$a + ${diff - yrsAgo} = ${m}(a - ${yrsAgo})$.`),
      };
    }
    // level 4: when will parent be exactly r times child? find years from now
    const r = 2;
    // P + t = 2 (c + t) -> t = P - 2c
    const t = P - 2 * c;
    if (t <= 0) return age.generate(rng, level);
    return {
      format: 'numeric', stem: `${p} is ${P} years old and ${q} is ${c}. In how many years will ${p} be exactly twice as old as ${q}?`, answer: numAns(t),
      explanation: [`$${P} + t = ${r}(${c} + t)$.`, `$${P} + t = ${2 * c} + 2t \\Rightarrow t = ${t}$.`, `Check: in ${t} years they are ${P + t} and ${c + t}.`],
      trap: 'Doubling the current age only, ignoring that both ages increase.',
      hints: H('Let t be the number of years.', 'Both ages increase by t.', `$${P} + t = 2(${c} + t)$.`),
    };
  },
});

const translate: Generator = gen({
  id: W('translate'), unit: 'wp.translation', subtopic: 'Translating written information into mathematical expressions', levels: [1, 2, 3],
  skills: ['translation'], concepts: ['Translating written information into mathematical expressions'],
  generate(rng, level) {
    const a = rng.int(2, 9), b = rng.int(2, 15);
    if (level === 3) {
      const n = rng.int(3, 20), cost = rng.int(3, 12);
      return {
        format: 'mcq', stem: `A club buys $n$ tickets at ${money(cost)} each and pays a one-time fee of ${money(b)}. The total cost is split evenly among $p$ people. Which expression gives each person's share, in dollars?`,
        ...textMcq(rng, `$\\dfrac{${cost}n + ${b}}{p}$`, [{ t: `$\\dfrac{${cost}n}{p} + ${b}$`, note: 'The fee is shared too; it must be inside the numerator.' }, `$\\dfrac{${cost}(n + ${b})}{p}$`, `$${cost}n + \\dfrac{${b}}{p}n$`, `$\\dfrac{p}{${cost}n + ${b}}$`]),
        explanation: [`Total cost $= ${cost}n + ${b}$.`, `Split among $p$ people: $\\dfrac{${cost}n + ${b}}{p}$.`], trap: 'Splitting only part of the total.',
        hints: H('Write the total cost first.', 'Then divide the whole total by p.', `Total = $${cost}n + ${b}$.`), ...{} as object,
      };
    }
    const forms = [
      { s: `${a} less than ${level === 1 ? 'twice' : 'three times'} a number $n$ is ${b}`, e: `${level === 1 ? 2 : 3}n - ${a} = ${b}`, w: [{ t: `${a} - ${level === 1 ? 2 : 3}n = ${b}`, note: '“a less than X” means X − a, not a − X.' }, `${level === 1 ? 2 : 3}(n - ${a}) = ${b}`, `${level === 1 ? 2 : 3}n + ${a} = ${b}`, `n - ${a} = ${level === 1 ? 2 : 3}\\cdot ${b}`] },
      { s: `the sum of a number $n$ and ${a}, divided by ${b}, is ${a + b}`, e: `\\dfrac{n + ${a}}{${b}} = ${a + b}`, w: [{ t: `n + \\dfrac{${a}}{${b}} = ${a + b}`, note: 'The sum is divided, not just one term.' }, `\\dfrac{n}{${b}} = ${a + b} + ${a}`, `${b}(n + ${a}) = ${a + b}`, `\\dfrac{${b}}{n + ${a}} = ${a + b}`] },
      { s: `${a} more than the product of $n$ and ${b} equals the square of $n$`, e: `${b}n + ${a} = n^2`, w: [{ t: `${b}(n + ${a}) = n^2`, note: '“More than the product” adds after multiplying.' }, `${b}n = n^2 + ${a}`, `${b} + n + ${a} = n^2`, `${a}n + ${b} = 2n`] },
    ];
    const f = rng.pick(forms);
    return {
      format: 'mcq', stem: `Which equation represents the statement: “${f.s}”?`,
      ...textMcq(rng, `$${f.e}$`, f.w.map((w) => (typeof w === 'string' ? `$${w}$` : { t: `$${w.t}$`, note: w.note }))),
      explanation: [`Translate phrase by phrase: “${f.s}” → $${f.e}$.`, '“Less than” reverses order: “a less than X” is X − a.'],
      trap: 'Reversing the order of subtraction in “less than” phrases.',
      hints: H('Translate one phrase at a time.', '“is” becomes “=”.', '“a less than X” means X − a.'),
    };
  },
});

const tickets: Generator = gen({
  id: W('tickets'), unit: 'wp.translation', subtopic: 'Multi-step equations', levels: [2, 3, 4],
  skills: ['setting up systems from words'], concepts: ['Multi-step equations', 'Systems of equations'],
  generate(rng, level) {
    const pa = rng.pick([8, 9, 10, 12, 15]), pc = rng.pick([4, 5, 6, 7].filter((x) => x < pa));
    const A = rng.int(20, 120), C = rng.int(20, 150);
    const N = A + C, R = A * pa + C * pc;
    const ask = level === 4 ? 'diff' : 'adult';
    const ans = ask === 'adult' ? A : Math.abs(A - C);
    return {
      format: 'numeric', stem: `A theater sold ${N} tickets for a total of ${money(R)}. Adult tickets cost ${money(pa)} and child tickets cost ${money(pc)}. ${ask === 'adult' ? 'How many adult tickets were sold?' : `What is the positive difference between the numbers of adult and child tickets sold?`}`,
      answer: numAns(ans),
      explanation: [`$a + c = ${N}$ and $${pa}a + ${pc}c = ${R}$.`, `Substitute $c = ${N} - a$: $${pa}a + ${pc}(${N} - a) = ${R} \\Rightarrow ${pa - pc}a = ${R - pc * N}$.`, `$a = ${A}$, $c = ${C}$${ask === 'diff' ? `; difference $= ${ans}$` : ''}.`],
      trap: 'Mixing up which price goes with which ticket type.',
      altMethod: `If every ticket were a child ticket, revenue would be ${money(pc * N)}. Each adult ticket adds ${money(pa - pc)}, so adults $= (${R} - ${pc * N})/${pa - pc} = ${A}$.`,
      hints: H('Two unknowns need two equations.', 'One equation counts tickets; one counts dollars.', `$a + c = ${N}$.`),
      ...(level === 2 ? {} : {}),
    };
  },
});

// ===================== Work-rate =====================
const workCombined: Generator = gen({
  id: W('work.combined'), unit: 'wp.work', subtopic: 'Combined rates', levels: [2, 3, 4],
  skills: ['adding rates'], concepts: ['Work-rate problems', 'Combined rates'],
  generate(rng, level) {
    const [p, q] = twoNames(rng);
    const a = rng.pick([2, 3, 4, 5, 6, 8, 10, 12]), b = rng.pick([3, 4, 6, 9, 12, 15, 20].filter((x) => x !== a));
    const t = new Frac(a * b, a + b);
    if (level === 4) {
      // given combined time and one, find other
      const comb = t;
      return {
        format: 'numeric', stem: `Working together at constant rates, ${p} and ${q} can paint a fence in $${comb.tex()}$ hours. Working alone, ${p} can paint it in ${a} hours. How many hours would ${q} need working alone?`, answer: numAns(b),
        explanation: [`Rates add: $\\dfrac{1}{${a}} + \\dfrac{1}{x} = \\dfrac{1}{${comb.tex()}} = ${new Frac(comb.d, comb.n).tex()}$.`, `$\\dfrac{1}{x} = ${new Frac(comb.d, comb.n).sub(new Frac(1, a)).tex()}$, so $x = ${b}$.`],
        trap: 'Subtracting times instead of rates.',
        hints: H('Convert each time to a rate (jobs per hour).', 'Combined rate = sum of individual rates.', `Combined rate $= ${new Frac(comb.d, comb.n).tex()}$ job/hour.`),
      };
    }
    return {
      format: level === 2 ? 'mcq' : 'numeric', stem: `${p} can finish a job in ${a} hours and ${q} can finish the same job in ${b} hours. Working together at these rates, how many hours will they take to finish the job?${level === 3 && !t.isInt() ? ' Give your answer as a fraction.' : ''}`,
      ...(level === 2
        ? numMcq(t.value, [{ v: (a + b) / 2, note: 'Averaged the times — combined work is faster than either alone.' }, { v: a + b, note: 'Added the times.' }, Math.abs(a - b) || 1, Math.min(a, b)], { render: (n) => `$${Number.isInteger(round(n, 6)) ? fmt(n) : new Frac(Math.round(n * (a + b)), a + b).tex()}$` })
        : { answer: t.isInt() ? numAns(t.value) : fracAns(t.n, t.d) }),
      explanation: [`Rates: $\\dfrac{1}{${a}}$ and $\\dfrac{1}{${b}}$ job per hour. Together: $\\dfrac{1}{${a}} + \\dfrac{1}{${b}} = ${new Frac(a + b, a * b).tex()}$.`, `Time $= ${new Frac(a * b, a + b).tex()}$ hours (shortcut: $\\dfrac{ab}{a + b}$).`],
      trap: 'Averaging or adding the times. Together they must be faster than the faster worker alone.',
      hints: H('Work with rates, not times.', 'Rate = 1 job ÷ time.', `Combined rate $= \\frac{1}{${a}} + \\frac{1}{${b}}$.`),
    } as any;
  },
});

const workPartial: Generator = gen({
  id: W('work.partial'), unit: 'wp.work', subtopic: 'Work-rate problems', levels: [4, 5],
  skills: ['partial work'], concepts: ['Work-rate problems', 'Combined rates'],
  generate(rng, level) {
    const [p, q] = twoNames(rng);
    const a = rng.pick([6, 8, 10, 12]), b = rng.pick([4, 6, 12, 15, 24].filter((x) => x !== a));
    const t1 = rng.int(1, Math.floor(a / 2));
    // p works alone t1 hours, then both finish. remaining = 1 - t1/a ; together rate (a+b)/(ab)
    const remaining = new Frac(1).sub(new Frac(t1, a));
    const t2 = remaining.div(new Frac(a + b, a * b));
    if (level === 5) {
      // pipes: fill in a, drain in c > a; both open — time to fill
      const c = a + rng.pick([2, 4, 6, 12]);
      const tt = new Frac(a * c, c - a);
      return {
        format: 'numeric', stem: `An inlet pipe can fill a tank in ${a} hours, and a drain can empty the full tank in ${c} hours. If the tank is empty and both are opened at the same time, how many hours will it take to fill the tank?${tt.isInt() ? '' : ' Give your answer as a fraction.'}`, answer: tt.isInt() ? numAns(tt.value) : fracAns(tt.n, tt.d),
        explanation: [`Net rate $= \\dfrac{1}{${a}} - \\dfrac{1}{${c}} = ${new Frac(c - a, a * c).tex()}$ tank per hour.`, `Time $= ${tt.tex()}$ hours.`],
        trap: 'Adding the drain’s rate instead of subtracting it.',
        hints: H('The drain works against the inlet.', 'Net rate = fill rate − drain rate.', `$\\frac{1}{${a}} - \\frac{1}{${c}}$.`),
      };
    }
    return {
      format: 'numeric', stem: `${p} can complete a task alone in ${a} hours; ${q} can complete it alone in ${b} hours. ${p} works alone for ${t1} hour${t1 > 1 ? 's' : ''}, and then ${q} joins and they finish together. How many hours do they work together?${t2.isInt() ? '' : ' Give your answer as a fraction.'}`,
      answer: t2.isInt() ? numAns(t2.value) : fracAns(t2.n, t2.d),
      explanation: [`In ${t1} hour(s), ${p} completes $\\dfrac{${t1}}{${a}}$ of the task, leaving $${remaining.tex()}$.`, `Together their rate is $\\dfrac{1}{${a}} + \\dfrac{1}{${b}} = ${new Frac(a + b, a * b).tex()}$.`, `Time together $= ${remaining.tex()} \\div ${new Frac(a + b, a * b).tex()} = ${t2.tex()}$ hours.`],
      trap: 'Ignoring the work already done before the second worker joined.',
      hints: H('Find how much of the job is left after the first phase.', 'Divide the remaining work by the combined rate.', `Remaining: $${remaining.tex()}$.`),
    };
  },
});

// ===================== Distance-rate-time =====================
const avgSpeed: Generator = gen({
  id: W('dist.avg'), unit: 'wp.distance', subtopic: 'Average speed', levels: [2, 3, 4],
  skills: ['average speed = total distance / total time'], concepts: ['Average speed', 'Distance, rate, and time'],
  generate(rng, level) {
    const pairs = [[30, 60], [40, 60], [20, 30], [45, 90], [36, 54], [48, 72], [50, 75], [60, 90], [30, 70]];
    const [v1, v2] = rng.pick(pairs);
    const avg = new Frac(2 * v1 * v2, v1 + v2);
    if (level === 4) {
      return qcNumeric({
        given: `A cyclist rides from town P to town Q at ${v1} km/h and returns along the same road at ${v2} km/h.`,
        a: 'The average speed for the round trip, in km/h', b: `${(v1 + v2) / 2}`, va: avg.value, vb: (v1 + v2) / 2,
        proof: [`Average speed $= \\dfrac{2 v_1 v_2}{v_1 + v_2} = \\dfrac{2\\cdot${v1}\\cdot${v2}}{${v1 + v2}} = ${avg.tex()} \\approx ${avg.value.toFixed(2)}$.`, 'More time is spent at the slower speed, so the average is below the simple mean.'],
        trap: 'Averaging the two speeds directly.',
        hints: H('Pick a distance, e.g. the LCM of the speeds.', 'Average speed = total distance ÷ total time.', 'More time is spent at the slower speed.'),
      });
    }
    return {
      format: level === 2 ? 'mcq' : 'numeric', stem: `A car travels a certain distance at ${v1} miles per hour and returns the same distance at ${v2} miles per hour. What is its average speed for the round trip, in miles per hour?${level === 3 && !avg.isInt() ? ' Give your answer as a fraction.' : ''}`,
      ...(level === 2 ? numMcq(avg.value, [{ v: (v1 + v2) / 2, note: 'Averaged the speeds; the car spends more time at the slower speed.' }, v2 - v1, v1, v2], { render: (n) => `$${Number.isInteger(round(n, 6)) ? fmt(n) : avg.tex()}$` }) : { answer: avg.isInt() ? numAns(avg.value) : fracAns(avg.n, avg.d) }),
      explanation: [`Let the one-way distance be $d$. Total distance $= 2d$; total time $= \\dfrac{d}{${v1}} + \\dfrac{d}{${v2}}$.`, `For example, with $d = ${(v1 * v2) / gcdN(v1, v2)}$ miles the trip takes $${v2 / gcdN(v1, v2)} + ${v1 / gcdN(v1, v2)} = ${(v1 + v2) / gcdN(v1, v2)}$ hours for $${(2 * v1 * v2) / gcdN(v1, v2)}$ miles.`, `Average speed $= \\dfrac{2d}{d/${v1} + d/${v2}} = \\dfrac{2\\cdot${v1}\\cdot${v2}}{${v1} + ${v2}} = ${avg.tex()}$.`],
      trap: 'Taking the arithmetic mean of the speeds.',
      hints: H('Average speed is total distance over total time.', 'Pick a convenient one-way distance.', `Try a distance of ${v1 * v2 / gcdN(v1, v2)} miles.`),
    } as any;
  },
});
function gcdN(a: number, b: number): number { return b ? gcdN(b, a % b) : a; }

const meeting: Generator = gen({
  id: W('dist.meet'), unit: 'wp.distance', subtopic: 'Relative speed', levels: [3, 4, 5],
  skills: ['relative speed'], concepts: ['Relative speed', 'Distance, rate, and time'],
  generate(rng, level) {
    const v1 = rng.pick([40, 45, 50, 55, 60]), v2 = rng.pick([30, 35, 45, 60, 65, 70].filter((x) => x !== v1));
    if (level === 5) {
      // catch-up: second leaves h hours later, faster
      const slow = Math.min(v1, v2), fast = Math.max(v1, v2), h = rng.pick([1, 2, 3]);
      const t = new Frac(slow * h, fast - slow);
      return {
        format: 'numeric', stem: `Train A leaves a station traveling at ${slow} mph. ${h} hour${h > 1 ? 's' : ''} later, train B leaves the same station on a parallel track in the same direction at ${fast} mph. How many hours after train B leaves will it catch train A?${t.isInt() ? '' : ' Give your answer as a fraction.'}`,
        answer: t.isInt() ? numAns(t.value) : fracAns(t.n, t.d),
        explanation: [`Head start: $${slow}\\times${h} = ${slow * h}$ miles.`, `Gap closes at $${fast} - ${slow} = ${fast - slow}$ mph.`, `Time $= ${slow * h}/${fast - slow} = ${t.tex()}$ hours.`],
        trap: 'Adding the speeds — for same-direction motion the closing speed is the difference.',
        hints: H('How far ahead is train A when B starts?', 'Same direction → subtract speeds.', `The head start is ${slow * h} miles.`),
      };
    }
    const t = rng.pick([1.5, 2, 2.5, 3, 4]);
    const D = (v1 + v2) * t;
    if (level === 3) {
      return {
        format: 'numeric', stem: `Two cars start ${fmt(D)} miles apart and drive toward each other, one at ${v1} mph and the other at ${v2} mph. After how many hours will they meet?`, answer: numAns(t),
        explanation: [`Closing speed $= ${v1} + ${v2} = ${v1 + v2}$ mph.`, `Time $= ${fmt(D)}/${v1 + v2} = ${fmt(t)}$ hours.`],
        trap: 'Subtracting the speeds for cars moving toward each other.',
        hints: H('Moving toward each other, the gap shrinks at the sum of the speeds.', 'time = distance ÷ closing speed.', `Closing speed: ${v1 + v2} mph.`),
      };
    }
    return {
      format: 'numeric', stem: `Two cars start ${fmt(D)} miles apart and drive toward each other, one at ${v1} mph and the other at ${v2} mph. How many miles from the slower car's starting point will they meet?`, answer: numAns(Math.min(v1, v2) * t),
      explanation: [`They meet after $${fmt(D)}/(${v1} + ${v2}) = ${fmt(t)}$ hours.`, `The slower car (${Math.min(v1, v2)} mph) covers $${Math.min(v1, v2)}\\times${fmt(t)} = ${fmt(Math.min(v1, v2) * t)}$ miles.`],
      trap: 'Reporting the faster car’s distance.',
      hints: H('First find the meeting time.', 'Then distance = slower speed × time.', `Closing speed ${v1 + v2} mph.`),
    };
  },
});

const drt: Generator = gen({
  id: W('dist.basic'), unit: 'wp.distance', subtopic: 'Distance, rate, and time', levels: [1, 2, 3],
  skills: ['d = rt'], concepts: ['Distance, rate, and time', 'Unit conversions'],
  generate(rng, level) {
    const v = rng.pick([12, 15, 24, 36, 48, 60, 72]);
    const mins = rng.pick([10, 15, 20, 25, 40, 45, 50]);
    if (level === 3) {
      // two legs, total time
      const d1 = rng.pick([30, 60, 90, 120]), v1 = rng.pick([30, 40, 60]), d2 = rng.pick([20, 50, 80, 100]), v2 = rng.pick([40, 50, 80].filter((x) => x !== v1));
      const T = d1 / v1 + d2 / v2;
      return {
        format: 'numeric', stem: `A driver covers ${d1} miles at ${v1} mph and then ${d2} miles at ${v2} mph. How many **minutes** does the whole trip take?`, answer: numAns(round(T * 60, 4)),
        explanation: [`Leg 1: $${d1}/${v1} = ${fmt(d1 / v1)}$ h. Leg 2: $${d2}/${v2} = ${fmt(d2 / v2)}$ h.`, `Total $= ${fmt(T)}$ h $= ${fmt(T * 60)}$ minutes.`],
        trap: 'Forgetting to convert hours to minutes.',
        hints: H('Time = distance ÷ rate for each leg.', 'Add the times.', 'Multiply hours by 60.'),
      };
    }
    const d = v * (mins / 60);
    return {
      format: 'numeric', stem: `A cyclist rides at a constant ${v} miles per hour. How many miles does she ride in ${mins} minutes?`, answer: numAns(d),
      explanation: [`${mins} minutes $= \\dfrac{${mins}}{60}$ hour.`, `$d = rt = ${v}\\cdot\\dfrac{${mins}}{60} = ${fmt(d)}$ miles.`],
      trap: 'Multiplying the speed by minutes without converting to hours.',
      hints: H('Match the time unit to the rate’s unit.', 'Convert minutes to hours.', `${mins} min = ${fmt(mins / 60)} h.`),
    };
  },
});

// ===================== Mixtures & weighted averages =====================
const mixture: Generator = gen({
  id: W('mix.solution'), unit: 'wp.mixtures', subtopic: 'Mixture problems', levels: [3, 4, 5],
  skills: ['concentration equations'], concepts: ['Mixture problems', 'Alligation'],
  generate(rng, level) {
    const c1 = rng.pick([10, 15, 20, 25, 30]), c2 = rng.pick([40, 50, 60, 70, 80]);
    const target = rng.pick([c1 + 5, c1 + 10, Math.round((c1 + c2) / 2), c2 - 10].filter((x) => x > c1 && x < c2 && x % 5 === 0));
    const v1 = rng.pick([10, 20, 30, 40, 60]);
    // v1(c1) + v2(c2) = (v1+v2) target -> v2 = v1 (target - c1)/(c2 - target)
    const v2 = new Frac(v1 * (target - c1), c2 - target);
    if (level === 5) {
      // replacement: remove x of solution c, replace with water twice
      const V = rng.pick([20, 40, 50, 100]), x = rng.pick([V / 4, V / 5, V / 10]), c = rng.pick([40, 50, 80]);
      const final = c * (1 - x / V) ** 2;
      return {
        format: 'numeric', stem: `A tank holds ${V} liters of a ${c}% acid solution. ${fmt(x)} liters are drained and replaced with pure water, and then this process is repeated once more. What is the acid concentration of the final solution, in percent?`, answer: numAns(round(final, 4), 0.01), unitLabel: '%',
        explanation: [`Each replacement keeps a fraction $1 - \\dfrac{${fmt(x)}}{${V}} = ${fmt(1 - x / V)}$ of the acid.`, `After two rounds: $${c}\\% \\times ${fmt(1 - x / V)}^2 = ${fmt(final)}\\%$.`],
        trap: `Subtracting the same amount of acid twice (the second draining removes less acid).`,
        hints: H('What fraction of the acid remains after one replacement?', 'The volume stays constant; only the acid is diluted.', `Each time ${fmt(1 - x / V)} of the acid remains.`),
      };
    }
    return {
      format: level === 3 ? 'mcq' : 'numeric', stem: `How many liters of a ${c2}% saline solution must be added to ${v1} liters of a ${c1}% saline solution to obtain a ${target}% saline solution?${level === 4 && !v2.isInt() ? ' Give your answer as a fraction.' : ''}`,
      ...(level === 3 ? numMcq(v2.value, [{ v: v1, note: 'Assumed equal volumes.' }, round((v1 * (c2 - target)) / (target - c1), 4), round(v2.value * 2, 4), round(v2.value + 5, 4)], { render: (n) => `$${Number.isInteger(round(n, 6)) ? fmt(n) : new Frac(Math.round(n * 12 * (c2 - target)), 12 * (c2 - target)).tex()}$` }) : { answer: v2.isInt() ? numAns(v2.value) : fracAns(v2.n, v2.d) }),
      explanation: [`Salt balance: $${c1 / 100}(${v1}) + ${c2 / 100}x = ${target / 100}(${v1} + x)$.`, `$${(target - c1) / 100}\\cdot${v1} = ${(c2 - target) / 100}x \\Rightarrow x = ${v2.tex()}$ liters.`, `Alligation check: distances to target are ${target - c1} and ${c2 - target}, so volumes are in ratio $${c2 - target}:${target - c1}$.`],
      trap: 'Averaging the percentages without weighting by volume.',
      hints: H('Track the amount of pure salt.', 'Salt before mixing = salt after mixing.', `Set up $${c1}\\%\\cdot${v1} + ${c2}\\%\\cdot x = ${target}\\%(${v1} + x)$.`),
    } as any;
  },
});

const weightedAvg: Generator = gen({
  id: W('mix.weighted'), unit: 'wp.mixtures', subtopic: 'Weighted averages', levels: [2, 3, 4],
  skills: ['weighted mean'], concepts: ['Weighted averages'],
  generate(rng, level) {
    const n1 = rng.int(10, 30), n2 = rng.int(10, 40), a1 = rng.int(60, 80), a2 = rng.int(81, 95);
    const w = (n1 * a1 + n2 * a2) / (n1 + n2);
    if (level === 4) {
      return qcNumeric({
        given: `Class X has ${n1} students with an average score of ${a1}. Class Y has ${n2} students with an average score of ${a2}.`,
        a: 'The average score of all students in both classes', b: `${fmt((a1 + a2) / 2)}`, va: w, vb: (a1 + a2) / 2,
        proof: [`Combined average $= \\dfrac{${n1}\\cdot${a1} + ${n2}\\cdot${a2}}{${n1 + n2}} \\approx ${w.toFixed(2)}$.`, `It is pulled toward the average of the ${n1 > n2 ? 'larger class X' : n2 > n1 ? 'larger class Y' : 'classes equally'}.`],
        trap: 'Averaging the two averages without considering class sizes.',
        hints: H('Which class has more students?', 'The combined mean is closer to the larger group’s mean.', 'Compare the group sizes.'),
      });
    }
    if (level === 3) {
      const target = rng.int(a1 + 2, a2 - 2);
      // n2 = n1 (target - a1)/(a2 - target)
      const nn2 = new Frac(n1 * (target - a1), a2 - target);
      if (!nn2.isInt()) return weightedAvg.generate(rng, level);
      return {
        format: 'numeric', stem: `In a company, ${n1} employees have an average salary of ${money(a1 * 1000)}. How many employees with an average salary of ${money(a2 * 1000)} must be hired so that the average salary of all employees is ${money(target * 1000)}?`, answer: numAns(nn2.value),
        explanation: [`$${n1}(${a1}) + x(${a2}) = (${n1} + x)(${target})$ (in thousands).`, `$${n1}(${target - a1}) = x(${a2 - target}) \\Rightarrow x = ${nn2.value}$.`],
        trap: 'Using the simple average of the two salaries.',
        hints: H('Balance the deviations from the target average.', 'Total deviation below the target equals total deviation above.', `$${n1}\\times${target - a1} = x \\times ${a2 - target}$.`),
      };
    }
    return {
      format: 'numeric', stem: `A class has ${n1} students who averaged ${a1} on a test and ${n2} students who averaged ${a2}. What is the average for the whole class? (Round to the nearest tenth.)`, answer: numAns(round(w, 1), 0.051),
      explanation: [`Total points $= ${n1}\\cdot${a1} + ${n2}\\cdot${a2} = ${n1 * a1 + n2 * a2}$.`, `Average $= ${n1 * a1 + n2 * a2}/${n1 + n2} \\approx ${w.toFixed(2)}$, i.e. ${fmt(round(w, 1))}.`],
      trap: 'Averaging the two averages.',
      hints: H('Compute total points, not average of averages.', 'Total = count × average for each group.', `Group 1 total: ${n1 * a1}.`),
    };
  },
});

// ===================== Profit, loss & percent applications =====================
const markup: Generator = gen({
  id: W('money.markup'), unit: 'wp.money', subtopic: 'Markup and discount', levels: [2, 3, 4, 5],
  skills: ['markup', 'discount', 'profit percent'], concepts: ['Profit and loss', 'Markup and discount'],
  generate(rng, level) {
    const cost = rng.pick([20, 40, 50, 60, 80, 120, 160, 200, 240]);
    const m = rng.pick([20, 25, 40, 50, 60, 75, 100]), d = rng.pick([10, 20, 25, 30, 40]);
    const list = cost * (1 + m / 100), sale = list * (1 - d / 100);
    const profit = sale - cost, pp = (profit / cost) * 100;
    if (level === 2) {
      return {
        format: 'numeric', stem: `A store buys a lamp for ${money(cost)} and marks the price up ${m}%. During a sale, the lamp is sold at ${d}% off the marked price. What is the sale price, in dollars?`, answer: numAns(round(sale, 2)), unitLabel: 'dollars',
        explanation: [`Marked price: $${cost}\\times${fmt(1 + m / 100)} = ${fmt(list)}$.`, `Sale price: $${fmt(list)}\\times${fmt(1 - d / 100)} = ${fmt(sale)}$.`],
        trap: `Netting the percents (${m}% − ${d}%) — the discount applies to the marked price.`,
        hints: H('Apply the markup first.', 'The discount is a percent of the marked price.', `Marked price: ${money(list)}.`),
      };
    }
    if (level === 3) {
      return {
        format: 'mcq', stem: `A retailer marks up an item ${m}% above cost and then sells it at a ${d}% discount from the marked price. The retailer's profit, as a percent of cost, is`,
        ...numMcq(round(pp, 4), [{ v: m - d, note: 'Subtracted the percents directly.' }, round(pp + 5, 4), round((profit / sale) * 100, 2), m], { render: (n) => `$${fmt(n, 2)}\\%$` }),
        explanation: [`Use cost $= 100$: marked $= ${100 + m}$, sale $= ${100 + m}\\times${fmt(1 - d / 100)} = ${fmt((100 + m) * (1 - d / 100))}$.`, `Profit $= ${fmt((100 + m) * (1 - d / 100) - 100)}$ on a cost of 100 → ${fmt(pp, 2)}%.`],
        trap: 'Subtracting the discount percent from the markup percent.',
        hints: H('Assume the cost is \\$100.', 'Apply markup then discount as multipliers.', `$100 \\to ${100 + m} \\to ?$`),
      };
    }
    if (level === 4) {
      // find cost given selling price and profit %
      const p = rng.pick([20, 25, 30, 50]);
      const c = rng.pick([40, 60, 80, 120, 200]);
      const s = c * (1 + p / 100);
      return {
        format: 'numeric', stem: `A dealer sold a bicycle for ${money(s)}, making a profit of ${p}% of the cost. If the dealer had sold it for ${money(s - c * 0.1)}, what would the profit have been as a percent of cost?`, answer: numAns(p - 10),
        explanation: [`Cost $= ${fmt(s)}/${fmt(1 + p / 100)} = ${fmt(c)}$.`, `New profit $= ${fmt(s - c * 0.1)} - ${fmt(c)} = ${fmt(s - c * 0.1 - c)}$, i.e. $${fmt(s - c * 0.1 - c)}/${fmt(c)} = ${p - 10}\\%$.`],
        trap: 'Computing the profit percent relative to the selling price.',
        hints: H('Recover the cost first.', `Selling price = cost × ${fmt(1 + p / 100)}.`, `Cost = ${money(c)}.`),
      };
    }
    // level 5: break-even quantity / two discounts vs single
    const d1 = rng.pick([10, 20, 25]), d2 = rng.pick([10, 15, 20]);
    return qcNumeric({
      given: `Store P offers a ${d1}% discount followed by an additional ${d2}% off the reduced price. Store Q offers a single discount of ${d1 + d2}%. Both start from the same list price.`,
      a: 'Final price at store P', b: 'Final price at store Q', va: (1 - d1 / 100) * (1 - d2 / 100), vb: 1 - (d1 + d2) / 100,
      proof: [`P: $(1 - ${d1 / 100})(1 - ${d2 / 100}) = ${fmt((1 - d1 / 100) * (1 - d2 / 100))}$ of list. Q: $${fmt(1 - (d1 + d2) / 100)}$ of list.`, `Successive discounts total only $${d1} + ${d2} - ${fmt((d1 * d2) / 100)} = ${fmt(d1 + d2 - (d1 * d2) / 100)}\\%$.`],
      trap: 'Assuming successive discounts add.',
      hints: H('Translate discounts into multipliers.', 'The second discount applies to a smaller base.', 'Compare the two multipliers.'),
    });
  },
});

const commission: Generator = gen({
  id: W('money.commission'), unit: 'wp.money', subtopic: 'Tax and commission', levels: [1, 2, 3],
  skills: ['percent of a total', 'break-even equations'], concepts: ['Percentage applications', 'Tax and commission'],
  generate(rng, level) {
    if (level === 1) {
      const price = rng.pick([40, 60, 80, 120, 150]), tax = rng.pick([5, 6, 8, 10]), tip = rng.pick([15, 18, 20]);
      const total = price * (1 + tax / 100) + price * (tip / 100);
      return {
        format: 'numeric', stem: `A dinner costs ${money(price)} before tax. Sales tax is ${tax}% of the price, and a ${tip}% tip is calculated on the pre-tax price. What is the total paid, in dollars?`, answer: numAns(round(total, 2)), unitLabel: 'dollars',
        explanation: [`Tax: ${money(price * tax / 100, 2)}; tip: ${money(price * tip / 100, 2)}.`, `Total: $${price} + ${fmt(price * tax / 100)} + ${fmt(price * tip / 100)} = ${fmt(total)}$.`],
        trap: 'Computing the tip on the post-tax amount when the problem says pre-tax.',
        hints: H('Compute each percent of the base price.', 'Both percents use the same base here.', `${tax}% of ${price} = ${fmt(price * tax / 100)}.`),
      };
    }
    const base1 = rng.pick([300, 400, 500, 600]), r1 = rng.pick([5, 8, 10]), base2 = base1 + rng.pick([100, 200, 300]), r2 = rng.pick([2, 4].filter((x) => x < r1));
    // base1 + r1% S = base2 + r2% S  -> S = (base2 - base1)/((r1-r2)/100)
    const S = (base2 - base1) / ((r1 - r2) / 100);
    return {
      format: 'numeric', stem: `Plan A pays ${money(base1)} per week plus ${r1}% commission on sales. Plan B pays ${money(base2)} per week plus ${r2}% commission on sales. For what weekly sales total, in dollars, do the two plans pay the same amount?`, answer: numAns(S), unitLabel: 'dollars',
      explanation: [`$${base1} + ${r1 / 100}S = ${base2} + ${r2 / 100}S$.`, `$${(r1 - r2) / 100}S = ${base2 - base1} \\Rightarrow S = ${tnum(S)}$.`],
      trap: 'Using percents as whole numbers (e.g. 8 instead of 0.08).',
      hints: H('Write each plan’s pay as a function of sales S.', 'Set the two expressions equal.', `$${base1} + ${r1 / 100}S = ${base2} + ${r2 / 100}S$.`),
    };
  },
});

// ===================== Interest =====================
const simpleInterest: Generator = gen({
  id: W('int.simple'), unit: 'wp.interest', subtopic: 'Simple interest', levels: [1, 2, 3],
  skills: ['I = Prt'], concepts: ['Simple interest'],
  generate(rng, level) {
    const P = rng.pick([500, 800, 1000, 1200, 2000, 2500, 5000]), r = rng.pick([2, 3, 4, 5, 6, 8]), t = rng.pick([2, 3, 4, 5, 6]);
    const I = (P * r * t) / 100;
    if (level === 3) {
      return {
        format: 'numeric', stem: `An investment earning simple interest grows from ${money(P)} to ${money(P + I)} in ${t} years. What is the annual interest rate, in percent?`, answer: numAns(r), unitLabel: '%',
        explanation: [`Interest earned $= ${fmt(I)}$.`, `$r = \\dfrac{I}{Pt} = \\dfrac{${fmt(I)}}{${fmt(P)}\\cdot${t}} = ${r / 100} = ${r}\\%$.`],
        trap: 'Dividing by the final amount instead of the principal.',
        hints: H('Simple interest: I = Prt.', 'Find I first.', `$I = ${fmt(I)}$.`),
      };
    }
    return {
      format: 'numeric', stem: `How much simple interest, in dollars, does ${money(P)} earn in ${t} years at an annual rate of ${r}%?`, answer: numAns(I), unitLabel: 'dollars',
      explanation: [`$I = Prt = ${fmt(P)}\\times${r / 100}\\times${t} = ${fmt(I)}$.`],
      trap: 'Using the percent as a whole number.',
      hints: H('I = P × r × t.', `r = ${r / 100}.`, `$${fmt(P)} \\times ${r / 100}$ per year.`),
    };
  },
});

const compoundInterest: Generator = gen({
  id: W('int.compound'), unit: 'wp.interest', subtopic: 'Compound interest', levels: [3, 4, 5],
  skills: ['compound growth'], concepts: ['Compound interest', 'Growth and decay'],
  generate(rng, level) {
    const P = rng.pick([1000, 2000, 4000, 5000, 10000]), r = rng.pick([5, 10, 20]), t = rng.pick([2, 3]);
    const A = P * (1 + r / 100) ** t;
    if (level === 5) {
      const n = rng.pick([2, 4]);
      const rr = rng.pick([4, 8]);
      return qcNumeric({
        given: `${money(P)} is invested for 1 year at an annual interest rate of ${rr}%.`,
        a: `Value if interest is compounded ${n === 2 ? 'semiannually' : 'quarterly'}`, b: 'Value if interest is compounded annually', va: P * (1 + rr / 100 / n) ** n, vb: P * (1 + rr / 100),
        proof: [`${n === 2 ? 'Semiannual' : 'Quarterly'}: $${fmt(P)}(1 + ${rr / 100 / n})^{${n}} \\approx ${fmt(P * (1 + rr / 100 / n) ** n, 2)}$.`, `Annual: $${fmt(P)}(1.${String(rr).padStart(2, '0')}) = ${fmt(P * (1 + rr / 100))}$.`, 'More frequent compounding earns interest on interest sooner.'],
        trap: 'Assuming the compounding frequency does not matter if the annual rate is the same.',
        hints: H('Compounding n times uses rate r/n each period.', 'Interest earned early also earns interest.', `Compute $(1 + ${rr / 100 / n})^${n}$.`),
      });
    }
    if (level === 4) {
      const simple = P * (1 + (r * t) / 100);
      return {
        format: 'numeric', stem: `${money(P)} is invested for ${t} years at ${r}% annual interest. How many dollars more does it earn with interest compounded annually than with simple interest?`, answer: numAns(round(A - simple, 2)), unitLabel: 'dollars',
        explanation: [`Compound: $${fmt(P)}(${fmt(1 + r / 100)})^{${t}} = ${fmt(A)}$.`, `Simple: $${fmt(P)}(1 + ${(r * t) / 100}) = ${fmt(simple)}$.`, `Difference: ${fmt(A - simple)}.`],
        trap: 'Computing compound interest as r × t, which is simple interest.',
        hints: H('Compute both final values.', 'Compound: P(1 + r)^t. Simple: P(1 + rt).', `Compound value: ${money(A, 2)}.`),
      };
    }
    return {
      format: 'mcq', stem: `${money(P)} is deposited in an account that pays ${r}% interest compounded annually. What is the balance after ${t} years?`,
      ...numMcq(round(A, 2), [{ v: P * (1 + (r * t) / 100), note: 'That is simple interest.' }, round(A + (P * r) / 100, 2), P * (1 + r / 100), round(A - (P * r) / 200, 2)], { render: (n) => `$${money(n, Number.isInteger(round(n, 2)) ? 0 : 2)}$` }),
      explanation: [`$A = P(1 + r)^t = ${fmt(P)}(${fmt(1 + r / 100)})^{${t}} = ${fmt(A)}$.`],
      trap: 'Using simple interest.',
      hints: H('Each year multiply by the growth factor.', `Growth factor: ${fmt(1 + r / 100)}.`, `After year 1: ${money(P * (1 + r / 100))}.`),
    };
  },
});

export const WORD: Generator[] = [age, translate, tickets, workCombined, workPartial, avgSpeed, meeting, drt, mixture, weightedAvg, markup, commission, simpleInterest, compoundInterest];
void NAMES;
