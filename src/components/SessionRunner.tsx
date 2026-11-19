import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Calculator as CalcIcon, ChevronRight, Flag, MessageSquareWarning, SkipForward, Timer, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Attempt, Mode, Question, UserAnswer } from '../engine/types';
import { FORMAT_NAMES, LEVEL_NAMES } from '../engine/types';
import { isCorrect } from '../engine/grading';
import { UNIT_BY_ID } from '../content/curriculum';
import { useStore } from '../store/store';
import { QuestionView, answerIsBlank } from './QuestionView';
import { Feedback } from './Feedback';
import { Tutor } from './Tutor';
import { Calculator } from './Calculator';
import { fmtTime, pctStr, uid } from './ui';
import { getQuestion } from '../engine/bank';

export interface SessionResultRow { q: Question; answer: UserAnswer; correct: boolean; skipped: boolean; timeMs: number; attempt?: Attempt; timedOut?: boolean }
export interface SessionSummary { rows: SessionResultRow[]; correct: number; total: number; timeMs: number; xp: number }

export interface SessionProps {
  mode: Mode;
  title: string;
  questions: Question[];
  /** Load more questions when the list runs out (unlimited practice). */
  more?: (served: Question[]) => Question[];
  feedback?: 'immediate' | 'delayed';
  perQuestionSec?: number;
  totalSec?: number;
  allowHints?: boolean;
  allowSkip?: boolean;
  calculator?: boolean;
  srsKeys?: Record<string, string>;   // qid -> SRS item key (review sessions)
  resumeKey?: string;                 // enables interrupted-session recovery
  planBlock?: string;
  scoreLabel?: (s: SessionSummary) => { score: number; label: string; sub?: string };
  xpBonus?: (s: SessionSummary) => number;
  meta?: (s: SessionSummary) => Record<string, unknown>;
  onDone?: (s: SessionSummary) => void;
  onExit?: () => void;
  extraSummary?: (s: SessionSummary) => React.ReactNode;
}

interface Snap { key: string; qids: string[]; idx: number; rows: { qid: string; answer: UserAnswer; correct: boolean; skipped: boolean; timeMs: number }[]; startedAt: number }

