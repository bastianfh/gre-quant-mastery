import { useState } from 'react';
import type { ChartDiagram, Diagram as D, GeoDiagram, Pt } from '../engine/types';
import { usePalette } from './ui';

export function Diagram({ d }: { d: D }) {
  if (d.kind === 'geo') return <Geo d={d} />;
  if (d.kind === 'table') return <TableChart d={d} />;
  return <Chart d={d} />;
}

// ---------------- Geometry ----------------
function Geo({ d }: { d: GeoDiagram }) {
  const P = usePalette();
  const W = d.width, H = d.height, pad = d.axes ? 28 : 30;
  const pts: Pt[] = [];
  d.segments?.forEach((s) => pts.push(s.a, s.b));
  d.polygons?.forEach((p) => pts.push(...p.pts));
  d.circles?.forEach((c) => pts.push({ x: c.c.x - c.r, y: c.c.y - c.r }, { x: c.c.x + c.r, y: c.c.y + c.r }));
  d.arcs?.forEach((c) => pts.push({ x: c.c.x - c.r, y: c.c.y - c.r }, { x: c.c.x + c.r, y: c.c.y + c.r }));
  d.points?.forEach((p) => pts.push(p.p));
  d.labels?.forEach((l) => pts.push(l.at));
  let xMin = Math.min(...pts.map((p) => p.x)), xMax = Math.max(...pts.map((p) => p.x)), yMin = Math.min(...pts.map((p) => p.y)), yMax = Math.max(...pts.map((p) => p.y));
  if (d.axes) ({ xMin, xMax, yMin, yMax } = d.axes);
  const bw = xMax - xMin || 1, bh = yMax - yMin || 1;
  const sc = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh);
  const ox = (W - sc * bw) / 2, oy = (H - sc * bh) / 2;
  const X = (x: number) => ox + (x - xMin) * sc, Y = (y: number) => H - oy - (y - yMin) * sc;
  const stroke = P.ink2, ink = P.ink;
  const arcPath = (c: Pt, r: number, from: number, to: number, sector?: boolean) => {
    const a1 = (from * Math.PI) / 180, a2 = (to * Math.PI) / 180;
    const p1 = { x: X(c.x + r * Math.cos(a1)), y: Y(c.y + r * Math.sin(a1)) }, p2 = { x: X(c.x + r * Math.cos(a2)), y: Y(c.y + r * Math.sin(a2)) };
    const large = ((to - from) % 360 + 360) % 360 > 180 ? 1 : 0;
    return `${sector ? `M ${X(c.x)} ${Y(c.y)} L` : 'M'} ${p1.x} ${p1.y} A ${r * sc} ${r * sc} 0 ${large} 0 ${p2.x} ${p2.y}${sector ? ' Z' : ''}`;
  };
  const ticks = (lo: number, hi: number) => { const r: number[] = []; for (let v = Math.ceil(lo); v <= Math.floor(hi); v++) r.push(v); return r; };
  const step = d.axes ? (bw > 14 ? 2 : 1) : 1;
  return (
    <figure className="diagram" style={{ flexDirection: 'column', margin: '14px 0' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} role="img" aria-label="Figure">
        {d.axes && (
          <g>
            {ticks(xMin, xMax).map((v) => <line key={'gx' + v} x1={X(v)} x2={X(v)} y1={Y(yMin)} y2={Y(yMax)} stroke={P.grid} strokeWidth={1} />)}
            {ticks(yMin, yMax).map((v) => <line key={'gy' + v} y1={Y(v)} y2={Y(v)} x1={X(xMin)} x2={X(xMax)} stroke={P.grid} strokeWidth={1} />)}
            <line x1={X(xMin)} x2={X(xMax)} y1={Y(0)} y2={Y(0)} stroke={P.muted} strokeWidth={1.5} />
            <line y1={Y(yMin)} y2={Y(yMax)} x1={X(0)} x2={X(0)} stroke={P.muted} strokeWidth={1.5} />
            {ticks(xMin, xMax).filter((v) => v !== 0 && v % step === 0).map((v) => <text key={'tx' + v} x={X(v)} y={Y(0) + 12} fontSize={9} fill={P.muted} textAnchor="middle">{v}</text>)}
            {ticks(yMin, yMax).filter((v) => v !== 0 && v % step === 0).map((v) => <text key={'ty' + v} x={X(0) - 5} y={Y(v) + 3} fontSize={9} fill={P.muted} textAnchor="end">{v}</text>)}
            <text x={X(xMax) - 4} y={Y(0) - 5} fontSize={11} fill={P.ink2} textAnchor="end" fontStyle="italic">x</text>
            <text x={X(0) + 6} y={Y(yMax) + 10} fontSize={11} fill={P.ink2} fontStyle="italic">y</text>
          </g>
        )}
        {d.polygons?.map((p, i) => <polygon key={'pg' + i} points={p.pts.map((q) => `${X(q.x)},${Y(q.y)}`).join(' ')} fill={p.shaded ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'none'} stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />)}
        {d.circles?.map((c, i) => <circle key={'c' + i} cx={X(c.c.x)} cy={Y(c.c.y)} r={c.r * sc} fill={d.polygons?.some((p) => p.shaded) ? P.surface : 'none'} stroke={stroke} strokeWidth={1.8} />)}
        {d.arcs?.map((a, i) => <path key={'a' + i} d={arcPath(a.c, a.r, a.from, a.to, a.sector)} fill={a.sector ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'none'} stroke={stroke} strokeWidth={a.sector ? 0 : 1.8} />)}
        {d.segments?.map((s, i) => <line key={'s' + i} x1={X(s.a.x)} y1={Y(s.a.y)} x2={X(s.b.x)} y2={Y(s.b.y)} stroke={stroke} strokeWidth={1.8} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinecap="round" />)}
        {d.rightAngles?.map((r, i) => {
          const n1 = Math.hypot(r.dir1.x, r.dir1.y), n2 = Math.hypot(r.dir2.x, r.dir2.y), s = 10;
          const u = { x: (r.dir1.x / n1) * s, y: (-r.dir1.y / n1) * s }, v = { x: (r.dir2.x / n2) * s, y: (-r.dir2.y / n2) * s };
          const ax = X(r.at.x), ay = Y(r.at.y);
          return <path key={'r' + i} d={`M ${ax + u.x} ${ay + u.y} L ${ax + u.x + v.x} ${ay + u.y + v.y} L ${ax + v.x} ${ay + v.y}`} fill="none" stroke={stroke} strokeWidth={1.2} />;
        })}
        {d.points?.map((p, i) => (
          <g key={'p' + i}>
            <circle cx={X(p.p.x)} cy={Y(p.p.y)} r={3} fill={ink} />
            {p.label && <text x={X(p.p.x) + (p.dx ?? 0)} y={Y(p.p.y) + (p.dy ?? -8)} fontSize={12} fill={ink} textAnchor="middle" fontWeight={600}>{p.label}</text>}
          </g>
        ))}
        {d.labels?.map((l, i) => <text key={'l' + i} x={X(l.at.x)} y={Y(l.at.y)} fontSize={13} fill={ink} textAnchor={l.anchor ?? 'middle'} dominantBaseline="middle" fontStyle={/^[a-zℓ]/.test(l.text) && l.text.length <= 3 ? 'italic' : undefined}>{l.text}</text>)}
      </svg>
      {d.note && <figcaption className="diagram-note">{d.note}</figcaption>}
    </figure>
  );
}

