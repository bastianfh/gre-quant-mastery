import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { DRILL_KINDS, drillStream, drillXp, parseNumber } from '../src/engine/drills';
import { parseMarkup } from '../src/lib/markup';

const canon = (a: string) => a.replace(/°$/, '').replace(/ \(≈\)$/, '');

describe('mental-math drills', () => {
  it('parses typed numbers', () => {
    expect(parseNumber('1,024')).toBe(1024);
    expect(parseNumber('12.5%')).toBe(12.5);
    expect(parseNumber('3/8')).toBe(0.375);
    expect(parseNumber('-3/4')).toBe(-0.75);
    expect(parseNumber('1 1/2')).toBe(1.5);
    expect(parseNumber('.5')).toBe(0.5);
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('1/0')).toBeNull();
  });

  for (const k of DRILL_KINDS) {
    it(`${k.id}: answers check, wrong answers fail, prompts render`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const next = drillStream(k.id, seed);
        const seen: string[] = [];
        for (let i = 0; i < 30; i++) {
          const it = next();
          expect(it.check(canon(it.answer)), `${it.prompt} → ${it.answer}`).toBe(true);
          if (it.answer === 'yes' || it.answer === 'no') {
            expect(it.check(it.answer === 'yes' ? 'n' : 'y')).toBe(false);
            const n = Number(it.prompt.match(/\$([\d{,}]+)\$/)![1].replace(/\{,\}/g, ''));
            const d = Number(it.prompt.match(/by \$(\d+)\$/)![1]);
            expect(n % d === 0).toBe(it.answer === 'yes');
          } else if (/\//.test(it.answer)) {
            const [a, b] = it.answer.split('/').map(Number);
            expect(it.check(`${a * 2}/${b * 2}`)).toBe(false); // must be lowest terms
          } else {
            const v = parseNumber(canon(it.answer))!;
            expect(it.check(String(v + 1))).toBe(false);
          }
          for (const seg of parseMarkup(it.prompt)) if (seg.t !== 'text') katex.renderToString(seg.v, { throwOnError: true });
          expect(it.prompt).not.toMatch(/undefined|NaN/);
          seen.push(it.prompt);
        }
        // no immediate repeats
        for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
      }
    });
  }

  it('is reproducible for a seed', () => {
    const a = drillStream('mixed', 7), b = drillStream('mixed', 7);
    for (let i = 0; i < 20; i++) expect(a().prompt).toBe(b().prompt);
  });

  it('xp is bounded', () => {
    expect(drillXp(0, 0)).toBe(0);
    expect(drillXp(10, 3)).toBe(10);
    expect(drillXp(10, 8)).toBe(5);
    expect(drillXp(80, 0)).toBe(30);
    expect(drillXp(1, 20)).toBe(0);
  });
});