export function SessionRunner(p: SessionProps) {
  const store = useStore();
  const nav = useNavigate();
  const sessionId = useMemo(uid, []);
  const [qs, setQs] = useState<Question[]>(p.questions);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<UserAnswer>(null);
  const [submitted, setSubmitted] = useState<SessionResultRow | null>(null);
  const [rows, setRows] = useState<SessionResultRow[]>([]);
  const [hints, setHints] = useState(0);
  const [calc, setCalc] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [done, setDone] = useState<SessionSummary | null>(null);
  const [report, setReport] = useState(false);
  const [confidence, setConfidence] = useState<1 | 2 | 3 | undefined>();
  const [resume, setResume] = useState<Snap | null>(null);
  const [now, setNow] = useState(Date.now());
  const qStart = useRef(Date.now());
  const sessionStart = useRef(Date.now());
  const xpRef = useRef(0);
  const feedback = p.feedback ?? store.profile.settings.feedback;
  const q = qs[idx];

  // ---- interrupted-session recovery ----
  useEffect(() => {
    if (!p.resumeKey) return;
    store.loadSnapshot<Snap>('session:' + p.resumeKey).then((s) => { if (s && s.idx < s.qids.length && s.rows.length > 0) setResume(s); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.resumeKey]);
  const doResume = () => {
    if (!resume) return;
    const restored = resume.qids.map((id) => getQuestion(id)).filter(Boolean) as Question[];
    setQs(restored);
    setRows(resume.rows.map((r) => ({ ...r, q: getQuestion(r.qid)! })).filter((r) => r.q));
    setIdx(resume.idx);
    setResume(null);
    qStart.current = Date.now();
  };
  useEffect(() => {
    if (!p.resumeKey || done) return;
    const snap: Snap = { key: p.resumeKey, qids: qs.map((x) => x.id), idx: submitted ? idx + 1 : idx, rows: rows.map((r) => ({ qid: r.q.id, answer: r.answer, correct: r.correct, skipped: r.skipped, timeMs: r.timeMs })), startedAt: sessionStart.current };
    store.snapshot('session:' + p.resumeKey, snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, idx, qs.length]);

  // ---- timers ----
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const qElapsed = (now - qStart.current) / 1000;
  const totalElapsed = (now - sessionStart.current) / 1000;
  const qLeft = p.perQuestionSec ? p.perQuestionSec - qElapsed : null;
  const totalLeft = p.totalSec ? p.totalSec - totalElapsed : null;

  const finish = useCallback(async (all: SessionResultRow[]) => {
    const answered = all.filter((r) => !r.skipped);
    const summary: SessionSummary = { rows: all, correct: answered.filter((r) => r.correct).length, total: all.length, timeMs: all.reduce((a, r) => a + r.timeMs, 0), xp: xpRef.current };
    const bonus = p.xpBonus ? p.xpBonus(summary) : 0;
    const sc = p.scoreLabel?.(summary);
    await store.finishSession({ mode: p.mode, total: summary.total, correct: summary.correct, score: sc?.score, meta: { title: p.title, timeMs: summary.timeMs, ...p.meta?.(summary) } }, bonus, p.planBlock);
    summary.xp += bonus;
    if (p.resumeKey) await store.clearSnapshot('session:' + p.resumeKey);
    setDone(summary);
    p.onDone?.(summary);
  }, [p, store]);

  const submit = useCallback(async (opts: { skip?: boolean; timedOut?: boolean } = {}) => {
    if (!q || submitted) return;
    const timeMs = Date.now() - qStart.current;
    const skipped = !!opts.skip || (opts.timedOut && answerIsBlank(q, answer));
    const correct = !skipped && isCorrect(q, answer);
    const { attempt, xp } = await store.recordAttempt({ q, answer, correct, timeMs, mode: p.mode, sessionId, hintsUsed: hints, timeLimitSec: p.perQuestionSec, isReview: !!p.srsKeys?.[q.id], srsKey: p.srsKeys?.[q.id], confidence, skipped: !!opts.skip });
    xpRef.current += xp;
    const row: SessionResultRow = { q, answer, correct, skipped: !!opts.skip, timeMs, attempt, timedOut: opts.timedOut };
    const all = [...rows, row];
    setRows(all);
    if (feedback === 'immediate' && !opts.skip) setSubmitted(row);
    else advance(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, submitted, answer, hints, rows, feedback, confidence]);

  const advance = (all = rows) => {
    let list = qs;
    if (idx + 1 >= list.length && p.more) { const extra = p.more(list); if (extra.length) { list = [...list, ...extra]; setQs(list); } }
    if (idx + 1 >= list.length) { finish(all); return; }
    setIdx(idx + 1); setAnswer(null); setSubmitted(null); setHints(0); setConfidence(undefined); setShowTutor(false);
    qStart.current = Date.now();
  };

  // auto-submit on per-question timeout; end session on total timeout
  useEffect(() => { if (qLeft !== null && qLeft <= 0 && !submitted && !done && q) submit({ timedOut: true }); }, [qLeft, submitted, done, q, submit]);
  useEffect(() => { if (totalLeft !== null && totalLeft <= 0 && !done) { if (!submitted && q) submit({ timedOut: true }).then(() => {}); else finish(rows); } }, [totalLeft]); // eslint-disable-line

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q || calc) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === 'Enter' && tag !== 'TEXTAREA') {
        if (tag === 'INPUT' && (e.target as HTMLInputElement).getAttribute('aria-label') === 'Ask the tutor') return;
        e.preventDefault();
        if (submitted) advance(); else if (!answerIsBlank(q, answer)) submit();
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || submitted) return;
      const n = 'abcdefgh'.indexOf(e.key.toLowerCase());
      const num = Number(e.key) - 1;
      const k = n >= 0 ? n : num >= 0 && num < 8 ? num : -1;
      const count = q.format === 'qc' ? 4 : q.choices?.length ?? 0;
      if (k >= 0 && k < count && q.format !== 'numeric') {
        if (q.format === 'multi') { const cur = Array.isArray(answer) ? answer : []; setAnswer(cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k].sort()); }
        else setAnswer(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (resume) {
    return (
      <div className="q-wrap"><div className="card">
        <h2>Resume your previous session?</h2>
        <p className="muted mt8">You left “{p.title}” after {resume.rows.length} of {resume.qids.length} questions. Answers you submitted were already saved.</p>
        <div className="row mt16"><button className="btn primary" onClick={doResume}>Resume</button><button className="btn" onClick={() => { store.clearSnapshot('session:' + p.resumeKey); setResume(null); }}>Start fresh</button></div>
      </div></div>
    );
  }

  if (done) return <Summary s={done} p={p} onAgain={() => nav(0)} />;
  if (!q) return <div className="q-wrap"><div className="card empty">No questions match these settings. Try widening the filters.</div></div>;

  const unit = UNIT_BY_ID[q.unit];
  const saved = store.profile.bookmarks.includes(q.id), flagged = store.profile.flagged.includes(q.id);
  const timerCls = (left: number | null, limit?: number) => (left === null ? '' : left < 10 || (limit && left < limit * 0.15) ? 'danger' : left < 30 ? 'warn' : '');
  return (
    <div className="q-wrap" style={{ maxWidth: showTutor ? 1180 : 860 }}>
      <div className="exam-bar">
        <b>{p.title}</b>
        <span className="muted small">Question {idx + 1}{p.more ? '' : ` of ${qs.length}`}</span>
        <span className="grow" />
        {store.profile.settings.showTimer && (qLeft !== null ? <span className={`timer ${timerCls(qLeft, p.perQuestionSec)}`} aria-label="Time left for this question"><Timer size={13} style={{ verticalAlign: -2 }} /> {fmtTime(qLeft)}</span>
          : totalLeft !== null ? <span className={`timer ${timerCls(totalLeft, p.totalSec)}`}>{fmtTime(totalLeft)}</span>
          : <span className="timer" aria-label="Elapsed">{fmtTime(qElapsed)}</span>)}
        {p.calculator !== false && <button className={`btn sm ${calc ? 'active' : ''}`} onClick={() => setCalc(!calc)} aria-label="Calculator"><CalcIcon size={14} /> Calc</button>}
        {p.onExit && <button className="btn sm ghost" onClick={() => (rows.length ? finish(rows) : p.onExit!())}>End</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: showTutor ? 'minmax(0,1fr) 340px' : '1fr', gap: 16 }} className="session-grid">
        <div>
          <div className="q-meta">
            <span className="pill">{q.di ? FORMAT_NAMES.di : FORMAT_NAMES[q.format]}</span>
            <span className="pill">{LEVEL_NAMES[q.level]}</span>
            {p.mode !== 'mock' && <span className="pill">{unit?.name}</span>}
            {p.srsKeys?.[q.id] && <span className="pill" style={{ color: 'var(--accent)' }}>{q.id === p.srsKeys[q.id] ? 'Review · original' : 'Review · concept variant'}</span>}
            <span className="grow" />
            <button className={`btn sm ghost ${saved ? 'active' : ''}`} onClick={() => store.toggleList('bookmarks', q.id)} aria-label="Save question"><Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</button>
            <button className={`btn sm ghost ${flagged ? 'active' : ''}`} onClick={() => store.toggleList('flagged', q.id)} aria-label="Flag question"><Flag size={14} fill={flagged ? 'currentColor' : 'none'} /></button>
            <button className="btn sm ghost" onClick={() => setReport(true)} aria-label="Report question"><MessageSquareWarning size={14} /></button>
          </div>
          <div className="q-card fade-in" key={q.id}>
            <QuestionView q={q} answer={answer} onAnswer={setAnswer} locked={!!submitted} reveal={!!submitted} />
            {store.profile.settings.confidencePrompt && !submitted && (
              <div className="row mt16 small"><span className="muted">Confidence:</span>{([1, 2, 3] as const).map((c) => <button key={c} className={`chip ${confidence === c ? 'on' : ''}`} onClick={() => setConfidence(c)}>{['Guess', 'Unsure', 'Sure'][c - 1]}</button>)}</div>
            )}
            <div className="q-actions">
              <div className="row">
                {p.allowHints !== false && <button className={`btn sm ${showTutor ? 'active' : ''}`} onClick={() => setShowTutor(!showTutor)}>Hints & tutor</button>}
                {p.allowSkip !== false && !submitted && <button className="btn sm ghost" onClick={() => submit({ skip: true })}><SkipForward size={14} /> Skip</button>}
              </div>
              {!submitted ? <button className="btn primary" disabled={answerIsBlank(q, answer)} onClick={() => submit()} data-testid="submit">Submit <span className="kbd" style={{ color: 'inherit', borderColor: 'currentColor', opacity: .6 }}>Enter</span></button>
                : <button className="btn primary" onClick={() => advance()} data-testid="next">{idx + 1 >= qs.length && !p.more ? 'Finish' : 'Next'} <ChevronRight size={15} /></button>}
            </div>
          </div>
          {submitted && <Feedback q={q} answer={submitted.answer} correct={submitted.correct} attempt={submitted.attempt} />}
          {submitted?.timedOut && <div className="callout warn mt8"><div className="t">Time expired</div>The question was submitted automatically when the {p.perQuestionSec}s limit ran out.</div>}
        </div>
        {showTutor && <Tutor q={q} revealed={!!submitted} answer={submitted?.answer} hintsUsed={hints} onHint={setHints} />}
      </div>
      {calc && <Calculator onClose={() => setCalc(false)} onTransfer={q.format === 'numeric' && !submitted ? (v) => setAnswer(v) : undefined} />}
      {report && <ReportModal qid={q.id} onClose={() => setReport(false)} />}
    </div>
  );
}

function ReportModal({ qid, onClose }: { qid: string; onClose: () => void }) {
  const [note, setNote] = useState('');
  const report = useStore((s) => s.reportQuestion);
  return (
    <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2>Report this question</h2>
      <p className="muted small mt8">Describe what looks wrong (answer, wording, figure). The question is flagged and saved with your note; you can export reports from Settings.</p>
      <textarea rows={4} style={{ width: '100%' }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I believe the answer should be (C) because…" />
      <div className="tiny muted mt8 mono">{qid}</div>
      <div className="row mt16"><button className="btn primary" disabled={!note.trim()} onClick={() => { report(qid, note); onClose(); }}>Submit report</button><button className="btn" onClick={onClose}>Cancel</button></div>
    </div></div>
  );
}

function Summary({ s, p, onAgain }: { s: SessionSummary; p: SessionProps; onAgain: () => void }) {
  const [open, setOpen] = useState<number | null>(p.feedback === 'delayed' ? 0 : null);
  const answered = s.rows.filter((r) => !r.skipped);
  const acc = answered.length ? s.correct / answered.length : 0;
  const sc = p.scoreLabel?.(s);
  const misses = s.rows.filter((r) => !r.correct && !r.skipped).length;
  const nav = useNavigate();
  return (
    <div className="q-wrap fade-in">
      <div className="card">
        <div className="row between wrap">
          <div><div className="upper">{p.title} · complete</div><h1 className="mt8 row" style={{ gap: 10 }}><Trophy size={22} color="var(--warning)" /> {sc ? <>{sc.label}</> : <>{s.correct} / {answered.length} correct</>}</h1>{sc?.sub && <div className="muted mt8">{sc.sub}</div>}</div>
          <div className="row" style={{ gap: 24 }}>
            <div className="stat"><div className="label">Accuracy</div><div className="value num">{pctStr(acc)}</div></div>
            <div className="stat"><div className="label">Avg time</div><div className="value num">{fmtTime(answered.length ? s.timeMs / answered.length / 1000 : 0)}</div></div>
            <div className="stat"><div className="label">XP earned</div><div className="value num" style={{ color: 'var(--accent)' }}>+{s.xp}</div></div>
          </div>
        </div>
        {p.extraSummary?.(s)}
        <div className="row wrap mt16">
          <button className="btn primary" onClick={onAgain}><RotateCcw size={14} /> Go again</button>
          {misses > 0 && <button className="btn" onClick={() => nav('/lab')}>Review {misses} mistake{misses > 1 ? 's' : ''} in the Wrong Answer Lab</button>}
          <button className="btn ghost" onClick={() => nav('/')}>Dashboard</button>
        </div>
      </div>
      <div className="card mt16">
        <div className="card-head"><h3>Question review</h3><span className="tiny muted">click a row for the full explanation</span></div>
        {s.rows.map((r, i) => (
          <div key={i}>
            <button className="list-row" style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }} onClick={() => setOpen(open === i ? null : i)}>
              {r.skipped ? <SkipForward size={16} className="muted" /> : r.correct ? <CheckCircle2 size={16} color="var(--good)" /> : <XCircle size={16} color="var(--critical)" />}
              <span className="mono small muted" style={{ width: 24 }}>{i + 1}</span>
              <span className="grow small">{UNIT_BY_ID[r.q.unit]?.name} · {r.q.subtopic}</span>
              <span className="pill">{LEVEL_NAMES[r.q.level]}</span>
              <span className="mono small muted">{fmtTime(r.timeMs / 1000)}</span>
            </button>
            {open === i && <div className="fade-in" style={{ padding: '12px 0' }}><div className="q-card"><QuestionView q={r.q} answer={r.answer} onAnswer={() => {}} locked reveal autoFocus={false} /></div><Feedback q={r.q} answer={r.answer} correct={r.correct} attempt={r.attempt} /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
