import { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Target, CalendarCheck, Gauge, Scale, Swords, FlaskConical, ClipboardCheck, BarChart3, Sigma, Settings as SettingsIcon, Menu, Flame, Zap, CalendarDays, Map } from 'lucide-react';
import { useStore } from './store/store';
import { computeDerived } from './store/derived';
import { levelOf, dayKey, daysBetween } from './engine/gamification';
import Dashboard from './pages/Dashboard';

const Learn = lazy(() => import('./pages/Learn'));
const LessonPage = lazy(() => import('./pages/Lesson'));
const Practice = lazy(() => import('./pages/Practice'));
const Daily = lazy(() => import('./pages/Daily'));
const Speed = lazy(() => import('./pages/Speed'));
const QcArena = lazy(() => import('./pages/QcArena'));
const Boss = lazy(() => import('./pages/Boss'));
const Lab = lazy(() => import('./pages/Lab'));
const Mock = lazy(() => import('./pages/Mock'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Formulas = lazy(() => import('./pages/Formulas'));
const Settings = lazy(() => import('./pages/Settings'));
const Plan = lazy(() => import('./pages/Plan'));

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/plan', label: '30-Day Plan', icon: Map },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/practice', label: 'Practice', icon: Target },
  { to: '/daily', label: 'Daily Challenge', icon: CalendarCheck },
  { to: '/speed', label: 'Speed Training', icon: Gauge },
  { to: '/qc', label: 'Quant Comparison', icon: Scale },
  { to: '/boss', label: 'Boss Challenges', icon: Swords },
  { to: '/lab', label: 'Wrong Answer Lab', icon: FlaskConical, badge: true },
  { to: '/mock', label: 'Mock Exams', icon: ClipboardCheck },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/formulas', label: 'Formula Reference', icon: Sigma },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Shell() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = s.profile.settings.theme;
    document.documentElement.classList.toggle('reduce-motion', s.profile.settings.reduceMotion);
  }, [s.profile.settings.theme, s.profile.settings.reduceMotion]);
  const d = computeDerived(s);
  const lv = levelOf(s.profile.xp);
  const daysLeft = daysBetween(dayKey(), s.profile.examDate);
  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark"><svg width="16" height="16" viewBox="0 0 32 32"><path d="M4 24 L12 14 L18 19 L28 6" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div>GRE Quant Mastery<small>Target {s.profile.targetScore}</small></div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <n.icon size={16} /> {n.label}
            {n.badge && d.due.length > 0 && <span className="badge" aria-label={`${d.due.length} reviews due`}>{d.due.length}</span>}
          </NavLink>
        ))}
        <div className="grow" />
        <div className="card tight mt16" style={{ background: 'var(--surface-2)' }}>
          <div className="row between small"><b>Lv {lv.level} · {lv.name}</b></div>
          <div className="mt8"><div className="bar"><i style={{ width: `${lv.progress * 100}%` }} /></div></div>
          <div className="tiny muted mt8 mono">{s.profile.xp.toLocaleString()} XP{lv.next ? ` · ${(lv.next.xp - s.profile.xp).toLocaleString()} to Lv ${lv.next.level}` : ' · max level'}</div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn icon ghost menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="ticker">
            <span title="Estimated GRE Quant score (approximation)">EST <b>{d.estimate.score ?? '—'}</b>{d.estimate.range && <span className="hide-sm muted"> ({d.estimate.range[0]}–{d.estimate.range[1]})</span>}</span>
            <span>TGT <b>{s.profile.targetScore}</b></span>
            <span className="hide-sm">ACC <b>{d.totals.n ? Math.round(d.totals.accuracy * 100) + '%' : '—'}</b></span>
            <span className="row" style={{ gap: 4 }}><Flame size={13} color="var(--serious)" /><b>{d.streak.current}</b><span className="hide-sm">day streak</span></span>
            <span className="row hide-sm" style={{ gap: 4 }}><Zap size={13} color="var(--accent)" /><b>{s.profile.xp.toLocaleString()}</b> XP</span>
            <span className="row" style={{ gap: 4 }}><CalendarDays size={13} /><b>{daysLeft >= 0 ? daysLeft : 0}</b><span className="hide-sm">days to exam</span></span>
          </div>
        </header>
        {s.error && <div className="callout bad" style={{ margin: '12px 24px 0' }}><div className="t">Storage warning</div>{s.error}</div>}
        <main className="content">
          <Suspense fallback={<div className="muted">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:unit" element={<LessonPage />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/daily" element={<Daily />} />
              <Route path="/speed" element={<Speed />} />
              <Route path="/qc" element={<QcArena />} />
              <Route path="/boss" element={<Boss />} />
              <Route path="/lab" element={<Lab />} />
              <Route path="/mock" element={<Mock />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/formulas" element={<Formulas />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<div className="card empty">Page not found.</div>} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Toasts />
    </div>
  );
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)} role="status">
          <div><div className="t1">{t.text}</div>{t.sub && <div className="t2">{t.sub}</div>}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const ready = useStore((s) => s.ready);
  useEffect(() => { useStore.getState().init(); }, []);
  if (!ready) return <div className="content muted">Loading your progress…</div>;
  return <HashRouter><Shell /></HashRouter>;
}
