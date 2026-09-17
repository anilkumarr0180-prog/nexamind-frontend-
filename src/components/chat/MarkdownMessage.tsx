import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#171717] border border-[#2f2f2f] my-3.5 group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#212121] border-b border-[#2f2f2f] text-[11px] font-mono text-[#b4b4b4] select-none">
        <span className="uppercase tracking-wider text-[#b4b4b4] font-medium">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[#b4b4b4] hover:text-[#ececec] hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-[#ececec]">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none text-[15px] sm:text-base leading-relaxed text-[#ececec] font-normal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code & Syntax
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const rawString = String(children).replace(/\n$/, '');
            const isMultiline = rawString.includes('\n') || Boolean(match);

            if (isMultiline) {
              return <CodeBlock language={match ? match[1] : undefined} code={rawString} />;
            }

            return (
              <code
                className="font-mono text-[13px] bg-[#2f2f2f] text-[#ececec] px-1.5 py-0.5 rounded border border-white/[0.08]"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Paragraphs
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-relaxed text-[#ececec]">{children}</p>;
          },

          // Headings
          h1({ children }) {
            return (
              <h1 className="text-xl sm:text-2xl font-bold text-[#ececec] mt-5 mb-2.5 first:mt-0 tracking-tight">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-lg sm:text-xl font-semibold text-[#ececec] mt-4 mb-2 first:mt-0 tracking-tight">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base sm:text-lg font-semibold text-[#ececec] mt-3.5 mb-1.5 first:mt-0">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-sm sm:text-base font-semibold text-[#ececec] mt-3 mb-1 first:mt-0">
                {children}
              </h4>
            );
          },

          // Lists
          ul({ children }) {
            return (
              <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-[#ececec] marker:text-[#8e8e8e]">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-[#ececec] marker:text-[#8e8e8e]">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="leading-relaxed pl-0.5">{children}</li>;
          },

          // Quotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-[#525252] pl-4 py-1.5 my-3.5 text-[#b4b4b4] italic bg-[#262626]/50 rounded-r-xl">
                {children}
              </blockquote>
            );
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ececec] underline underline-offset-2 hover:text-white transition-colors cursor-pointer font-medium"
              >
                {children}
              </a>
            );
          },

          // Tables
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-[#2f2f2f]">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-[#171717] border-b border-[#2f2f2f] text-[#ececec] font-semibold">
                {children}
              </thead>
            );
          },
          th({ children }) {
            return (
              <th className="px-3.5 py-2.5 font-semibold text-slate-100 border-r border-white/5 last:border-r-0">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3.5 py-2 border-t border-white/5 border-r border-white/5 last:border-r-0 text-slate-300">
                {children}
              </td>
            );
          },

          // Divider
          hr() {
            return <hr className="my-4 border-white/10" />;
          },

          // Strong & Emphasis
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
