import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { FORMULAS } from '../content/formulas';
import { LESSONS } from '../content/lessons';
import { Md } from './Md';
import { TodayTraining } from './TodayTraining';
import { RecentActivity } from './RecentActivity';

const ALL_FORMULAS = FORMULAS.flatMap((s) => s.items);
const DEFAULT_FORMULAS = ['pchange', 'pyth', 'comb', 'mean'];
const PAD_KEY = 'gqm-scratchpad';

/**
 * Context-aware right rail (presentation only — reads the store, never changes study data):
 *  - answering a question (any practice mode or a mock exam): quick formulas + scratchpad
 *  - on a lesson: that lesson's formulas + scratchpad
 *  - everywhere else (incl. the Dashboard): today's training checklist + recent activity
 */
export function RightRail() {
  const answering = useUi((s) => s.answering > 0);
  const loc = useLocation();
  const lessonUnit = loc.pathname.startsWith('/learn/') ? loc.pathname.split('/')[2] : null;

  if (answering || lessonUnit) return (
    <aside className="app-rail" aria-label="Formulas and scratchpad">
      <Formulas lessonUnit={lessonUnit} />
      <Scratchpad />
    </aside>
  );
  return (
    <aside className="app-rail" aria-label="Today's training and recent activity">
      <TodayTraining />
      <RecentActivity />
    </aside>
  );
}

function Formulas({ lessonUnit }: { lessonUnit: string | null }) {
  const marks = useStore((s) => s.profile.formulaBookmarks);
  // On a lesson page, show that lesson's formulas; otherwise bookmarked ones, falling back to core defaults.
  const lessonFormulas = lessonUnit && LESSONS[lessonUnit] ? LESSONS[lessonUnit].formulas.slice(0, 4).map((f) => ({ id: f.label, name: f.label, tex: f.tex })) : null;
  const picked = lessonFormulas ?? (marks.length ? marks : DEFAULT_FORMULAS).map((id) => ALL_FORMULAS.find((f) => f.id === id)).filter(Boolean).slice(0, 5) as { id: string; name: string; tex: string }[];
  return (
    <section className="rail-section">
      <div className="rail-title"><span>{lessonFormulas ? 'Lesson formulas' : marks.length ? 'Bookmarked formulas' : 'Quick formulas'}</span><Link to="/formulas">Reference</Link></div>
      {picked.map((f) => (
        <div key={f.id} className="rail-formula">
          <div className="n">{f.name}</div>
          <Md text={`$${f.tex}$`} />
        </div>
      ))}
    </section>
  );
}

function Scratchpad() {
  const [pad, setPad] = useState(() => { try { return localStorage.getItem(PAD_KEY) ?? ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem(PAD_KEY, pad); } catch { /* storage unavailable: keep in memory */ } }, [pad]);
  return (
    <section className="rail-section" style={{ flex: 1 }}>
      <div className="rail-title"><span>Scratchpad</span>{pad && <button className="btn ghost sm" style={{ height: 22, padding: '0 8px' }} onClick={() => setPad('')}>Clear</button>}</div>
      <textarea className="scratchpad" value={pad} onChange={(e) => setPad(e.target.value)} placeholder="Work problems here… (saved in this browser)" aria-label="Scratchpad" spellCheck={false} />
    </section>
  );
}
