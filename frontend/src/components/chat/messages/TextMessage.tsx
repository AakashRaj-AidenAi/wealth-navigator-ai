/**
 * TextMessage - renders a plain-text (or markdown-ish) chat bubble.
 * User messages are right-aligned with primary colour; assistant messages
 * are left-aligned with secondary background.
 */

import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface TextMessageProps {
  content: string;
  isUser: boolean;
}

export const TextMessage = ({ content, isUser }: TextMessageProps) => (
  <div
    className={cn(
      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
      isUser
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary'
    )}
  >
    {isUser ? (
      <p className="whitespace-pre-wrap">{content}</p>
    ) : (
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>p]:mb-1 [&>p:last-child]:mb-0">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    )}
  </div>
);
