import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { CATEGORIES, UNITS } from '../content/curriculum';
import { pickQuestions, pool, type Filter } from '../engine/selection';
import type { CategoryId, Format, Level } from '../engine/types';
import { FORMAT_NAMES, LEVEL_NAMES } from '../engine/types';
import { SessionRunner } from '../components/SessionRunner';
import { Card, PageHead, Seg } from '../components/ui';
import { usePickCtx, useDerived } from '../store/hooks';
import { useStore } from '../store/store';

export default function Practice() {
  const [sp, setSp] = useSearchParams();
  const ctx = usePickCtx();
  const d = useDerived();
  const settings = useStore((s) => s.profile.settings);
  const list = (k: string) => sp.get(k)?.split(',').filter(Boolean) ?? [];
  const [cats, setCats] = useState<CategoryId[]>(list('cats') as CategoryId[]);
  const [units, setUnits] = useState<string[]>(list('units'));
  const [levels, setLevels] = useState<Level[]>(list('levels').map(Number) as Level[]);
  const [formats, setFormats] = useState<(Format | 'di')[]>(list('formats') as Format[]);
  const [status, setStatus] = useState<Filter['status']>((sp.get('status') as Filter['status']) ?? 'any');
  const [timed, setTimed] = useState<'untimed' | 'timed'>(sp.get('mode') === 'timed' ? 'timed' : 'untimed');
  const [feedback, setFeedback] = useState<'immediate' | 'delayed'>(settings.feedback);
  const [count, setCount] = useState<number>(Number(sp.get('n') ?? 10) || 10);
  const [started, setStarted] = useState<number>(sp.get('n') || sp.get('units') || sp.get('block') ? 1 : 0);

  const filter: Filter = { categories: cats, units, levels, formats, status };
  const available = useMemo(() => pool(filter, ctx).length, [JSON.stringify(filter), ctx]); // eslint-disable-line
  const weak = d.weakUnits.filter((w) => w.score < 60).map((w) => w.unit);
  const questions = useMemo(() => (started ? pickQuestions(filter, count === 0 ? 10 : count, ctx, { adaptive: true }) : []), [started]); // eslint-disable-line
  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  if (started) {
    return (
      <SessionRunner key={started} mode="practice" title={timed === 'timed' ? 'Timed practice' : 'Practice'} questions={questions}
        more={count === 0 ? (served) => pickQuestions(filter, 10, { ...ctx, recent: [...ctx.recent, ...served.map((q) => q.id)] }, { adaptive: true }) : undefined}
        feedback={feedback} perQuestionSec={timed === 'timed' ? 105 : undefined} planBlock={sp.get('block') ?? undefined}
        resumeKey={count === 0 ? undefined : 'practice'}
        xpBonus={(s) => (s.total >= 10 ? 10 : 0)}
        onExit={() => { setStarted(0); setSp({}); }} />
    );
  }

  return (
    <div className="fade-in">
      <PageHead title="Practice" sub="Unlimited adaptive practice. Difficulty targets the level where you succeed about 70% of the time unless you pick levels yourself." />
      <div className="grid g3">
        <Card title="Topics" className="span2">
          <div className="row wrap" style={{ gap: 6 }}>
            <button className={`chip ${!cats.length && !units.length ? 'on' : ''}`} onClick={() => { setCats([]); setUnits([]); }}>Mixed (all topics)</button>
            <button className="chip" disabled={!weak.length} onClick={() => { setCats([]); setUnits(weak); }} title={weak.length ? '' : 'No weak topics identified yet'}>Weak topics{weak.length ? ` (${weak.length})` : ''}</button>
            {CATEGORIES.map((c) => <button key={c.id} className={`chip ${cats.includes(c.id) ? 'on' : ''}`} onClick={() => toggle(cats, c.id, setCats)}><i className="dot" style={{ background: c.color }} />{c.name}</button>)}
          </div>
          <div className="upper mt16 mb8">Subtopics</div>
          {CATEGORIES.map((c) => (
            <div key={c.id} className="row wrap mb8" style={{ gap: 6 }}>
              {UNITS.filter((u) => u.category === c.id).map((u) => <button key={u.id} className={`chip ${units.includes(u.id) ? 'on' : ''}`} onClick={() => toggle(units, u.id, setUnits)}>{u.name}</button>)}
            </div>
          ))}
        </Card>
        <div className="col">
          <Card title="Difficulty">
            <div className="row wrap" style={{ gap: 6 }}>
              <button className={`chip ${!levels.length ? 'on' : ''}`} onClick={() => setLevels([])}>Adaptive</button>
              {([1, 2, 3, 4, 5] as Level[]).map((l) => <button key={l} className={`chip ${levels.includes(l) ? 'on' : ''}`} onClick={() => toggle(levels, l, setLevels)}>{LEVEL_NAMES[l]}</button>)}
            </div>
          </Card>
          <Card title="Question type">
            <div className="row wrap" style={{ gap: 6 }}>
              <button className={`chip ${!formats.length ? 'on' : ''}`} onClick={() => setFormats([])}>All</button>
              {(['qc', 'mcq', 'multi', 'numeric', 'di'] as const).map((f) => <button key={f} className={`chip ${formats.includes(f) ? 'on' : ''}`} onClick={() => toggle(formats, f, setFormats)}>{FORMAT_NAMES[f]}</button>)}
            </div>
          </Card>
          <Card title="Question pool">
            <Seg value={status!} onChange={setStatus} options={[{ v: 'any', label: 'All' }, { v: 'untouched', label: 'Untouched' }, { v: 'incorrect', label: 'Previously wrong' }, { v: 'saved', label: 'Saved' }, { v: 'flagged', label: 'Flagged' }]} />
          </Card>
        </div>
      </div>
      <Card className="mt16">
        <div className="row wrap between">
          <div className="row wrap" style={{ gap: 16 }}>
            <div className="field" role="group" aria-label="Timing">Timing<Seg value={timed} onChange={setTimed} options={[{ v: 'untimed', label: 'Untimed' }, { v: 'timed', label: 'Timed · 1:45 / q' }]} /></div>
            <div className="field" role="group" aria-label="Feedback">Feedback<Seg value={feedback} onChange={setFeedback} options={[{ v: 'immediate', label: 'Immediate' }, { v: 'delayed', label: 'At the end' }]} /></div>
            <div className="field" role="group" aria-label="Questions">Questions<Seg value={count} onChange={setCount} options={[{ v: 5, label: '5' }, { v: 10, label: '10' }, { v: 20, label: '20' }, { v: 0, label: 'Unlimited' }]} /></div>
          </div>
          <div className="row">
            <span className="small muted">{available} bank questions match{status === 'any' ? ' · fresh variants fill any gap' : ''}</span>
            <button className="btn primary lg" disabled={available === 0 && status !== 'any'} onClick={() => setStarted(Date.now())} data-testid="start-practice"><Play size={16} /> Start</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
