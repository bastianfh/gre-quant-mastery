import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GraduationCap, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { UNITS, UNIT_BY_ID, CATEGORY_BY_ID } from '../content/curriculum';
import { LESSONS } from '../content/lessons';
import { pickQuestions } from '../engine/selection';
import { isCorrect } from '../engine/grading';
import type { Question, UserAnswer } from '../engine/types';
import { Md } from '../components/Md';
import { QuestionView, answerIsBlank } from '../components/QuestionView';
import { Feedback } from '../components/Feedback';
import { SessionRunner } from '../components/SessionRunner';
import { BandTag, Card } from '../components/ui';
import { useStore } from '../store/store';
import { usePickCtx, useDerived } from '../store/hooks';
import { uid } from '../components/ui';

export default function LessonPage() {
  const { unit = '' } = useParams();
  const u = UNIT_BY_ID[unit];
  const lesson = LESSONS[unit];
  const s = useStore();
  const d = useDerived();
  const ctx = usePickCtx();
  const [check, setCheck] = useState(0);
  const practice = useMemo(() => (u ? pickQuestions({ units: [unit], levels: [1, 2, 3] }, 3, ctx, { seed: 11, adaptive: false, sortByLevel: true }) : []), [unit]); // eslint-disable-line
  const checkQs = useMemo(() => (check ? pickQuestions({ units: [unit], levels: [2, 3, 4] }, 6, ctx, { adaptive: false, sortByLevel: true }) : []), [check]); // eslint-disable-line
  if (!u || !lesson) return <Card>Lesson not found. <Link to="/learn">Back to curriculum</Link></Card>;
  const i = UNITS.findIndex((x) => x.id === unit);
  const prev = UNITS[i - 1], next = UNITS[i + 1];
  const m = d.unitMastery[unit];

  if (check) return (
    <SessionRunner key={check} mode="mastery" title={`Mastery check · ${u.name}`} questions={checkQs} feedback="delayed" allowHints={false}
      scoreLabel={(x) => { const pct = Math.round((x.correct / Math.max(1, x.total)) * 100); return { score: pct, label: `${pct}% — ${pct >= 80 ? 'passed' : 'not yet'}`, sub: pct >= 80 ? 'Mastery check passed (≥80%). Topic mastery still grows with harder practice over time.' : 'Pass mark is 80%. Review the explanations, then retry.' }; }}
      onDone={(x) => { const pct = Math.round((x.correct / Math.max(1, x.total)) * 100); s.setLessonMastery(unit, pct); if (pct >= 80) s.completeLesson(unit); }}
      onExit={() => setCheck(0)} />
  );

  return (
    <div className="fade-in lesson" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="row between wrap mb16">
        <Link to="/learn" className="small">← Curriculum</Link>
        <div className="row small">{prev && <Link to={`/learn/${prev.id}`} className="btn sm ghost"><ChevronLeft size={14} /> {prev.name}</Link>}{next && <Link to={`/learn/${next.id}`} className="btn sm ghost">{next.name} <ChevronRight size={14} /></Link>}</div>
      </div>
      <div className="upper row" style={{ gap: 6 }}><i className="dot" style={{ background: CATEGORY_BY_ID[u.category].color }} />{CATEGORY_BY_ID[u.category].name}</div>
      <h1 className="mt8">{u.name}</h1>
      <div className="row mt8 wrap"><BandTag band={m.band} /><span className="small muted">{m.n ? `${m.score}% mastery from ${m.n} attempts` : 'No attempts yet'}{s.profile.lessonMastery[unit] !== undefined ? ` · best mastery check ${s.profile.lessonMastery[unit]}%` : ''}</span>{s.profile.lessonsCompleted[unit] && <span className="pill good"><CheckCircle2 size={11} /> Completed</span>}</div>
      <p className="mt16" style={{ fontSize: 15, lineHeight: 1.75 }}><Md text={lesson.intro} /></p>

      <h2>1 · Essential concepts</h2>
      {lesson.concepts.map((c) => <div key={c.title} className="concept"><b>{c.title}.</b> <Md text={c.body} /></div>)}

      <h2>2 · Key formulas</h2>
      <Card className="tight">{lesson.formulas.map((f) => <div key={f.label} className="formula-row"><span className="small ink2" style={{ width: 200, flex: 'none' }}>{f.label}</span><div className="tex"><Md text={`$${f.tex}$`} /></div></div>)}</Card>

      <h2>3 · Rules to remember</h2>
      <ul style={{ lineHeight: 1.8, paddingLeft: 18 }}>{lesson.rules.map((r) => <li key={r}><Md text={r} /></li>)}</ul>

      <h2>4 · Worked examples</h2>
      {lesson.examples.map((e, k) => <WorkedExample key={k} n={k + 1} e={e} />)}

      <h2>5 · Common mistakes</h2>
      <div className="col" style={{ gap: 8 }}>{lesson.mistakes.map((x) => <div key={x} className="callout bad"><div className="t"><AlertTriangle size={12} /> Trap</div><Md text={x} /></div>)}</div>

      <h2>6 · GRE strategies</h2>
      <div className="col" style={{ gap: 8 }}>{lesson.strategies.map((x) => <div key={x} className="callout good"><div className="t"><Lightbulb size={12} /> Strategy</div><Md text={x} /></div>)}</div>

      <h2>7 · Practice questions</h2>
      <div className="col">{practice.map((q, k) => <InlinePractice key={q.id} q={q} n={k + 1} />)}</div>
      <div className="small mt8"><Link to={`/practice?units=${unit}&n=10`}>More adaptive practice on this topic →</Link></div>

      <h2>8 · Mastery assessment</h2>
      <Card>
        <div className="row between wrap">
          <div><b>6 questions · Easy → Hard · pass mark 80%</b><div className="small muted mt8">Results feed your topic mastery and the study plan. Passing completes the lesson.</div></div>
          <div className="row">
            {!s.profile.lessonsCompleted[unit] && <button className="btn" onClick={() => s.completeLesson(unit)}>Mark as read</button>}
            <button className="btn primary" onClick={() => setCheck(Date.now())} data-testid="start-mastery"><GraduationCap size={15} /> Start mastery check</button>
          </div>
        </div>
      </Card>
      <div className="row between mt24">{prev ? <Link to={`/learn/${prev.id}`} className="btn ghost"><ChevronLeft size={14} /> {prev.name}</Link> : <span />}{next && <Link to={`/learn/${next.id}`} className="btn">{next.name} <ChevronRight size={14} /></Link>}</div>
    </div>
  );
}

