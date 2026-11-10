import type { Question } from './types';
import { parseMarkup } from '../lib/markup';

/** Structural + consistency validation. Returns a list of problems (empty = valid). */
export function validateQuestion(q: Question): string[] {
  const errs: string[] = [];
  const texts: string[] = [q.stem, ...(q.choices ?? []), ...q.explanation, q.trap, ...q.hints, q.altMethod ?? '', q.qc?.a ?? '', q.qc?.b ?? '', q.qc?.given ?? '', ...Object.values(q.distractorNotes ?? {})];
  for (const t of texts) {
    if (/\bNaN\b|\[object Object\]|Infinity|(=|:|\(|\{)\s*undefined|undefined\s*(\}|\))/.test(t)) errs.push(`bad token in text: ${t.slice(0, 80)}`);
    for (const seg of parseMarkup(t)) if (seg.t !== 'text' && /undefined|NaN|Infinity/.test(seg.v) && !/\\text\{undefined\}/.test(seg.v)) errs.push(`bad token in math: ${seg.v.slice(0, 60)}`);
    const dollars = (t.replace(/\\\$/g, '').match(/\$/g) ?? []).length;
    if (dollars % 2 !== 0) errs.push(`unbalanced $ in: ${t.slice(0, 80)}`);
  }
  if (!q.explanation.length) errs.push('missing explanation');
  if (q.hints.length !== 3 || q.hints.some((h) => !h)) errs.push('need 3 hints');
  if (!q.trap) errs.push('missing trap');
  switch (q.format) {
    case 'qc':
      if (!q.qc || !q.qc.a || !q.qc.b) errs.push('qc quantities missing');
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) errs.push('qc answer out of range');
      break;
    case 'mcq': {
      const c = q.choices ?? [];
      if (c.length < 4 || c.length > 5) errs.push(`mcq needs 4-5 choices, got ${c.length}`);
      if (new Set(c).size !== c.length) errs.push('duplicate choices');
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= c.length) errs.push('mcq answer index invalid');
      break;
    }
    case 'multi': {
      const c = q.choices ?? [];
      if (c.length < 3 || c.length > 8) errs.push(`multi needs 3-8 choices, got ${c.length}`);
      if (new Set(c).size !== c.length) errs.push('duplicate choices');
      if (!Array.isArray(q.answer) || q.answer.length === 0) errs.push('multi needs ≥1 correct');
      else if (q.answer.some((i) => i < 0 || i >= c.length) || new Set(q.answer).size !== q.answer.length) errs.push('multi answer indices invalid');
      break;
    }
    case 'numeric': {
      const a = q.answer as any;
      if (!a || typeof a !== 'object') { errs.push('numeric answer missing'); break; }
      if (a.kind === 'number' && !Number.isFinite(a.value)) errs.push('numeric not finite');
      if (a.kind === 'fraction' && (!Number.isInteger(a.num) || !Number.isInteger(a.den) || a.den === 0)) errs.push('bad fraction');
      if (a.kind === 'number' && Math.abs(a.value) > 1e9) errs.push('numeric too large');
      break;
    }
  }
  if (q.choices) {
    for (const ch of q.choices) if (!ch.trim()) errs.push('empty choice');
  }
  return errs;
}

/** Extract every math segment (for KaTeX compile checks). */
export function mathSegments(q: Question): string[] {
  const texts = [q.stem, ...(q.choices ?? []), ...q.explanation, q.trap, ...q.hints, q.altMethod ?? '', q.qc?.a ?? '', q.qc?.b ?? '', q.qc?.given ?? '', ...Object.values(q.distractorNotes ?? {})];
  return texts.flatMap((t) => parseMarkup(t).filter((s) => s.t !== 'text').map((s) => s.v));
}
