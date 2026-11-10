import { useMemo, useState } from 'react';
import { FlaskConical, Play, Repeat, X } from 'lucide-react';
import { getQuestion, makeVariant } from '../engine/bank';
import { reviewUsesVariant, SRS_STAGE_NAMES } from '../engine/srs';
import type { ErrorType, Question, SrsItem } from '../engine/types';
import { ERROR_TYPE_NAMES } from '../engine/types';
import { UNIT_BY_ID, CATEGORIES, CATEGORY_BY_ID } from '../content/curriculum';
import { SessionRunner } from '../components/SessionRunner';
import { QuestionView } from '../components/QuestionView';
import { Feedback } from '../components/Feedback';
import { Card, Empty, PageHead, Seg, Stat } from '../components/ui';
import { Bars } from '../components/Charts';
import { useStore } from '../store/store';
import { useDerived } from '../store/hooks';

type Group = 'type' | 'topic' | 'subtopic';
const rel = (t: number) => {
  const d = t - Date.now();
  if (t > 8e15) return 'graduated';
  if (d <= 0) return 'due now';
  const h = d / 3600000;
  return h < 1 ? `in ${Math.ceil(d / 60000)} min` : h < 24 ? `in ${Math.round(h)} h` : `in ${Math.round(h / 24)} d`;
};

