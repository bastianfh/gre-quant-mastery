import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { CATEGORIES, unitsOf } from '../content/curriculum';
import { BandTag, Card, PageHead, Progress } from '../components/ui';
import { useStore } from '../store/store';
import { useDerived } from '../store/hooks';

export default function Learn() {
  const p = useStore((s) => s.profile);
  const d = useDerived();
  const total = CATEGORIES.reduce((a, c) => a + unitsOf(c.id).length, 0);
  const done = Object.keys(p.lessonsCompleted).length;
  return (
    <div className="fade-in">
      <PageHead title="Learn" sub="The complete GRE Quant curriculum — concepts, formulas, worked examples, traps, strategies, practice and a mastery check for every topic. GRE scope only: no calculus or trigonometry.">
        <div style={{ width: 220 }}><div className="row between small mb8"><span className="muted">Lessons completed</span><b className="mono">{done}/{total}</b></div><Progress value={done / total} /></div>
      </PageHead>
      {CATEGORIES.map((c) => (
        <div key={c.id} className="mb16">
          <div className="row mb8"><i className="dot" style={{ background: c.color }} /><h2>{c.name}</h2>{d.categoryMastery[c.id].n > 0 && <BandTag band={d.categoryMastery[c.id].band} />}</div>
          <div className="grid g3">
            {unitsOf(c.id).map((u) => {
              const m = d.unitMastery[u.id];
              const check = p.lessonMastery[u.id];
              return (
                <Link key={u.id} to={`/learn/${u.id}`} style={{ color: 'inherit' }}>
                  <Card className="tight" style={{ height: '100%' }}>
                    <div className="row between top">
                      <b>{u.name}</b>
                      {p.lessonsCompleted[u.id] ? <CheckCircle2 size={16} color="var(--good)" aria-label="Completed" /> : <Circle size={16} className="muted" />}
                    </div>
                    <div className="tiny muted mt8">{u.concepts.slice(0, 4).join(' · ')}{u.concepts.length > 4 ? ' …' : ''}</div>
                    <div className="row between mt8"><BandTag band={m.band} /><span className="mono tiny ink2">{m.n ? `${m.score}% · ${m.n}q` : ''}{check !== undefined ? ` · check ${check}%` : ''}</span></div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
