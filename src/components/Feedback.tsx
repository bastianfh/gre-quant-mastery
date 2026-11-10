import { CheckCircle2, XCircle, Lightbulb, AlertTriangle, Zap, BookOpen, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Attempt, ErrorType, Question, UserAnswer } from '../engine/types';
import { ERROR_TYPE_NAMES } from '../engine/types';
import { answerText, diagnose, userAnswerText } from '../engine/grading';
import { UNIT_BY_ID } from '../content/curriculum';
import { Md } from './Md';
import { useStore } from '../store/store';
import { fmtTime } from './ui';

export function Feedback({ q, answer, correct, attempt, compact }: { q: Question; answer: UserAnswer; correct: boolean; attempt?: Attempt; compact?: boolean }) {
  const setErrorType = useStore((s) => s.setErrorType);
  const live = useStore((s) => (attempt?.id ? s.attempts.find((a) => a.id === attempt.id) : undefined));
  const notes = correct ? [] : diagnose(q, answer);
  const tagged = live?.errorType ?? attempt?.errorType;
  const auto = attempt?.autoErrorType;
  const timeSec = attempt ? attempt.timeMs / 1000 : null;
  const unit = UNIT_BY_ID[q.unit];
  return (
    <div className="feedback" data-testid="feedback">
      <div className={`feedback-head ${correct ? 'ok' : 'no'}`}>
        {correct ? <CheckCircle2 size={18} color="var(--good)" /> : <XCircle size={18} color="var(--critical)" />}
        <span>{correct ? 'Correct' : attempt?.skipped ? 'Skipped' : 'Incorrect'}</span>
        {timeSec !== null && (
          <span className="row small ink2" style={{ marginLeft: 'auto', gap: 6, fontWeight: 500 }}>
            <Clock size={13} /> {fmtTime(timeSec)} <span className="muted">/ target {fmtTime(q.timeSec)}</span>
            {timeSec > q.timeSec * 1.5 && <span className="pill" style={{ color: 'var(--warning)' }}>slow</span>}
          </span>
        )}
      </div>
      <div className="feedback-body">
        <div><span className="upper">Correct answer</span><div className="mt8"><Md text={answerText(q)} /></div>{!correct && !attempt?.skipped && <div className="small muted mt8">Your answer: <Md text={userAnswerText(q, answer)} /></div>}</div>
        {!correct && notes.length > 0 && (
          <div className="callout bad"><div className="t"><AlertTriangle size={13} /> Why your answer is wrong</div>{notes.map((n, i) => <div key={i}><Md text={n} /></div>)}</div>
        )}
        <div>
          <span className="upper">Solution</span>
          <ol className="mt8">{q.explanation.map((s, i) => <li key={i}><Md text={s} /></li>)}</ol>
        </div>
        {q.altMethod && <div className="callout good"><div className="t"><Zap size={13} /> Fastest reliable method</div><Md text={q.altMethod} /></div>}
        <div className="callout warn"><div className="t"><Lightbulb size={13} /> {correct ? 'Common trap' : 'Likely misconception'}</div><Md text={q.trap} /></div>
        {!correct && attempt?.id !== undefined && !compact && (
          <div>
            <span className="upper">What went wrong? (tag it — the Wrong Answer Lab groups mistakes by cause)</span>
            <div className="row wrap mt8" style={{ gap: 6 }}>
              {(Object.keys(ERROR_TYPE_NAMES) as ErrorType[]).map((t) => (
                <button key={t} className={`chip ${tagged === t ? 'on' : ''}`} onClick={() => setErrorType(attempt.id!, t)}>
                  {ERROR_TYPE_NAMES[t]}{!tagged && auto === t ? ' · suggested' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
        {unit && !compact && <div className="row small"><BookOpen size={14} className="muted" /><span className="muted">Concept:</span><Link to={`/learn/${unit.id}`}>{unit.name}</Link><span className="muted">· {q.subtopic}</span></div>}
      </div>
    </div>
  );
}