export default function Lab() {
  const s = useStore();
  const d = useDerived();
  const [session, setSession] = useState<{ qs: Question[]; keys: Record<string, string>; title: string } | null>(null);
  const [group, setGroup] = useState<Group>('type');
  const [show, setShow] = useState<'active' | 'graduated'>('active');
  const [open, setOpen] = useState<SrsItem | null>(null);
  const items = Object.values(s.srs);
  const active = items.filter((i) => !i.graduated);
  const lastMiss = useMemo(() => { const m = new Map<string, typeof s.attempts[number]>(); for (const a of s.attempts) if (!a.correct && !a.skipped) m.set(a.qid, a); return m; }, [s.attempts]);
  const typeOf = (i: SrsItem): ErrorType => { const a = lastMiss.get(i.qid); return (a?.errorType ?? a?.autoErrorType ?? i.lastErrorType ?? 'concept') as ErrorType; };

  const buildReview = (list: SrsItem[], title: string) => {
    const qs: Question[] = [], keys: Record<string, string> = {};
    for (const it of list.slice(0, 20)) {
      const orig = getQuestion(it.qid);
      if (!orig) continue;
      // early stages re-test the exact question; later stages test the concept with a fresh variant
      const q = reviewUsesVariant(it) ? makeVariant(it.generatorId, orig.level, new Set([orig.id])) ?? orig : orig;
      qs.push(q); keys[q.id] = it.qid;
    }
    setSession({ qs, keys, title });
  };

  if (session) return <SessionRunner mode="review" title={session.title} questions={session.qs} srsKeys={session.keys} feedback="immediate" xpBonus={(x) => x.correct * 2} onExit={() => setSession(null)} />;

  const shown = (show === 'active' ? active : items.filter((i) => i.graduated));
  const groups = new Map<string, SrsItem[]>();
  for (const it of shown) {
    const k = group === 'type' ? typeOf(it) : group === 'topic' ? UNIT_BY_ID[it.unit]?.category ?? 'other' : it.unit;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  const label = (k: string) => (group === 'type' ? ERROR_TYPE_NAMES[k as ErrorType] : group === 'topic' ? CATEGORY_BY_ID[k as 'algebra']?.name ?? k : UNIT_BY_ID[k]?.name ?? k);
  const recurring = active.filter((i) => i.lapses >= 1 || i.missCount >= 2);
  const stageData = SRS_STAGE_NAMES.map((n, st) => ({ stage: n.replace('In ', ''), Items: items.filter((i) => (st === 5 ? i.graduated : !i.graduated && i.stage === st)).length }));
  const errTotal = d.errors.reduce((a, e) => a + e.count, 0);

  return (
    <div className="fade-in">
      <PageHead title="Wrong Answer Lab" sub="Every miss is saved and comes back on a spaced schedule — immediately, later today, tomorrow, in 3 days, in 7 days. Repeat mistakes come back sooner. Later reviews test the concept with new numbers.">
        <button className="btn primary" disabled={!d.due.length} onClick={() => buildReview(d.due, 'Spaced review')} data-testid="start-review"><Play size={14} /> Review {d.due.length} due</button>
        <button className="btn" disabled={!recurring.length} onClick={() => buildReview(recurring.sort((a, b) => b.lapses - a.lapses), 'Recurring mistakes')}><Repeat size={14} /> Recurring ({recurring.length})</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="Active mistakes" value={active.length} sub="in the review queue" />
        <Stat label="Due now" value={d.due.length} />
        <Stat label="Recurring" value={recurring.length} sub="missed more than once" />
        <Stat label="Eliminated" value={items.filter((i) => i.graduated).length} sub="passed the 7-day review" />
      </div>
      <div className="grid g2 mt16">
        <Card title="Mistakes by cause (all recorded errors)">
          {errTotal === 0 ? <div className="small muted">No mistakes recorded yet.</div> : (
            <div className="col" style={{ gap: 8 }}>
              {d.errors.map((e) => (
                <div key={e.type}>
                  <div className="row between small"><span>{ERROR_TYPE_NAMES[e.type]}</span><span className="mono">{Math.round((e.count / errTotal) * 100)}% <span className="muted">({e.count})</span></span></div>
                  <div className="bar mt8"><i style={{ width: `${(e.count / errTotal) * 100}%` }} /></div>
                </div>
              ))}
              <div className="tiny muted">Causes are auto-suggested from timing and the answer you chose; tag misses after answering to make this exact.</div>
            </div>
          )}
        </Card>
        <Card title="Review schedule">
          <Bars data={stageData} x="stage" y="Items" name="Items" height={190} />
        </Card>
      </div>
      <Card className="mt16" title="Mistake log" action={<div className="row wrap"><Seg value={show} onChange={setShow} options={[{ v: 'active', label: 'Active' }, { v: 'graduated', label: 'Eliminated' }]} /><Seg value={group} onChange={setGroup} options={[{ v: 'type', label: 'By error type' }, { v: 'topic', label: 'By topic' }, { v: 'subtopic', label: 'By subtopic' }]} /></div>}>
        {shown.length === 0 ? <Empty icon={<FlaskConical size={28} />} title={show === 'active' ? 'No active mistakes' : 'Nothing eliminated yet'}>{show === 'active' ? 'Missed questions land here automatically.' : 'Items graduate after passing the 7-day review.'}</Empty> : (
          [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, list]) => (
            <div key={k} className="mb16">
              <div className="row between mb8"><b className="small">{label(k)} <span className="muted">· {list.length}</span></b>{show === 'active' && <button className="btn sm" onClick={() => buildReview(list, `Review: ${label(k)}`)}>Review group</button>}</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data">
                  <thead><tr><th>Topic</th><th>Cause</th><th className="num">Misses</th><th>Stage</th><th>Next review</th><th /></tr></thead>
                  <tbody>{list.sort((a, b) => a.due - b.due).map((it) => {
                    const q = getQuestion(it.qid);
                    return (
                      <tr key={it.qid}>
                        <td className="small"><i className="dot" style={{ background: CATEGORY_BY_ID[UNIT_BY_ID[it.unit]?.category]?.color, marginRight: 6 }} />{UNIT_BY_ID[it.unit]?.name}<div className="tiny muted">{q?.subtopic}</div></td>
                        <td className="small">{ERROR_TYPE_NAMES[typeOf(it)]}</td>
                        <td className="num">{it.missCount}</td>
                        <td className="small">{it.graduated ? 'Graduated' : SRS_STAGE_NAMES[it.stage]}</td>
                        <td className="small mono">{rel(it.due)}</td>
                        <td><button className="btn sm ghost" onClick={() => setOpen(it)}>View</button></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </Card>
      <div className="tiny muted mt8">Categories: {CATEGORIES.map((c) => c.name).join(' · ')}</div>
      {open && <MistakeModal it={open} onClose={() => setOpen(null)} answer={lastMiss.get(open.qid)} />}
    </div>
  );
}

function MistakeModal({ it, onClose, answer }: { it: SrsItem; onClose: () => void; answer?: { answer: any; id?: number } & Record<string, any> }) {
  const q = getQuestion(it.qid);
  if (!q) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820 }} onClick={(e) => e.stopPropagation()}>
        <div className="row between mb8"><b>{UNIT_BY_ID[q.unit]?.name} · {q.subtopic}</b><button className="btn ghost icon sm" onClick={onClose} aria-label="Close"><X size={14} /></button></div>
        <div className="q-card"><QuestionView q={q} answer={answer?.answer ?? null} onAnswer={() => {}} locked reveal autoFocus={false} /></div>
        <Feedback q={q} answer={answer?.answer ?? null} correct={false} attempt={answer as any} />
      </div>
    </div>
  );
}
