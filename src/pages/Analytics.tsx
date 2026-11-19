import { useMemo, useState } from 'react';
import { CATEGORIES, MAIN_CATEGORIES, UNITS, UNIT_BY_ID, CATEGORY_BY_ID } from '../content/curriculum';
import { computeMastery } from '../engine/mastery';
import { ERROR_TYPE_NAMES, FORMAT_NAMES, LEVEL_NAMES, type Attempt, type Level } from '../engine/types';
import { dayKey } from '../engine/gamification';
import { BandTag, Card, Empty, PageHead, Stat, fmtTime, pctStr, usePalette } from '../components/ui';
import { Bars, LineSeries } from '../components/LazyCharts';
import { useStore } from '../store/store';
import { useDerived } from '../store/hooks';
import { OfficialScores } from '../components/OfficialScores';
import { ExamTimingSummary } from '../components/TimingStrategy';

type Tab = 'overview' | 'topics' | 'time' | 'errors' | 'progress' | 'history';

export default function Analytics() {
  const s = useStore();
  const d = useDerived();
  const P = usePalette();
  const [tab, setTab] = useState<Tab>('overview');
  const [day, setDay] = useState<string | null>(null);
  const at = s.attempts.filter((a) => !a.skipped);
  const days = d.daily;
  const perDay = days.length ? d.totals.n / days.length : 0;

  const unitRows = useMemo(() => UNITS.map((u) => {
    const xs = at.filter((a) => a.unit === u.id);
    const m = d.unitMastery[u.id];
    const last10 = xs.slice(-10), prev10 = xs.slice(-20, -10);
    const acc = (ys: Attempt[]) => (ys.length ? ys.filter((a) => a.correct).length / ys.length : null);
    const trend = last10.length >= 5 && prev10.length >= 5 ? acc(last10)! - acc(prev10)! : null;
    return { u, m, n: xs.length, acc: acc(xs), time: xs.length ? xs.reduce((a, x) => a + x.timeMs, 0) / xs.length / 1000 : null, trend, lv: ([1, 2, 3, 4, 5] as Level[]).map((l) => xs.filter((a) => a.level === l).length) };
  }), [at.length, d]); // eslint-disable-line

  const masteryHistory = useMemo(() => days.map((r) => {
    const end = new Date(r.date + 'T23:59:59').getTime();
    const row: Record<string, string | number | null> = { date: r.date.slice(5) };
    for (const c of MAIN_CATEGORIES) { const xs = at.filter((a) => a.category === c && a.ts <= end); row[c] = xs.length ? computeMastery(xs, end).score : null; }
    return row;
  }), [days.length, at.length]); // eslint-disable-line

  if (!s.attempts.length) return (<div className="fade-in"><PageHead title="Analytics" sub="Everything here is computed from your recorded answers." /><Card><Empty title="No data yet">Answer some questions — every chart on this page is built from your real attempts.</Empty></Card><div className="mt16"><OfficialScores /></div></div>);

  const tabs: [Tab, string][] = [['overview', 'Overview'], ['topics', 'Topics'], ['time', 'Time'], ['errors', 'Errors'], ['progress', 'Progress'], ['history', 'History']];
  const slowest = unitRows.filter((r) => r.n >= 3 && r.time !== null).sort((a, b) => (b.time! / b.u.id.length) - (a.time! / a.u.id.length));
  const byRatio = unitRows.filter((r) => r.n >= 3).map((r) => ({ ...r, ratio: d.unitMastery[r.u.id].avgTimeRatio })).sort((a, b) => b.ratio - a.ratio);
  void slowest;
  return (
    <div className="fade-in">
      <PageHead title="Analytics" sub="Every number and chart below is computed from your recorded attempts." />
      <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'overview' && (
        <>
          <div className="grid g6">
            <Stat label="Attempted" value={d.totals.n.toLocaleString()} sub={`${d.totals.skipped} skipped`} />
            <Stat label="Correct" value={d.totals.correct.toLocaleString()} />
            <Stat label="Incorrect" value={d.totals.incorrect.toLocaleString()} />
            <Stat label="Accuracy" value={pctStr(d.totals.accuracy)} />
            <Stat label="Avg solving time" value={fmtTime(d.totals.avgTimeSec)} />
            <Stat label="Questions / active day" value={perDay.toFixed(1)} sub={`${days.length} active day(s)`} />
          </div>
          <div className="grid g3 mt16">
            <Card title="Estimated score model">
              <div className="row" style={{ alignItems: 'baseline', gap: 10 }}><span className="hero-score num" style={{ fontSize: 40 }}>{d.estimate.score ?? '—'}</span>{d.estimate.range && <span className="mono ink2">{d.estimate.range[0]}–{d.estimate.range[1]}</span>}</div>
              <table className="data mt8"><tbody>{d.estimate.components.map((c) => <tr key={c.label}><td className="small ink2">{c.label}</td><td className="num small">{c.value}</td></tr>)}<tr><td className="small ink2">Topic coverage (≥3 attempts)</td><td className="num small">{pctStr(d.coverage)}</td></tr><tr><td className="small ink2">Confidence</td><td className="num small">{d.estimate.confidence}</td></tr></tbody></table>
              <div className="tiny muted mt8">Rasch ability estimate (recency-weighted, slow/hinted answers partially credited) blended with simulation results; widened when topics are under-sampled. An approximation, not ETS's algorithm.</div>
            </Card>
            <Card title="By question type">
              <table className="data"><thead><tr><th>Type</th><th className="num">n</th><th className="num">Acc</th><th className="num">Time</th></tr></thead><tbody>{(['qc', 'mcq', 'multi', 'numeric', 'di'] as const).map((f) => { const x = d.formatStats[f]; return <tr key={f}><td className="small">{FORMAT_NAMES[f]}</td><td className="num">{x.n}</td><td className="num">{x.n ? pctStr(x.correct / x.n) : '—'}</td><td className="num">{x.n ? fmtTime(x.avgTimeSec) : '—'}</td></tr>; })}</tbody></table>
            </Card>
            <Card title="By difficulty">
              <Bars data={[1, 2, 3, 4, 5].map((l) => ({ level: LEVEL_NAMES[l as Level], Accuracy: d.levelStats[l].n ? Math.round((d.levelStats[l].correct / d.levelStats[l].n) * 100) : 0, n: d.levelStats[l].n }))} x="level" y="Accuracy" name="Accuracy %" fmt={(v) => `${v}%`} yDomain={[0, 100]} height={180} />
              <div className="tiny muted mono">{[1, 2, 3, 4, 5].map((l) => `L${l}: ${d.levelStats[l].n}`).join(' · ')}</div>
            </Card>
          </div>
          <Card title="Estimated score development" className="mt16">{days.filter((r) => r.est).length < 2 ? <div className="small muted">Needs two or more active days.</div> : <LineSeries data={days.map((r) => ({ date: r.date.slice(5), Estimate: r.est }))} x="date" series={[{ key: 'Estimate', name: 'Estimated score' }]} yDomain={[130, 170]} refY={s.profile.targetScore} refLabel="target" />}</Card>
          <div className="mt16"><OfficialScores /></div>
        </>
      )}

      {tab === 'topics' && (
        <>
          <div className="grid g2">
            {CATEGORIES.map((c) => {
              const rows = unitRows.filter((r) => r.u.category === c.id);
              return (
                <Card key={c.id} title={<span className="row" style={{ gap: 8 }}><i className="dot" style={{ background: c.color }} />{c.name} · {d.categoryMastery[c.id].n ? `${d.categoryMastery[c.id].score}% mastery` : 'no data'}</span>}>
                  <Bars data={rows.map((r) => ({ unit: r.u.name.split(/[ ,&]/)[0], Mastery: r.m.score, full: r.u.name }))} x="unit" y="Mastery" name="Mastery %" slot={c.slot} yDomain={[0, 100]} height={160} fmt={(v) => `${v}%`} />
                </Card>
              );
            })}
          </div>
          <Card title="Topic detail" className="mt16">
            <div style={{ overflowX: 'auto' }}>
              <table className="data">
                <thead><tr><th>Topic</th><th>Mastery</th><th className="num">Score</th><th className="num">Attempts</th><th className="num">Accuracy</th><th className="num">Avg time</th><th>Difficulty mix (L1–L5)</th><th className="num">Trend</th></tr></thead>
                <tbody>{unitRows.map((r) => (
                  <tr key={r.u.id}>
                    <td className="small"><i className="dot" style={{ background: CATEGORY_BY_ID[r.u.category].color, marginRight: 6 }} />{r.u.name}</td>
                    <td><BandTag band={r.m.band} /></td>
                    <td className="num" title={r.m.capReason}>{r.n ? r.m.score : '—'}</td>
                    <td className="num">{r.n}</td>
                    <td className="num">{r.acc !== null ? pctStr(r.acc) : '—'}</td>
                    <td className="num">{r.time !== null ? fmtTime(r.time) : '—'}</td>
                    <td><div className="row" style={{ gap: 2, alignItems: 'flex-end', height: 18 }}>{r.lv.map((v, i) => <span key={i} title={`L${i + 1}: ${v}`} style={{ width: 8, height: Math.max(2, Math.min(18, v * 3)), background: v ? P.series[0] : P.grid, borderRadius: 2, display: 'inline-block' }} />)}</div></td>
                    <td className="num" style={{ color: r.trend === null ? undefined : r.trend >= 0 ? 'var(--good-ink)' : 'var(--critical-ink)' }}>{r.trend === null ? '—' : `${r.trend >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(r.trend * 100))}`}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="tiny muted mt8">Mastery bands: 0–39 critical · 40–59 developing · 60–74 intermediate · 75–89 strong · 90–100 mastered. Hover a score to see what caps it. Trend = accuracy of last 10 vs previous 10 attempts.</div>
          </Card>
        </>
      )}

      {tab === 'time' && (
        <>
          <div className="grid g4">
            <Stat label="Avg seconds / question" value={Math.round(d.totals.avgTimeSec)} sub="GRE average budget ≈ 104 s" />
            <Stat label="Time reviewing mistakes" value={fmtTime(d.totals.reviewTimeSec)} />
            <Stat label="Total study time (questions)" value={fmtTime(at.reduce((a, x) => a + x.timeMs, 0) / 1000)} />
            <Stat label="Over-time answers" value={pctStr(at.filter((a) => a.timeMs / 1000 > a.targetSec * 1.5).length / Math.max(1, at.length))} sub="took > 1.5× target time" />
          </div>
          <div className="grid g2 mt16">
            <Card title="Accuracy by time limit (speed drills)">
              {d.timeLimitStats.every((x) => !x.n) ? <div className="small muted">No speed drills yet.</div> : <Bars data={d.timeLimitStats.map((x) => ({ limit: `${x.limit}s`, Accuracy: x.n ? Math.round((x.correct / x.n) * 100) : 0 }))} x="limit" y="Accuracy" name="Accuracy %" fmt={(v) => `${v}%`} yDomain={[0, 100]} />}
            </Card>
            <Card title="Average solving time per day">
              {days.length < 2 ? <div className="small muted">Needs two or more active days.</div> : <LineSeries data={days.map((r) => ({ date: r.date.slice(5), Seconds: Math.round(r.avgTimeSec) }))} x="date" series={[{ key: 'Seconds', name: 'Avg seconds' }]} refY={104} refLabel="GRE pace" />}
            </Card>
          </div>
          <div className="grid g2 mt16">
            <Card title="Slowest topics (time ÷ target)">{byRatio.slice(0, 6).map((r) => <div key={r.u.id} className="list-row small"><span className="grow">{r.u.name}</span><span className="mono">{fmtTime(r.time!)}</span><span className="mono muted">{r.ratio.toFixed(2)}×</span></div>)}{!byRatio.length && <div className="small muted">Needs 3+ attempts per topic.</div>}</Card>
            <Card title="Fastest topics (time ÷ target)">{[...byRatio].reverse().slice(0, 6).map((r) => <div key={r.u.id} className="list-row small"><span className="grow">{r.u.name}</span><span className="mono">{fmtTime(r.time!)}</span><span className="mono muted">{r.ratio.toFixed(2)}×</span></div>)}</Card>
          </div>
          <div className="mt16"><ExamTimingSummary exams={s.exams} /></div>
        </>
      )}

      {tab === 'errors' && (
        <div className="grid g2">
          <Card title="Most common mistake types">
            {!d.errors.length ? <div className="small muted">No mistakes recorded.</div> : d.errors.map((e) => { const tot = d.errors.reduce((a, x) => a + x.count, 0); return <div key={e.type} className="mb8"><div className="row between small"><span>{ERROR_TYPE_NAMES[e.type]}</span><b className="mono">{((e.count / tot) * 100).toFixed(0)}%</b></div><div className="bar mt8"><i style={{ width: `${(e.count / tot) * 100}%` }} /></div></div>; })}
            <div className="tiny muted mt8">Percentages are your tagged (or auto-suggested) causes over all {d.totals.incorrect} incorrect answers.</div>
          </Card>
          <Card title="Mistakes by topic">
            {d.errorsByUnit.slice(0, 10).map((e) => { const tot = d.totals.incorrect; return <div key={e.unit} className="mb8"><div className="row between small"><span>{UNIT_BY_ID[e.unit].name}</span><b className="mono">{((e.count / tot) * 100).toFixed(0)}% <span className="muted">({e.count})</span></b></div><div className="bar mt8"><i style={{ width: `${(e.count / tot) * 100}%`, background: CATEGORY_BY_ID[UNIT_BY_ID[e.unit].category].color }} /></div></div>; })}
          </Card>
        </div>
      )}

      {tab === 'progress' && (
        <>
          <div className="grid g2">
            <Card title="Daily accuracy">{days.length < 2 ? <div className="small muted">Needs two or more active days.</div> : <LineSeries data={days.map((r) => ({ date: r.date.slice(5), Accuracy: Math.round(r.accuracy * 100) }))} x="date" series={[{ key: 'Accuracy', name: 'Accuracy %' }]} yDomain={[0, 100]} fmt={(v) => `${v}%`} />}</Card>
            <Card title="Weekly accuracy"><Bars data={d.weekly.map((w) => ({ week: w.week.slice(5), Accuracy: Math.round(w.accuracy * 100) }))} x="week" y="Accuracy" name="Accuracy %" fmt={(v) => `${v}%`} yDomain={[0, 100]} /></Card>
          </div>
          <div className="grid g2 mt16">
            <Card title="Topic mastery development">{masteryHistory.length < 2 ? <div className="small muted">Needs two or more active days.</div> : <LineSeries data={masteryHistory} x="date" series={MAIN_CATEGORIES.map((c) => ({ key: c, name: CATEGORY_BY_ID[c].name, slot: CATEGORY_BY_ID[c].slot }))} yDomain={[0, 100]} />}</Card>
            <Card title="Study consistency · questions per day"><Bars data={days.map((r) => ({ date: r.date.slice(5), Questions: r.n }))} x="date" y="Questions" name="Questions" /><div className="tiny muted mono">streak {d.streak.current}d · longest {d.streak.longest}d · {d.streak.last7}/7 days this week · {d.streak.activeDays} active days</div></Card>
          </div>
        </>
      )}

      {tab === 'history' && (
        <Card title="Inspect a day">
          <div className="row wrap" style={{ gap: 6 }}>{[...days].reverse().map((r) => <button key={r.date} className={`chip ${day === r.date ? 'on' : ''}`} onClick={() => setDay(r.date)}>{r.date} · {r.n}q · {pctStr(r.accuracy)}</button>)}</div>
          {day && (
            <div style={{ overflowX: 'auto' }} className="mt16">
              <table className="data"><thead><tr><th>Time</th><th>Mode</th><th>Topic</th><th>Type</th><th className="num">Level</th><th>Result</th><th className="num">Seconds</th></tr></thead>
                <tbody>{s.attempts.filter((a) => dayKey(a.ts) === day).map((a, i) => <tr key={i}><td className="small mono">{new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td className="small">{a.mode}</td><td className="small">{UNIT_BY_ID[a.unit]?.name}</td><td className="small">{a.di ? 'DI' : a.format.toUpperCase()}</td><td className="num">{a.level}</td><td className="small" style={{ color: a.skipped ? undefined : a.correct ? 'var(--good-ink)' : 'var(--critical-ink)' }}>{a.skipped ? 'skipped' : a.correct ? 'correct' : 'wrong'}</td><td className="num">{Math.round(a.timeMs / 1000)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
