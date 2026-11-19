import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, Scale } from 'lucide-react';
import { pickQuestions } from '../engine/selection';
import { computeMastery } from '../engine/mastery';
import { SessionRunner } from '../components/SessionRunner';
import { BandTag, Card, PageHead, Seg, Stat, fmtTime, pctStr } from '../components/ui';
import { Bars } from '../components/LazyCharts';
import { useStore } from '../store/store';
import { usePickCtx } from '../store/hooks';
import { MAIN_CATEGORIES, CATEGORY_BY_ID } from '../content/curriculum';
import { QC_CHOICES } from '../engine/types';
import { SectionTabs, PRACTICE_TABS } from '../components/SectionTabs';

const RULES = [
  'Treat the two quantities like the sides of an inequality: add, subtract, multiply or divide both by the same thing — but only multiply/divide by quantities known to be positive.',
  'Test ZONEF: Zero, One, Negatives, Extremes (very large/small), Fractions between 0 and 1. Two different results ⇒ (D).',
  'A single substitution never proves A, B or C. It can only disprove them.',
  'If both quantities are pure numbers (no variables), (D) is impossible.',
  'Read hidden constraints: counts are non-negative integers, lengths are positive, √x ≥ 0, a triangle obeys the triangle inequality.',
  'Do not compute what you can compare: factor, cancel common terms, or compare to benchmarks.',
];

export default function QcArena() {
  const [sp] = useSearchParams();
  const s = useStore();
  const ctx = usePickCtx();
  const [go, setGo] = useState(0);
  const [focus, setFocus] = useState<'mixed' | 'edge' | 'hard'>('mixed');
  const qcAt = s.attempts.filter((a) => a.format === 'qc');
  const m = computeMastery(qcAt);
  const answered = qcAt.filter((a) => !a.skipped);
  // how often the user picks (D) vs how often (D) is right — a calibrated QC solver matches the two
  const picks = [0, 1, 2, 3].map((i) => answered.filter((a) => a.answer === i).length);
  const byCat = MAIN_CATEGORIES.map((c) => { const xs = answered.filter((a) => a.category === c); return { cat: CATEGORY_BY_ID[c].short, Accuracy: xs.length ? Math.round((xs.filter((a) => a.correct).length / xs.length) * 100) : 0, n: xs.length }; });
  const questions = useMemo(() => (go ? pickQuestions({ formats: ['qc'], units: focus === 'edge' ? ['st.qc', 'al.inequalities', 'ar.integers'] : undefined, levels: focus === 'hard' ? [4, 5] : undefined }, 12, ctx, { adaptive: focus === 'mixed' }) : []), [go]); // eslint-disable-line

  if (go) return <SessionRunner key={go} mode="qc" title="QC Arena" questions={questions} perQuestionSec={75} feedback="immediate" planBlock={sp.get('block') ?? undefined} xpBonus={(x) => (x.correct >= 9 ? 30 : 10)} onExit={() => setGo(0)} />;

  return (
    <div className="fade-in">
      <SectionTabs tabs={PRACTICE_TABS} label="Practice modes" />
      <PageHead title="Quantitative Comparison Arena" sub="Dedicated training for the GRE's comparison format — tracked separately from other question types." />
      <div className="grid g4">
        <Stat label="QC mastery" value={qcAt.length ? `${m.score}%` : '—'} sub={<BandTag band={m.band} />} />
        <Stat label="QC accuracy" value={answered.length ? pctStr(m.accuracy) : '—'} sub={`${answered.length} answered`} />
        <Stat label="Avg time" value={answered.length ? fmtTime(m.avgTimeSec) : '—'} sub="target ≈ 1:05" />
        <Stat label="(D) usage" value={answered.length ? pctStr(picks[3] / answered.length) : '—'} sub="share of your QC answers that were (D)" />
      </div>
      <div className="grid g3 mt16">
        <Card title="Enter the arena" className="span2">
          <Seg value={focus} onChange={setFocus} options={[{ v: 'mixed', label: 'Adaptive mix' }, { v: 'edge', label: 'Edge cases & constraints' }, { v: 'hard', label: 'Hard / Expert' }]} />
          <p className="small muted mt8">12 questions · 75 seconds each · immediate explanations with concrete counter-examples for every (D).</p>
          <button className="btn primary lg mt8" onClick={() => setGo(Date.now())} data-testid="start-qc"><Play size={16} /> Start</button>
          <div className="upper mt24 mb8">The answer choices</div>
          <ol className="small ink2" type="A" style={{ margin: 0, paddingLeft: 20 }}>{QC_CHOICES.map((c) => <li key={c}>{c}</li>)}</ol>
        </Card>
        <Card title="QC accuracy by topic" action={<Scale size={14} className="muted" />}>
          {answered.length ? <Bars data={byCat} x="cat" y="Accuracy" name="Accuracy %" fmt={(v) => `${v}%`} yDomain={[0, 100]} height={180} /> : <div className="small muted">No QC attempts yet.</div>}
        </Card>
      </div>
      <Card title="Core QC rules" className="mt16">
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>{RULES.map((r) => <li key={r}>{r}</li>)}</ol>
        <div className="small mt8">Full lesson: <Link to="/learn/st.qc">Quantitative Comparison Mastery</Link></div>
      </Card>
    </div>
  );
}
