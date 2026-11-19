import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Target, CalendarCheck, Gauge, Scale, Swords, FlaskConical, ClipboardCheck, BarChart3, Sigma, Settings as SettingsIcon, Menu, Flame, Zap, CalendarDays, Map, Brain, Users } from 'lucide-react';
import { useStore } from './store/store';
import { computeDerived } from './store/derived';
import { levelOf, dayKey, daysBetween } from './engine/gamification';
import { CATEGORIES, MAIN_CATEGORIES } from './content/curriculum';
import { RightRail } from './components/RightRail';
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
const Drills = lazy(() => import('./pages/Drills'));
const Friends = lazy(() => import('./pages/Friends'));

type NavEntry = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; badge?: boolean };
const NAV_GROUPS: { title: string; items: NavEntry[] }[] = [
  { title: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/plan', label: '30-Day Plan', icon: Map },
  ] },
  { title: 'Learn', items: [
    { to: '/learn', label: 'Learn', icon: BookOpen },
    { to: '/formulas', label: 'Formula Reference', icon: Sigma },
  ] },
  { title: 'Train', items: [
    { to: '/practice', label: 'Practice', icon: Target },
    { to: '/daily', label: 'Daily Challenge', icon: CalendarCheck },
    { to: '/speed', label: 'Speed Training', icon: Gauge },
    { to: '/drills', label: 'Mental Math', icon: Brain },
    { to: '/qc', label: 'Quant Comparison', icon: Scale },
    { to: '/boss', label: 'Boss Challenges', icon: Swords },
  ] },
  { title: 'Review & Test', items: [
    { to: '/lab', label: 'Wrong Answer Lab', icon: FlaskConical, badge: true },
    { to: '/mock', label: 'Mock Exams', icon: ClipboardCheck },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/friends', label: 'Friends', icon: Users },
  ] },
];

function Shell() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { setOpen(false); mainRef.current?.scrollTo(0, 0); window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = s.profile.settings.theme;
    document.documentElement.classList.toggle('reduce-motion', s.profile.settings.reduceMotion);
  }, [s.profile.settings.theme, s.profile.settings.reduceMotion]);
  const d = computeDerived(s);
  const lv = levelOf(s.profile.xp);
  const daysLeft = daysBetween(dayKey(), s.profile.examDate);
  return (
    <>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="app-shell">
        <aside className={`app-sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
          <div className="brand">
            <div className="brand-mark"><svg width="16" height="16" viewBox="0 0 32 32"><path d="M4 24 L12 14 L18 19 L28 6" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <div>GRE Quant Mastery<small>Target {s.profile.targetScore}</small></div>
          </div>
          {NAV_GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <div className="nav-group">{g.title}</div>
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <n.icon size={16} /> {n.label}
                  {n.badge && d.due.length > 0 && <span className="badge" aria-label={`${d.due.length} reviews due`}>{d.due.length}</span>}
                </NavLink>
              ))}
            </nav>
          ))}
          <nav aria-label="Topics">
            <div className="nav-group">Topics</div>
            {CATEGORIES.filter((c) => MAIN_CATEGORIES.includes(c.id)).map((c) => {
              const m = d.categoryMastery[c.id];
              return (
                <Link key={c.id} to={`/practice?cats=${c.id}`} className="topic-link" title={`Practice ${c.name}`}>
                  <i className="dot" style={{ background: c.color }} />
                  <span>{c.name}</span>
                  <span className="pct">{m.n ? `${m.score}%` : '—'}</span>
                  <span className="meter" aria-hidden><i style={{ width: `${m.score}%`, background: c.color }} /></span>
                </Link>
              );
            })}
          </nav>
          <div className="grow" />
          <div className="glass-panel mt16" style={{ padding: 12 }}>
            <div className="row between small"><b>Lv {lv.level} · {lv.name}</b></div>
            <div className="mt8"><div className="bar"><i style={{ width: `${lv.progress * 100}%` }} /></div></div>
            <div className="tiny muted mt8 mono">{s.profile.xp.toLocaleString()} XP{lv.next ? ` · ${(lv.next.xp - s.profile.xp).toLocaleString()} to Lv ${lv.next.level}` : ' · max level'}</div>
          </div>
          <NavLink to="/settings" className={({ isActive }) => `nav-item mt8 ${isActive ? 'active' : ''}`}><SettingsIcon size={16} /> Settings</NavLink>
        </aside>

        <main className="app-main" ref={mainRef}>
          <header className="topbar">
            <button className="btn icon ghost menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
            <div className="ticker">
              <span title="Estimated GRE Quant score (approximation)">EST <b>{d.estimate.score ?? '—'}</b>{d.estimate.range && <span className="hide-sm muted"> ({d.estimate.range[0]}–{d.estimate.range[1]})</span>}</span>
              <span>TGT <b>{s.profile.targetScore}</b></span>
              <span className="hide-sm">ACC <b>{d.totals.n ? Math.round(d.totals.accuracy * 100) + '%' : '—'}</b></span>
              <span className="row" style={{ gap: 4 }}><Flame size={13} color="var(--accent-coral)" /><b>{d.streak.current}</b><span className="hide-sm">day streak</span></span>
              <span className="row hide-sm" style={{ gap: 4 }}><Zap size={13} color="var(--accent-warm)" /><b>{s.profile.xp.toLocaleString()}</b> XP</span>
              <span className="row" style={{ gap: 4 }}><CalendarDays size={13} /><b>{daysLeft >= 0 ? daysLeft : 0}</b><span className="hide-sm">days to exam</span></span>
            </div>
          </header>
          {s.error && <div className="callout bad" style={{ margin: '12px 28px 0' }}><div className="t">Storage warning</div>{s.error}</div>}
          <div className="content">
            <Suspense fallback={<div className="muted">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/learn/:unit" element={<LessonPage />} />
                <Route path="/practice" element={<Practice />} />
                <Route path="/daily" element={<Daily />} />
                <Route path="/speed" element={<Speed />} />
                <Route path="/drills" element={<Drills />} />
                <Route path="/friends" element={<Friends />} />
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
          </div>
        </main>

        <RightRail />
      </div>
      <Toasts />
    </>
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
