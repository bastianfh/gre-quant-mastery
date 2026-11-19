import { useMemo, useState } from 'react';
import { Swords, Lock, Crown } from 'lucide-react';
import { pickQuestions } from '../engine/selection';
import { ALL_GENERATORS } from '../engine/generators';
import { XP_EVENTS } from '../engine/gamification';
import type { CategoryId, Level } from '../engine/types';
import { SessionRunner, type SessionSummary } from '../components/SessionRunner';
import { Card, PageHead } from '../components/ui';
import { useStore } from '../store/store';
import { usePickCtx } from '../store/hooks';
import { SectionTabs, PRACTICE_TABS } from '../components/SectionTabs';

interface BossDef { id: string; name: string; combo: string; cats: CategoryId[]; units?: string[]; n: number }
const BOSSES: BossDef[] = [
  { id: 'arith-alg', name: 'The Translator', combo: 'Arithmetic + Algebra', cats: ['arithmetic', 'algebra'], n: 6 },
  { id: 'geo-ratio', name: 'The Architect', combo: 'Geometry + Ratios', cats: ['geometry'], units: ['ge.triangles', 'ge.quads', 'ge.circles', 'ge.right', 'ar.ratios'], n: 6 },
  { id: 'prob-count', name: 'The Gambler', combo: 'Probability + Counting', cats: ['data'], units: ['da.probability', 'da.counting', 'da.sets'], n: 7 },
  { id: 'pct-wavg', name: 'The Accountant', combo: 'Percentages + Weighted Averages', cats: ['arithmetic', 'word'], units: ['ar.percents', 'wp.mixtures', 'wp.money', 'wp.interest'], n: 7 },
  { id: 'alg-num', name: 'The Number Theorist', combo: 'Algebra + Number Properties', cats: ['arithmetic', 'algebra'], units: ['ar.integers', 'ar.primes', 'ar.factors', 'ar.remainders', 'al.quadratics', 'al.expressions'], n: 8 },
  { id: 'gauntlet', name: 'The Gauntlet', combo: 'Everything, hard mode', cats: [], n: 10 },
];
const RANKS = [{ min: 0.9, r: 'S' }, { min: 0.75, r: 'A' }, { min: 0.6, r: 'B' }, { min: 0.4, r: 'C' }, { min: 0, r: 'D' }];
const rankOf = (acc: number) => RANKS.find((x) => acc >= x.min)!.r;

export default function Boss() {
  const s = useStore();
  const ctx = usePickCtx();
  const [active, setActive] = useState<BossDef | null>(null);
  const [key, setKey] = useState(0);
  const results = s.sessions.filter((x) => x.mode === 'boss');
  const best = (id: string) => results.filter((r) => (r.meta as any)?.boss === id).reduce<{ score: number; rank: string } | null>((b, r) => { const sc = r.score ?? 0; return !b || sc > b.score ? { score: sc, rank: String((r.meta as any)?.rank ?? '') } : b; }, null);
  const cleared = BOSSES.filter((b) => { const x = best(b.id); return x && ['S', 'A', 'B'].includes(x.rank); }).length;
  // difficulty rises as you progress: tier from clears
  const tier = Math.min(2, Math.floor(cleared / 2));
  const levels: Level[] = tier === 0 ? [3, 4] : tier === 1 ? [4, 5] : [5];
  const comboGens = new Set(ALL_GENERATORS.filter((g) => g.combo).map((g) => g.id));

  const questions = useMemo(() => {
    if (!active) return [];
    const combos = pickQuestions({ combos: true, levels: [4, 5], units: active.units }, 2, ctx, { adaptive: false });
    const rest = pickQuestions({ categories: active.cats.length ? active.cats : undefined, units: active.units, levels }, active.n - combos.length, { ...ctx, recent: [...ctx.recent, ...combos.map((q) => q.id)] }, { adaptive: false });
    return [...rest, ...combos].sort((a, b) => a.level - b.level);
  }, [active, key]); // eslint-disable-line
  const bossScore = (x: SessionSummary) => x.rows.reduce((a, r) => a + (r.correct ? r.q.level * 20 + (comboGens.has(r.q.generatorId) ? 20 : 0) : 0), 0);

  if (active) {
    return <SessionRunner key={key} mode="boss" title={`Boss: ${active.name}`} questions={questions} totalSec={questions.reduce((a, q) => a + q.timeSec, 0)} feedback="delayed" allowHints={false}
      scoreLabel={(x) => { const acc = x.correct / Math.max(1, x.total); return { score: bossScore(x), label: `Rank ${rankOf(acc)} · ${bossScore(x)} pts`, sub: `${x.correct}/${x.total} correct · ${['S', 'A', 'B'].includes(rankOf(acc)) ? 'Boss defeated! Mastery reward granted.' : 'Not defeated — rank B or better clears the boss.'}` }; }}
      xpBonus={(x) => { const acc = x.correct / Math.max(1, x.total); return ['S', 'A', 'B'].includes(rankOf(acc)) ? XP_EVENTS.boss + (rankOf(acc) === 'S' ? 60 : rankOf(acc) === 'A' ? 30 : 0) : 15; }}
      meta={(x) => ({ boss: active.id, rank: rankOf(x.correct / Math.max(1, x.total)) })}
      onExit={() => setActive(null)} />;
  }

  return (
    <div className="fade-in">
      <SectionTabs tabs={PRACTICE_TABS} label="Practice modes" />
      <PageHead title="Boss Challenges" sub={`Multi-concept gauntlets of hard questions. Current tier: ${['Hard', 'Hard–Expert', 'Expert'][tier]} (rises as you clear bosses). Rank B or better defeats a boss.`} />
      <div className="grid g3">
        {BOSSES.map((b, i) => {
          const x = best(b.id);
          const locked = b.id === 'gauntlet' && cleared < 3;
          return (
            <Card key={b.id}>
              <div className="row between"><span className="upper">{b.combo}</span>{x ? <span className="pill" style={{ color: ['S', 'A', 'B'].includes(x.rank) ? 'var(--good-ink)' : 'var(--ink-2)' }}>{['S', 'A', 'B'].includes(x.rank) ? <Crown size={11} /> : null} Rank {x.rank}</span> : <span className="pill">Unbeaten</span>}</div>
              <h2 className="mt8 row" style={{ gap: 8 }}><Swords size={17} /> {b.name}</h2>
              <p className="small muted mt8">{b.n} questions · levels {levels.join('–')} · includes multi-concept items · timed, results at the end.</p>
              <div className="row between mt8"><span className="mono small ink2">{x ? `best ${x.score} pts` : `#${i + 1}`}</span>
                <button className="btn primary sm" disabled={locked} onClick={() => { setActive(b); setKey(Date.now()); }}>{locked ? <><Lock size={12} /> Clear 3 bosses</> : 'Fight'}</button></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
