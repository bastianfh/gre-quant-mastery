import { NavLink } from 'react-router-dom';
import { BookOpen, Brain, CalendarCheck, Gauge, Map, Scale, Sigma, SlidersHorizontal, Swords, type LucideIcon } from 'lucide-react';

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean };
export const PRACTICE_TABS: Tab[] = [
  { to: '/practice', label: 'Custom', icon: SlidersHorizontal, end: true },
  { to: '/daily', label: 'Daily Challenge', icon: CalendarCheck },
  { to: '/speed', label: 'Speed', icon: Gauge },
  { to: '/drills', label: 'Mental Math', icon: Brain },
  { to: '/qc', label: 'Quant Comparison', icon: Scale },
  { to: '/boss', label: 'Boss', icon: Swords },
];
export const PLAN_TABS: Tab[] = [
  { to: '/plan', label: 'Plan', icon: Map, end: true },
  { to: '/learn', label: 'Lessons', icon: BookOpen },
  { to: '/formulas', label: 'Formula Reference', icon: Sigma },
];

/** Secondary navigation inside a section (Practice modes, Study Plan resources). */
export function SectionTabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  return (
    <nav className="section-tabs" aria-label={label}>
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `section-tab${isActive ? ' on' : ''}`}>
          <t.icon size={14} aria-hidden /> {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
