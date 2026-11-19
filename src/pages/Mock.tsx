import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calculator as CalcIcon, ChevronLeft, ChevronRight, Flag, ClipboardCheck, Info, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { buildSection, routeSection2, FORM_NAMES, type Path } from '../engine/selection';
import { getQuestion } from '../engine/bank';
import { isCorrect } from '../engine/grading';
import { scoreExam } from '../engine/scoring';
import type { ExamResult, Question, UserAnswer, Level } from '../engine/types';
import { FORMAT_NAMES, LEVEL_NAMES } from '../engine/types';
import { CATEGORY_BY_ID, UNIT_BY_ID } from '../content/curriculum';
import { QuestionView, answerIsBlank } from '../components/QuestionView';
import { Feedback } from '../components/Feedback';
import { Calculator } from '../components/Calculator';
import { Card, PageHead, Stat, fmtTime, pctStr, uid } from '../components/ui';
import { LineSeries } from '../components/Charts';
import { TimingStrategy } from '../components/TimingStrategy';
import { useStore } from '../store/store';

const LIMITS = [21 * 60, 26 * 60];
interface Sec { qids: string[]; answers: UserAnswer[]; marked: boolean[]; timeMs: number[]; remaining: number; idx: number }
interface ExamState { id: string; kind: 'mock' | 'diagnostic'; form: number; startedAt: number; section: 0 | 1; path: Path; secs: Sec[]; phase: 'question' | 'review' }
const SNAP = 'exam-inprogress';

export default function Mock() {
  const [sp] = useSearchParams();
  const s = useStore();
  const nav = useNavigate();
  const [exam, setExam] = useState<ExamState | null>(null);
  const [saved, setSaved] = useState<ExamState | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const kindParam = sp.get('kind') === 'diagnostic' ? 'diagnostic' : 'mock';
  useEffect(() => { s.loadSnapshot<ExamState>(SNAP).then((x) => x && setSaved(x)); }, []); // eslint-disable-line

  const start = (kind: 'mock' | 'diagnostic') => {
    const used = new Set(s.exams.flatMap((e) => e.sections.flatMap((x) => x.qids)));
    const form = kind === 'diagnostic' ? 0 : (s.exams.filter((e) => e.kind === 'mock').length % FORM_NAMES.length) + 1;
    const qs = buildSection(1, 'medium', form, used);
    setExam({ id: uid(), kind, form, startedAt: Date.now(), section: 0, path: 'medium', phase: 'question', secs: [{ qids: qs.map((q) => q.id), answers: qs.map(() => null), marked: qs.map(() => false), timeMs: qs.map(() => 0), remaining: LIMITS[0], idx: 0 }] });
    setResult(null);
  };

  if (result) return <Results r={result} onAgain={() => { setResult(null); }} />;
  if (exam) return <ExamRunner exam={exam} setExam={setExam} onFinish={(r) => { setExam(null); setResult(r); }} onQuit={() => { setExam(null); s.clearSnapshot(SNAP); }} />;

  const mocks = s.exams;
  const hist = mocks.map((e, i) => ({ n: `#${i + 1}`, Score: e.scaled }));
  return (
    <div className="fade-in">
      <PageHead title={kindParam === 'diagnostic' ? 'Diagnostic Exam' : 'Mock Exams'} sub="Full GRE Quantitative Reasoning simulation: Section 1 (12 questions, 21 min, average difficulty) → Section 2 (15 questions, 26 min) adapted to your Section 1 performance." />
      {saved && (
        <div className="callout warn mb16"><div className="t">Interrupted exam found</div>
          You have an unfinished {saved.kind} (Section {saved.section + 1}, {fmtTime(saved.secs[saved.section].remaining)} left).
          <div className="row mt8"><button className="btn primary sm" onClick={() => { setExam(saved); setSaved(null); }}>Resume</button><button className="btn sm" onClick={() => { s.clearSnapshot(SNAP); setSaved(null); }}>Discard</button></div>
        </div>
      )}
      <div className="grid g3">
        <Card title="Exam conditions" className="span2">
          <ul className="ink2" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>27 questions · 47 minutes · Quantitative Comparison, multiple choice (one / one-or-more), numeric entry, data interpretation.</li>
            <li>Skip, revisit, and change answers freely <b>within</b> a section; mark questions for review; a review screen shows answered / unanswered / marked.</li>
            <li>On-screen calculator with Transfer Display for numeric entry.</li>
            <li>Section 2 difficulty is routed by Section 1: strong → harder, average → medium, weaker → easier.</li>
            <li>No answers are shown until the entire exam is finished. Unanswered questions count as incorrect — always enter a guess.</li>
          </ul>
          <div className="row mt16 wrap">
            {!s.profile.diagnosticDone || kindParam === 'diagnostic' ? <button className="btn primary lg" onClick={() => start('diagnostic')} data-testid="start-diagnostic"><ClipboardCheck size={16} /> Start diagnostic</button> : null}
            {kindParam !== 'diagnostic' && <button className={`btn lg ${s.profile.diagnosticDone ? 'primary' : ''}`} onClick={() => start('mock')} data-testid="start-mock"><ClipboardCheck size={16} /> Start {FORM_NAMES[(s.exams.filter((e) => e.kind === 'mock').length) % FORM_NAMES.length]}</button>}
          </div>
          <div className="small muted mt8 row" style={{ gap: 6 }}><Info size={13} /> Scores are estimates from a statistical model of your answers and the path difficulty — not ETS's proprietary scoring.</div>
        </Card>
        <Card title="Score history">
          {mocks.length < 2 ? <div className="small muted">{mocks.length ? `Last: ${mocks[0].scaled}` : 'No exams yet.'}</div> : <LineSeries data={hist} x="n" series={[{ key: 'Score', name: 'Estimated score' }]} yDomain={[130, 170]} height={170} refY={s.profile.targetScore} refLabel="target" />}
          {mocks.slice(-5).reverse().map((e) => (
            <button key={e.id} className="list-row small" style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'inherit', textAlign: 'left' }} onClick={() => setResult(e)}>
              <span className="grow">{e.kind === 'diagnostic' ? 'Diagnostic' : e.form} · {new Date(e.finishedAt).toLocaleDateString()}</span><span className="mono">{e.raw}/27</span><b className="mono">{e.scaled}</b>
            </button>
          ))}
        </Card>
      </div>
      {kindParam === 'diagnostic' && s.profile.diagnosticDone && <div className="small muted mt16">You already completed the diagnostic. <a onClick={() => nav('/mock')} style={{ cursor: 'pointer' }}>Take a mock exam instead.</a></div>}
    </div>
  );
}

