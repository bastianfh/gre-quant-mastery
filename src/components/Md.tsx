import katex from 'katex';
import { memo, useMemo } from 'react';
import { parseMarkup } from '../lib/markup';

const cache = new Map<string, string>();
function tex(src: string, display: boolean) {
  const k = (display ? 'D' : 'I') + src;
  let html = cache.get(k);
  if (html === undefined) {
    try { html = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore' }); }
    catch { html = src; }
    if (cache.size > 5000) cache.clear();
    cache.set(k, html);
  }
  return html;
}

/** Render app markup: text + $inline$ / $$display$$ math (KaTeX) + **bold**. */
export const Md = memo(function Md({ text, block, className }: { text: string; block?: boolean; className?: string }) {
  const segs = useMemo(() => parseMarkup(text ?? ''), [text]);
  const Tag = (block ? 'div' : 'span') as 'span';
  return (
    <Tag className={className}>
      {segs.map((s, i) =>
        s.t === 'text' ? (s.bold ? <strong key={i}>{s.v}</strong> : <span key={i}>{s.v}</span>)
          : <span key={i} dangerouslySetInnerHTML={{ __html: tex(s.v, s.t === 'display') }} />,
      )}
    </Tag>
  );
});
