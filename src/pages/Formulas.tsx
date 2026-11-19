import { useState } from 'react';
import { Star, Search } from 'lucide-react';
import { FORMULAS } from '../content/formulas';
import { Md } from '../components/Md';
import { Card, PageHead, Seg } from '../components/ui';
import { useStore } from '../store/store';

const TIPS = [
  'Multiply by 10% / 5% / 1% mentally and combine (e.g. 15% = 10% + 5%).',
  'Benchmark fractions: 1/8 = 12.5%, 1/6 ≈ 16.7%, 1/3 ≈ 33.3%, 3/8 = 37.5%, 5/8 = 62.5%.',
  'Squares to 20 and √2 ≈ 1.41, √3 ≈ 1.73, π ≈ 3.14 cover most estimates.',
  'When the choices are far apart, round to one significant figure — don\'t touch the calculator.',
  'The calculator follows order of operations; check entries rather than trusting a surprising result.',
];

export default function Formulas() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'all' | 'saved'>('all');
  const marks = s.profile.formulaBookmarks;
  const match = (t: string) => t.toLowerCase().includes(q.toLowerCase());
  return (
    <div className="fade-in">
      <PageHead title="Formula Reference" sub="Everything the GRE Quant section expects you to know. Bookmark the ones you hesitate on.">
        <div className="row" style={{ gap: 6 }}><Search size={14} className="muted" /><input placeholder="Search formulas" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search formulas" /></div>
        <Seg value={only} onChange={setOnly} options={[{ v: 'all', label: 'All' }, { v: 'saved', label: `Bookmarked (${marks.length})` }]} />
      </PageHead>
      <div className="grid g2">
        {FORMULAS.map((sec) => {
          const items = sec.items.filter((f) => (only === 'all' || marks.includes(f.id)) && (!q || match(f.name) || match(f.tex) || match(sec.title)));
          if (!items.length) return null;
          return (
            <Card key={sec.id} title={sec.title}>
              {items.map((f) => (
                <div key={f.id} className="formula-row">
                  <div className="tex" tabIndex={0} role="group" aria-label={f.name}><div className="small ink2 mb8">{f.name}</div><Md text={`$${f.tex}$`} />{f.note && <div className="tiny muted mt8">{f.note}</div>}</div>
                  <button className="btn ghost icon sm" aria-label={marks.includes(f.id) ? 'Remove bookmark' : 'Bookmark'} onClick={() => s.toggleList('formulaBookmarks', f.id)}><Star size={15} fill={marks.includes(f.id) ? 'var(--warning)' : 'none'} color={marks.includes(f.id) ? 'var(--warning)' : 'currentColor'} /></button>
                </div>
              ))}
            </Card>
          );
        })}
      </div>
      <Card title="Mental math & estimation (use the calculator last)" className="mt16"><ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>{TIPS.map((t) => <li key={t}>{t}</li>)}</ul></Card>
    </div>
  );
}