function ExamRunner({ exam, setExam, onFinish, onQuit }: { exam: ExamState; setExam: (e: ExamState) => void; onFinish: (r: ExamResult) => void; onQuit: () => void }) {
  const store = useStore();
  const [calc, setCalc] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [, tick] = useState(0);
  const sec = exam.secs[exam.section];
  const qs = useMemo(() => sec.qids.map((id) => getQuestion(id)!), [sec.qids]);
  const q = qs[sec.idx];
  const viewStart = useRef(Date.now());
  const lastTick = useRef(Date.now());
  const ref = useRef(exam);
  ref.current = exam;

  // countdown (persisted every tick so an interrupted exam resumes with the right time)
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      const e = ref.current;
      const cur = e.secs[e.section];
      const remaining = Math.max(0, cur.remaining - dt);
      const secs = e.secs.map((x, i) => (i === e.section ? { ...x, remaining } : x));
      const next = { ...e, secs };
      setExam(next);
      tick((x) => x + 1);
      if (remaining <= 0) submitSection(next, true);
    }, 1000);
    return () => clearInterval(t);
  }, [exam.section]); // eslint-disable-line
  useEffect(() => { store.snapshot(SNAP, exam); }, [exam]); // eslint-disable-line

  const commitTime = (e: ExamState): ExamState => {
    const now = Date.now();
    const dt = now - viewStart.current;
    viewStart.current = now;
    if (e.phase !== 'question') return e;
    const cur = e.secs[e.section];
    const timeMs = cur.timeMs.map((t, i) => (i === cur.idx ? t + dt : t));
    return { ...e, secs: e.secs.map((x, i) => (i === e.section ? { ...x, timeMs } : x)) };
  };
  const update = (fn: (c: Sec) => Sec, phase?: ExamState['phase']) => {
    const e = commitTime(ref.current);
    setExam({ ...e, phase: phase ?? e.phase, secs: e.secs.map((x, i) => (i === e.section ? fn(x) : x)) });
  };
  const go = (i: number) => update((c) => ({ ...c, idx: Math.max(0, Math.min(c.qids.length - 1, i)) }), 'question');
  const setAnswer = (a: UserAnswer) => { const e = ref.current; setExam({ ...e, secs: e.secs.map((x, i) => (i === e.section ? { ...x, answers: x.answers.map((v, k) => (k === x.idx ? a : v)) } : x)) }); };

  const submitting = useRef(-1);
  const submitSection = async (e0: ExamState, timedOut = false) => {
    if (submitting.current === e0.section) return; // timer ticks must not double-submit
    submitting.current = e0.section;
    const e = commitTime(e0);
    const cur = e.secs[e.section];
    if (e.section === 0) {
      const s1Correct = cur.qids.filter((id, i) => isCorrect(getQuestion(id)!, cur.answers[i])).length;
      const path = routeSection2(s1Correct);
      const used = new Set([...store.exams.flatMap((x) => x.sections.flatMap((y) => y.qids)), ...cur.qids]);
      const q2 = buildSection(2, path, e.form, used);
      viewStart.current = Date.now(); lastTick.current = Date.now();
      setExam({ ...e, section: 1, path, phase: 'question', secs: [{ ...cur, remaining: timedOut ? 0 : cur.remaining }, { qids: q2.map((x) => x.id), answers: q2.map(() => null), marked: q2.map(() => false), timeMs: q2.map(() => 0), remaining: LIMITS[1], idx: 0 }] });
      setConfirm(false);
      return;
    }
    // finish: record every answer (unanswered = incorrect), score, save
    const sessionId = e.id;
    const sections: ExamResult['sections'] = [];
    const items: { level: Level; correct: boolean }[] = [];
    for (let si = 0; si < e.secs.length; si++) {
      const x = e.secs[si];
      const correct: boolean[] = [];
      for (let i = 0; i < x.qids.length; i++) {
        const qq = getQuestion(x.qids[i])!;
        const ok = isCorrect(qq, x.answers[i]);
        correct.push(ok); items.push({ level: qq.level, correct: ok });
        await store.recordAttempt({ q: qq, answer: x.answers[i], correct: ok, timeMs: x.timeMs[i] || 1000, mode: e.kind, sessionId });
      }
      sections.push({ qids: x.qids, answers: x.answers, correct, timeMs: x.timeMs, timeUsedSec: Math.round(LIMITS[si] - x.remaining), limitSec: LIMITS[si], marked: x.marked });
    }
    const sc = scoreExam(items);
    const r: ExamResult = { id: e.id, kind: e.kind, form: e.kind === 'diagnostic' ? 'Diagnostic' : FORM_NAMES[(e.form - 1) % FORM_NAMES.length], startedAt: e.startedAt, finishedAt: Date.now(), path: e.path, sections, raw: items.filter((i) => i.correct).length, scaled: sc.scaled, range: sc.range };
    await store.saveExam(r);
    await store.clearSnapshot(SNAP);
    onFinish(r);
  };

  const left = sec.remaining;
  const answered = sec.answers.filter((a, i) => !answerIsBlank(qs[i], a)).length;
  return (
    <div className="q-wrap" style={{ maxWidth: 920 }}>
      <div className="exam-bar">
        <b>{exam.kind === 'diagnostic' ? 'Diagnostic' : 'GRE Quant Simulation'} · Section {exam.section + 1} of 2</b>
        <span className="muted small">{exam.phase === 'review' ? 'Review' : `Question ${sec.idx + 1} of ${sec.qids.length}`} · {answered}/{sec.qids.length} answered</span>
        <span className="grow" />
        <span className={`timer ${left < 60 ? 'danger' : left < 300 ? 'warn' : ''}`} data-testid="exam-timer">{fmtTime(left)}</span>
        <button className={`btn sm ${calc ? 'active' : ''}`} onClick={() => setCalc(!calc)}><CalcIcon size={14} /> Calculator</button>
        <button className="btn sm" onClick={() => update((c) => c, exam.phase === 'review' ? 'question' : 'review')} data-testid="review-screen">{exam.phase === 'review' ? 'Return' : 'Review'}</button>
      </div>
      {exam.phase === 'review' ? (
        <div className="card">
          <h2>Section {exam.section + 1} review</h2>
          <p className="small muted mt8">Click a question to go to it. Marked questions show a flag. You can change any answer until you submit the section.</p>
          <div className="qgrid mt16">
            {qs.map((qq, i) => <button key={i} className={`qcell ${!answerIsBlank(qq, sec.answers[i]) ? 'answered' : ''}`} onClick={() => go(i)} aria-label={`Question ${i + 1}`}>{i + 1}{sec.marked[i] && <Flag size={9} className="flag" fill="currentColor" />}</button>)}
          </div>
          <div className="row mt16 small ink2 wrap" style={{ gap: 16 }}><span>Answered: <b>{answered}</b></span><span>Not answered: <b>{sec.qids.length - answered}</b></span><span>Marked: <b>{sec.marked.filter(Boolean).length}</b></span></div>
          <div className="row mt16"><button className="btn primary" onClick={() => setConfirm(true)} data-testid="submit-section">Submit section {exam.section + 1}</button><button className="btn ghost" onClick={() => { if (confirm || window.confirm('Quit this exam? Progress in this exam will be lost.')) onQuit(); }}>Quit exam</button></div>
        </div>
      ) : (
        <>
          <div className="q-meta"><span className="pill">{q.di ? FORMAT_NAMES.di : FORMAT_NAMES[q.format]}</span><span className="grow" />
            <button className={`btn sm ${sec.marked[sec.idx] ? 'active' : ''}`} onClick={() => update((c) => ({ ...c, marked: c.marked.map((m, i) => (i === c.idx ? !m : m)) }))} data-testid="mark"><Flag size={13} fill={sec.marked[sec.idx] ? 'currentColor' : 'none'} /> {sec.marked[sec.idx] ? 'Marked' : 'Mark'}</button></div>
          <div className="q-card" key={q.id}><QuestionView q={q} answer={sec.answers[sec.idx]} onAnswer={setAnswer} /></div>
          <div className="q-actions">
            <button className="btn" disabled={sec.idx === 0} onClick={() => go(sec.idx - 1)}><ChevronLeft size={15} /> Back</button>
            {sec.idx < sec.qids.length - 1 ? <button className="btn primary" onClick={() => go(sec.idx + 1)} data-testid="exam-next">Next <ChevronRight size={15} /></button> : <button className="btn primary" onClick={() => update((c) => c, 'review')}>Go to review</button>}
          </div>
        </>
      )}
      {confirm && (
        <div className="overlay"><div className="modal">
          <h2>Submit Section {exam.section + 1}?</h2>
          <p className="muted mt8">{sec.qids.length - answered > 0 ? `${sec.qids.length - answered} question(s) are unanswered and will be scored as incorrect. ` : ''}You cannot return to this section after submitting.</p>
          <div className="row mt16"><button className="btn primary" onClick={() => submitSection(ref.current)} data-testid="confirm-submit">Submit</button><button className="btn" onClick={() => setConfirm(false)}>Keep working</button></div>
        </div></div>
      )}
      {calc && <Calculator onClose={() => setCalc(false)} onTransfer={q?.format === 'numeric' && exam.phase === 'question' ? (v) => setAnswer(v) : undefined} />}
    </div>
  );
}

