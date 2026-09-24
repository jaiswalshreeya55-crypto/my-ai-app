import React, { useState } from 'react';
import { Copy, Check, Sigma } from 'lucide-react';
import katex from 'katex';

interface MarkdownProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownProps> = ({ content }) => {
  if (!content) return null;

  // Normalize alternative LaTeX display delimiters \[ ... \] and equation environments to $$ ... $$
  const normalizedContent = content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, '$$$$$1$$$$')
    .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, '$$$$$1$$$$');

  // Split content by code blocks and display math blocks ($$ ... $$)
  const parts = normalizedContent.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

  return (
    <div className="space-y-3 text-slate-800 text-sm sm:text-base leading-relaxed break-words font-normal">
      {parts.map((part, index) => {
        if (!part) return null;

        // Code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0].trim();
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const language = hasLang ? firstLine : '';
          const code = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

          return <CodeBlock key={index} code={code} language={language} />;
        }

        // Display Math Block ($$ ... $$)
        if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
          const math = part.slice(2, -2).trim();
          return <MathBlock key={index} math={math} />;
        }

        // Regular markdown text paragraphs, lists, tables, and inline math
        return <FormattedParagraphs key={index} text={part} />;
      })}
    </div>
  );
};

export const MathBlock: React.FC<{ math: string }> = ({ math }) => {
  const [copied, setCopied] = useState(false);
  const cleanMath = math.trim();

  let renderedHtml = '';
  try {
    renderedHtml = katex.renderToString(cleanMath, {
      displayMode: true,
      throwOnError: false,
    });
  } catch {
    renderedHtml = `<span class="katex-error text-amber-700 font-mono text-sm">${escapeHtml(cleanMath)}</span>`;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanMath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 p-4 sm:p-5 shadow-2xs transition hover:border-purple-300/90">
      {/* Math Card Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2 border-b border-purple-100/70 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-purple-800 text-xs tracking-wide">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100/80 text-purple-700 font-serif font-bold text-xs">
            <Sigma className="h-3.5 w-3.5" />
          </span>
          <span className="uppercase text-[11px] tracking-wider font-bold">
            Mathematical Equation
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-purple-100 bg-white/90 px-2.5 py-1 text-slate-600 shadow-2xs transition hover:bg-purple-50 hover:text-purple-700 active:scale-95"
          title="Copy LaTeX formula"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold text-[11px]">Copied LaTeX</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600" />
              <span className="text-[11px] font-medium">Copy LaTeX</span>
            </>
          )}
        </button>
      </div>

      {/* Equation Display Canvas */}
      <div
        className="katex-display-container flex justify-center py-3 sm:py-4 text-slate-900 overflow-x-auto text-lg sm:text-xl md:text-2xl font-normal leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};

export const InlineMath: React.FC<{ math: string }> = ({ math }) => {
  const cleanMath = math.trim();
  if (!cleanMath) return null;

  let renderedHtml = '';
  try {
    renderedHtml = katex.renderToString(cleanMath, {
      displayMode: false,
      throwOnError: false,
    });
  } catch {
    return <span className="font-mono text-purple-800 px-1">{cleanMath}</span>;
  }

  return (
    <span
      className="inline-math px-0.5 align-baseline font-normal text-slate-900"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-purple-100 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2 text-xs">
        <span className="font-mono text-purple-400 font-medium">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs sm:text-sm text-slate-200 leading-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const FormattedParagraphs: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let tableBuffer: string[] = [];

  const flushList = (keyPrefix: number) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={`ul-${keyPrefix}`} className="my-2 space-y-1.5 pl-5 list-disc text-slate-700 marker:text-purple-500">
          {currentList.items.map((item, i) => (
            <li key={i} className="pl-1 leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${keyPrefix}`} className="my-2 space-y-1.5 pl-5 list-decimal text-slate-700 marker:text-purple-600 marker:font-semibold">
          {currentList.items.map((item, i) => (
            <li key={i} className="pl-1 leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  const flushTable = (keyPrefix: number) => {
    if (tableBuffer.length < 2) {
      // Not a valid table, render lines as paragraphs
      tableBuffer.forEach((line, idx) => {
        elements.push(
          <p key={`tbf-${keyPrefix}-${idx}`} className="my-1.5 text-slate-700 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      });
      tableBuffer = [];
      return;
    }

    const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(tableBuffer[1].trim());
    if (isSeparator) {
      const parseCells = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseCells(tableBuffer[0]);
      const rows = tableBuffer.slice(2).map(parseCells);

      elements.push(
        <div key={`tbl-${keyPrefix}`} className="my-3 overflow-x-auto rounded-xl border border-purple-100 shadow-2xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-purple-50/80 border-b border-purple-100 text-purple-950 font-bold">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-3.5 py-2.5 whitespace-nowrap">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 bg-white">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-purple-50/30 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-slate-700 leading-normal">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      tableBuffer.forEach((line, idx) => {
        elements.push(
          <p key={`tbf-${keyPrefix}-${idx}`} className="my-1.5 text-slate-700 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      });
    }
    tableBuffer = [];
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    // Check for table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(index);
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable(index);
    }

    // Check for standalone LaTeX math lines without explicit $$ delimiters
    if (isStandaloneMathLine(trimmed)) {
      flushList(index);
      elements.push(<MathBlock key={`math-${index}`} math={trimmed} />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList(index);
      elements.push(
        <h3 key={index} className="pt-3 pb-1 text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="inline-block w-1.5 h-4 bg-purple-500 rounded-full" />
          {renderInline(trimmed.replace('### ', ''))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList(index);
      elements.push(
        <h2 key={index} className="pt-4 pb-1.5 text-lg sm:text-xl font-extrabold text-slate-900 border-b border-purple-100">
          {renderInline(trimmed.replace('## ', ''))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList(index);
      elements.push(
        <h1 key={index} className="pt-5 pb-2 text-xl sm:text-2xl font-extrabold text-purple-950">
          {renderInline(trimmed.replace('# ', ''))}
        </h1>
      );
      continue;
    }

    // Bullet lists
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('+ ')) {
      const itemContent = trimmed.slice(2);
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(itemContent);
      } else {
        flushList(index);
        currentList = { type: 'ul', items: [itemContent] };
      }
      continue;
    }

    // Numbered lists
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      const itemContent = numberMatch[2];
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(itemContent);
      } else {
        flushList(index);
        currentList = { type: 'ol', items: [itemContent] };
      }
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList(index);
      elements.push(
        <blockquote key={index} className="border-l-4 border-purple-500 bg-purple-50/60 pl-4 py-2 my-2 rounded-r-lg text-slate-700 italic">
          {renderInline(trimmed.replace('> ', ''))}
        </blockquote>
      );
      continue;
    }

    // Empty line
    if (!trimmed) {
      flushList(index);
      continue;
    }

    // Standard paragraph
    flushList(index);
    elements.push(
      <p key={index} className="my-1.5 text-slate-700 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList(lines.length);
  if (tableBuffer.length > 0) {
    flushTable(lines.length);
  }

  return <>{elements}</>;
};

function isStandaloneMathLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Ignore markdown headings, list bullets, quotes, tables
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('- ') ||
    trimmed.startsWith('* ') ||
    trimmed.startsWith('+ ') ||
    trimmed.startsWith('> ') ||
    trimmed.startsWith('|')
  ) {
    return false;
  }
  if (trimmed.startsWith('$$') || trimmed.startsWith('\\[') || trimmed.startsWith('\\begin{')) {
    return true;
  }
  // Check for common LaTeX math keywords combined with math assignment or relations
  const hasLatexCmd =
    /\\(frac|sum|int|sqrt|vec|alpha|beta|gamma|delta|theta|lambda|pi|sigma|partial|pm|times|approx|infty|cdot|text|mathbf|mathrm|over)\b/.test(
      trimmed
    );
  const hasMathRelation = /[=<>+\-]/.test(trimmed);
  return hasLatexCmd && hasMathRelation;
}

function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Regex to match inline tokens:
  // 1. \( ... \)
  // 2. $ ... $ (where not starting/ending with whitespace and not empty)
  // 3. Raw LaTeX fractions \frac{...}{...} or square roots \sqrt{...}
  // 4. Raw LaTeX math symbols \vec{...}, \sum, \int, \alpha, etc.
  // 5. Raw mathematical subscripts and superscripts: X_{cm}, m_1, x_i, x^2
  // 6. `inline code`
  // 7. **bold**
  // 8. *italic*
  // 9. [link](url)
  const tokenRegex =
    /(\\\([\s\S]*?\\\)|\$(?!\s)[^\$\n]+?(?<!\s)\$|\\frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\sqrt\{[^{}]*\}|\\[a-zA-Z]+(?:\{[^{}]*\})*|\b[A-Za-z]+_\{[^{}]+\}|\b[A-Za-z]+_[a-zA-Z0-9]+|\b[A-Za-z]+\^\{[^{}]+\}|\b[A-Za-z]+\^[0-9]+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  const parts = text.split(tokenRegex);
  return parts.map((part, index) => {
    if (!part) return null;

    // \( ... \) inline LaTeX
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const formula = part.slice(2, -2).trim();
      return <InlineMath key={index} math={formula} />;
    }

    // $ ... $ inline LaTeX
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const formula = part.slice(1, -1).trim();
      return <InlineMath key={index} math={formula} />;
    }

    // Raw LaTeX \frac{...}{...} or \sqrt{...} or commands like \vec{...}, \alpha, \sum
    if (part.startsWith('\\')) {
      return <InlineMath key={index} math={part.trim()} />;
    }

    // Raw math variables with subscripts or superscripts: X_{cm}, m_1, x^2
    if (
      /^[A-Za-z]+_\{[^{}]+\}$/.test(part) ||
      /^[A-Za-z]+_[a-zA-Z0-9]+$/.test(part) ||
      /^[A-Za-z]+\^\{[^{}]+\}$/.test(part) ||
      /^[A-Za-z]+\^[0-9]+$/.test(part)
    ) {
      return <InlineMath key={index} math={part.trim()} />;
    }

    // `inline code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code
          key={index}
          className="rounded-md bg-purple-100/70 px-1.5 py-0.5 font-mono text-xs text-purple-800 font-medium"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // **bold**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // *italic*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    // [text](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a
            key={index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 underline decoration-purple-300 underline-offset-2 font-medium"
          >
            {match[1]}
          </a>
        );
      }
    }

    return part;
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
