import { MessageRenderer } from './MessageRenderer';
import { MessageActions } from './MessageActions';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: {
    id: string;
    role: string;
    content: string;
    agent_name?: string;
    created_at?: string;
  };
  isStreaming?: boolean;
  userInitials: string;
  onRetry?: () => void;
}

export const ChatMessage = ({
  message,
  isStreaming,
  userInitials,
  onRetry,
}: ChatMessageProps) => {
  const isUser = message.role === 'user';

  if (isStreaming && !message.content) {
    // Typing indicator
    return (
      <div className="flex gap-4 animate-slide-up">
        <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="bg-secondary/50 rounded-xl px-5 py-4">
          <div className="flex gap-1.5">
            <span
              className="h-2 w-2 bg-muted-foreground rounded-full animate-typing-dot"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-2 w-2 bg-muted-foreground rounded-full animate-typing-dot"
              style={{ animationDelay: '200ms' }}
            />
            <span
              className="h-2 w-2 bg-muted-foreground rounded-full animate-typing-dot"
              style={{ animationDelay: '400ms' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-4 animate-slide-up group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'max-w-[80%] rounded-xl px-5 py-4',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 text-foreground'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MessageRenderer content={message.content} />
          )}
        </div>

        {!isUser && !isStreaming && (
          <MessageActions
            content={message.content}
            role="assistant"
            onRetry={onRetry}
          />
        )}
        {isUser && (
          <MessageActions content={message.content} role="user" />
        )}

        {message.agent_name && !isUser && (
          <span className="text-xs text-muted-foreground mt-1 px-1">
            {message.agent_name}
          </span>
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">{userInitials}</span>
        </div>
      )}
    </div>
  );
};
