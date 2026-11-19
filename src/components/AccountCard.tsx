import { useState } from 'react';
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { Card, Seg } from './ui';
import { deleteAccount, signIn, signOut, signUp, syncNow, useSync } from '../lib/sync';

/** Simple username + passphrase sign-in for cross-device sync (no email). */
export function AccountCard() {
  const { available, account, status, message } = useSync();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delPass, setDelPass] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (mode === 'signup' && pass !== pass2) { setError('The passphrases do not match.'); return; }
    setBusy(true);
    try { await (mode === 'signup' ? signUp : signIn)(username.trim(), pass); setPass(''); setPass2(''); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  if (available === null) return <Card title="Account & sync"><div className="small muted">Checking…</div></Card>;
  if (!available) return (
    <Card title="Account & sync" action={<CloudOff size={14} className="muted" />}>
      <p className="small muted">Cloud sync isn't available on this server. It works on the Cloudflare deployment of the app. You can still move progress between devices with Export / Import below.</p>
    </Card>
  );

  if (account) return (
    <Card title="Account & sync" action={<Cloud size={14} className="muted" />}>
      <div className="small" data-testid="account-status">Signed in as <b>{account.username}</b>. Progress syncs automatically across every device you sign in on.</div>
      <div className="tiny muted mt8 mono" data-testid="sync-status">{status === 'syncing' ? 'Syncing…' : account.lastSync ? `Last synced ${new Date(account.lastSync).toLocaleString()}` : 'Not synced yet'}</div>
      {message && <div className={`callout mt8${status === 'error' ? ' warn' : ''}`}>{message}</div>}
      <div className="row wrap mt16">
        <button className="btn" onClick={() => syncNow()} disabled={status === 'syncing'} data-testid="sync-now"><RefreshCw size={14} /> Sync now</button>
        <button className="btn" onClick={() => signOut()}><LogOut size={14} /> Sign out</button>
        <button className="btn ghost danger" onClick={() => setConfirmDelete((v) => !v)}>Delete cloud account…</button>
      </div>
      {confirmDelete && (
        <form className="row wrap mt8" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await deleteAccount(delPass); setConfirmDelete(false); } catch (err) { setError((err as Error).message); } }}>
          <input type="password" placeholder="Passphrase to confirm" aria-label="Passphrase to confirm deletion" value={delPass} onChange={(e) => setDelPass(e.target.value)} autoComplete="current-password" />
          <button className="btn danger" type="submit" disabled={!delPass}>Delete cloud copy</button>
          <span className="tiny muted">Removes the account, cloud progress and leaderboard entries. Progress on this device is kept.</span>
        </form>
      )}
      {error && <div className="callout warn mt8">{error}</div>}
    </Card>
  );

  return (
    <Card title="Account & sync" action={<Cloud size={14} className="muted" />}>
      <p className="small muted">Sign in to sync progress between your laptop and phone and to compare Daily Challenge scores with friends. No email needed.</p>
      <div className="mt8"><Seg value={mode} onChange={(v) => { setMode(v); setError(null); }} options={[{ v: 'login', label: 'Sign in' }, { v: 'signup', label: 'Create account' }]} /></div>
      <form className="col mt16" onSubmit={submit} data-testid="account-form">
        <label className="field">Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="3–24 letters, numbers, _ . -" data-testid="account-username" /></label>
        <label className="field">Passphrase<input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'At least 8 characters' : ''} data-testid="account-pass" /></label>
        {mode === 'signup' && <label className="field">Repeat passphrase<input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" data-testid="account-pass2" /></label>}
        {mode === 'signup' && <div className="tiny muted">There is no password reset (no email is collected), so store your passphrase in a password manager. Your progress on this device is merged into the new account.</div>}
        {error && <div className="callout warn" role="alert">{error}</div>}
        <div><button className="btn primary" type="submit" disabled={busy || !username.trim() || !pass} data-testid="account-submit">{busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button></div>
      </form>
    </Card>
  );
}
