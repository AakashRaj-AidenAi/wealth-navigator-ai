import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const INTERNAL_ROUTES = /^\/(clients|portfolios|tasks|leads|compliance|reports|copilot|goals|orders|campaigns|communications|cio|dashboard|settings|admin|business|funding|corporate-actions|portfolio-admin)/;

interface MessageRendererProps {
  content: string;
}

const CodeBlock = ({ children, className }: { children: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || 'text';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 w-7"
        >
          {copied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre className="bg-secondary/80 rounded-lg p-4 overflow-x-auto">
        <code className={cn('text-sm font-mono', className)}>{children}</code>
      </pre>
      {language && (
        <div className="absolute left-2 top-2 text-xs text-muted-foreground">
          {language}
        </div>
      )}
    </div>
  );
};

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-secondary/80 px-1.5 py-0.5 rounded text-sm font-mono">
    {children}
  </code>
);

export const MessageRenderer = ({ content }: MessageRendererProps) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');

            return !inline && match ? (
              <CodeBlock className={className}>{codeContent}</CodeBlock>
            ) : (
              <InlineCode>{children}</InlineCode>
            );
          },
          a({ node, href, children, ...props }) {
            if (href && INTERNAL_ROUTES.test(href)) {
              return (
                <Link
                  to={href}
                  className="text-primary hover:underline font-medium"
                >
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          table({ node, children, ...props }) {
            return (
              <div className="my-4 w-full overflow-auto">
                <Table>
                  {children}
                </Table>
              </div>
            );
          },
          thead({ node, children, ...props }) {
            return <TableHeader>{children}</TableHeader>;
          },
          tbody({ node, children, ...props }) {
            return <TableBody>{children}</TableBody>;
          },
          tr({ node, children, ...props }) {
            return <TableRow>{children}</TableRow>;
          },
          th({ node, children, ...props }) {
            return <TableHead>{children}</TableHead>;
          },
          td({ node, children, ...props }) {
            return <TableCell>{children}</TableCell>;
          },
          ul({ node, children, ...props }) {
            return <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>;
          },
          ol({ node, children, ...props }) {
            return <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>;
          },
          h1({ node, children, ...props }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
          },
          h2({ node, children, ...props }) {
            return <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>;
          },
          h3({ node, children, ...props }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
          },
          h4({ node, children, ...props }) {
            return <h4 className="text-base font-medium mt-3 mb-2">{children}</h4>;
          },
          p({ node, children, ...props }) {
            return <p className="my-2 leading-relaxed">{children}</p>;
          },
          blockquote({ node, children, ...props }) {
            return (
              <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
