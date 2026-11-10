import type { Lesson } from './types';

export const WORD_LESSONS: Lesson[] = [
  {
    unit: 'wp.translation',
    intro: 'Most word problems are easy algebra hidden in English. The hard part is translation: turning phrases into precise expressions without reversing an order or dropping a condition.',
    concepts: [
      { title: 'Translation dictionary', body: '“is” → $=$; “of” → $\\times$; “per” → $\\div$; “more than” → $+$; “less than” → subtraction in reverse order: “5 less than $x$” is $x - 5$.' },
      { title: 'Age problems', body: 'Define current ages with variables. “$t$ years ago” subtracts $t$ from **every** age; the difference between two ages never changes.' },
      { title: 'Ratio applications', body: 'Turn ratios into multiples of $k$, then use the extra fact (a total, a difference, a change) to find $k$.' },
      { title: 'Multi-step structure', body: 'Identify the unknowns, write one equation per independent fact, and check that the final answer is what was asked (often not the first variable you solve for).' },
    ],
    formulas: [{ label: 'Age shift', tex: '(\\text{age} - t)\\ \\text{or}\\ (\\text{age} + t)\\ \\text{for everyone}' }, { label: 'Ratio', tex: 'a:b \\Rightarrow ak,\\ bk' }],
    rules: ['Write down what each variable means, with units.', 'Re-read the question sentence before answering.', 'Check that answers make sense (no negative people, fractional tickets).'],
    examples: [
      { problem: 'Ana is 4 times as old as Ben. In 6 years she will be twice as old. How old is Ben?', steps: ['Ana $= 4b$.', '$4b + 6 = 2(b + 6) \\Rightarrow 2b = 6$.'], answer: '$b = 3$' },
      { problem: 'Adult tickets cost \\$12 and child tickets \\$7. 50 tickets brought in \\$480. How many adult tickets?', steps: ['If all 50 were child tickets: \\$350.', 'Each adult ticket adds \\$5: $(480 - 350)/5 = 26$.'], answer: '$26$' },
    ],
    mistakes: ['Writing “7 less than $x$” as $7 - x$.', 'Applying a time shift to only one person’s age.', 'Answering for the wrong variable.'],
    strategies: ['Backsolve when choices are numbers — word problems are ideal for it.', 'Use the “all one type” trick for two-category totals.', 'Underline the question being asked.'],
  },
  {
    unit: 'wp.work',
    intro: 'Work problems are rate problems where the “distance” is one job. Add rates, never times.',
    concepts: [
      { title: 'Rates', body: 'Someone who finishes a job in $a$ hours works at $\\frac1a$ job per hour.' },
      { title: 'Combined work', body: 'Working together, rates add: $\\frac1a + \\frac1b = \\frac1T$, so $T = \\frac{ab}{a + b}$. Together is always faster than the faster worker alone.' },
      { title: 'Partial work', body: 'Work done = rate × time. Subtract work already completed, then divide the remainder by the new combined rate.' },
      { title: 'Opposing rates', body: 'A drain works against a fill pipe: net rate = fill − drain.' },
    ],
    formulas: [{ label: 'Combined time', tex: 'T = \\dfrac{ab}{a + b}' }, { label: 'Work', tex: 'W = rt' }, { label: 'Net rate', tex: '\\dfrac1a - \\dfrac1d' }],
    rules: ['Never average or add times.', 'Answer must be less than the fastest individual time when helping each other.', 'Identical workers: time ∝ 1 / number of workers.'],
    examples: [
      { problem: 'Pipes fill a tank in 6 and 12 hours. Together?', steps: ['$\\frac16 + \\frac1{12} = \\frac3{12} = \\frac14$.'], answer: '4 hours' },
      { problem: 'A fills a pool in 8 h, a drain empties it in 12 h. Both open: time to fill?', steps: ['Net $\\frac18 - \\frac1{12} = \\frac1{24}$.'], answer: '24 hours' },
    ],
    mistakes: ['Averaging the times.', 'Ignoring work already completed.', 'Adding a drain’s rate.'],
    strategies: ['Pick the job size as the LCM of the times (e.g. 24 units) to work in whole numbers.', 'Use $\\frac{ab}{a+b}$ for two workers.', 'Sanity-check against the fastest worker.'],
  },
  {
    unit: 'wp.distance',
    intro: 'Distance = rate × time. Most traps are average speed (it is not the average of speeds) and relative motion.',
    concepts: [
      { title: 'Core relation', body: '$d = rt$. Keep units consistent (minutes vs hours).' },
      { title: 'Average speed', body: 'Total distance ÷ total time. For equal distances at $v_1$ and $v_2$: $\\frac{2v_1v_2}{v_1 + v_2}$, always below the simple average.' },
      { title: 'Toward each other', body: 'The gap closes at $v_1 + v_2$.' },
      { title: 'Same direction', body: 'The gap closes at $|v_1 - v_2|$; compute the head start first.' },
    ],
    formulas: [{ label: 'DRT', tex: 'd = rt' }, { label: 'Average speed', tex: '\\bar v = \\dfrac{d_{total}}{t_{total}}' }, { label: 'Round trip', tex: '\\dfrac{2v_1v_2}{v_1 + v_2}' }],
    rules: ['Time spent at the slower speed is longer, so it dominates the average.', 'Convert minutes to hours by dividing by 60.', 'Draw a line diagram for meeting/catch-up problems.'],
    examples: [
      { problem: 'A trip out at 40 mph and back at 60 mph. Average speed?', steps: ['$\\frac{2\\cdot40\\cdot60}{100} = 48$.'], answer: '48 mph' },
      { problem: 'Two cars 210 miles apart drive toward each other at 30 and 40 mph. When do they meet?', steps: ['Closing speed 70.', '$210/70 = 3$.'], answer: '3 hours' },
    ],
    mistakes: ['Averaging speeds.', 'Adding speeds for same-direction motion.', 'Mixing minutes and hours.'],
    strategies: ['Pick a convenient distance (LCM of the speeds).', 'Use a table: rate | time | distance for each leg.', 'Estimate to eliminate impossible choices.'],
  },
  {
    unit: 'wp.mixtures',
    intro: 'Mixtures and weighted averages are the same idea: a combined value is pulled toward the larger group. Track the pure quantity (salt, acid, total points).',
    concepts: [
      { title: 'Pure-amount balance', body: 'Amount of solute before mixing = after: $c_1V_1 + c_2V_2 = c(V_1 + V_2)$.' },
      { title: 'Weighted average', body: '$\\bar x = \\frac{n_1\\bar x_1 + n_2\\bar x_2}{n_1 + n_2}$. The average lies between the group means, closer to the bigger group.' },
      { title: 'Alligation (balance)', body: 'Distances from the target are inversely proportional to the amounts: $\\frac{V_1}{V_2} = \\frac{c_2 - c}{c - c_1}$.' },
      { title: 'Replacement', body: 'Draining a fraction $f$ of a solution and replacing with water keeps $(1 - f)$ of the solute each round.' },
    ],
    formulas: [{ label: 'Mixture', tex: 'c_1V_1 + c_2V_2 = c(V_1 + V_2)' }, { label: 'Alligation', tex: '\\dfrac{V_1}{V_2} = \\dfrac{c_2 - c}{c - c_1}' }, { label: 'Replacement', tex: 'c_n = c_0(1 - f)^n' }],
    rules: ['Never average percentages without weights.', 'The mixture concentration must lie between the ingredients.', 'Equal amounts give the simple average.'],
    examples: [
      { problem: 'How many liters of 50% acid must be added to 30 L of 20% acid to make 30% acid?', steps: ['Alligation: distances 10 and 20 → $V_1:V_2 = 20:10$.', 'So 30 L of 20% pairs with 15 L of 50%.'], answer: '15 L' },
      { problem: '20 students average 70 and 30 average 80. Overall?', steps: ['$(1400 + 2400)/50 = 76$.'], answer: '$76$' },
    ],
    mistakes: ['Averaging concentrations directly.', 'Forgetting the second replacement removes less solute.', 'Using group means as if they had equal sizes.'],
    strategies: ['Use the balance (alligation) method — it is faster than algebra.', 'Check the answer lies between the components.', 'Pick smart volumes like 100 L for percentage problems.'],
  },
  {
    unit: 'wp.money',
    intro: 'Profit, markup and discount problems are percent problems with a story. Use multipliers and always identify the base: cost, list price, or sale price.',
    concepts: [
      { title: 'Markup', body: 'Marked price = cost × $(1 + m)$. Markup percent is relative to **cost**.' },
      { title: 'Discount', body: 'Sale price = marked price × $(1 - d)$. Discounts are relative to the price they are applied to.' },
      { title: 'Profit', body: 'Profit = revenue − cost; profit percent = profit ÷ cost × 100 (unless stated otherwise).' },
      { title: 'Successive discounts', body: '20% off then 10% off is $0.8 \\times 0.9 = 0.72$: a 28% total discount, not 30%.' },
      { title: 'Commission & break-even', body: 'Set two pay plans equal: base₁ + r₁S = base₂ + r₂S.' },
    ],
    formulas: [{ label: 'Sale price', tex: 'C(1 + m)(1 - d)' }, { label: 'Profit %', tex: '\\dfrac{R - C}{C}\\times100' }, { label: 'Break-even', tex: 'S = \\dfrac{b_2 - b_1}{r_1 - r_2}' }],
    rules: ['Identify the base of every percent.', 'Successive discounts multiply.', 'Tax is usually applied to the post-discount price.'],
    examples: [
      { problem: 'Cost \\$80, marked up 50%, sold at 20% off. Profit percent?', steps: ['$80 \\to 120 \\to 96$.', 'Profit 16 on 80 = 20%.'], answer: '20%' },
      { problem: 'Plan A: \\$400 + 8%; Plan B: \\$600 + 4%. Equal at what sales?', steps: ['$0.04S = 200$.'], answer: '\\$5,000' },
    ],
    mistakes: ['Subtracting discount % from markup %.', 'Computing profit percent relative to the selling price.', 'Adding successive discounts.'],
    strategies: ['Start with a cost of \\$100.', 'Chain multipliers.', 'Backsolve break-even questions from the choices.'],
  },
  {
    unit: 'wp.interest',
    intro: 'Simple interest grows linearly; compound interest grows multiplicatively. The GRE tests the difference and the effect of compounding frequency.',
    concepts: [
      { title: 'Simple interest', body: '$I = Prt$ with $r$ as a decimal and $t$ in years. The interest is the same every year.' },
      { title: 'Compound interest', body: '$A = P(1 + r)^t$ annually, or $P(1 + \\frac rn)^{nt}$ for $n$ compoundings per year.' },
      { title: 'Compare', body: 'For $t > 1$, compound beats simple at the same rate; more frequent compounding gives slightly more.' },
      { title: 'Growth/decay', body: 'Population growth of $r\\%$ per period multiplies by $(1 + r)$; depreciation by $(1 - r)$.' },
    ],
    formulas: [{ label: 'Simple', tex: 'A = P(1 + rt)' }, { label: 'Compound', tex: 'A = P\\left(1 + \\tfrac rn\\right)^{nt}' }],
    rules: ['Convert percentages to decimals.', 'Semiannual: $n = 2$; quarterly: $n = 4$.', 'Ask whether the question wants the interest or the final amount.'],
    examples: [
      { problem: '\\$2,000 at 10% compounded annually for 2 years?', steps: ['$2000 \\cdot 1.1^2 = 2420$.'], answer: '\\$2,420' },
      { problem: 'Same with simple interest — how much less?', steps: ['Simple: $2000(1.2) = 2400$.', 'Difference \\$20.'], answer: '\\$20' },
    ],
    mistakes: ['Using simple interest when compounding is stated.', 'Forgetting to divide the rate by $n$.', 'Reporting the total amount when interest was asked.'],
    strategies: ['For 2–3 years, compute step by step instead of using exponents.', 'In QC, recognize more frequent compounding is larger without computing.', 'Estimate with $(1 + r)^t \\approx 1 + rt + \\binom t2 r^2$.'],
  },
];
