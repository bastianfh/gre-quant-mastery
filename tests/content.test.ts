import katex from 'katex';
import { UNITS } from '../src/content/curriculum';
import { LESSONS, ALL_LESSONS } from '../src/content/lessons';
import { FORMULAS } from '../src/content/formulas';
import { parseMarkup } from '../src/lib/markup';

const compile = (src: string, where: string, bad: string[]) => {
  for (const s of parseMarkup(src)) if (s.t !== 'text') { try { katex.renderToString(s.v, { throwOnError: true }); } catch (e) { bad.push(`${where}: ${s.v} — ${(e as Error).message.slice(0, 60)}`); } }
  if (((src.replace(/\\\$/g, '').match(/\$/g) ?? []).length) % 2) bad.push(`${where}: unbalanced $`);
};

describe('curriculum content', () => {
  it('every curriculum unit has a complete lesson', () => {
    for (const u of UNITS) {
      const l = LESSONS[u.id];
      expect(l, u.id).toBeTruthy();
      expect(l.concepts.length, u.id).toBeGreaterThanOrEqual(3);
      expect(l.formulas.length, u.id).toBeGreaterThanOrEqual(1);
      expect(l.examples.length, u.id).toBeGreaterThanOrEqual(2);
      expect(l.mistakes.length, u.id).toBeGreaterThanOrEqual(3);
      expect(l.strategies.length, u.id).toBeGreaterThanOrEqual(3);
    }
    expect(ALL_LESSONS.length).toBe(UNITS.length);
  });
  it('all lesson and formula math compiles', () => {
    const bad: string[] = [];
    for (const l of ALL_LESSONS) {
      const texts = [l.intro, ...l.concepts.map((c) => c.body), ...l.rules, ...l.mistakes, ...l.strategies, ...l.examples.flatMap((e) => [e.problem, e.answer, ...e.steps])];
      texts.forEach((t, i) => compile(t, `${l.unit}#${i}`, bad));
      l.formulas.forEach((f) => compile(`$${f.tex}$`, `${l.unit}:${f.label}`, bad));
    }
    for (const s of FORMULAS) for (const f of s.items) compile(`$${f.tex}$`, `formula:${f.id}`, bad);
    if (bad.length) console.log(bad);
    expect(bad).toEqual([]);
  });
});