function WorkedExample({ n, e }: { n: number; e: { problem: string; steps: string[]; answer: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="tight mb8">
      <div className="upper">Example {n}</div>
      <div className="mt8" style={{ lineHeight: 1.7 }}><Md text={e.problem} /></div>
      {!open ? <button className="btn sm mt8" onClick={() => setOpen(true)}>Show solution</button> : (
        <div className="fade-in mt8"><ol style={{ lineHeight: 1.75, paddingLeft: 20, margin: 0 }}>{e.steps.map((st, i) => <li key={i}><Md text={st} /></li>)}</ol><div className="mt8"><b>Answer:</b> <Md text={e.answer} /></div></div>
      )}
    </Card>
  );
}

function InlinePractice({ q, n }: { q: Question; n: number }) {
  const [a, setA] = useState<UserAnswer>(null);
  const [res, setRes] = useState<{ correct: boolean; attempt: any } | null>(null);
  const [t0] = useState(Date.now());
  const record = useStore((s) => s.recordAttempt);
  const [sid] = useState(uid);
  return (
    <Card className="tight">
      <div className="upper mb8">Practice {n}</div>
      <QuestionView q={q} answer={a} onAnswer={setA} locked={!!res} reveal={!!res} autoFocus={false} />
      {!res && <button className="btn sm primary mt8" disabled={answerIsBlank(q, a)} onClick={async () => { const c = isCorrect(q, a); const r = await record({ q, answer: a, correct: c, timeMs: Date.now() - t0, mode: 'learn', sessionId: sid }); setRes({ correct: c, attempt: r.attempt }); }}>Check answer</button>}
      {res && <Feedback q={q} answer={a} correct={res.correct} attempt={res.attempt} compact />}
    </Card>
  );
}
