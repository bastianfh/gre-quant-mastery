import { useMemo, useState } from 'react';
import { CalendarCheck, Play } from 'lucide-react';
import { pickQuestions } from '../engine/selection';
import { targetLevel, DEFAULT_RATING } from '../engine/adaptive';
import { hashString } from '../lib/rng';
import { addDays, dayKey, XP_EVENTS } from '../engine/gamification';
import type { Level, Question } from '../engine/types';
import { SessionRunner, type SessionSummary } from '../components/SessionRunner';
import { Card, PageHead, Stat } from '../components/ui';
import { Bars } from '../components/LazyCharts';
import { useStore } from '../store/store';
import { usePickCtx, useDerived } from '../store/hooks';
import { UNIT_BY_ID } from '../content/curriculum';
import { SectionTabs, PRACTICE_TABS } from '../components/SectionTabs';

export const dailyScore = (s: SessionSummary, totalSec: number) => {
  const pts = s.rows.reduce((a, r) => a + (r.correct ? r.q.level * 10 : 0), 0);
  const timeBonus = Math.max(0, Math.round((totalSec - s.timeMs / 1000) / 6));
  return pts + (s.correct ? timeBonus : 0);
};

export default function Daily() {
  const s = useStore();
  const ctx = usePickCtx();
  const d = useDerived();
  const today = dayKey();
  const [go, setGo] = useState(false);
  const sessions = s.sessions.filter((x) => x.mode === 'daily');
  const byDay = new Map<string, number>();
  for (const x of sessions) { const k = dayKey(x.ts); byDay.set(k, Math.max(byDay.get(k) ?? 0, x.score ?? 0)); }
  const todayScore = byDay.get(today);
  let streak = 0; for (let k = byDay.has(today) ? today : addDays(today, -1); byDay.has(k); k = addDays(k, -1)) streak++;
  const history = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((k) => ({ day: k.slice(5), Score: byDay.get(k) ?? 0 }));
  const prev = [...byDay.entries()].filter(([k]) => k !== today).map(([, v]) => v);
  const prevAvg = prev.length ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length) : null;

  const questions = useMemo<Question[]>(() => {
    const seed = hashString('daily' + today);
    const t = targetLevel(s.profile.ratings._global ?? DEFAULT_RATING);
    const lv = (k: number) => Math.max(1, Math.min(5, t + k)) as Level;
    const weak = d.weakUnits.slice(0, 4).map((w) => w.unit);
    const a = pickQuestions({ levels: [lv(-1)] }, 4, ctx, { seed, adaptive: false });
    const b = pickQuestions({ levels: [lv(0)], units: weak.length >= 2 ? weak : undefined }, 4, { ...ctx, recent: [...ctx.recent, ...a.map((q) => q.id)] }, { seed: seed + 1, adaptive: false });
    const c = pickQuestions({ levels: [lv(1), Math.min(5, lv(1) + 1) as Level] }, 4, { ...ctx, recent: [...ctx.recent, ...a.map((q) => q.id), ...b.map((q) => q.id)] }, { seed: seed + 2, adaptive: false });
    return [...a, ...b, ...c.sort((x, y) => x.level - y.level)];
  }, [go]); // eslint-disable-line
  const totalSec = questions.reduce((a, q) => a + Math.round(q.timeSec * 0.9), 0);

  if (go) {
    return <SessionRunner mode="daily" title={`Daily challenge · ${today}`} questions={questions} totalSec={totalSec} feedback="immediate" resumeKey={'daily-' + today}
      scoreLabel={(x) => { const sc = dailyScore(x, totalSec); return { score: sc, label: `${sc} points`, sub: prevAvg !== null ? `${sc >= prevAvg ? '▲' : '▼'} ${Math.abs(sc - prevAvg)} vs your average of ${prevAvg}` : 'First daily challenge — your baseline.' }; }}
      xpBonus={() => (todayScore === undefined ? XP_EVENTS.dailyChallenge : 10)} onExit={() => setGo(false)} />;
  }

  return (
    <div className="fade-in">
      <SectionTabs tabs={PRACTICE_TABS} label="Practice modes" />
      <PageHead title="Daily Challenge" sub="12 fresh questions each day: mixed topics, rising difficulty, weighted toward your weak areas, under time pressure." />
      <div className="grid g4">
        <Stat label="Today" value={todayScore !== undefined ? `${todayScore} pts` : 'Not played'} sub={todayScore !== undefined ? 'Replay to practise; best score counts' : `${Math.round(totalSec / 60)} min time limit`} />
        <Stat label="Challenge streak" value={`${streak}d`} sub="consecutive days completed" />
        <Stat label="Your average" value={prevAvg ?? '—'} sub={`${byDay.size} day(s) played`} />
        <Stat label="Personal best" value={byDay.size ? Math.max(...byDay.values()) : '—'} />
      </div>
      <div className="grid g3 mt16">
        <Card title="Today's lineup" className="span2">
          <div className="col" style={{ gap: 0 }}>
            {questions.map((q, i) => <div key={q.id} className="list-row small"><span className="mono muted" style={{ width: 20 }}>{i + 1}</span><span className="grow">{UNIT_BY_ID[q.unit].name}</span><span className="pill">L{q.level}</span></div>)}
          </div>
          <div className="row mt16"><button className="btn primary lg" onClick={() => setGo(true)} data-testid="start-daily"><Play size={16} /> {todayScore !== undefined ? 'Replay' : 'Start challenge'}</button><span className="small muted">Scoring: 10 × difficulty per correct answer + time bonus.</span></div>
        </Card>
        <Card title="Last 14 days" action={<CalendarCheck size={14} className="muted" />}>
          <Bars data={history} x="day" y="Score" name="Score" height={220} />
        </Card>
      </div>
    </div>
  );
}
