import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  content: string;
  role: 'user' | 'assistant';
  onRetry?: () => void;
}

export const MessageActions = ({
  content,
  role,
  onRetry,
}: MessageActionsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({ title: 'Copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(feedback === type ? null : type);
    // In the future, this could send feedback to the backend
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCopy}
        className="h-7 w-7"
        title="Copy message"
      >
        {copied ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>

      {role === 'assistant' && onRetry && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onRetry}
          className="h-7 w-7"
          title="Retry"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}

      {role === 'assistant' && (
        <>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleFeedback('up')}
            className={cn(
              'h-7 w-7',
              feedback === 'up' && 'text-success bg-success/10'
            )}
            title="Good response"
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleFeedback('down')}
            className={cn(
              'h-7 w-7',
              feedback === 'down' && 'text-destructive bg-destructive/10'
            )}
            title="Bad response"
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
};
