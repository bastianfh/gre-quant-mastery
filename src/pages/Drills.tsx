import { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { DRILL_KINDS, ROUND_SEC, drillStream, drillXp, type DrillItem, type DrillKind } from '../engine/drills';
import { Card, PageHead } from '../components/ui';
import { Md } from '../components/Md';
import { useStore } from '../store/store';

interface Miss { prompt: string; answer: string; given: string }
interface RoundResult { kind: DrillKind; correct: number; wrong: number; misses: Miss[]; best: number; isBest: boolean }

export default function Drills() {
  const sessions = useStore((s) => s.sessions);
  const finishSession = useStore((s) => s.finishSession);
  const [kind, setKind] = useState<DrillKind>('mixed');
  const [round, setRound] = useState(0);              // 0 = not running; otherwise the seed
  const [result, setResult] = useState<RoundResult | null>(null);

  const drillSessions = sessions.filter((x) => x.mode === 'drill');
  const bestOf = (k: DrillKind) => Math.max(0, ...drillSessions.filter((x) => x.meta?.kind === k).map((x) => x.score ?? 0));
  const recent = drillSessions.slice(-8).reverse();

  if (round) return <Round key={round} kind={kind} seed={round} onDone={async (r) => {
    const prevBest = bestOf(kind);
    await finishSession({ mode: 'drill', total: r.correct + r.wrong, correct: r.correct, score: r.correct, meta: { kind, wrong: r.wrong } }, drillXp(r.correct, r.wrong));
    setResult({ ...r, kind, best: Math.max(prevBest, r.correct), isBest: r.correct > prevBest && r.correct > 0 });
    setRound(0);
  }} onQuit={() => setRound(0)} />;

  const start = () => { setResult(null); setRound((Date.now() & 0x7fffffff) || 1); };

  return (
    <div className="fade-in">
      <PageHead title="Mental-Math Drills" sub={`${ROUND_SEC}-second rapid-fire rounds. Type the answer and press Enter. These build arithmetic fluency and don't affect topic mastery.`} />
      {result && (
        <Card title="Round complete" className="mb16">
          <div className="drill-result" data-testid="drill-result">
            <div><div className="drill-big">{result.correct}</div><div className="tiny muted">correct</div></div>
            <div><div className="drill-big muted">{result.wrong}</div><div className="tiny muted">missed or skipped</div></div>
            <div><div className="drill-big">{result.correct + result.wrong ? Math.round((100 * result.correct) / (result.correct + result.wrong)) : 0}%</div><div className="tiny muted">accuracy</div></div>
            <div><div className="drill-big">{result.best}</div><div className="tiny muted">{result.isBest ? 'new personal best!' : 'personal best'}</div></div>
          </div>
          {result.misses.length > 0 && (
            <table className="data mt16"><thead><tr><th>Prompt</th><th>Your answer</th><th>Correct</th></tr></thead>
              <tbody>{result.misses.slice(0, 12).map((m, i) => <tr key={i}><td><Md text={m.prompt} /></td><td className="mono bad">{m.given || '—'}</td><td className="mono good">{m.answer}</td></tr>)}</tbody></table>
          )}
          <button className="btn primary mt16" onClick={start}><RotateCcw size={15} /> Go again</button>
        </Card>
      )}
      <div className="grid g3">
        <Card title="Pick a drill" className="span2">
          <div className="drill-kinds" role="radiogroup" aria-label="Drill type">
            {DRILL_KINDS.map((k) => (
              <button key={k.id} role="radio" aria-checked={kind === k.id} className={`drill-kind${kind === k.id ? ' sel' : ''}`} onClick={() => setKind(k.id)} data-testid={`drill-kind-${k.id}`}>
                <b>{k.label}</b><span className="tiny muted"><Md text={k.blurb} /></span>
                <span className="tiny mono muted">best {bestOf(k.id)}</span>
              </button>
            ))}
          </div>
          <button className="btn primary lg mt16" onClick={start} data-testid="start-drill"><Play size={16} /> Start {ROUND_SEC}-second round</button>
        </Card>
        <Card title="Why drill?" action={<Brain size={14} className="muted" />}>
          <p className="small ink2"><Md text={"The on-screen calculator is slow. Knowing $15^2 = 225$, $\\tfrac{3}{8} = 37.5\\%$ and the digit-sum rule by heart saves 10–20 seconds on many questions and keeps your attention on the reasoning."} /></p>
          <p className="small ink2 mt8">Aim for 20+ correct in a mixed round before test day.</p>
        </Card>
      </div>
      <Card title="Recent rounds" className="mt16">
        {recent.length === 0 ? <div className="small muted">No rounds yet.</div> : (
          <table className="data"><thead><tr><th>When</th><th>Drill</th><th>Correct</th><th>Missed</th></tr></thead>
            <tbody>{recent.map((x) => <tr key={x.id}><td className="small">{new Date(x.ts).toLocaleString()}</td><td className="small">{DRILL_KINDS.find((k) => k.id === x.meta?.kind)?.label ?? '—'}</td><td className="mono">{x.correct}</td><td className="mono">{x.total - x.correct}</td></tr>)}</tbody></table>
        )}
      </Card>
    </div>
  );
}

function Round({ kind, seed, onDone, onQuit }: { kind: DrillKind; seed: number; onDone: (r: Omit<RoundResult, 'kind' | 'best' | 'isBest'>) => void; onQuit: () => void }) {
  const next = useMemo(() => drillStream(kind, seed), [kind, seed]);
  const [item, setItem] = useState<DrillItem>(() => next());
  const [input, setInput] = useState('');
  const [left, setLeft] = useState(ROUND_SEC);
  const [flash, setFlash] = useState<null | { ok: boolean; answer: string }>(null);
  const stats = useRef({ correct: 0, wrong: 0, misses: [] as Miss[] });
  const [, force] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ended = useRef(false);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const l = Math.max(0, ROUND_SEC - Math.floor((Date.now() - t0) / 1000));
      setLeft(l);
      if (l === 0 && !ended.current) { ended.current = true; clearInterval(id); onDone({ ...stats.current }); }
    }, 250);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!flash) inputRef.current?.focus(); }, [flash, item]);

  const advance = (ok: boolean, given: string) => {
    if (ended.current) return;
    if (ok) stats.current.correct++;
    else { stats.current.wrong++; stats.current.misses.push({ prompt: item.prompt, answer: item.answer, given }); }
    force((n) => n + 1);
    setFlash({ ok, answer: item.answer });
    setTimeout(() => { setFlash(null); setInput(''); setItem(next()); }, ok ? 220 : 1100);
  };
  const submit = () => { if (!flash && input.trim()) advance(item.check(input), input.trim()); };

  return (
    <div className="fade-in drill-round">
      <div className="row between mb16">
        <div className="row"><Timer size={16} /><span className={`mono drill-clock${left <= 10 ? ' warn' : ''}`} aria-live="off">{left}s</span></div>
        <div className="mono small" aria-live="polite">✓ {stats.current.correct} · ✗ {stats.current.wrong}</div>
        <button className="btn ghost" onClick={onQuit}>Quit</button>
      </div>
      <div className="drill-bar" aria-hidden><div style={{ width: `${(left / ROUND_SEC) * 100}%` }} /></div>
      <Card className={`drill-card${flash ? (flash.ok ? ' ok' : ' no') : ''}`}>
        <div className="drill-prompt" data-testid="drill-prompt"><Md text={item.prompt} /></div>
        <form className="drill-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input ref={inputRef} aria-label="Your answer" autoComplete="off" inputMode={item.hint === 'y / n' ? 'text' : 'decimal'} value={input} disabled={!!flash}
            placeholder={item.hint ?? 'answer'} onChange={(e) => setInput(e.target.value)} data-testid="drill-input" />
          <button className="btn primary" type="submit" disabled={!!flash || !input.trim()}>Enter</button>
          <button className="btn ghost" type="button" disabled={!!flash} onClick={() => advance(false, '')} aria-label="Skip"><SkipForward size={15} /></button>
        </form>
        <div className="drill-feedback" role="status">{flash ? (flash.ok ? <span className="good">Correct</span> : <span className="bad">Answer: <b className="mono">{flash.answer}</b></span>) : ' '}</div>
      </Card>
    </div>
  );
}
