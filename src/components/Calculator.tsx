import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { initCalc, press } from '../lib/calc';

const KEYS = [
  ['7', '8', '9', '/', 'C'],
  ['4', '5', '6', '*', 'CE'],
  ['1', '2', '3', '-', 'MR'],
  ['0', '.', '±', '+', 'MC'],
  ['(', ')', '√', '%', 'M+'],
];
const LABEL: Record<string, string> = { '/': '÷', '*': '×', '-': '−' };

export function Calculator({ onClose, onTransfer }: { onClose: () => void; onTransfer?: (v: string) => void }) {
  const [s, setS] = useState(initCalc);
  const [pos, setPos] = useState({ x: Math.max(16, window.innerWidth - 290), y: 120 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const map: Record<string, string> = { Enter: '=', '=': '=', Escape: 'C', Backspace: 'CE' };
      const k = map[e.key] ?? e.key;
      if (/^[0-9.+\-*/()%]$/.test(k) || k === '=' || k === 'C' || k === 'CE') { e.preventDefault(); e.stopPropagation(); setS((p) => press(p, k)); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  useEffect(() => {
    const mv = (e: PointerEvent) => { if (drag.current) setPos({ x: Math.max(0, Math.min(window.innerWidth - 250, e.clientX - drag.current.dx)), y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - drag.current.dy)) }); };
    const up = () => { drag.current = null; };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  }, []);
  const pretty = (e: string) => e.replace(/\*/g, '×').replace(/\//g, '÷');
  return (
    <div className="calc" style={{ left: pos.x, top: pos.y }} role="dialog" aria-label="Calculator">
      <div className="calc-head" onPointerDown={(e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; }}>
        <span>Calculator {s.memory !== 0 && <span className="pill" style={{ marginLeft: 6 }}>M</span>}</span>
        <button className="btn ghost sm icon" onClick={onClose} aria-label="Close calculator"><X size={14} /></button>
      </div>
      <div className="calc-display" aria-live="polite">
        <div className="expr">{pretty(s.expr)}</div>
        <div className="val" data-testid="calc-display">{s.entry}</div>
      </div>
      <div className="calc-keys">
        {KEYS.flat().map((k) => <button key={k} className={'+-*/'.includes(k) && k.length === 1 ? 'op' : ''} onClick={() => setS((p) => press(p, k))}>{LABEL[k] ?? k}</button>)}
        <button className="eq" style={{ gridColumn: onTransfer ? 'span 2' : 'span 5' }} onClick={() => setS((p) => press(p, '='))}>=</button>
        {onTransfer && <button style={{ gridColumn: 'span 3', fontFamily: 'var(--font)', fontSize: 12 }} onClick={() => !s.error && onTransfer(s.entry)}>Transfer Display</button>}
      </div>
      <div className="tiny muted" style={{ padding: '0 10px 8px' }}>Tip: estimate first — use the calculator only for ugly arithmetic.</div>
    </div>
  );
}
