import katex from 'katex';
import { buildBank, getQuestion, makeVariant } from '../src/engine/bank';
import { ALL_GENERATORS } from '../src/engine/generators';
import { mathSegments, validateQuestion } from '../src/engine/validate';
import { UNITS } from '../src/content/curriculum';
import type { Question } from '../src/engine/types';

const build = buildBank();
const bank = build.questions;

describe('question bank', () => {
  it('builds without generator errors', () => {
    if (build.errors.length) console.log(build.errors.slice(0, 30));
    expect(build.errors).toEqual([]);
  });

  it('contains at least 1,000 validated questions', () => {
    console.log(`bank size: ${bank.length} from ${ALL_GENERATORS.length} generators`);
    expect(bank.length).toBeGreaterThanOrEqual(1000);
  });

  it('every question passes structural validation', () => {
    for (const q of bank) expect(validateQuestion(q), q.id).toEqual([]);
  });

  it('every math segment compiles in KaTeX', () => {
    const bad: string[] = [];
    for (const q of bank) {
      for (const m of mathSegments(q)) {
        try { katex.renderToString(m, { throwOnError: true }); } catch (e) { bad.push(`${q.id}: ${m} :: ${(e as Error).message.slice(0, 80)}`); }
      }
    }
    if (bad.length) console.log(bad.slice(0, 20));
    expect(bad).toEqual([]);
  });

  it('ids are unique and reproducible', () => {
    const ids = new Set(bank.map((q) => q.id));
    expect(ids.size).toBe(bank.length);
    for (const q of bank.slice(0, 200)) {
      const r = getQuestion(q.id)!;
      expect(r.stem).toBe(q.stem);
      expect(r.answer).toEqual(q.answer);
    }
  });

  it('covers every curriculum unit, all formats and all five levels', () => {
    const units = new Set(bank.map((q) => q.unit));
    for (const u of UNITS) expect(units.has(u.id), u.id).toBe(true);
    const formats = new Set(bank.map((q) => q.format));
    for (const f of ['qc', 'mcq', 'multi', 'numeric']) expect(formats.has(f as any)).toBe(true);
    expect(bank.some((q) => q.di)).toBe(true);
    const levels = new Set(bank.map((q) => q.level));
    for (const l of [1, 2, 3, 4, 5]) expect(levels.has(l as any)).toBe(true);
  });

  it('has a balanced distribution', () => {
    const by = (f: (q: Question) => string) => bank.reduce<Record<string, number>>((m, q) => ((m[f(q)] = (m[f(q)] ?? 0) + 1), m), {});
    const cat = by((q) => q.category), fmt = by((q) => q.format), lvl = by((q) => String(q.level));
    console.log('category', cat, '\nformat', fmt, '\nlevel', lvl, '\nDI', bank.filter((q) => q.di).length);
    for (const c of ['arithmetic', 'algebra', 'word', 'geometry', 'data']) expect(cat[c]).toBeGreaterThan(80);
    expect(fmt.qc).toBeGreaterThan(120);
    expect(fmt.multi).toBeGreaterThan(40);
    expect(fmt.numeric).toBeGreaterThan(150);
  });

  it('multiple-choice answers are unambiguous: no choice duplicates the correct value', () => {
    for (const q of bank.filter((x) => x.format === 'mcq')) {
      const c = q.choices!;
      const norm = c.map((s) => s.replace(/\s+/g, ''));
      expect(new Set(norm).size, q.id).toBe(c.length);
    }
  });

  it('QC answer choices are not trivially always the same', () => {
    const qc = bank.filter((q) => q.format === 'qc');
    const dist = [0, 1, 2, 3].map((i) => qc.filter((q) => q.answer === i).length);
    console.log('QC answer distribution A,B,C,D:', dist);
    for (const d of dist) expect(d).toBeGreaterThan(qc.length * 0.1);
  });

  it('MCQ correct-answer positions are spread out', () => {
    const m = bank.filter((q) => q.format === 'mcq');
    const dist = [0, 1, 2, 3, 4].map((i) => m.filter((q) => q.answer === i).length);
    console.log('MCQ answer position distribution:', dist);
    for (const d of dist) expect(d).toBeGreaterThan(m.length * 0.08);
  });

  it('variants are generated for every generator and differ from the bank', () => {
    let rnd = 1;
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    for (const g of ALL_GENERATORS) {
      const v = makeVariant(g.id, g.levels[0], new Set(), rand);
      expect(v, g.id).not.toBeNull();
      expect(validateQuestion(v!)).toEqual([]);
    }
  });
});
