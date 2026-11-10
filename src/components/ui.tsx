import type { ReactNode } from 'react';
import { BAND_LABEL, type Band } from '../engine/mastery';
import { useStore } from '../store/store';

// Chart palette (validated reference instance: dataviz references/palette.md), resolved per theme.
const PALETTE = {
  dark: { series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'], grid: '#2c2c2a', axis: '#383835', ink: '#f0efec', ink2: '#c3c2b7', muted: '#898781', surface: '#1a1a19', good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
  light: { series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'], grid: '#e1e0d9', axis: '#c3c2b7', ink: '#0b0b0b', ink2: '#52514e', muted: '#6f6d68', surface: '#fcfcfb', good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
};
export function usePalette() {
  const theme = useStore((s) => s.profile.settings.theme);
  return PALETTE[theme === 'light' ? 'light' : 'dark'];
}

export const BAND_COLOR: Record<Band, string> = {
  critical: 'var(--critical)', developing: 'var(--serious)', intermediate: 'var(--warning)', strong: 'var(--good)', mastered: 'var(--accent)', unrated: 'var(--muted)',
};
export function BandTag({ band }: { band: Band }) {
  return <span className="band" style={{ color: band === 'unrated' ? 'var(--muted)' : 'var(--ink-2)' }}><span className="dot" style={{ background: BAND_COLOR[band] }} />{BAND_LABEL[band]}</span>;
}

export function Card({ title, action, children, className, style }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`card ${className ?? ''}`} style={style}>
      {(title || action) && <div className="card-head"><h3>{title}</h3>{action}</div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value num" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Progress({ value, color, height }: { value: number; color?: string; height?: number }) {
  return <div className="bar" style={height ? { height } : undefined}><i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} /></div>;
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return <div className="seg" role="radiogroup">{options.map((o) => <button key={String(o.v)} role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>)}</div>;
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="row wrap">{children}</div>}</div>;
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return <div className="empty">{icon}<div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{title}</div>{children}</div>;
}

export const fmtTime = (sec: number) => {
  if (!Number.isFinite(sec)) return '—';
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s % 60).padStart(2, '0')}`;
};
export const pctStr = (x: number, d = 0) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—');
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