// ---------------- Data interpretation ----------------
function niceMax(v: number) {
  const m = 10 ** Math.floor(Math.log10(v || 1));
  for (const k of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * m >= v) return k * m;
  return 10 * m;
}

function TableChart({ d }: { d: ChartDiagram }) {
  return (
    <figure style={{ margin: '14px 0' }}>
      <div className="upper" style={{ textAlign: 'center', marginBottom: 8 }}>{d.title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data" style={{ maxWidth: 560, margin: '0 auto' }}>
          <thead><tr>{d.columns!.map((c, i) => <th key={i} className={i ? 'num' : ''}>{c}</th>)}</tr></thead>
          <tbody>{d.rows!.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === 'number' ? 'num' : ''} style={String(r[0]) === 'Total' ? { fontWeight: 600 } : undefined}>{typeof c === 'number' ? c.toLocaleString() : c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </figure>
  );
}

function Chart({ d }: { d: ChartDiagram }) {
  const P = usePalette();
  const [hover, setHover] = useState<string | null>(null);
  const W = 560, H = 280, L = 48, R = 16, T = 16, B = 44;
  const iw = W - L - R, ih = H - T - B;
  const title = <div className="upper" style={{ textAlign: 'center', marginBottom: 6 }}>{d.title}</div>;
  const tip = hover && <div className="tiny mono muted" style={{ textAlign: 'center', minHeight: 16 }}>{hover}</div>;
  if (d.kind === 'pie') {
    const cx = 150, cy = 140, r = 105;
    let acc = 0;
    return (
      <figure style={{ margin: '14px 0' }}>{title}
        <div className="row wrap" style={{ justifyContent: 'center', gap: 24 }}>
          <svg viewBox="0 0 300 280" width={300} role="img" aria-label={d.title}>
            {d.slices!.map((s, i) => {
              const a1 = (acc / 100) * 2 * Math.PI - Math.PI / 2; acc += s.value; const a2 = (acc / 100) * 2 * Math.PI - Math.PI / 2;
              const large = s.value > 50 ? 1 : 0;
              const mid = (a1 + a2) / 2;
              return (
                <g key={i} onMouseEnter={() => setHover(`${s.label}: ${s.value}%`)} onMouseLeave={() => setHover(null)}>
                  <path d={`M ${cx} ${cy} L ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)} Z`} fill={P.series[i]} stroke={P.surface} strokeWidth={2} />
                  {s.value >= 6 && <text x={cx + r * 0.65 * Math.cos(mid)} y={cy + r * 0.65 * Math.sin(mid)} fontSize={12} fontWeight={700} fill={i === 3 ? '#0b0b0b' : '#fff'} textAnchor="middle" dominantBaseline="middle">{s.value}%</text>}
                </g>
              );
            })}
          </svg>
          <div className="legend" style={{ flexDirection: 'column', gap: 6 }}>{d.slices!.map((s, i) => <span key={i}><i className="dot" style={{ background: P.series[i] }} />{s.label} — <b className="mono">{s.value}%</b></span>)}</div>
        </div>
      </figure>
    );
  }
  if (d.kind === 'boxplot') {
    const boxes = d.box!;
    const lo = Math.min(...boxes.map((b) => b.min)), hi = Math.max(...boxes.map((b) => b.max));
    const x0 = Math.floor(lo / 10) * 10, x1 = Math.ceil(hi / 10) * 10;
    const X = (v: number) => L + ((v - x0) / (x1 - x0)) * iw;
    const rowH = ih / boxes.length;
    const tks: number[] = []; for (let v = x0; v <= x1; v += x1 - x0 > 60 ? 10 : 5) tks.push(v);
    return (
      <figure style={{ margin: '14px 0' }}>{title}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={d.title}>
          {tks.map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={T} y2={T + ih} stroke={P.grid} /><text x={X(v)} y={T + ih + 16} fontSize={11} fill={P.muted} textAnchor="middle">{v}</text></g>)}
          {boxes.map((b, i) => {
            const cy = T + rowH * i + rowH / 2, bh = Math.min(36, rowH * 0.45);
            return (
              <g key={i} onMouseEnter={() => setHover(`${b.label}: min ${b.min}, Q1 ${b.q1}, median ${b.median}, Q3 ${b.q3}, max ${b.max}`)} onMouseLeave={() => setHover(null)}>
                <text x={4} y={cy + 4} fontSize={11} fill={P.ink2}>{b.label}</text>
                <line x1={X(b.min)} x2={X(b.max)} y1={cy} y2={cy} stroke={P.ink2} strokeWidth={1.5} />
                <line x1={X(b.min)} x2={X(b.min)} y1={cy - bh / 3} y2={cy + bh / 3} stroke={P.ink2} strokeWidth={1.5} />
                <line x1={X(b.max)} x2={X(b.max)} y1={cy - bh / 3} y2={cy + bh / 3} stroke={P.ink2} strokeWidth={1.5} />
                <rect x={X(b.q1)} y={cy - bh / 2} width={X(b.q3) - X(b.q1)} height={bh} fill={P.series[i]} fillOpacity={0.35} stroke={P.series[i]} strokeWidth={2} rx={3} />
                <line x1={X(b.median)} x2={X(b.median)} y1={cy - bh / 2} y2={cy + bh / 2} stroke={P.ink} strokeWidth={2.5} />
                {[b.min, b.q1, b.median, b.q3, b.max].map((v, k) => <text key={k} x={X(v)} y={cy - bh / 2 - 5} fontSize={10} fill={P.ink2} textAnchor="middle">{v}</text>)}
              </g>
            );
          })}
          <text x={L + iw / 2} y={H - 4} fontSize={11} fill={P.muted} textAnchor="middle">{d.unit ? `(${d.unit})` : ''}</text>
        </svg>{tip}
      </figure>
    );
  }
  if (d.kind === 'scatter') {
    const ps = d.points!;
    const xm = niceMax(Math.max(...ps.map((p) => p.x))), ym = niceMax(Math.max(...ps.map((p) => p.y)));
    const X = (v: number) => L + (v / xm) * iw, Y = (v: number) => T + ih - (v / ym) * ih;
    const tx: number[] = [], ty: number[] = [];
    for (let v = 0; v <= xm; v += xm / 5) tx.push(v);
    for (let v = 0; v <= ym; v += ym / 5) ty.push(v);
    return (
      <figure style={{ margin: '14px 0' }}>{title}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={d.title}>
          {ty.map((v) => <g key={'y' + v}><line x1={L} x2={L + iw} y1={Y(v)} y2={Y(v)} stroke={P.grid} /><text x={L - 6} y={Y(v) + 4} fontSize={11} fill={P.muted} textAnchor="end">{+v.toFixed(1)}</text></g>)}
          {tx.map((v) => <g key={'x' + v}><line x1={X(v)} x2={X(v)} y1={T} y2={T + ih} stroke={P.grid} /><text x={X(v)} y={T + ih + 16} fontSize={11} fill={P.muted} textAnchor="middle">{+v.toFixed(1)}</text></g>)}
          <line x1={X(0)} y1={Y(0)} x2={X(Math.min(xm, ym))} y2={Y(Math.min(xm, ym))} stroke={P.muted} strokeDasharray="4 4" />
          <text x={X(Math.min(xm, ym)) - 4} y={Y(Math.min(xm, ym)) + 14} fontSize={10} fill={P.muted} textAnchor="end">y = x</text>
          {ps.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={4.5} fill={P.series[0]} stroke={P.surface} strokeWidth={2} onMouseEnter={() => setHover(`(${p.x}, ${p.y})`)} onMouseLeave={() => setHover(null)} />)}
          <text x={L + iw / 2} y={H - 4} fontSize={11} fill={P.muted} textAnchor="middle">{d.xLabel}</text>
          <text x={12} y={T + ih / 2} fontSize={11} fill={P.muted} textAnchor="middle" transform={`rotate(-90 12 ${T + ih / 2})`}>{d.yLabel}</text>
        </svg>{tip}
      </figure>
    );
  }
  // bar / histogram / line
  const cats = d.categories!, series = d.series!;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values)));
  const Y = (v: number) => T + ih - (v / max) * ih;
  const ticks = Array.from({ length: 6 }, (_, i) => (max / 5) * i);
  const band = iw / cats.length;
  return (
    <figure style={{ margin: '14px 0' }}>{title}
      {series.length > 1 && <div className="legend" style={{ justifyContent: 'center', marginBottom: 4 }}>{series.map((s, i) => <span key={i}><i className="dot" style={{ background: P.series[i] }} />{s.name}</span>)}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={d.title}>
        {ticks.map((v) => <g key={v}><line x1={L} x2={L + iw} y1={Y(v)} y2={Y(v)} stroke={P.grid} /><text x={L - 6} y={Y(v) + 4} fontSize={11} fill={P.muted} textAnchor="end">{+v.toFixed(1)}</text></g>)}
        <line x1={L} x2={L + iw} y1={Y(0)} y2={Y(0)} stroke={P.axis} strokeWidth={1.5} />
        {cats.map((c, i) => <text key={c} x={L + band * i + band / 2} y={T + ih + 16} fontSize={11} fill={P.ink2} textAnchor="middle">{c}</text>)}
        {d.kind === 'line'
          ? series.map((s, si) => (
            <g key={si}>
              <polyline points={s.values.map((v, i) => `${L + band * i + band / 2},${Y(v)}`).join(' ')} fill="none" stroke={P.series[si]} strokeWidth={2} />
              {s.values.map((v, i) => (
                <g key={i} onMouseEnter={() => setHover(`${cats[i]}: ${v}`)} onMouseLeave={() => setHover(null)}>
                  <circle cx={L + band * i + band / 2} cy={Y(v)} r={4.5} fill={P.series[si]} stroke={P.surface} strokeWidth={2} />
                  <text x={L + band * i + band / 2} y={Y(v) - 9} fontSize={11} fill={P.ink} textAnchor="middle">{v}</text>
                  <rect x={L + band * i} y={T} width={band} height={ih} fill="transparent" />
                </g>
              ))}
            </g>
          ))
          : cats.map((c, i) => {
            const gw = band * (d.kind === 'histogram' ? 1 : 0.72), bw = gw / series.length;
            const x0 = L + band * i + (band - gw) / 2;
            return series.map((s, si) => {
              const v = s.values[i];
              const x = x0 + bw * si + 1, w = bw - 2, y = Y(v), h = Y(0) - y;
              return (
                <g key={c + si} onMouseEnter={() => setHover(`${c}${series.length > 1 ? ` · ${s.name}` : ''}: ${v}`)} onMouseLeave={() => setHover(null)}>
                  <path d={`M ${x} ${Y(0)} V ${y + Math.min(4, h)} Q ${x} ${y} ${x + Math.min(4, w / 2)} ${y} H ${x + w - Math.min(4, w / 2)} Q ${x + w} ${y} ${x + w} ${y + Math.min(4, h)} V ${Y(0)} Z`} fill={P.series[si]} />
                  <text x={x + w / 2} y={y - 5} fontSize={10.5} fill={P.ink} textAnchor="middle">{v}</text>
                </g>
              );
            });
          })}
        {d.xLabel && <text x={L + iw / 2} y={H - 4} fontSize={11} fill={P.muted} textAnchor="middle">{d.xLabel}</text>}
        {d.yLabel && <text x={12} y={T + ih / 2} fontSize={11} fill={P.muted} textAnchor="middle" transform={`rotate(-90 12 ${T + ih / 2})`}>{d.yLabel}</text>}
      </svg>{tip}
    </figure>
  );
}
