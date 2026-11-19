import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, FlaskConical, ClipboardCheck, BarChart3, Settings as SettingsIcon, Menu, Map, Users } from 'lucide-react';
import { useStore } from './store/store';
import { computeDerived } from './store/derived';
import { levelOf } from './engine/gamification';
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

// Six top-level destinations. Practice modes and study resources live as tabs inside their section,
// so the section stays highlighted while you're on any of its sub-pages.
type NavEntry = { to: string; label: string; icon: typeof LayoutDashboard; also?: string[]; badge?: boolean };
const NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/plan', label: 'Study Plan', icon: Map, also: ['/learn', '/formulas'] },
  { to: '/practice', label: 'Practice', icon: Target, also: ['/daily', '/speed', '/drills', '/qc', '/boss'] },
  { to: '/mock', label: 'Mock Exams', icon: ClipboardCheck },
  { to: '/lab', label: 'Wrong Answer Lab', icon: FlaskConical, badge: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];
const isActive = (n: NavEntry, path: string) => (n.to === '/' ? path === '/' : [n.to, ...(n.also ?? [])].some((p) => path === p || path.startsWith(p + '/')));

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
  return (
    <>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="app-shell">
        <aside className={`app-sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
          <div className="brand">
            <div className="brand-mark"><svg width="16" height="16" viewBox="0 0 32 32"><path d="M4 24 L12 14 L18 19 L28 6" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <div>GRE Quant Mastery<small>Target {s.profile.targetScore}</small></div>
          </div>
          <nav aria-label="Main">
            {NAV.map((n) => {
              const active = isActive(n, loc.pathname);
              return (
                <Link key={n.to} to={n.to} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <n.icon size={17} /> {n.label}
                  {n.badge && d.due.length > 0 && <span className="badge" aria-label={`${d.due.length} reviews due`}>{d.due.length}</span>}
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
          <div className="nav-utility">
            <NavLink to="/friends" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Users size={15} /> Friends</NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><SettingsIcon size={15} /> Settings</NavLink>
          </div>
        </aside>

        {/* while the mobile drawer is open, the page behind it is inert (no focus, hidden from screen readers) */}
        <main className="app-main" ref={mainRef} {...(open ? { inert: '', 'aria-hidden': true } : {})}>
          {/* small screens only: the sidebar becomes a drawer */}
          <header className="topbar mobile-only">
            <button className="btn icon ghost menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
            <span className="topbar-brand">GRE Quant Mastery</span>
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
