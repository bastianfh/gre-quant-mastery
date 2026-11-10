import type { NumericAnswer, Question, UserAnswer } from './types';

/** Parse a numeric-entry string: integers, decimals, negatives, commas, and a/b fractions. */
export function parseNumeric(input: string): number | null {
  const s = input.replace(/\s+/g, '').replace(/,/g, '').replace(/−/g, '-');
  if (!s) return null;
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const d = Number(frac[2]);
    if (d === 0) return null;
    return Number(frac[1]) / d;
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export function numericValue(a: NumericAnswer): number {
  return a.kind === 'number' ? a.value : a.num / a.den;
}

export function isCorrect(q: Question, ans: UserAnswer): boolean {
  if (ans === null || ans === undefined) return false;
  switch (q.format) {
    case 'qc':
    case 'mcq':
      return typeof ans === 'number' && ans === q.answer;
    case 'multi': {
      if (!Array.isArray(ans)) return false;
      const want = [...(q.answer as number[])].sort((a, b) => a - b);
      const got = [...new Set(ans)].sort((a, b) => a - b);
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case 'numeric': {
      if (typeof ans !== 'string') return false;
      const v = parseNumeric(ans);
      if (v === null) return false;
      const a = q.answer as NumericAnswer;
      const target = numericValue(a);
      const tol = a.kind === 'number' && a.tolerance !== undefined ? a.tolerance : 1e-6 * Math.max(1, Math.abs(target));
      return Math.abs(v - target) <= tol;
    }
  }
}

/** Human readable correct answer (markup). */
export function answerText(q: Question): string {
  const L = 'ABCDEFGH';
  switch (q.format) {
    case 'qc': return `(${L[q.answer as number]})`;
    case 'mcq': return `(${L[q.answer as number]}) ${q.choices![q.answer as number]}`;
    case 'multi': return (q.answer as number[]).map((i) => `(${L[i]}) ${q.choices![i]}`).join(', ');
    case 'numeric': {
      const a = q.answer as NumericAnswer;
      if (a.kind === 'fraction') return `$\\dfrac{${a.num}}{${a.den}}$${a.den !== 1 ? ` (or any equivalent fraction)` : ''}`;
      const v = Number.isInteger(a.value) ? String(a.value) : String(Math.round(a.value * 1e6) / 1e6);
      return `$${v}$${q.unitLabel ? ` ${q.unitLabel}` : ''}`;
    }
  }
}

export function userAnswerText(q: Question, ans: UserAnswer): string {
  const L = 'ABCDEFGH';
  if (ans === null || ans === undefined || (Array.isArray(ans) && ans.length === 0) || ans === '') return 'No answer';
  if (q.format === 'numeric') return String(ans);
  if (Array.isArray(ans)) return ans.map((i) => `(${L[i]})`).join(', ');
  return `(${L[ans as number]})`;
}

/** Diagnose why a wrong answer was chosen, using generator-provided distractor notes. */
export function diagnose(q: Question, ans: UserAnswer): string[] {
  const notes: string[] = [];
  if (q.distractorNotes) {
    if (typeof ans === 'number' && q.distractorNotes[ans]) notes.push(q.distractorNotes[ans]);
    if (Array.isArray(ans)) {
      const want = new Set(q.answer as number[]);
      for (const i of ans) if (!want.has(i) && q.distractorNotes[i]) notes.push(`Choice ${'ABCDEFGH'[i]}: ${q.distractorNotes[i]}`);
      for (const i of want) if (!ans.includes(i)) notes.push(`You missed choice ${'ABCDEFGH'[i]}, which is also correct.`);
    }
  }
  if (q.format === 'qc' && typeof ans === 'number') {
    if (ans !== 3 && q.answer === 3) notes.push('You picked a definite relationship, but the given information allows different outcomes. Test zero, negatives, fractions and boundary values before committing.');
    if (ans === 3 && q.answer !== 3) notes.push('You chose (D), but the relationship is actually fixed. Simplify both quantities algebraically to see why every allowed value gives the same result.');
  }
  if (q.format === 'numeric' && typeof ans === 'string') {
    const v = parseNumeric(ans);
    const t = numericValue(q.answer as NumericAnswer);
    if (v === null) notes.push('Your entry could not be read as a number. Use digits, a decimal point, a minus sign, or a fraction like 3/4.');
    else if (Math.abs(v + t) < 1e-9 && t !== 0) notes.push('Your answer has the right size but the wrong sign.');
    else if (t !== 0 && [10, 100, 0.1, 0.01].some((k) => Math.abs(v - t * k) < 1e-9)) notes.push('Your answer is off by a power of 10 — check decimal placement or a percent conversion.');
  }
  return notes;
}
