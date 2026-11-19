import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import type { NumericAnswer, Question, UserAnswer } from '../engine/types';
import { QC_CHOICES } from '../engine/types';
import { Md } from './Md';
import { Diagram } from './Diagram';

const L = 'ABCDEFGH';

export function QuestionView({ q, answer, onAnswer, locked, reveal, autoFocus = true }: { q: Question; answer: UserAnswer; onAnswer: (a: UserAnswer) => void; locked?: boolean; reveal?: boolean; autoFocus?: boolean }) {
  const isFraction = q.format === 'numeric' && (q.answer as NumericAnswer).kind === 'fraction';
  return (
    <div>
      {q.format === 'qc' ? (
        <>
          {q.qc!.given && <div className="qc-given"><Md text={q.qc!.given} /></div>}
          {q.diagram && <Diagram d={q.diagram} />}
          <div className="qc-table" role="table" aria-label="Quantities">
            <div className="qc-row" role="row"><div className="qh" role="columnheader">Quantity A</div><div className="qh" role="columnheader">Quantity B</div></div>
            <div className="qc-row" role="row"><div role="cell"><Md text={q.qc!.a} /></div><div role="cell"><Md text={q.qc!.b} /></div></div>
          </div>
          <div className="small muted">Compare Quantity A and Quantity B, using additional information centered above the two quantities if such information is given.</div>
        </>
      ) : (
        <>
          <div className="q-stem"><Md text={q.stem} block /></div>
          {q.diagram && <Diagram d={q.diagram} />}
        </>
      )}
      {q.format === 'multi' && <div className="small muted mt8">Select <b>all</b> answer choices that apply.</div>}
      {(q.format === 'qc' || q.format === 'mcq' || q.format === 'multi') && (
        <div className="choices" role={q.format === 'multi' ? 'group' : 'radiogroup'}>
          {(q.format === 'qc' ? QC_CHOICES : q.choices!).map((c, i) => {
            const multi = q.format === 'multi';
            const sel = multi ? Array.isArray(answer) && answer.includes(i) : answer === i;
            const isRight = multi ? (q.answer as number[]).includes(i) : q.answer === i;
            const cls = ['choice', multi ? 'check' : 'radio', !reveal && sel ? 'sel' : '', reveal && isRight ? 'right' : '', reveal && sel && !isRight ? 'wrong' : ''].join(' ');
            return (
              <button key={i} className={cls} disabled={locked} aria-pressed={sel}
                onClick={() => {
                  if (multi) { const cur = Array.isArray(answer) ? answer : []; onAnswer(cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()); }
                  else onAnswer(i);
                }}>
                <span className="key">{L[i]}</span>
                <span className="grow"><Md text={c} /></span>
                {reveal && isRight && <span className="mark good"><Check size={16} /></span>}
                {reveal && sel && !isRight && <span className="mark bad"><X size={16} /></span>}
              </button>
            );
          })}
        </div>
      )}
      {q.format === 'numeric' && <NumericEntry fraction={isFraction} value={typeof answer === 'string' ? answer : ''} onChange={onAnswer} locked={locked} unit={q.unitLabel} autoFocus={autoFocus} />}
    </div>
  );
}

function NumericEntry({ fraction, value, onChange, locked, unit, autoFocus }: { fraction: boolean; value: string; onChange: (v: string) => void; locked?: boolean; unit?: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus && !locked) ref.current?.focus({ preventScroll: true }); }, [autoFocus, locked]);
  const clean = (s: string) => s.replace(/[^0-9.\-,]/g, '');
  if (fraction) {
    const [n, d] = value.includes('/') ? value.split('/') : [value, ''];
    return (
      <div className="numeric-entry">
        <div className="frac-entry" aria-label="Fraction entry">
          <input ref={ref} aria-label="Numerator" inputMode="decimal" value={n} disabled={locked} onChange={(e) => onChange(`${clean(e.target.value)}/${d}`)} />
          <div className="line" />
          <input aria-label="Denominator" inputMode="decimal" value={d} disabled={locked} onChange={(e) => onChange(`${n}/${clean(e.target.value)}`)} />
        </div>
        <span className="small muted">Enter a fraction. It does not need to be reduced.</span>
      </div>
    );
  }
  return (
    <div className="numeric-entry">
      <input ref={ref} aria-label="Numeric answer" inputMode="decimal" placeholder="Enter a number" value={value} disabled={locked} onChange={(e) => onChange(e.target.value.replace(/[^0-9.\-,/]/g, ''))} />
      {unit && <span className="ink2">{unit}</span>}
      <span className="small muted">Integer or decimal; use a minus sign for negatives.</span>
    </div>
  );
}

export function answerIsBlank(q: Question, a: UserAnswer) {
  if (a === null || a === undefined) return true;
  if (q.format === 'multi') return !Array.isArray(a) || a.length === 0;
  if (q.format === 'numeric') { const s = String(a); return !s.replace('/', '').trim() || /\/$/.test(s) || /^\//.test(s); }
  return false;
}
