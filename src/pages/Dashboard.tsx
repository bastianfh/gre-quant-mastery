import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Compass, FlaskConical, Info } from 'lucide-react';
import { useStore } from '../store/store';
import { useDerived } from '../store/hooks';
import { planForDay } from '../engine/plan';
import { CATEGORIES, MAIN_CATEGORIES, UNIT_BY_ID, CATEGORY_BY_ID } from '../content/curriculum';
import { dailyObjectives, dayKey, daysBetween, ACHIEVEMENTS } from '../engine/gamification';
import { BandTag, Card, Progress, fmtTime, pctStr, usePalette } from '../components/ui';
import { LineSeries } from '../components/Charts';

export default function Dashboard() {
  const s = useStore();
  const d = useDerived();
  const nav = useNavigate();
  const P = usePalette();
  const today = dayKey();
  const lastMock = s.exams.filter((e) => e.kind === 'mock').slice(-1)[0];
  const plan = planForDay(s.profile, d.unitMastery, d.due.length, today, lastMock ? daysBetween(dayKey(lastMock.finishedAt), today) : null);
  const log = s.daily[today];
  const doneIds = log?.planDone ?? {};
  const est = d.estimate;
  const target = s.profile.targetScore;
  const daysLeft = Math.max(0, daysBetween(today, s.profile.examDate));
  const weak = d.weakUnits[0];
  const weakToday = weak ? s.attempts.filter((a) => a.unit === weak.unit && dayKey(a.ts) === today && !a.skipped).length : 0;
  const objectives = dailyObjectives(log, s.profile.dailyQuestionGoal, weak ? UNIT_BY_ID[weak.unit].name : null, weakToday);
  const nextBlock = plan.blocks.find((b) => !doneIds[b.id]);
  const rec = !s.profile.diagnosticDone
    ? { title: 'Take the diagnostic exam', why: 'Establishes your baseline so the plan, difficulty and score estimate adapt to you.', to: '/mock?kind=diagnostic', icon: Compass }
    : d.due.length >= 5 ? { title: `Clear ${d.due.length} due reviews`, why: 'Spaced repetition is due — reviewing now prevents repeating the same mistakes on test day.', to: '/lab', icon: FlaskConical }
    : nextBlock ? { title: nextBlock.title, why: nextBlock.detail, to: nextBlock.to, icon: ArrowRight }
    : { title: 'Daily challenge', why: 'Today\'s plan is complete. Bank extra reps with the personalized challenge.', to: '/daily', icon: ArrowRight };
  const recent = d.daily.slice(-14).map((r) => ({ date: r.date.slice(5), Accuracy: Math.round(r.accuracy * 100), Estimate: r.est }));
  const recentAch = Object.entries(s.profile.achievements).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
  const progressToTarget = est.score ? Math.max(0, Math.min(1, (est.score - 130) / (target - 130))) : 0;
  const todayQs = log?.questions ?? 0;
  const overallMastery = Math.round(MAIN_CATEGORIES.reduce((a, c) => a + d.categoryMastery[c].score, 0) / MAIN_CATEGORIES.length);

  return (
    <div className="fade-in">
      <div className="bento" aria-label="Key metrics">
        <div className="bento-card bento-card--warm">
          <div className="bento-label">Estimated score</div>
          <div><span className="bento-value" data-testid="est-score">{est.score ?? '—'}</span>{est.range && <span className="bento-sub"> &nbsp;{est.range[0]}–{est.range[1]}</span>}</div>
          <div className="bento-track" aria-hidden><i style={{ width: `${progressToTarget * 100}%` }} /></div>
          <div className="bento-sub">{est.score ? (est.score >= target ? `On target (${target})` : `${target - est.score} pts to target ${target}`) : 'Answer 10+ questions to unlock'}</div>
        </div>
        <div className="bento-card bento-card--coral">
          <div className="bento-label">Pace</div>
          <div className="bento-value">{d.totals.n ? fmtTime(d.totals.avgTimeSec) : '—'}</div>
          <div className="bento-track" aria-hidden><i style={{ width: `${d.totals.n ? Math.min(1, 104 / Math.max(1, d.totals.avgTimeSec)) * 100 : 0}%` }} /></div>
          <div className="bento-sub">avg per question · GRE pace ≈ 1:45</div>
        </div>
        <div className="bento-card bento-card--sage">
          <div className="bento-label">Accuracy · streak</div>
          <div className="bento-value">{d.totals.n ? pctStr(d.totals.accuracy) : '—'}</div>
          <div className="bento-track" aria-hidden><i style={{ width: `${d.totals.accuracy * 100}%` }} /></div>
          <div className="bento-sub">{d.totals.correct}/{d.totals.n} correct · {d.streak.current}-day streak (best {d.streak.longest})</div>
        </div>
        <div className="bento-card bento-card--mist">
          <div className="bento-label">Topic mastery</div>
          <div className="bento-value">{overallMastery}%</div>
          <div className="bento-track" aria-hidden><i style={{ width: `${overallMastery}%` }} /></div>
          <div className="bento-sub">average of 5 topic areas · {Math.round(d.coverage * 100)}% of topics practised</div>
        </div>
      </div>
      <div className="small muted mt8 row" style={{ gap: 6 }}><Info size={13} /> {est.score ? `Score estimate: ${est.confidence} confidence, from your practice & simulations. An approximation — not an official ETS score.` : 'Take the diagnostic exam to get a baseline score estimate.'}</div>

      <div className="grid g-hero mt16">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="upper">Recommended next</div>
            <div className="row between mt8 wrap">
              <div className="grow"><b style={{ fontSize: 16 }}>{rec.title}</b><div className="small ink2 mt8">{rec.why}</div></div>
              <button className="btn primary" onClick={() => nav(rec.to)} data-testid="rec-start"><rec.icon size={15} /> Start</button>
            </div>
          </div>
          <div className="grid g3" style={{ gap: 12 }}>
            <div className="glass-panel stat" style={{ padding: 14 }}><div className="label">Questions completed</div><div className="value num">{d.totals.n.toLocaleString()}</div><div className="sub">{d.totals.skipped} skipped</div></div>
            <div className="glass-panel stat" style={{ padding: 14 }}><div className="label">Daily goal</div><div className="value num">{todayQs}/{s.profile.dailyQuestionGoal}</div><div className="sub"><Progress value={todayQs / s.profile.dailyQuestionGoal} /></div></div>
            <div className="glass-panel stat" style={{ padding: 14 }}><div className="label">Reviews due</div><div className="value num">{d.due.length}</div><div className="sub"><Link to="/lab">Wrong Answer Lab</Link></div></div>
          </div>
          <div className="small muted">{daysLeft} days to your exam · target {target}</div>
        </div>
        <Card title={`Today's training · Day ${plan.day}/${plan.total}`} action={<Link to="/plan" className="small">Full plan</Link>}>
          <div className="small muted mb8">{plan.phase} — {plan.focus}</div>
          <div className="col" style={{ gap: 6 }}>
            {plan.blocks.map((b) => (
              <Link key={b.id} to={b.to} className={`plan-block ${doneIds[b.id] ? 'done' : ''}`} style={{ color: 'inherit' }}>
                {doneIds[b.id] ? <CheckCircle2 size={16} color="var(--good)" /> : <Circle size={16} className="muted" />}
                <span className="mins">{b.minutes} min</span>
                <span className="grow" style={{ minWidth: 0 }}><b className="small">{b.title}</b><div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.detail}</div></span>
                <ArrowRight size={14} className="muted" />
              </Link>
            ))}
          </div>
          <div className="tiny muted mt8 mono">≈ {plan.blocks.reduce((a, b) => a + b.minutes, 0)} min planned · adapts daily to your results</div>
        </Card>
      </div>

      <div className="grid g3 mt16">
        <Card title="Topic mastery" className="span2" action={<Link to="/analytics" className="small">Analytics</Link>}>
          <div className="col" style={{ gap: 12 }}>
            {CATEGORIES.filter((c) => MAIN_CATEGORIES.includes(c.id)).map((c) => {
              const m = d.categoryMastery[c.id];
              return (
                <div key={c.id}>
                  <div className="row between small mb8"><span className="row" style={{ gap: 8 }}><i className="dot" style={{ background: c.color }} /><b>{c.name}</b><BandTag band={m.band} /></span><span className="mono ink2">{m.n ? `${m.score}%` : '—'} <span className="muted">· {m.n} q</span></span></div>
                  <Progress value={m.score / 100} color={c.color} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Weakest topics">
          {d.weakUnits.length === 0 ? <div className="small muted">Answer at least 3 questions in a topic to rank it.</div> : (
            <div className="col" style={{ gap: 0 }}>
              {d.weakUnits.slice(0, 5).map((w) => (
                <div key={w.unit} className="list-row">
                  <i className="dot" style={{ background: CATEGORY_BY_ID[UNIT_BY_ID[w.unit].category].color }} />
                  <div className="grow"><div className="small"><b>{UNIT_BY_ID[w.unit].name}</b></div><BandTag band={d.unitMastery[w.unit].band} /></div>
                  <span className="mono small">{w.score}%</span>
                  <Link className="btn sm" to={`/practice?units=${w.unit}&n=10`}>Drill</Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid g3 mt16">
        <Card title="Recent performance · daily accuracy" className="span2">
          {recent.length < 2 ? <div className="small muted">Practice on two or more days to see your trend.</div> : <LineSeries data={recent} x="date" series={[{ key: 'Accuracy', name: 'Accuracy %' }]} yDomain={[0, 100]} fmt={(v) => `${v}%`} height={180} />}
          {recent.filter((r) => r.Estimate).length >= 2 && <><div className="upper mt16 mb8">Estimated score by day</div><LineSeries data={recent} x="date" series={[{ key: 'Estimate', name: 'Estimated score', slot: 3 }]} yDomain={[130, 170]} height={150} refY={target} refLabel="target" /></>}
        </Card>
        <Card title="Daily objectives">
          <div className="col" style={{ gap: 10 }}>
            {objectives.map((o) => {
              const claimed = log?.objectivesClaimed.includes(o.id);
              return (
                <div key={o.id}>
                  <div className="row between small"><span className="row" style={{ gap: 6 }}>{o.done ? <CheckCircle2 size={14} color="var(--good)" /> : <Circle size={14} className="muted" />}{o.text}</span>
                    {o.done && !claimed ? <button className="btn sm primary" onClick={() => s.claimObjective(o.id)}>Claim +30</button> : <span className="mono tiny muted">{claimed ? 'claimed' : `${Math.min(o.progress, o.goal)}/${o.goal}`}</span>}
                  </div>
                  <div className="mt8"><Progress value={o.progress / o.goal} color={o.done ? 'var(--good)' : undefined} /></div>
                </div>
              );
            })}
          </div>
          {recentAch.length > 0 && <><hr /><div className="upper mb8">Recent achievements</div>{recentAch.map((a) => <div key={a!.id} className="small row" style={{ gap: 6 }}><span style={{ color: P.warning }}>★</span><b>{a!.name}</b><span className="muted">{a!.desc}</span></div>)}</>}
        </Card>
      </div>
    </div>
  );
}
