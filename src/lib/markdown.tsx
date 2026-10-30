// Minimal, safe markdown renderer for CMS pages: #/##/### headings, > quotes, - lists, 1. lists,
// **bold**, *italic*. Output is built from React elements (never innerHTML), so page content
// cannot inject scripts.
import { Fragment, type ReactNode } from 'react';

const inline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });

export const Markdown = ({ source }: { source: string }) => {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'mt-2 mb-4 text-3xl font-bold' : level === 2 ? 'mt-8 mb-2 text-xl font-semibold' : 'mt-5 mb-1 text-lg font-semibold';
      const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3';
      out.push(<Tag key={i} className={cls}>{inline(h[2])}</Tag>);
      i++;
      continue;
    }

    if (line.startsWith('> ')) {
      out.push(<blockquote key={i} className="my-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900">{inline(line.slice(2))}</blockquote>);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\.\s+/.test(lines[i]) : /^[-*]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^([-*]|\d+\.)\s+/, ''));
        i++;
      }
      const List = ordered ? 'ol' : 'ul';
      out.push(
        <List key={`l${i}`} className={`my-3 space-y-1.5 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, k) => <li key={k}>{inline(it)}</li>)}
        </List>,
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>\s|[-*]\s|\d+\.\s)/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={`p${i}`} className="my-3 leading-relaxed">{inline(para.join(' '))}</p>);
  }

  return <div className="text-warm-gray-800">{out}</div>;
};
