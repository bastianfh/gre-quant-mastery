import { useEffect, useRef, useState } from 'react';
import { Bot, Lightbulb, Send, Sparkles, Shuffle } from 'lucide-react';
import type { Question, UserAnswer } from '../engine/types';
import { Md } from './Md';
import { aiStatus, askTutor, questionContext, type AiStatus } from '../lib/ai';
import { LESSONS } from '../content/lessons';
import { UNIT_BY_ID } from '../content/curriculum';
import { diagnose, isCorrect } from '../engine/grading';
import { makeVariant } from '../engine/bank';
import { computeDerived } from '../store/derived';
import { useStore } from '../store/store';
import { QuestionView, answerIsBlank } from './QuestionView';
import { Feedback } from './Feedback';
import type { Band } from '../engine/mastery';

type Msg = { role: 'user' | 'assistant'; content: string; offline?: boolean };

/** Three-level hints + tutor chat. Before the answer is revealed, the tutor never gives the answer away. */
export function Tutor({ q, revealed, answer, hintsUsed, onHint }: { q: Question; revealed: boolean; answer?: UserAnswer; hintsUsed: number; onHint: (n: number) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [similar, setSimilar] = useState<Question | null>(null);
  const [simAns, setSimAns] = useState<UserAnswer>(null);
  const [simDone, setSimDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const state = useStore();
  const band: Band = computeDerived(state).unitMastery[q.unit]?.band ?? 'unrated';
  useEffect(() => { aiStatus().then(setAi); }, []);
  useEffect(() => { setMsgs([]); setSimilar(null); }, [q.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs]);
  const lesson = LESSONS[q.unit];
  const unit = UNIT_BY_ID[q.unit];
  const novice = band === 'critical' || band === 'developing' || band === 'unrated';

  const offline = (intent: string): string => {
    switch (intent) {
      case 'concept': {
        if (!lesson) return `This question tests **${q.subtopic}** (${unit?.name}).`;
        const c = lesson.concepts.slice(0, novice ? 3 : 1).map((x) => `**${x.title}.** ${x.body}`).join('\n\n');
        const f = lesson.formulas.slice(0, 3).map((x) => `${x.label}: $${x.tex}$`).join('  ·  ');
        return `This question tests **${q.subtopic}**.\n\n${c}${f ? `\n\nKey formulas: ${f}` : ''}`;
      }
      case 'strategy': return lesson ? `Strategies for ${unit?.name}:\n\n${lesson.strategies.slice(0, 3).map((s) => '• ' + s).join('\n')}${revealed && q.altMethod ? `\n\n**For this question:** ${q.altMethod}` : ''}` : q.altMethod ?? 'Start by identifying what is asked, then write one equation.';
      case 'wrong': {
        if (!revealed) return 'Submit an answer first — then I can diagnose exactly where it went wrong.';
        if (answer === undefined || isCorrect(q, answer ?? null)) return 'Your answer was correct. The key step was: ' + q.explanation[0];
        const d = diagnose(q, answer ?? null);
        return (d.length ? d.join('\n\n') + '\n\n' : '') + `The underlying misconception is usually this: ${q.trap}\n\nWorking it properly: ${q.explanation.slice(0, 2).join(' ')}`;
      }
      case 'trap': return `Watch out: ${q.trap}${lesson ? `\n\nOther common mistakes in this topic:\n${lesson.mistakes.slice(0, 2).map((m) => '• ' + m).join('\n')}` : ''}`;
      case 'solve': return revealed ? q.explanation.map((s, i) => `${i + 1}. ${s}`).join('\n') : `I won't reveal the solution before you answer. Here's the next nudge:\n\n${q.hints[Math.min(2, hintsUsed)]}`;
      default: return '';
    }
  };
  const route = (text: string) => {
    const t = text.toLowerCase();
    if (/wrong|mistake|why (did|is)/.test(t)) return 'wrong';
    if (/trap|careful|avoid/.test(t)) return 'trap';
    if (/fast|shortcut|quick|strategy|approach|method/.test(t)) return 'strategy';
    if (/solve|solution|answer|steps/.test(t)) return 'solve';
    return 'concept';
  };

  const send = async (text: string, intent?: string) => {
    if (!text.trim()) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next); setInput('');
    if (ai?.available) {
      setBusy(true);
      try {
        const reply = await askTutor({ context: questionContext(q, revealed), messages: next.map(({ role, content }) => ({ role, content })), skill: band, revealed });
        setMsgs([...next, { role: 'assistant', content: reply }]);
      } catch (e) {
        setMsgs([...next, { role: 'assistant', content: `${offline(intent ?? route(text))}\n\n_(AI tutor unavailable: ${(e as Error).message}. Showing built-in guidance.)_`, offline: true }]);
      } finally { setBusy(false); }
    } else {
      setMsgs([...next, { role: 'assistant', content: offline(intent ?? route(text)), offline: true }]);
    }
  };

  const makeSimilar = () => {
    const v = makeVariant(q.generatorId, q.level, new Set([q.id]));
    setSimilar(v); setSimAns(null); setSimDone(false);
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="card tight">
        <div className="row between"><span className="upper row" style={{ gap: 6 }}><Lightbulb size={13} /> Hints</span><span className="tiny muted">{hintsUsed}/3 used{hintsUsed ? ' · hints reduce XP' : ''}</span></div>
        <div className="col mt8" style={{ gap: 8 }}>
          {q.hints.slice(0, hintsUsed).map((h, i) => <div key={i} className="callout"><div className="t">Hint {i + 1} · {['Concept', 'Formula / strategy', 'Next step'][i]}</div><Md text={h} /></div>)}
          {hintsUsed < 3 && !revealed && <button className="btn sm" onClick={() => onHint(hintsUsed + 1)}>Show hint {hintsUsed + 1}: {['a conceptual clue', 'the relevant formula or strategy', 'an explicit next step'][hintsUsed]}</button>}
        </div>
      </div>
      <div className="card tight">
        <div className="row between"><span className="upper row" style={{ gap: 6 }}><Bot size={13} /> Tutor</span><span className="tiny muted">{ai === null ? '…' : ai.available ? `AI · ${ai.model}` : 'Built-in (offline)'}</span></div>
        <div className="row wrap mt8" style={{ gap: 6 }}>
          <button className="chip" onClick={() => send('Explain the concept behind this question.', 'concept')}>Explain concept</button>
          <button className="chip" onClick={() => send('What is the fastest strategy here?', 'strategy')}>Fastest approach</button>
          <button className="chip" onClick={() => send('What trap should I avoid?', 'trap')}>Common trap</button>
          {revealed && <button className="chip" onClick={() => send('Why was my answer wrong?', 'wrong')}>Why was I wrong?</button>}
          <button className="chip" onClick={makeSimilar}><Shuffle size={12} /> Similar question</button>
        </div>
        {msgs.length > 0 && (
          <div className="col mt8" style={{ gap: 8, maxHeight: 340, overflowY: 'auto' }}>
            {msgs.map((m, i) => <div key={i} className={`tutor-msg ${m.role === 'user' ? 'me' : ''}`} style={{ whiteSpace: 'pre-wrap' }}><Md text={m.content} /></div>)}
            {busy && <div className="tutor-msg muted"><Sparkles size={13} /> Thinking…</div>}
            <div ref={endRef} />
          </div>
        )}
        <form className="row mt8" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input className="grow" placeholder={revealed ? 'Ask anything about this question…' : 'Ask for guidance (no spoilers)…'} value={input} onChange={(e) => setInput(e.target.value)} aria-label="Ask the tutor" />
          <button className="btn icon" type="submit" aria-label="Send" disabled={busy}><Send size={14} /></button>
        </form>
      </div>
      {similar && (
        <div className="card tight fade-in">
          <div className="upper mb8">Similar question · same concept, new numbers</div>
          <QuestionView q={similar} answer={simAns} onAnswer={setSimAns} locked={simDone} reveal={simDone} autoFocus={false} />
          <div className="row mt8">{!simDone ? <button className="btn sm primary" disabled={answerIsBlank(similar, simAns)} onClick={() => setSimDone(true)}>Check</button> : <button className="btn sm" onClick={makeSimilar}>Another one</button>}</div>
          {simDone && <Feedback q={similar} answer={simAns} correct={isCorrect(similar, simAns)} compact />}
        </div>
      )}
    </div>
  );
}
