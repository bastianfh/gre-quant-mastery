import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { useStore } from '../store/store';
import { UNIT_BY_ID } from '../content/curriculum';
import { FORMULAS } from '../content/formulas';
import { LESSONS } from '../content/lessons';
import { Md } from './Md';
import { fmtTime } from './ui';

const ALL_FORMULAS = FORMULAS.flatMap((s) => s.items);
const DEFAULT_FORMULAS = ['pchange', 'pyth', 'comb', 'mean'];
const PAD_KEY = 'gqm-scratchpad';

/** Right rail: recent attempts, quick formulas, and a scratchpad (presentation only — reads the store, never writes it). */
export function RightRail() {
  const attempts = useStore((s) => s.attempts);
  const marks = useStore((s) => s.profile.formulaBookmarks);
  const loc = useLocation();
  const [pad, setPad] = useState(() => { try { return localStorage.getItem(PAD_KEY) ?? ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem(PAD_KEY, pad); } catch { /* storage unavailable: keep in memory */ } }, [pad]);

  const recent = attempts.slice(-8).reverse();
  // On a lesson page, show that lesson's formulas; otherwise bookmarked ones, falling back to core defaults.
  const lessonUnit = loc.pathname.startsWith('/learn/') ? loc.pathname.split('/')[2] : null;
  const lessonFormulas = lessonUnit && LESSONS[lessonUnit] ? LESSONS[lessonUnit].formulas.slice(0, 4).map((f) => ({ id: f.label, name: f.label, tex: f.tex })) : null;
  const picked = lessonFormulas ?? (marks.length ? marks : DEFAULT_FORMULAS).map((id) => ALL_FORMULAS.find((f) => f.id === id)).filter(Boolean).slice(0, 5) as { id: string; name: string; tex: string }[];

  return (
    <aside className="app-rail" aria-label="Recent attempts and scratchpad">
      <section className="rail-section">
        <div className="rail-title"><span>Recent attempts</span><Link to="/analytics">All</Link></div>
        {recent.length === 0 ? <div className="small muted">Your last answers will show up here.</div> : (
          <div className="glass-panel" style={{ padding: '4px 12px' }}>
            {recent.map((a, i) => (
              <div key={a.id ?? i} className="attempt-row">
                {a.skipped ? <MinusCircle size={14} className="muted" aria-label="Skipped" /> : a.correct ? <CheckCircle2 size={14} color="var(--good)" aria-label="Correct" /> : <XCircle size={14} color="var(--critical)" aria-label="Incorrect" />}
                <span className="t" title={UNIT_BY_ID[a.unit]?.name}>{UNIT_BY_ID[a.unit]?.name ?? a.unit}</span>
                <span className="m">L{a.level} · {fmtTime(a.timeMs / 1000)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rail-section">
        <div className="rail-title"><span>{lessonFormulas ? 'Lesson formulas' : marks.length ? 'Bookmarked formulas' : 'Quick formulas'}</span><Link to="/formulas">Reference</Link></div>
        {picked.map((f) => (
          <div key={f.id} className="rail-formula">
            <div className="n">{f.name}</div>
            <Md text={`$${f.tex}$`} />
          </div>
        ))}
      </section>

      <section className="rail-section" style={{ flex: 1 }}>
        <div className="rail-title"><span>Scratchpad</span>{pad && <button className="btn ghost sm" style={{ height: 22, padding: '0 8px' }} onClick={() => setPad('')}>Clear</button>}</div>
        <textarea className="scratchpad" value={pad} onChange={(e) => setPad(e.target.value)} placeholder="Work problems here… (saved in this browser)" aria-label="Scratchpad" spellCheck={false} />
      </section>
    </aside>
  );
}
