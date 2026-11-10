import type { Lesson } from './types';

export const STRATEGY_LESSONS: Lesson[] = [
  {
    unit: 'st.qc',
    intro: 'Quantitative Comparison makes up roughly a third of GRE Quant. You do not need the exact value of either quantity — only their relationship. The four choices are fixed: (A) A greater, (B) B greater, (C) equal, (D) cannot be determined.',
    concepts: [
      { title: 'Treat it like an inequality', body: 'You may add or subtract the same thing from both quantities, and multiply or divide both by a **positive** number. Simplify until the comparison is obvious.' },
      { title: 'ZONEF case testing', body: 'When variables appear, test **Z**ero, **O**ne, **N**egatives, **E**xtremes (very large or tiny) and **F**ractions between 0 and 1 — but only values the conditions allow.' },
      { title: 'What one example proves', body: 'A single substitution can only rule choices out. If two allowed values give different relationships, the answer is (D). To choose (A), (B) or (C) you need reasoning that covers every allowed value.' },
      { title: 'Hidden constraints', body: 'Counts are non-negative integers, lengths are positive, $\\sqrt x \\ge 0$, triangle sides obey the triangle inequality, percents of a whole are at most 100.' },
      { title: 'No variables, no (D)', body: 'If both quantities are fixed numbers, the relationship is determined — (D) is impossible.' },
    ],
    formulas: [{ label: 'For 0 < x < 1', tex: 'x^3 < x^2 < x < \\sqrt x' }, { label: 'For x > 1', tex: '\\sqrt x < x < x^2 < x^3' }, { label: 'For x < 0', tex: 'x^3 < 0 < x^2' }],
    rules: ['Never multiply or divide both sides by a variable of unknown sign.', 'If a quantity can equal the other and also differ, the answer is (D).', 'Ignore information that does not affect the comparison (but read it carefully first).'],
    examples: [
      { problem: 'Given $x \\ne 0$. Quantity A: $x^3$. Quantity B: $x^2$.', steps: ['$x = 2$: A = 8 > 4 = B.', '$x = -1$: A = −1 < 1 = B.'], answer: '(D)' },
      { problem: 'Given $0 < x < y$. Quantity A: $\\frac{x+1}{y+1}$. Quantity B: $\\frac xy$.', steps: ['Cross-multiply (positive denominators): $y(x+1) = xy + y$ vs $x(y+1) = xy + x$.', '$y > x$, so A is greater for every allowed pair.'], answer: '(A)' },
    ],
    mistakes: ['Choosing (A) after testing only $x = 2$.', 'Dividing both sides by $x$ without knowing its sign.', 'Picking (D) for two numeric quantities.'],
    strategies: ['Simplify first, test cases second, compute last.', 'After a “nice” test, deliberately try a value designed to break the pattern.', 'Budget about 60–75 seconds per QC; they are usually faster than other questions.'],
  },
  {
    unit: 'st.plugin',
    intro: 'Three techniques turn algebra into arithmetic: plugging in numbers for variables, backsolving from answer choices, and choosing smart numbers for unknown totals.',
    concepts: [
      { title: 'Plugging in', body: 'When answer choices contain variables, pick simple distinct values (avoid 0, 1 and numbers already in the problem), compute the target, then evaluate every choice. If two match, pick new numbers.' },
      { title: 'Backsolving', body: 'When choices are numbers and the question asks for a single value, test the choices in the conditions. Choices are listed in increasing order: start in the middle, and the result tells you whether to go up or down.' },
      { title: 'Smart numbers', body: 'For percents use 100; for fractions use a common multiple of the denominators; for rates use the LCM of times. The answer does not depend on your choice.' },
      { title: 'Working backward', body: 'For multi-step processes ending at a known value, undo each step in reverse order.' },
    ],
    formulas: [{ label: 'Smart total', tex: 'T = \\operatorname{lcm}(\\text{denominators})' }],
    rules: ['Test every choice when plugging in.', 'Do not use 0 or 1 — they make many expressions coincide.', 'Backsolving works best when the setup is harder than the check.'],
    examples: [
      { problem: 'A car travels $m$ miles in $h$ hours. Miles in $t$ minutes?', steps: ['Let $m = 120$, $h = 2$, $t = 30$: target 30 miles.', 'Only $\\frac{mt}{60h} = 30$.'], answer: '$\\frac{mt}{60h}$' },
      { problem: 'A number added to the numerator and denominator of $\\frac37$ gives $\\frac23$. The number?', steps: ['Try 5: $\\frac{8}{12} = \\frac23$ ✓.'], answer: '$5$' },
    ],
    mistakes: ['Stopping at the first matching choice when plugging in.', 'Picking numbers that violate the problem’s constraints.', 'Backsolving without using the ordering of choices.'],
    strategies: ['Recognize triggers: variables in choices → plug in; numbers in choices → backsolve; “fraction/percent of an unknown” → smart number.', 'Write your chosen numbers down so you can recheck.', 'Combine with estimation to skip impossible choices.'],
  },
  {
    unit: 'st.traps',
    intro: 'High scorers are not faster calculators — they avoid traps, spot patterns, and refuse unnecessary computation.',
    concepts: [
      { title: 'Classic traps', body: 'Averaging rates, adding percents, percentage points vs percent, “less than” order reversal, forgetting a negative root, assuming figures are to scale, answering the wrong quantity.' },
      { title: 'Patterns', body: 'Telescoping sums ($\\frac1{k(k+1)} = \\frac1k - \\frac1{k+1}$), pairing terms, cycles in units digits and recursive sequences, sum of first $n$ odd numbers $= n^2$.' },
      { title: 'Symmetry', body: 'When roles are interchangeable (heads/tails, two identical people), outcomes split equally. Products with a fixed sum are maximized when the factors are equal.' },
      { title: 'Avoiding computation', body: 'Use given products, factor before multiplying, compare to benchmarks, and estimate when choices are far apart.' },
      { title: 'Elimination', body: 'Cross off choices that are impossible by sign, size, units or parity before working the problem.' },
    ],
    formulas: [{ label: 'Telescoping', tex: '\\sum_{k=1}^{n} \\dfrac{1}{k(k+1)} = 1 - \\dfrac{1}{n+1}' }, { label: 'Odd sum', tex: '1 + 3 + \\cdots + (2n - 1) = n^2' }, { label: 'Fixed-sum product', tex: 'x + y = s \\Rightarrow xy \\le (s/2)^2' }],
    rules: ['If an answer appears instantly on a hard question, re-read for a trap.', 'Re-read the question stem before selecting.', 'Units and signs are the cheapest checks.'],
    examples: [
      { problem: 'A rate rises from 5% to 6%. Percent increase?', steps: ['Change is 1 point on a base of 5.'], answer: '20%' },
      { problem: 'Compute $\\frac{1}{1\\cdot2} + \\frac{1}{2\\cdot3} + \\dots + \\frac{1}{9\\cdot10}$.', steps: ['Telescopes to $1 - \\frac1{10}$.'], answer: '$\\frac{9}{10}$' },
    ],
    mistakes: ['Rushing the last step of a correct setup.', 'Brute-forcing a pattern question.', 'Trusting a diagram’s appearance.'],
    strategies: ['Spend the first 10 seconds deciding the approach.', 'Keep a personal trap list from the Wrong Answer Lab.', 'Use the review screen in exams to revisit marked trap-prone questions.'],
  },
];
