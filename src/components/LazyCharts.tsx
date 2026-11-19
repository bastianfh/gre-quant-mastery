// Recharts (+ d3/lodash) is ~850 KB, so charts load on demand in their own chunk.
import { lazy, Suspense, type ComponentProps } from 'react';
import type * as C from './Charts';

const LineSeriesImpl = lazy(() => import('./Charts').then((m) => ({ default: m.LineSeries })));
const BarsImpl = lazy(() => import('./Charts').then((m) => ({ default: m.Bars })));
const Placeholder = ({ height = 200 }: { height?: number }) => <div className="chart-loading" style={{ height }} aria-hidden />;

export function LineSeries(p: ComponentProps<typeof C.LineSeries>) {
  return <Suspense fallback={<Placeholder height={p.height} />}><LineSeriesImpl {...p} /></Suspense>;
}
export function Bars(p: ComponentProps<typeof C.Bars>) {
  return <Suspense fallback={<Placeholder height={p.height} />}><BarsImpl {...p} /></Suspense>;
}
