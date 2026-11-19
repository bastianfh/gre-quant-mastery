import { RNG, hashString } from '../lib/rng';
import { UNIT_BY_ID } from '../content/curriculum';
import { ALL_GENERATORS } from './generators';
import type { Generator, Level, Question } from './types';
import { timeFor } from './generators/helpers';
import { validateQuestion } from './validate';

export const GEN_BY_ID: Record<string, Generator> = Object.fromEntries(ALL_GENERATORS.map((g) => [g.id, g]));

/** Seeds per (generator, level) in the fixed bank. */
export const BANK_SEEDS = 3;

const seedFor = (gid: string, level: number, seed: number) => (hashString(gid) ^ Math.imul(level, 0x9e3779b1) ^ Math.imul(seed + 1, 0x85ebca6b)) >>> 0;

/** Deterministically build a question. Throws on generator errors. */
export function makeQuestion(g: Generator, level: Level, seed: number, source: Question['source'] = 'bank'): Question {
  const rng = new RNG(seedFor(g.setOf?.base ?? g.id, level, seed));
  const out = g.generate(rng, level);
  const unit = UNIT_BY_ID[g.unit];
  if (!unit) throw new Error(`unknown unit ${g.unit}`);
  const { qcSample, ...rest } = out;
  void qcSample;
  const q: Question = {
    ...rest,
    id: `${g.id}~${level}~${seed}`,
    generatorId: g.id,
    seed,
    category: unit.category,
    unit: g.unit,
    subtopic: out.subtopic ?? g.subtopic,
    level,
    di: out.di ?? false,
    timeSec: out.timeSec ?? timeFor(level, out.format === 'qc' ? 0.75 : out.di ? 1.15 : 1),
    skills: out.skills ?? g.skills,
    concepts: out.concepts ?? g.concepts,
    source,
    ...(g.setOf ? { setId: `${g.setOf.base}~${level}~${seed}`, setIndex: g.setOf.index, setSize: g.setOf.size } : {}),
  };
  return q;
}

export function parseQid(id: string): { gid: string; level: Level; seed: number } | null {
  const parts = id.split('~');
  if (parts.length !== 3) return null;
  const level = Number(parts[1]) as Level, seed = Number(parts[2]);
  if (!GEN_BY_ID[parts[0]] || !(level >= 1 && level <= 5) || !Number.isFinite(seed)) return null;
  return { gid: parts[0], level, seed };
}

const cache = new Map<string, Question>();
/** Rebuild any question (bank or variant) from its id. */
export function getQuestion(id: string): Question | null {
  if (cache.has(id)) return cache.get(id)!;
  const p = parseQid(id);
  if (!p) return extraQuestions.get(id) ?? null;
  try {
    const q = makeQuestion(GEN_BY_ID[p.gid], p.level, p.seed, p.seed >= 1000 ? 'variant' : 'bank');
    cache.set(id, q);
    return q;
  } catch {
    return null;
  }
}

/** AI-generated (verified) questions registered at runtime. */
export const extraQuestions = new Map<string, Question>();
export function registerExtra(q: Question) { extraQuestions.set(q.id, q); }

export interface BankBuild { questions: Question[]; errors: { id: string; error: string }[] }

/** Build the fixed bank: every generator × level × seed, de-duplicated and validated. */
export function buildBank(seeds = BANK_SEEDS): BankBuild {
  const questions: Question[] = [];
  const errors: BankBuild['errors'] = [];
  const seen = new Set<string>();
  for (const g of ALL_GENERATORS) {
    for (const level of g.levels) {
      let made = 0;
      for (let seed = 0; made < seeds && seed < seeds * 4; seed++) {
        const id = `${g.id}~${level}~${seed}`;
        try {
          const q = makeQuestion(g, level, seed);
          const sig = q.stem + '|' + (q.qc ? q.qc.a + q.qc.b + (q.qc.given ?? '') : '') + '|' + (q.choices ?? []).join();
          if (seen.has(sig)) continue;
          const errs = validateQuestion(q);
          if (errs.length) { errors.push({ id, error: errs.join('; ') }); continue; }
          seen.add(sig);
          cache.set(q.id, q);
          questions.push(q);
          made++;
        } catch (e) {
          errors.push({ id, error: String((e as Error).message ?? e) });
        }
      }
    }
  }
  return { questions, errors };
}

let _bank: Question[] | null = null;
export function getBank(): Question[] {
  if (!_bank) _bank = buildBank().questions;
  return _bank;
}

/** Fresh variation of a generator (new seed, never in the fixed bank). */
export function makeVariant(gid: string, level: Level, avoid: Set<string> = new Set(), rand: () => number = Math.random): Question | null {
  const g = GEN_BY_ID[gid];
  if (!g) return null;
  const lv = g.levels.includes(level) ? level : g.levels.reduce((a, b) => (Math.abs(b - level) < Math.abs(a - level) ? b : a));
  for (let i = 0; i < 12; i++) {
    const seed = 1000 + Math.floor(rand() * 1e9);
    const id = `${g.id}~${lv}~${seed}`;
    if (avoid.has(id)) continue;
    try {
      const q = makeQuestion(g, lv, seed, 'variant');
      if (validateQuestion(q).length) continue;
      cache.set(q.id, q);
      return q;
    } catch {
      /* try another seed */
    }
  }
  return null;
}
