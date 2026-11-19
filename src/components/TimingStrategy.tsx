import { Clock, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import type { ExamResult } from '../engine/types';
import { analyzeTiming } from '../engine/timing';
import { getQuestion } from '../engine/bank';
import { UNIT_BY_ID } from '../content/curriculum';
import { answerIsBlank } from './QuestionView';
import { LineSeries } from './LazyCharts';
import { Card, fmtTime, pctStr } from './ui';

/** Where the clock went in one simulated exam, and what it cost. */
export function TimingStrategy({ r }: { r: ExamResult }) {
  const t = analyzeTiming(r, getQuestion, answerIsBlank as (q: any, a: unknown) => boolean);
  return (
    <Card title={<span className="row" style={{ gap: 6 }}><Clock size={14} /> Timing strategy</span>} className="mt16">
      <div className="grid g3">
        <div className="glass-panel stat" style={{ padding: 14 }}><div className="label">Time on missed questions</div><div className="value num">{fmtTime(t.wastedSec)}</div><div className="sub">{pctStr(t.wastedShare)} of your total time</div></div>
        <div className="glass-panel stat" style={{ padding: 14 }}><div className="label">Wrong answers over 2:30</div><div className="value num">{t.overCapWrong}</div><div className="sub">candidates for “guess, mark, move on”</div></div>
        <div className="glass-panel stat" style={{ padding: 14 }}><div className="label">Blank when time ran out</div><div className="value num">{t.blanksAtEnd}</div><div className="sub">always enter a guess</div></div>
      </div>
      <div className="col mt16" style={{ gap: 6 }} data-testid="timing-advice">{t.advice.map((a) => <div key={a} className="callout"><div className="t">Next exam</div>{a}</div>)}</div>
      <div className="grid g2 mt16">
        <div>
          <div className="upper mb8">Biggest time sinks</div>
          <table className="data"><tbody>{t.sinks.map((x) => (
            <tr key={`${x.section}-${x.index}`}>
              <td style={{ width: 22 }}>{x.correct ? <CheckCircle2 size={14} color="var(--good)" aria-label="Correct" /> : x.blank ? <MinusCircle size={14} className="muted" aria-label="Blank" /> : <XCircle size={14} color="var(--critical)" aria-label="Incorrect" />}</td>
              <td className="small mono muted">S{x.section + 1}·{x.index + 1}</td>
              <td className="small">{UNIT_BY_ID[x.q.unit]?.name}</td>
              <td className="num">{fmtTime(x.timeSec)}</td>
              <td className="num muted">{x.ratio.toFixed(1)}× target</td>
            </tr>
          ))}</tbody></table>
        </div>
        <div>
          {t.pacing.map((p, si) => (
            <div key={si} className={si ? 'mt16' : ''}>
              <div className="upper mb8">Section {si + 1} pacing (cumulative minutes)</div>
              <LineSeries data={p} x="n" series={[{ key: 'you', name: 'You' }, { key: 'even', name: 'Even pace', slot: 3 }]} height={140} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/** Aggregate timing across all simulations (Analytics → Time). */
export function ExamTimingSummary({ exams }: { exams: ExamResult[] }) {
  if (!exams.length) return <Card title="Exam timing (simulations)"><div className="small muted">Take a mock exam to see how you pace under real conditions.</div></Card>;
  const reports = exams.map((e) => analyzeTiming(e, getQuestion, answerIsBlank as (q: any, a: unknown) => boolean));
  const items = reports.flatMap((r) => r.items);
  const avg = (xs: typeof items) => (xs.length ? xs.reduce((a, x) => a + x.timeSec, 0) / xs.length : 0);
  const right = items.filter((x) => x.correct), wrong = items.filter((x) => !x.correct && !x.blank);
  return (
    <Card title="Exam timing (simulations)">
      <table className="data"><tbody>
        <tr><td className="small ink2">Average time on correct answers</td><td className="num">{fmtTime(avg(right))}</td></tr>
        <tr><td className="small ink2">Average time on wrong answers</td><td className="num">{fmtTime(avg(wrong))}</td></tr>
        <tr><td className="small ink2">Share of exam time spent on misses</td><td className="num">{pctStr(reports.reduce((a, r) => a + r.wastedShare, 0) / reports.length)}</td></tr>
        <tr><td className="small ink2">Wrong answers that took over 2:30</td><td className="num">{reports.reduce((a, r) => a + r.overCapWrong, 0)}</td></tr>
        <tr><td className="small ink2">Questions left blank at the buzzer</td><td className="num">{reports.reduce((a, r) => a + r.blanksAtEnd, 0)}</td></tr>
      </tbody></table>
      <div className="tiny muted mt8">Across {exams.length} simulation{exams.length > 1 ? 's' : ''}. If wrong answers take much longer than right ones, a 2:30 cap per question will usually raise your score.</div>
    </Card>
  );
}
