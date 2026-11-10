import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import { usePalette } from './ui';

type Row = Record<string, string | number | null>;

function Tip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="tt">{label}</div>
      {payload.map((p: any) => <div key={p.dataKey} className="row" style={{ gap: 6 }}><i className="dot" style={{ background: p.color }} /><span className="ink2">{p.name}</span><b className="mono" style={{ marginLeft: 'auto' }}>{fmt ? fmt(p.value, p.dataKey) : p.value}</b></div>)}
    </div>
  );
}

/** Single-axis line chart. One measure per chart (never dual axes). */
export function LineSeries({ data, x, series, height = 200, yDomain, fmt, refY, refLabel }: { data: Row[]; x: string; series: { key: string; name: string; slot?: number }[]; height?: number; yDomain?: [number | string, number | string]; fmt?: (v: number, k: string) => string; refY?: number; refLabel?: string }) {
  const P = usePalette();
  return (
    <div>
      {series.length > 1 && <div className="legend mb8">{series.map((s, i) => <span key={s.key}><i className="dot" style={{ background: P.series[(s.slot ?? i + 1) - 1] }} />{s.name}</span>)}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={P.grid} vertical={false} />
          <XAxis dataKey={x} tick={{ fill: P.muted, fontSize: 11 }} axisLine={{ stroke: P.axis }} tickLine={false} minTickGap={16} />
          <YAxis domain={yDomain ?? ['auto', 'auto']} tick={{ fill: P.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt ? (v) => fmt(v, '') : undefined} width={48} />
          <Tooltip content={<Tip fmt={fmt} />} cursor={{ stroke: P.axis }} />
          {refY !== undefined && <ReferenceLine y={refY} stroke={P.muted} strokeDasharray="4 4" label={{ value: refLabel, fill: P.muted, fontSize: 10, position: 'insideTopRight' }} />}
          {series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={P.series[(s.slot ?? i + 1) - 1]} strokeWidth={2} dot={data.length < 20 ? { r: 4, strokeWidth: 2, stroke: P.surface } : false} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bar chart for one measure; optional per-bar color slots. */
export function Bars({ data, x, y, name, height = 200, slot = 1, colorOf, fmt, yDomain }: { data: Row[]; x: string; y: string; name: string; height?: number; slot?: number; colorOf?: (r: Row) => string; fmt?: (v: number) => string; yDomain?: [number, number] }) {
  const P = usePalette();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
        <CartesianGrid stroke={P.grid} vertical={false} />
        <XAxis dataKey={x} tick={{ fill: P.muted, fontSize: 11 }} axisLine={{ stroke: P.axis }} tickLine={false} interval={0} minTickGap={4} />
        <YAxis tick={{ fill: P.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={48} domain={yDomain} />
        <Tooltip content={<Tip fmt={fmt} />} cursor={{ fill: P.grid, opacity: 0.4 }} />
        <Bar dataKey={y} name={name} radius={[4, 4, 0, 0]} fill={P.series[slot - 1]} isAnimationActive={false}>
          {colorOf && data.map((r, i) => <Cell key={i} fill={colorOf(r)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
