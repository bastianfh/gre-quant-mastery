import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Compass, FlaskConical, Info, Lock, Play } from 'lucide-react';
import { useStore } from '../store/store';
import { useDerived } from '../store/hooks';
import { CATEGORIES, MAIN_CATEGORIES, UNIT_BY_ID, CATEGORY_BY_ID } from '../content/curriculum';
import { dailyObjectives, dayKey, daysBetween, ACHIEVEMENTS } from '../engine/gamification';
import { BandTag, Card, Progress, fmtTime, pctStr, usePalette } from '../components/ui';
import { LineSeries } from '../components/LazyCharts';
import { TodayTraining, useTodayPlan } from '../components/TodayTraining';

export default function Dashboard() {
  const s = useStore();
  const d = useDerived();
  const nav = useNavigate();
  const P = usePalette();
  const today = dayKey();
  const { plan, done: doneIds } = useTodayPlan();
  const log = s.daily[today];
  const est = d.estimate;
  const target = s.profile.targetScore;
  const daysLeft = Math.max(0, daysBetween(today, s.profile.examDate));
  const weak = d.weakUnits[0];
  const weakToday = weak ? s.attempts.filter((a) => a.unit === weak.unit && dayKey(a.ts) === today && !a.skipped).length : 0;
  const objectives = dailyObjectives(log, s.profile.dailyQuestionGoal, weak ? UNIT_BY_ID[weak.unit].name : null, weakToday);
  const nextBlock = plan.blocks.find((b) => !doneIds[b.id]);

  // Recommended next action (same priority order as before): diagnostic → due reviews → next plan block → daily challenge.
  const rec = !s.profile.diagnosticDone
    ? { title: 'Take the diagnostic exam', meta: ['27 questions', '~47 min', 'Sets your custom study plan'], why: 'Two adaptive sections, just like test day. Your result tunes difficulty, your score estimate and every day of the plan.', cta: 'Start diagnostic', to: '/mock?kind=diagnostic', icon: Compass }
    : d.due.length >= 5 ? { title: `Clear ${d.due.length} due reviews`, meta: [`${d.due.length} questions`, `~${Math.max(5, Math.round(d.due.length * 1.5))} min`, 'Locks in yesterday’s fixes'], why: 'These are questions you missed. Re-solving them on schedule stops the same mistakes from showing up on test day.', cta: 'Start reviews', to: '/lab', icon: FlaskConical }
    : nextBlock ? { title: nextBlock.title, meta: [`${nextBlock.minutes} min`, `Day ${plan.day} of ${plan.total}`, plan.phase], why: nextBlock.detail, cta: "Start today's session", to: nextBlock.to, icon: Play }
    : { title: 'Daily challenge', meta: ['12 questions', '~20 min', 'Matched to your level'], why: 'Today’s plan is done. Bank a few extra reps with your personalized challenge.', cta: 'Start challenge', to: '/daily', icon: Play };

  const hasData = d.totals.n > 0;
  const hasSession = s.sessions.length > 0 || s.exams.length > 0;
  const recent = d.daily.slice(-14).map((r) => ({ date: r.date.slice(5), Accuracy: Math.round(r.accuracy * 100), Estimate: r.est }));
  const recentAch = Object.entries(s.profile.achievements).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
  const progressToTarget = est.score ? Math.max(0, Math.min(1, (est.score - 130) / (target - 130))) : 0;
  const overallMastery = Math.round(MAIN_CATEGORIES.reduce((a, c) => a + d.categoryMastery[c].score, 0) / MAIN_CATEGORIES.length);

  return (
    <div className="fade-in dash">
      {/* 1 — what to do now */}
      <section className="card hero-action" aria-labelledby="rec-title">
        <div className="hero-kicker"><rec.icon size={14} aria-hidden /> Recommended next</div>
        <h1 id="rec-title" className="hero-title">{rec.title}</h1>
        <div className="hero-meta" data-testid="rec-meta">{rec.meta.map((m, i) => <span key={i}>{m}</span>)}</div>
        <p className="hero-why">{rec.why}</p>
        <div className="hero-actions">
          <button className="btn primary xl" onClick={() => nav(rec.to)} data-testid="rec-start">{rec.cta} <ArrowRight size={17} aria-hidden /></button>
          <span className="hero-foot num">{daysLeft} days to your exam · target {target}</span>
        </div>
      </section>

      {/* 2 — where you stand */}
      <div className="bento bento--compact" aria-label="Key metrics">
        <div className="bento-card bento-card--warm">
          <div className="bento-label">Estimated score</div>
          {est.score ? <>
            <div><span className="bento-value" data-testid="est-score">{est.score}</span>{est.range && <span className="bento-sub"> &nbsp;{est.range[0]}–{est.range[1]}</span>}</div>
            <div className="bento-track" aria-hidden><i style={{ width: `${progressToTarget * 100}%` }} /></div>
            <div className="bento-sub">{est.score >= target ? `On target (${target})` : `${target - est.score} pts to target ${target}`}</div>
          </> : <Locked testid="est-score" hint="Unlocks after about 10 answers" />}
        </div>
        <div className="bento-card bento-card--coral">
          <div className="bento-label">Pace</div>
          {hasData ? <>
            <div className="bento-value">{fmtTime(d.totals.avgTimeSec)}</div>
            <div className="bento-track" aria-hidden><i style={{ width: `${Math.min(1, 104 / Math.max(1, d.totals.avgTimeSec)) * 100}%` }} /></div>
            <div className="bento-sub">avg per question · GRE pace ≈ 1:45</div>
          </> : <Locked hint="Your average time per question" />}
        </div>
        <div className="bento-card bento-card--sage">
          <div className="bento-label">Accuracy · streak</div>
          {hasData ? <>
            <div className="bento-value">{pctStr(d.totals.accuracy)}</div>
            <div className="bento-track" aria-hidden><i style={{ width: `${d.totals.accuracy * 100}%` }} /></div>
            <div className="bento-sub">{d.totals.correct}/{d.totals.n} correct · {d.streak.current}-day streak</div>
          </> : <Locked hint="Correct answers and daily streak" />}
        </div>
        <div className="bento-card bento-card--mist">
          <div className="bento-label">Topic mastery</div>
          {hasData ? <>
            <div className="bento-value">{overallMastery}%</div>
            <div className="bento-track" aria-hidden><i style={{ width: `${overallMastery}%` }} /></div>
            <div className="bento-sub">{Math.round(d.coverage * 100)}% of topics practised</div>
          </> : <Locked hint="Across all five topic areas" />}
        </div>
      </div>
      {est.score && <div className="small muted row dash-note"><Info size={13} aria-hidden /> Score estimate: {est.confidence} confidence, from your practice and simulations. An approximation, not an official ETS score.</div>}

      {/* today's checklist lives in the right rail; shown here only when the rail is hidden (narrower screens) */}
      <div className="card dash-training-inline"><TodayTraining compact /></div>

      {/* 3 — details, once there is something to show */}
      {hasSession && <>
        <div className="grid g3">
          <Card title="Topic mastery" className="span2" action={<Link to="/analytics" className="small">Analytics</Link>}>
            <div className="col" style={{ gap: 12 }}>
              {CATEGORIES.filter((c) => MAIN_CATEGORIES.includes(c.id)).map((c) => {
                const m = d.categoryMastery[c.id];
                return (
                  <div key={c.id}>
                    <div className="row between small mb8"><span className="row" style={{ gap: 8 }}><i className="dot" style={{ background: c.color }} /><b>{c.name}</b>{m.n > 0 && <BandTag band={m.band} />}</span><span className="mono ink2">{m.n ? `${m.score}%` : <span className="muted">not started</span>} {m.n > 0 && <span className="muted">· {m.n} q</span>}</span></div>
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

        <div className="grid g3">
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
      </>}
    </div>
  );
}

function Locked({ hint, testid }: { hint: string; testid?: string }) {
  return (
    <>
      <div className="bento-locked" data-testid={testid}><Lock size={15} aria-hidden /> Start to unlock</div>
      <div className="bento-sub">{hint}</div>
    </>
  );
}
