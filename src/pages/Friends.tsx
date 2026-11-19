import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Trophy, UserMinus, UserPlus, Users } from 'lucide-react';
import { Card, Empty, PageHead } from '../components/ui';
import { addFriend, fetchBoard, fetchFriends, removeFriend, setSharing, syncNow, useSync, type Board, type Friends as FriendsData } from '../lib/sync';

export default function Friends() {
  const { available, account } = useSync();
  const [board, setBoard] = useState<Board | null>(null);
  const [friends, setFriends] = useState<FriendsData | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try { await syncNow(); const [b, f] = await Promise.all([fetchBoard(), fetchFriends()]); setBoard(b); setFriends(f); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }, []);
  useEffect(() => { if (account) void refresh(); }, [account?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  if (available === false) return <div className="fade-in"><PageHead title="Friends" /><Empty icon={<Users size={22} />} title="Not available here">The friends leaderboard needs the Cloudflare deployment of the app (it uses the cloud account).</Empty></div>;
  if (!account) return (
    <div className="fade-in"><PageHead title="Friends" sub="Compare Daily Challenge scores with friends." />
      <Empty icon={<Users size={22} />} title="Sign in to play with friends">Create a free account (username and passphrase, no email) in <Link to="/settings">Settings → Account &amp; sync</Link>. Then share your friend code.</Empty>
    </div>
  );

  const rows = board?.rows ?? [];
  const todayRows = [...rows].sort((a, b) => (b.today ?? -1) - (a.today ?? -1));
  const weekRows = [...rows].sort((a, b) => b.week - a.week || b.days - a.days);
  const sharing = account.share;

  return (
    <div className="fade-in">
      <PageHead title="Friends" sub="Daily Challenge standings with friends. Everyone's challenge is matched to their level, so points reward consistency as much as raw skill." />
      <div className="grid g3">
        <Card title="Today" action={<Trophy size={14} className="muted" />} className="span2">
          {!board ? <div className="small muted">Loading…</div> : (
            <table className="data" data-testid="board-today"><thead><tr><th>#</th><th>Player</th><th>Points</th><th>Correct</th></tr></thead>
              <tbody>{todayRows.map((r, i) => <tr key={r.username} className={r.me ? 'me-row' : ''}><td className="mono">{r.today !== null ? i + 1 : '—'}</td><td>{r.username}{r.me && <span className="tiny muted"> (you)</span>}</td><td className="mono">{r.today ?? <span className="muted">not played</span>}</td><td className="mono">{r.todayAcc ?? ''}</td></tr>)}</tbody></table>
          )}
          {board && rows.length === 1 && <p className="small muted mt8">Only you so far. Add friends with their code →</p>}
          {board && !rows.find((r) => r.me)?.today && <p className="small mt8"><Link to="/daily">Play today's Daily Challenge</Link> to get on the board.</p>}
        </Card>
        <Card title="Your friend code">
          <div className="row"><span className="mono friend-code" data-testid="friend-code">{account.friendCode}</span>
            <button className="btn icon" aria-label="Copy friend code" onClick={() => { navigator.clipboard?.writeText(account.friendCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}><Copy size={14} /></button>
            {copied && <span className="tiny good">Copied</span>}</div>
          <form className="row wrap mt16" onSubmit={async (e) => { e.preventDefault(); setMsg(null); try { const u = await addFriend(code); setCode(''); setMsg({ ok: true, text: `You and ${u} are now friends.` }); await refresh(); } catch (err) { setMsg({ ok: false, text: (err as Error).message }); } }}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Friend's code" aria-label="Friend's code" maxLength={9} style={{ width: 140 }} className="mono" data-testid="friend-input" />
            <button className="btn" type="submit" disabled={code.replace(/[^A-Z0-9]/g, '').length !== 8}><UserPlus size={14} /> Add</button>
          </form>
          {msg && <div className={`callout mt8${msg.ok ? '' : ' warn'}`} role="status">{msg.text}</div>}
          <label className="row small mt16"><input type="checkbox" checked={sharing} onChange={async (e) => { try { await setSharing(e.target.checked); await refresh(); } catch (err) { setMsg({ ok: false, text: (err as Error).message }); } }} data-testid="share-toggle" /> Share my Daily Challenge scores with friends</label>
          {!sharing && <div className="tiny muted">Off by default. Friends see you only after you turn this on. You always see your own scores.</div>}
        </Card>
      </div>
      <div className="grid g2 mt16">
        <Card title="Last 7 days">
          {!board ? <div className="small muted">Loading…</div> : (
            <table className="data" data-testid="board-week"><thead><tr><th>#</th><th>Player</th><th>Points</th><th>Days played</th></tr></thead>
              <tbody>{weekRows.map((r, i) => <tr key={r.username} className={r.me ? 'me-row' : ''}><td className="mono">{i + 1}</td><td>{r.username}{r.me && <span className="tiny muted"> (you)</span>}</td><td className="mono">{r.week}</td><td className="mono">{r.days}/7</td></tr>)}</tbody></table>
          )}
        </Card>
        <Card title={`Friends (${friends?.friends.length ?? 0})`}>
          {!friends ? <div className="small muted">Loading…</div> : friends.friends.length === 0 ? <div className="small muted">No friends yet. Share your code, or enter theirs.</div> : (
            <table className="data"><tbody>{friends.friends.map((f) => <tr key={f.username}><td>{f.username}</td><td className="tiny muted">{f.sharing ? 'sharing scores' : 'not sharing yet'}</td>
              <td style={{ textAlign: 'right' }}><button className="btn ghost sm" aria-label={`Remove ${f.username}`} onClick={async () => { if (confirm(`Remove ${f.username} from your friends?`)) { await removeFriend(f.username); await refresh(); } }}><UserMinus size={14} /></button></td></tr>)}</tbody></table>
          )}
        </Card>
      </div>
    </div>
  );
}