function Results({ r, onAgain }: { r: ExamResult; onAgain: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const all = r.sections.flatMap((s, si) => s.qids.map((id, i) => ({ si, i, q: getQuestion(id)!, answer: s.answers[i], correct: s.correct[i], timeMs: s.timeMs[i], blank: answerIsBlank(getQuestion(id)!, s.answers[i]) }))).filter((x) => x.q);
  const grp = <K extends string>(f: (x: typeof all[number]) => K) => { const m = new Map<K, { n: number; c: number }>(); for (const x of all) { const k = f(x); const e = m.get(k) ?? { n: 0, c: 0 }; e.n++; if (x.correct) e.c++; m.set(k, e); } return [...m.entries()]; };
  const totalTime = all.reduce((a, x) => a + x.timeMs, 0) / 1000;
  const timeMissed = r.sections.flatMap((s, si) => (s.timeUsedSec >= s.limitSec - 1 ? s.qids.map((id, i) => ({ blank: answerIsBlank(getQuestion(id)!, s.answers[i]), si })).filter((x) => x.blank) : [])).length;
  return (
    <div className="fade-in">
      <PageHead title={`${r.kind === 'diagnostic' ? 'Diagnostic' : r.form} — results`} sub={new Date(r.finishedAt).toLocaleString()}><button className="btn" onClick={onAgain}>Back to exams</button></PageHead>
      <div className="grid g3">
        <div className="card">
          <div className="upper">Estimated GRE Quant score</div>
          <div className="hero-score num mt8" data-testid="exam-score">{r.scaled}</div>
          <div className="mono ink2 mt8">likely range {r.range[0]}–{r.range[1]}</div>
          <div className="small muted mt8">Approximation based on your answers and question difficulty (Section 2 path: <b>{r.path}</b>). Not an official ETS score.</div>
        </div>
        <Stat label="Total correct" value={`${r.raw} / 27`} sub={`Accuracy ${pctStr(r.raw / 27)}`} />
        <Stat label="Average time per question" value={fmtTime(totalTime / 27)} sub={timeMissed ? `${timeMissed} question(s) left blank when time ran out` : 'No questions lost to the clock'} />
      </div>
      <div className="grid g2 mt16">
        {r.sections.map((s, i) => (
          <Card key={i} title={`Section ${i + 1}${i === 1 ? ` · ${r.path} path` : ' · average difficulty'}`}>
            <div className="row" style={{ gap: 24 }}>
              <div className="stat"><div className="label">Correct</div><div className="value num">{s.correct.filter(Boolean).length}/{s.qids.length}</div></div>
              <div className="stat"><div className="label">Time used</div><div className="value num">{fmtTime(s.timeUsedSec)}</div></div>
              <div className="stat"><div className="label">{s.limitSec - s.timeUsedSec > 0 ? 'Time remaining' : 'Time'}</div><div className="value num">{s.limitSec - s.timeUsedSec > 0 ? fmtTime(s.limitSec - s.timeUsedSec) : 'expired'}</div></div>
            </div>
          </Card>
        ))}
      </div>
      <TimingStrategy r={r} />
      <div className="grid g3 mt16">
        {[{ t: 'By topic', rows: grp((x) => CATEGORY_BY_ID[x.q.category].name) }, { t: 'By question type', rows: grp((x) => (x.q.di ? FORMAT_NAMES.di : FORMAT_NAMES[x.q.format])) }, { t: 'By difficulty', rows: grp((x) => `${x.q.level}. ${LEVEL_NAMES[x.q.level]}`).sort() }].map((g) => (
          <Card key={g.t} title={g.t}>
            <table className="data"><tbody>{g.rows.map(([k, v]) => <tr key={k}><td className="small">{k}</td><td className="num">{v.c}/{v.n}</td><td className="num" style={{ width: 60 }}>{pctStr(v.c / v.n)}</td></tr>)}</tbody></table>
          </Card>
        ))}
      </div>
      <Card title="Question-by-question review" className="mt16">
        {all.map((x) => {
          const k = `${x.si}-${x.i}`;
          return (
            <div key={k}>
              <button className="list-row" style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'inherit', textAlign: 'left' }} onClick={() => setOpen(open === k ? null : k)}>
                {x.correct ? <CheckCircle2 size={16} color="var(--good)" /> : x.blank ? <MinusCircle size={16} className="muted" /> : <XCircle size={16} color="var(--critical)" />}
                <span className="mono small muted" style={{ width: 44 }}>S{x.si + 1}·{x.i + 1}</span>
                <span className="grow small">{UNIT_BY_ID[x.q.unit].name} · {x.q.subtopic}</span>
                <span className="pill">{LEVEL_NAMES[x.q.level]}</span>
                <span className="mono small muted">{fmtTime(x.timeMs / 1000)}</span>
              </button>
              {open === k && <div style={{ padding: '12px 0' }} className="fade-in"><div className="q-card"><QuestionView q={x.q} answer={x.answer} onAnswer={() => {}} locked reveal autoFocus={false} /></div><Feedback q={x.q} answer={x.answer} correct={x.correct} compact /></div>}
            </div>
          );
        })}
        <div className="tiny muted mt8">Missed questions were added to the Wrong Answer Lab.</div>
      </Card>
    </div>
  );
}
