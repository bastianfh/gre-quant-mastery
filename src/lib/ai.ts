// Client for the optional AI service (server/index.mjs). The app is fully functional without it.
import type { Question } from '../engine/types';
import { plainText } from './markup';
import { answerText } from '../engine/grading';

export interface AiStatus { available: boolean; model?: string; reason?: string }
let statusPromise: Promise<AiStatus> | null = null;

export function aiStatus(force = false): Promise<AiStatus> {
  if (!statusPromise || force) {
    statusPromise = fetch('/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((j) => ({ available: !!j.ai, model: j.model, reason: j.ai ? undefined : j.reason ?? 'Server running without ANTHROPIC_API_KEY.' }))
      .catch(() => ({ available: false, reason: 'AI server not reachable (static/offline mode).' }));
  }
  return statusPromise;
}

export function questionContext(q: Question, revealed: boolean): string {
  const parts = [`Topic: ${q.subtopic} (${q.unit}), difficulty ${q.level}/5, format ${q.format}${q.di ? ' (data interpretation)' : ''}.`];
  if (q.qc) parts.push(`Quantitative Comparison.${q.qc.given ? ' Given: ' + plainText(q.qc.given) : ''} Quantity A: ${plainText(q.qc.a)}. Quantity B: ${plainText(q.qc.b)}. Choices: A greater / B greater / equal / cannot be determined.`);
  if (q.stem) parts.push(`Question: ${plainText(q.stem)}`);
  if (q.choices) parts.push('Choices: ' + q.choices.map((c, i) => `(${'ABCDEFGH'[i]}) ${plainText(c)}`).join('  '));
  if (q.diagram) parts.push(`A figure/chart accompanies the question: ${JSON.stringify(q.diagram).slice(0, 1500)}`);
  if (revealed) {
    parts.push(`Correct answer: ${plainText(answerText(q))}`);
    parts.push('Reference solution: ' + q.explanation.map(plainText).join(' '));
  }
  return parts.join('\n');
}

export async function askTutor(body: { context: string; messages: { role: 'user' | 'assistant'; content: string }[]; skill: string; revealed: boolean }): Promise<string> {
  const r = await fetch('/api/tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Tutor error ${r.status}`);
  return j.text as string;
}

export async function generateAiQuestion(body: { unit: string; unitName: string; level: number; format: string }): Promise<{ question?: Question; rejected?: string[] }> {
  const r = await fetch('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Generator error ${r.status}`);
  return j;
}
