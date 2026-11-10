import { Frac } from '../../lib/math';
import type { GenOutput } from '../types';
import { relIndex, relOf, relText, type Rel } from './helpers';

export type Vals = Record<string, number>;
export interface VarSpec { name: string; kind: 'real' | 'int' }

// Candidate values ordered from simplest to most exotic, so the first witness found is a clean example.
const REAL_POOL = [0, 1, -1, 2, -2, 0.5, -0.5, 3, -3, 1 / 3, -1 / 3, 4, -4, 1.5, -1.5, 0.25, -0.25, 5, -5, 10, -10, 0.1, -0.1, 100, -100, 2 / 3, -2 / 3, 7, 0.9, 6, 8, 12, 15, 20, 30, 50, -8];
const INT_POOL = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, -8, 9, 10, -10, 11, 12, 15, 20, -20, 25, 30, 50, 100, -100];

export function valTex(v: number): string {
  if (Number.isInteger(v)) return `${v}`;
  for (let d = 2; d <= 12; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-12) return new Frac(n, d).tex();
  }
  return `${v}`;
}
const numTex = (v: number): string => {
  if (!Number.isFinite(v)) return '\\text{undefined}';
  if (Number.isInteger(Math.round(v * 1e9) / 1e9)) return `${Math.round(v)}`;
  for (let d = 2; d <= 400; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) return new Frac(n, d).tex();
  }
  return `\\approx ${v.toFixed(3)}`;
};

export interface QcAnalysis { rel: Rel; witness: Partial<Record<'A' | 'B' | 'C', { vals: Vals; a: number; b: number }>>; samples: number }

/** Exhaustively test the candidate pools (respecting constraints) and classify the relationship. */
export function analyzeQc(vars: VarSpec[], constraint: (v: Vals) => boolean, fA: (v: Vals) => number, fB: (v: Vals) => number, extra: Vals[] = []): QcAnalysis {
  const witness: QcAnalysis['witness'] = {};
  let samples = 0;
  for (const vals of extra) {
    if (!constraint(vals)) continue;
    const a = fA(vals), b = fB(vals);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    samples++;
    const rel = relOf(a, b) as 'A' | 'B' | 'C';
    if (!witness[rel]) witness[rel] = { vals, a, b };
  }
  const pools = vars.map((v) => (v.kind === 'int' ? INT_POOL : REAL_POOL));
  const total = pools.reduce((a, p) => a * p.length, 1);
  const cap = Math.min(total, 40000);
  for (let idx = 0; idx < cap; idx++) {
    const vals: Vals = {};
    let r = idx;
    for (let j = 0; j < vars.length; j++) {
      const p = pools[j];
      vals[vars[j].name] = p[r % p.length];
      r = Math.floor(r / p.length);
    }
    if (!constraint(vals)) continue;
    const a = fA(vals), b = fB(vals);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    samples++;
    const rel = relOf(a, b) as 'A' | 'B' | 'C';
    if (!witness[rel]) witness[rel] = { vals, a, b };
  }
  if (samples === 0) throw new Error('QC template has no admissible samples');
  const kinds = Object.keys(witness) as ('A' | 'B' | 'C')[];
  const rel: Rel = kinds.length === 1 ? kinds[0] : 'D';
  return { rel, witness, samples };
}

export const assignTex = (vals: Vals) => Object.entries(vals).map(([k, v]) => `${k} = ${valTex(v)}`).join(', ');

export interface QcSpec {
  given?: string;
  a: string;
  b: string;
  vars: VarSpec[];
  constraint?: (v: Vals) => boolean;
  fA: (v: Vals) => number;
  fB: (v: Vals) => number;
  /** Reasoning shown when the relationship is determinate. Required for A/B/C answers. */
  proof?: string[];
  /** Expected relationship; if set and analysis disagrees, generation throws (caught by validator). */
  expect?: Rel;
  trap: string;
  hints: [string, string, string];
  intro?: string;
  altMethod?: string;
  /** Boundary / special cases that must be tested in addition to the generic pools. */
  extra?: Vals[];
}

/** Produce a full QC GenOutput from a spec. */
export function qcOutput(spec: QcSpec): GenOutput {
  const constraint = spec.constraint ?? (() => true);
  const an = analyzeQc(spec.vars, constraint, spec.fA, spec.fB, spec.extra);
  if (spec.expect && spec.expect !== an.rel) throw new Error(`QC expectation mismatch: expected ${spec.expect}, got ${an.rel} for ${spec.a} vs ${spec.b}`);
  const explanation: string[] = [];
  if (spec.intro) explanation.push(spec.intro);
  if (an.rel === 'D') {
    const ws = (['A', 'B', 'C'] as const).filter((k) => an.witness[k]);
    for (const k of ws) {
      const w = an.witness[k]!;
      const relSym = k === 'A' ? '>' : k === 'B' ? '<' : '=';
      explanation.push(
        spec.vars.length
          ? `Test $${assignTex(w.vals)}$: Quantity A $= ${numTex(w.a)}$ and Quantity B $= ${numTex(w.b)}$, so A $${relSym}$ B.`
          : `Quantity A $= ${numTex(w.a)}$, Quantity B $= ${numTex(w.b)}$.`,
      );
    }
    explanation.push('Different values allowed by the given information produce different relationships, so the answer is **(D)**.');
  } else {
    if (!spec.proof || spec.proof.length === 0) throw new Error(`QC determinate answer requires a proof (${spec.a} vs ${spec.b})`);
    explanation.push(...spec.proof);
    explanation.push(`Therefore ${relText[an.rel]} for every value allowed — answer **(${an.rel})**.`);
  }
  const qcSample = spec.vars.length
    ? undefined
    : undefined;
  return {
    format: 'qc',
    stem: spec.given ? '' : '',
    qc: { given: spec.given, a: spec.a, b: spec.b },
    answer: relIndex[an.rel],
    explanation,
    trap: spec.trap,
    hints: spec.hints,
    altMethod: spec.altMethod,
    qcSample,
  };
}

/** Numeric QC (no variables): relation computed directly. */
export function qcNumeric(spec: Omit<QcSpec, 'vars' | 'fA' | 'fB' | 'constraint'> & { va: number; vb: number }): GenOutput {
  const rel = relOf(spec.va, spec.vb);
  if (spec.expect && spec.expect !== rel) throw new Error(`QC numeric mismatch ${spec.a} vs ${spec.b}`);
  return {
    format: 'qc',
    stem: '',
    qc: { given: spec.given, a: spec.a, b: spec.b },
    answer: relIndex[rel],
    explanation: [...(spec.proof ?? []), `So ${relText[rel]} — answer **(${rel})**.`],
    trap: spec.trap,
    hints: spec.hints,
    altMethod: spec.altMethod,
  };
}
