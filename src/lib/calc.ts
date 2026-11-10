// GRE-style on-screen calculator: four operations with order of operations, parentheses,
// decimals, sign change, square root, percent, and memory (MR / MC / M+).

type Tok = { t: 'num'; v: number } | { t: 'op'; v: '+' | '-' | '*' | '/' } | { t: 'lp' } | { t: 'rp' };

export function tokenize(expr: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const s = expr.slice(i, j);
      if ((s.match(/\./g) ?? []).length > 1) throw new Error('bad number');
      out.push({ t: 'num', v: Number(s) }); i = j; continue;
    }
    if ('+-*/'.includes(c)) {
      // unary minus: at start, after an operator, or after '('
      const prev = out[out.length - 1];
      if (c === '-' && (!prev || prev.t === 'op' || prev.t === 'lp')) {
        let j = i + 1; while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
        if (j > i + 1) { out.push({ t: 'num', v: -Number(expr.slice(i + 1, j)) }); i = j; continue; }
        out.push({ t: 'num', v: -1 }); out.push({ t: 'op', v: '*' }); i++; continue;
      }
      out.push({ t: 'op', v: c as '+' }); i++; continue;
    }
    if (c === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rp' }); i++; continue; }
    throw new Error(`unexpected ${c}`);
  }
  return out;
}

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 } as const;

/** Shunting-yard evaluation. Throws on malformed input or division by zero. */
export function evaluate(expr: string): number {
  const toks = tokenize(expr);
  const out: number[] = [], ops: (Tok & { t: 'op' | 'lp' })[] = [];
  const apply = () => {
    const op = ops.pop() as Tok & { t: 'op' };
    const b = out.pop(), a = out.pop();
    if (a === undefined || b === undefined) throw new Error('syntax');
    if (op.v === '/' && b === 0) throw new Error('divide by zero');
    out.push(op.v === '+' ? a + b : op.v === '-' ? a - b : op.v === '*' ? a * b : a / b);
  };
  let expectNum = true;
  for (const t of toks) {
    if (t.t === 'num') { if (!expectNum) throw new Error('syntax'); out.push(t.v); expectNum = false; }
    else if (t.t === 'op') {
      if (expectNum) throw new Error('syntax');
      while (ops.length && ops[ops.length - 1].t === 'op' && PREC[(ops[ops.length - 1] as any).v as '+'] >= PREC[t.v]) apply();
      ops.push(t); expectNum = true;
    } else if (t.t === 'lp') { if (!expectNum) throw new Error('syntax'); ops.push(t); }
    else {
      if (expectNum) throw new Error('syntax');
      while (ops.length && ops[ops.length - 1].t !== 'lp') apply();
      if (!ops.length) throw new Error('mismatched )');
      ops.pop();
    }
  }
  if (expectNum && toks.length) throw new Error('syntax');
  while (ops.length) { if (ops[ops.length - 1].t === 'lp') throw new Error('mismatched ('); apply(); }
  if (out.length !== 1) throw new Error('syntax');
  return out[0];
}

export const formatCalc = (v: number) => {
  if (!Number.isFinite(v)) return 'Error';
  if (Math.abs(v) >= 1e10) return 'Error';
  const r = Math.round(v * 1e8) / 1e8;
  let s = String(r);
  if (s.includes('e')) s = r.toFixed(8);
  return s;
};

export interface CalcState { expr: string; entry: string; memory: number; error: boolean; fresh: boolean }
export const initCalc = (): CalcState => ({ expr: '', entry: '0', memory: 0, error: false, fresh: true });

/** Apply a key press. Keys: digits, '.', '+', '-', '*', '/', '(', ')', '=', 'C', 'CE', '±', '√', '%', 'MR', 'MC', 'M+'. */
export function press(s: CalcState, key: string): CalcState {
  if (s.error && key !== 'C' && key !== 'CE') return s;
  const lastChar = s.expr.trim().slice(-1);
  const entryValue = () => Number(s.entry);
  if (/^[0-9]$/.test(key)) {
    if (lastChar === ')') return s; // need an operator after ')'
    const entry = s.fresh || s.entry === '0' ? key : s.entry.replace(/^-0$/, '-') + key;
    if (entry.replace(/[-.]/g, '').length > 10) return s;
    return { ...s, entry, fresh: false };
  }
  if (key === '.') {
    if (s.fresh) return { ...s, entry: '0.', fresh: false };
    if (s.entry.includes('.')) return s;
    return { ...s, entry: s.entry + '.' };
  }
  if (key === '±') {
    if (s.entry === '0') return s;
    return { ...s, entry: s.entry.startsWith('-') ? s.entry.slice(1) : '-' + s.entry, fresh: false };
  }
  if (key === '√') {
    const v = entryValue();
    if (v < 0) return { ...s, error: true, entry: 'Error' };
    return { ...s, entry: formatCalc(Math.sqrt(v)), fresh: true };
  }
  if (key === '%') return { ...s, entry: formatCalc(entryValue() / 100), fresh: true };
  if (key === 'MR') return { ...s, entry: formatCalc(s.memory), fresh: true };
  if (key === 'MC') return { ...s, memory: 0 };
  if (key === 'M+') return { ...s, memory: s.memory + entryValue(), fresh: true };
  if (key === 'C') return { ...initCalc(), memory: s.memory };
  if (key === 'CE') return { ...s, entry: '0', fresh: true, error: false };
  const neg = (e: string) => (e.startsWith('-') ? `(${e})` : e);
  if (key === '(') {
    if (lastChar && !'+-*/('.includes(lastChar)) return s;
    return { ...s, expr: s.expr + '(', entry: '0', fresh: true };
  }
  if (key === ')') {
    const open = (s.expr.match(/\(/g) ?? []).length - (s.expr.match(/\)/g) ?? []).length;
    if (open <= 0) return s;
    const expr = lastChar === ')' ? s.expr + ')' : s.expr + neg(s.entry) + ')';
    return { ...s, expr, fresh: true };
  }
  if ('+-*/'.includes(key)) {
    let expr = lastChar === ')' ? s.expr : s.expr + neg(s.entry);
    if (s.fresh && lastChar && '+-*/'.includes(lastChar) && s.entry === '0') expr = s.expr.slice(0, -1);
    return { ...s, expr: expr + key, entry: s.entry, fresh: true };
  }
  if (key === '=') {
    let expr = lastChar === ')' ? s.expr : s.expr + neg(s.entry);
    const open = (expr.match(/\(/g) ?? []).length - (expr.match(/\)/g) ?? []).length;
    expr += ')'.repeat(Math.max(0, open));
    try {
      const v = evaluate(expr);
      const f = formatCalc(v);
      if (f === 'Error') return { ...s, error: true, entry: 'Error', expr: '' };
      return { ...s, expr: '', entry: f, fresh: true };
    } catch {
      return { ...s, error: true, entry: 'Error', expr: '' };
    }
  }
  return s;
}
