import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from '../store/store';
import { calibrationOffset } from '../engine/scoring';
import { dayKey } from '../engine/gamification';
import { Card } from './ui';

const SOURCES = ['POWERPREP Online', 'POWERPREP Plus', 'Official GRE test', 'Other official practice test'];

/** Enter official practice-test scores; they calibrate the app's score estimate. */
export function OfficialScores() {
  const list = useStore((s) => s.profile.officialScores ?? []);
  const add = useStore((s) => s.addOfficialScore);
  const remove = useStore((s) => s.removeOfficialScore);
  const [date, setDate] = useState(dayKey());
  const [score, setScore] = useState('');
  const [source, setSource] = useState(SOURCES[0]);
  const n = Number(score);
  const valid = Number.isInteger(n) && n >= 130 && n <= 170;
  const { offset, n: used } = calibrationOffset(list);
  return (
    <Card title="Official practice tests">
      <p className="small muted" style={{ marginTop: -4 }}>Take ETS's free POWERPREP test and enter your Quant score. The app compares it with its own estimate at that moment and corrects future estimates by the average gap (shrunk toward zero until you have several results).</p>
      <form className="row wrap mt8" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (valid) { add({ date, score: n, source }); setScore(''); } }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Test date" />
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Test source">{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
        <input type="number" min={130} max={170} placeholder="Quant score" value={score} onChange={(e) => setScore(e.target.value)} aria-label="Quant score (130–170)" style={{ width: 120 }} data-testid="official-score-input" />
        <button className="btn primary sm" disabled={!valid} type="submit" data-testid="official-score-add">Add</button>
      </form>
      {list.length > 0 && (
        <table className="data mt16">
          <thead><tr><th>Date</th><th>Test</th><th className="num">Official</th><th className="num">App estimate then</th><th className="num">Gap</th><th /></tr></thead>
          <tbody>{[...list].reverse().map((o) => (
            <tr key={o.id}>
              <td className="small mono">{o.date}</td><td className="small">{o.source}</td><td className="num">{o.score}</td>
              <td className="num">{o.modelScore ?? '—'}</td><td className="num">{o.modelScore === null ? '—' : `${o.score - o.modelScore > 0 ? '+' : ''}${o.score - o.modelScore}`}</td>
              <td><button className="btn ghost icon sm" aria-label={`Remove ${o.source} result from ${o.date}`} onClick={() => remove(o.id)}><Trash2 size={14} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <div className="small mt8" data-testid="calibration-status">{used ? <>Current calibration: <b className="mono">{offset > 0 ? '+' : ''}{offset}</b> point{Math.abs(offset) === 1 ? '' : 's'} from {used} result{used > 1 ? 's' : ''}.</> : list.length ? 'Your first result is used as the estimate until you have practice data.' : <span className="muted">No official results yet.</span>}</div>
    </Card>
  );
}
