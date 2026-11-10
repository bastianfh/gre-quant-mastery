import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { planForDay, PHASES } from '../engine/plan';
import { addDays, dayKey, daysBetween } from '../engine/gamification';
import { Card, PageHead } from '../components/ui';
import { useStore } from '../store/store';
import { useDerived } from '../store/hooks';

export default function Plan() {
  const s = useStore();
  const d = useDerived();
  const today = dayKey();
  const lastMock = s.exams.filter((e) => e.kind === 'mock').slice(-1)[0];
  const todayPlan = planForDay(s.profile, d.unitMastery, d.due.length, today, lastMock ? daysBetween(dayKey(lastMock.finishedAt), today) : null);
  const total = todayPlan.total;
  const done = s.daily[today]?.planDone ?? {};
  const weeks = [1, 2, 3, 4] as const;
  const dayWeek = (n: number) => { const f = n / total; return f <= 0.25 ? 1 : f <= 0.5 ? 2 : f <= 0.8 ? 3 : 4; };
  return (
    <div className="fade-in">
      <PageHead title="Personalized study plan" sub={`Day ${todayPlan.day} of ${total} · exam ${s.profile.examDate} · ~${s.profile.dailyMinutes} min/day. The plan re-optimizes every day from your mastery data, review backlog and recent simulations.`}>
        <Link className="btn" to="/settings">Change exam date / daily time</Link>
      </PageHead>
      <div className="grid g4">
        {weeks.map((w) => (
          <Card key={w} title={`Week ${w}`} style={{ borderColor: todayPlan.week === w ? 'var(--accent)' : undefined }}>
            <b>{PHASES[w].name}</b>
            <div className="small muted mt8">{PHASES[w].focus}</div>
            <div className="tiny muted mt8 mono">days {Array.from({ length: total }, (_, i) => i + 1).filter((n) => dayWeek(n) === w).slice(0, 1)[0]}–{Array.from({ length: total }, (_, i) => i + 1).filter((n) => dayWeek(n) === w).slice(-1)[0]}</div>
          </Card>
        ))}
      </div>
      <Card className="mt16" title={`Today · Day ${todayPlan.day} · ${todayPlan.phase}`}>
        <div className="col" style={{ gap: 6 }}>
          {todayPlan.blocks.map((b) => (
            <Link key={b.id} to={b.to} className={`plan-block ${done[b.id] ? 'done' : ''}`} style={{ color: 'inherit' }}>
              {done[b.id] ? <CheckCircle2 size={16} color="var(--good)" /> : <Circle size={16} className="muted" />}
              <span className="mins">{b.minutes} min</span>
              <span className="grow"><b className="small">{b.title}</b><div className="tiny muted">{b.detail}</div></span>
              {!done[b.id] && (b.kind === 'lesson' || b.kind === 'formulas' || b.kind === 'review' || b.kind === 'boss' || b.kind === 'daily') && <button className="btn sm ghost" onClick={(e) => { e.preventDefault(); s.markPlanBlock(b.id); }}>Mark done</button>}
            </Link>
          ))}
        </div>
        <div className="tiny muted mt8">Practice, timed, QC and speed blocks tick automatically when you finish them from here. Weak topics come from your mastery scores; topics at 75%+ skip the lesson step so time goes where it's needed.</div>
      </Card>
      <Card className="mt16" title="Upcoming days (projected from today's data)">
        <div className="grid g3">
          {[1, 2, 3].map((k) => { const dp = planForDay(s.profile, d.unitMastery, 0, addDays(today, k), lastMock ? daysBetween(dayKey(lastMock.finishedAt), addDays(today, k)) : null); return (
            <div key={k} className="card tight" style={{ background: 'var(--surface-2)' }}>
              <div className="upper">Day {dp.day} · {dp.phase}</div>
              {dp.blocks.map((b) => <div key={b.id} className="small mt8 row" style={{ gap: 8 }}><span className="mono muted" style={{ width: 40 }}>{b.minutes}m</span>{b.title}</div>)}
            </div>
          ); })}
        </div>
      </Card>
    </div>
  );
}
