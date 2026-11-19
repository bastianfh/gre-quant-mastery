import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useStore } from '../store/store';
import { useDerived } from '../store/hooks';
import { planForDay } from '../engine/plan';
import { dayKey, daysBetween } from '../engine/gamification';

// Blocks with no automatic completion signal can be ticked by hand (same rule as the Study Plan page).
const MANUAL = new Set(['lesson', 'formulas', 'review', 'boss', 'daily']);

export function useTodayPlan() {
  const s = useStore();
  const d = useDerived();
  const today = dayKey();
  const lastMock = s.exams.filter((e) => e.kind === 'mock').slice(-1)[0];
  const plan = planForDay(s.profile, d.unitMastery, d.due.length, today, lastMock ? daysBetween(dayKey(lastMock.finishedAt), today) : null);
  return { plan, done: s.daily[today]?.planDone ?? {} };
}

/** Today's plan as an interactive checklist. */
export function TodayTraining({ compact }: { compact?: boolean }) {
  const markPlanBlock = useStore((s) => s.markPlanBlock);
  const { plan, done } = useTodayPlan();
  const finished = plan.blocks.filter((b) => done[b.id]).length;
  const minutes = plan.blocks.reduce((a, b) => a + b.minutes, 0);
  return (
    <section className="training" aria-label="Today's training">
      <div className="rail-title"><span>Today's training · Day {plan.day}/{plan.total}</span><Link to="/plan">Plan</Link></div>
      <div className="training-meta"><span className="num">{finished}/{plan.blocks.length} done</span><span>≈ {minutes} min · {plan.phase}</span></div>
      <div className="training-bar" aria-hidden><i style={{ width: `${(finished / Math.max(1, plan.blocks.length)) * 100}%` }} /></div>
      <ul className="checklist">
        {plan.blocks.map((b) => {
          const isDone = !!done[b.id];
          return (
            <li key={b.id} className={`check-item${isDone ? ' done' : ''}`}>
              {isDone ? <CheckCircle2 size={17} className="check-icon ok" aria-label="Done" />
                : MANUAL.has(b.kind) ? <button className="check-btn" onClick={() => markPlanBlock(b.id)} aria-label={`Mark "${b.title}" done`}><Circle size={17} /></button>
                : <Circle size={17} className="check-icon" aria-label="Not done yet" />}
              <Link to={b.to} className="check-link">
                <span className="check-title">{b.title}</span>
                {!compact && <span className="check-detail">{b.detail}</span>}
              </Link>
              <span className="check-mins num">{b.minutes}m</span>
              {!isDone && <ArrowRight size={13} className="muted" aria-hidden />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
