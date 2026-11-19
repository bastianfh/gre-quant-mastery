import { Link } from 'react-router-dom';
import { useStore } from '../store/store';

const MODE_LABEL: Record<string, string> = { practice: 'Practice', daily: 'Daily Challenge', speed: 'Speed drill', qc: 'Quant Comparison', boss: 'Boss challenge', review: 'Review', mastery: 'Mastery check', drill: 'Mental Math', learn: 'Lesson', mock: 'Mock exam', diagnostic: 'Diagnostic' };

export function ago(ts: number, now = Date.now()) {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return 'yesterday';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Compact feed of finished sessions and exams, newest first. */
export function RecentActivity({ limit = 5 }: { limit?: number }) {
  const sessions = useStore((s) => s.sessions);
  const exams = useStore((s) => s.exams);
  const items = [
    ...sessions.map((x) => ({ id: x.id, ts: x.ts, label: MODE_LABEL[x.mode] ?? x.mode, detail: x.mode === 'drill' ? `${x.correct} correct` : `${x.correct}/${x.total} correct` })),
    ...exams.map((e) => ({ id: e.id, ts: e.finishedAt, label: MODE_LABEL[e.kind], detail: `scored ${e.scaled}` })),
  ].sort((a, b) => b.ts - a.ts).slice(0, limit);
  return (
    <section className="rail-section" aria-label="Recent activity">
      <div className="rail-title"><span>Recent activity</span>{items.length > 0 && <Link to="/analytics">All</Link>}</div>
      {items.length === 0 ? <div className="small muted">Finished sessions will show up here.</div> : (
        <ul className="activity">
          {items.map((it) => (
            <li key={it.id}><span className="a-label">{it.label}</span><span className="a-detail num">{it.detail}</span><span className="a-time">{ago(it.ts)}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}
