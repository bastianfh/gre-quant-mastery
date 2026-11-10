import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gauge, Play } from 'lucide-react';
import { pickQuestions } from '../engine/selection';
import { quadrant, QUADRANT_ADVICE } from '../engine/adaptive';
import { XP_EVENTS } from '../engine/gamification';
import { SessionRunner } from '../components/SessionRunner';
import { Card, PageHead, Seg, pctStr } from '../components/ui';
import { Bars } from '../components/Charts';
import { useStore } from '../store/store';
import { usePickCtx, useDerived } from '../store/hooks';
import type { Level } from '../engine/types';

const LIMITS = [30, 45, 60, 90, 120];
const LEVELS_FOR: Record<number, Level[]> = { 30: [1, 2], 45: [1, 2, 3], 60: [2, 3], 90: [3, 4], 120: [4, 5] };

const DECISION = [
  { when: 'Answer choices are far apart (factors of 10, or spread > 20%)', do: 'Estimate. Round aggressively and pick the closest choice.' },
  { when: 'Choices are numbers and the problem is a “find the value” word problem', do: 'Backsolve. Start with the middle choice; the order tells you which way to move.' },
  { when: 'Choices contain variables', do: 'Plug in simple, distinct numbers (avoid 0 and 1), then test every choice.' },
  { when: 'Two or more choices can be ruled out by sign, parity, or size', do: 'Eliminate first — then compute only what separates the rest.' },
  { when: 'Exact arithmetic with ugly numbers that the answer truly depends on', do: 'Calculate — set up first, then use the calculator only for the final arithmetic.' },
  { when: 'Quantitative Comparison', do: 'Simplify both sides like an inequality; test edge cases before computing anything big.' },
];

export default function Speed() {
  const [sp] = useSearchParams();
  const s = useStore();
  const ctx = usePickCtx();
  const d = useDerived();
  const [limit, setLimit] = useState(60);
  const [go, setGo] = useState(0);
  const speedAttempts = s.attempts.filter((a) => a.mode === 'speed');
  const per = LIMITS.map((l) => { const xs = speedAttempts.filter((a) => a.timeLimitSec === l && !a.skipped); return { limit: `${l}s`, n: xs.length, Accuracy: xs.length ? Math.round((xs.filter((a) => a.correct).length / xs.length) * 100) : 0 }; });
  // progressive pressure: suggest the next tighter limit once accuracy ≥ 80% on 10+ items
  const suggested = [...LIMITS].reverse().find((l) => { const r = per.find((p) => p.limit === `${l}s`)!; return r.n >= 10 && r.Accuracy >= 80; });
  const next = suggested ? LIMITS[Math.max(0, LIMITS.indexOf(suggested) - 1)] : 120;
  const quad = quadrant(s.attempts.filter((a) => a.timeLimitSec || a.mode === 'practice').slice(-60));
  const questions = useMemo(() => (go ? pickQuestions({ levels: LEVELS_FOR[limit], maxTimeSec: limit }, 10, ctx, { adaptive: false }) : []), [go]); // eslint-disable-line

  if (go) return <SessionRunner key={go} mode="speed" title={`Speed drill · ${limit}s per question`} questions={questions} perQuestionSec={limit} feedback="immediate" allowHints={false} planBlock={sp.get('block') ?? undefined}
    xpBonus={(x) => (x.correct >= 7 ? XP_EVENTS.speedDrill : 10)}
    extraSummary={(x) => { const acc = x.correct / Math.max(1, x.rows.filter((r) => !r.skipped).length); const timedOut = x.rows.filter((r) => r.timedOut).length; return <div className="callout mt16"><div className="t">Drill readout</div>{timedOut} question(s) ran out of time. {acc >= 0.8 ? `Strong accuracy at ${limit}s — try ${LIMITS[Math.max(0, LIMITS.indexOf(limit) - 1)]}s next.` : acc < 0.5 ? 'Accuracy dropped under pressure — step back to a longer limit; speed without accuracy costs points.' : 'Solid — repeat this limit until accuracy is 80%+.'}</div>; }}
    onExit={() => setGo(0)} />;

  return (
    <div className="fade-in">
      <PageHead title="Speed Training" sub="Timed drills that build pace without sacrificing accuracy. Questions auto-submit when time runs out." />
      <div className="grid g3">
        <Card title="Start a drill" className="span2">
          <Seg value={limit} onChange={setLimit} options={LIMITS.map((l) => ({ v: l, label: `${l} sec` }))} />
          <p className="small muted mt8">Difficulty is matched to the limit ({LIMITS.map((l) => `${l}s → L${LEVELS_FOR[l].join('–')}`).join(' · ')}). Suggested next limit: <b>{next}s</b> (move tighter once you hold 80% on 10+ questions).</p>
          <button className="btn primary lg mt8" onClick={() => setGo(Date.now())} data-testid="start-speed"><Play size={16} /> Start 10-question drill</button>
        </Card>
        <Card title="Your speed profile" action={<Gauge size={14} className="muted" />}>
          <b>{QUADRANT_ADVICE[quad.q].title}</b>
          {quad.q !== 'insufficient' && <div className="small muted mt8 mono">accuracy {pctStr(quad.accuracy)} · time used {pctStr(quad.timeRatio)} of target</div>}
          <p className="small ink2 mt8">{QUADRANT_ADVICE[quad.q].advice}</p>
        </Card>
      </div>
      <div className="grid g2 mt16">
        <Card title="Accuracy by time limit">
          {speedAttempts.length === 0 ? <div className="small muted">Complete a drill to see accuracy at each limit.</div> : <><Bars data={per} x="limit" y="Accuracy" name="Accuracy %" fmt={(v) => `${v}%`} yDomain={[0, 100]} /><div className="tiny muted mono">{per.map((p) => `${p.limit}: ${p.n} q`).join(' · ')}</div></>}
        </Card>
        <Card title="Calculate, estimate, backsolve, or eliminate?">
          <table className="data"><tbody>{DECISION.map((r) => <tr key={r.when}><td className="small ink2" style={{ width: '50%' }}>{r.when}</td><td className="small"><b>{r.do}</b></td></tr>)}</tbody></table>
        </Card>
      </div>
      <div className="tiny muted mt16">Time analytics across all modes live in Analytics → Time. Average solving time overall: {d.totals.n ? Math.round(d.totals.avgTimeSec) + 's' : '—'}.</div>
    </div>
  );
}
