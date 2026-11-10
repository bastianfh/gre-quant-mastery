// Tiny markup: text with $inline math$, $$display math$$, **bold**, and \$ for a literal dollar sign.
export type Seg = { t: 'text'; v: string; bold?: boolean } | { t: 'math'; v: string } | { t: 'display'; v: string };

export function parseMarkup(src: string): Seg[] {
  const out: Seg[] = [];
  let buf = '';
  let i = 0;
  const flushText = () => {
    if (!buf) return;
    // split bold
    const parts = buf.split('**');
    parts.forEach((p, idx) => { if (p) out.push({ t: 'text', v: p, bold: idx % 2 === 1 }); });
    buf = '';
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && src[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (ch === '$') {
      const display = src[i + 1] === '$';
      const open = display ? 2 : 1;
      let j = i + open;
      let math = '';
      while (j < src.length) {
        if (src[j] === '\\' && src[j + 1] === '$') { math += '\\$'; j += 2; continue; }
        if (src[j] === '$') break;
        math += src[j];
        j++;
      }
      if (j >= src.length) { buf += src.slice(i); break; } // unmatched: treat as text
      flushText();
      out.push({ t: display ? 'display' : 'math', v: math });
      i = j + open;
      continue;
    }
    buf += ch;
    i++;
  }
  flushText();
  return out;
}

/** Plain-text approximation (for search, AI prompts, aria labels). */
export function plainText(src: string): string {
  return parseMarkup(src).map((s) => s.v).join('');
}
