import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2, Bot, Sparkles } from 'lucide-react';
import { Card, PageHead, Seg } from '../components/ui';
import { useStore } from '../store/store';
import { aiStatus, generateAiQuestion, type AiStatus } from '../lib/ai';
import { UNITS, UNIT_BY_ID } from '../content/curriculum';
import { ACHIEVEMENTS, LEVELS, levelOf } from '../engine/gamification';
import { validateQuestion } from '../engine/validate';
import type { Question } from '../engine/types';
import { InstallApp } from '../components/InstallApp';

export default function Settings() {
  const s = useStore();
  const p = s.profile;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [gen, setGen] = useState({ unit: 'al.quadratics', level: 4, format: 'mcq' });
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { aiStatus(true).then(setAi); }, []);

  const exportNow = async () => {
    const json = await s.exportData();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `gre-quant-progress-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('Progress exported.');
  };
  const importFile = async (f: File) => { const r = await s.importData(await f.text()); setMsg(r.message); };
  const generate = async () => {
    setBusy(true); setGenMsg(null);
    try {
      const r = await generateAiQuestion({ unit: gen.unit, unitName: UNIT_BY_ID[gen.unit].name, level: gen.level, format: gen.format });
      if (r.question) {
        const q = { ...r.question, id: `ai~${Date.now()}`, source: 'ai' } as Question;
        const errs = validateQuestion(q);
        if (errs.length) setGenMsg(`Rejected by client validation: ${errs.join('; ')}`);
        else { await s.saveAiQuestion(q); setGenMsg('Verified question added to your practice pool (tagged “AI-generated, verified”).'); }
      } else setGenMsg(`Rejected: ${(r.rejected ?? ['failed verification']).join('; ')}`);
    } catch (e) { setGenMsg((e as Error).message); } finally { setBusy(false); }
  };
  const lv = levelOf(p.xp);
  return (
    <div className="fade-in">
      <PageHead title="Settings" sub="Exam details, study preferences, data management and AI configuration." />
      <div className="grid g2">
        <Card title="Exam & goals">
          <div className="grid g2">
            <label className="field">Exam date<input type="date" value={p.examDate} onChange={(e) => s.updateProfile({ examDate: e.target.value })} /></label>
            <label className="field">Plan start date<input type="date" value={p.startDate} onChange={(e) => s.updateProfile({ startDate: e.target.value })} /></label>
            <label className="field">Target score<input type="number" min={130} max={170} value={p.targetScore} onChange={(e) => s.updateProfile({ targetScore: Math.max(130, Math.min(170, Number(e.target.value) || 165)) })} /></label>
            <label className="field">Daily study minutes<input type="number" min={30} max={180} step={5} value={p.dailyMinutes} onChange={(e) => s.updateProfile({ dailyMinutes: Math.max(30, Math.min(180, Number(e.target.value) || 75)) })} /></label>
            <label className="field">Daily question goal<input type="number" min={5} max={200} value={p.dailyQuestionGoal} onChange={(e) => s.updateProfile({ dailyQuestionGoal: Math.max(5, Math.min(200, Number(e.target.value) || 30)) })} /></label>
            <label className="field">Display name<input value={p.name} onChange={(e) => s.updateProfile({ name: e.target.value })} /></label>
          </div>
        </Card>
        <Card title="Preferences">
          <div className="col">
            <div className="field" role="group" aria-label="Theme">Theme<Seg value={p.settings.theme} onChange={(v) => s.updateSettings({ theme: v })} options={[{ v: 'dark', label: 'Dark' }, { v: 'light', label: 'Light' }]} /></div>
            <div className="field" role="group" aria-label="Default feedback in practice">Default feedback in practice<Seg value={p.settings.feedback} onChange={(v) => s.updateSettings({ feedback: v })} options={[{ v: 'immediate', label: 'Immediate' }, { v: 'delayed', label: 'At the end' }]} /></div>
            <label className="row small"><input type="checkbox" checked={p.settings.showTimer} onChange={(e) => s.updateSettings({ showTimer: e.target.checked })} /> Show timer during practice</label>
            <label className="row small"><input type="checkbox" checked={p.settings.confidencePrompt} onChange={(e) => s.updateSettings({ confidencePrompt: e.target.checked })} /> Ask for my confidence before submitting</label>
            <label className="row small"><input type="checkbox" checked={p.settings.reduceMotion} onChange={(e) => s.updateSettings({ reduceMotion: e.target.checked })} /> Reduce motion</label>
            <InstallApp />
          </div>
        </Card>
        <Card title="Your data">
          <p className="small muted">Progress is saved automatically in this browser's IndexedDB after every answer. Export regularly to back it up or move it to another device.</p>
          <div className="row wrap">
            <button className="btn" onClick={exportNow}><Download size={14} /> Export progress</button>
            <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import progress</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <button className="btn danger" onClick={() => { if (confirm('Delete ALL progress? This cannot be undone. Export first if unsure.')) s.resetAll().then(() => setMsg('All progress deleted.')); }}><Trash2 size={14} /> Reset everything</button>
          </div>
          {msg && <div className="callout mt16">{msg}</div>}
          <div className="tiny muted mt8 mono">{s.attempts.length} attempts · {Object.keys(s.srs).length} review items · {s.exams.length} exams · {p.reports.length} question reports</div>
        </Card>
        <Card title="AI tutor & question generator" action={<Bot size={14} className="muted" />}>
          {ai === null ? <div className="small muted">Checking…</div> : ai.available ? <div className="small"><span className="good">● Connected</span> — model <span className="mono">{ai.model}</span>. The tutor and verified generator use the server-side API key; the key never reaches the browser.</div>
            : <div className="small"><span className="muted">● Offline mode</span> — {ai.reason} The built-in tutor (3-level hints, concept explanations, diagnosis, similar-question generation) is fully functional. To enable Claude, start the server with <span className="mono">ANTHROPIC_API_KEY</span> set (see README).</div>}
          {ai?.available && (
            <div className="mt16">
              <div className="upper mb8"><Sparkles size={12} /> Generate a verified question</div>
              <div className="row wrap">
                <select value={gen.unit} onChange={(e) => setGen({ ...gen, unit: e.target.value })} aria-label="Topic">{UNITS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                <select value={gen.level} onChange={(e) => setGen({ ...gen, level: Number(e.target.value) })} aria-label="Level">{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}</select>
                <select value={gen.format} onChange={(e) => setGen({ ...gen, format: e.target.value })} aria-label="Format"><option value="mcq">Multiple choice</option><option value="qc">Quant comparison</option><option value="numeric">Numeric entry</option><option value="multi">Select one or more</option></select>
                <button className="btn primary" disabled={busy} onClick={generate}>{busy ? 'Generating & verifying…' : 'Generate'}</button>
              </div>
              <div className="tiny muted mt8">Each question is generated, then solved independently by a second call; it is shown only if both answers agree and it passes structural checks. Original GRE-style content — not ETS material.</div>
              {genMsg && <div className="callout mt8">{genMsg}</div>}
            </div>
          )}
        </Card>
      </div>
      <Card title={`Progression · Level ${lv.level} ${lv.name}`} className="mt16">
        <div className="row wrap" style={{ gap: 6 }}>{LEVELS.map((l) => <span key={l.level} className="pill" style={{ color: p.xp >= l.xp ? 'var(--ink)' : undefined, background: lv.level === l.level ? 'var(--accent-soft)' : undefined }}>{l.level}. {l.name} · {l.xp.toLocaleString()} XP</span>)}</div>
        <div className="upper mt16 mb8">Achievements · {Object.keys(p.achievements).length}/{ACHIEVEMENTS.length}</div>
        <div className="grid g4">{ACHIEVEMENTS.map((a) => <div key={a.id} className="card tight" style={{ opacity: p.achievements[a.id] ? 1 : 0.45, background: 'var(--surface-2)' }}><b className="small">{p.achievements[a.id] ? '★ ' : ''}{a.name}</b><div className="tiny muted">{a.desc}</div>{p.achievements[a.id] && <div className="tiny mono ink2 mt8">{new Date(p.achievements[a.id]).toLocaleDateString()}</div>}</div>)}</div>
      </Card>
    </div>
  );
}
