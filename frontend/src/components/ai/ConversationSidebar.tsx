import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, Conversation } from '@/services/chatService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Loader3D } from '@/components/ui/loader-3d';
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Archive,
  ArchiveRestore,
  Pin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Briefcase,
  Shield,
  Search as SearchIcon,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const agentIcons: Record<string, React.ElementType> = {
  general: Sparkles,
  portfolio: Briefcase,
  compliance: Shield,
  research: SearchIcon,
};

const agentLabels: Record<string, string> = {
  general: 'General',
  portfolio: 'Portfolio',
  compliance: 'Compliance',
  research: 'Research',
};

export const ConversationSidebar = ({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  collapsed,
  onToggleCollapse,
}: ConversationSidebarProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.listConversations({ limit: 100, archived: false }),
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Conversation deleted' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: (id: string) => chatService.toggleArchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Conversation archived' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to archive conversation',
        variant: 'destructive',
      });
    },
  });

  const conversations = useMemo(() => {
    const items = data?.conversations || [];
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (conv) =>
        conv.title?.toLowerCase().includes(query) ||
        conv.agent_type?.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  const groupedConversations = useMemo(() => {
    const now = new Date();
    const groups: Record<string, Conversation[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    conversations.forEach((conv) => {
      const lastMessage = conv.last_message_at
        ? new Date(conv.last_message_at)
        : new Date(conv.created_at);
      const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        groups.today.push(conv);
      } else if (hoursDiff < 48) {
        groups.yesterday.push(conv);
      } else if (hoursDiff < 168) {
        groups.week.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversationMutation.mutate(id);
  };

  const handleArchive = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleArchiveMutation.mutate(id);
  };

  if (collapsed) {
    return (
      <div className="w-16 h-full border-r border-border bg-card/50 flex flex-col items-center py-4 gap-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={onNewChat}
          className="h-10 w-10"
          title="New Chat"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleCollapse}
          className="h-10 w-10"
          title="Expand Sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground rotate-90 whitespace-nowrap">
          {conversations.length}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 h-full border-r border-border bg-card/50 flex flex-col">
      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-gold hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader3D size="sm" variant="spinner" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a new chat to get started
              </p>
            </div>
          ) : (
            <>
              {Object.entries(groupedConversations).map(([group, items]) => {
                if (items.length === 0) return null;

                const labels: Record<string, string> = {
                  today: 'Today',
                  yesterday: 'Yesterday',
                  week: 'Previous 7 Days',
                  older: 'Older',
                };

                return (
                  <div key={group} className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground px-2 py-1">
                      {labels[group]}
                    </h3>
                    {items.map((conversation) => {
                      const AgentIcon =
                        agentIcons[conversation.agent_type || 'general'];
                      const isActive = conversation.id === activeConversationId;

                      return (
                        <div
                          key={conversation.id}
                          onClick={() => onSelectConversation(conversation.id)}
                          className={cn(
                            'group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all',
                            isActive
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-secondary/80 border border-transparent'
                          )}
                        >
                          <div
                            className={cn(
                              'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                              isActive ? 'bg-primary/20' : 'bg-secondary'
                            )}
                          >
                            <AgentIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {conversation.title || 'New conversation'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs px-1.5 py-0"
                              >
                                {agentLabels[conversation.agent_type || 'general']}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {conversation.message_count || 0} msgs
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(
                                new Date(
                                  conversation.last_message_at ||
                                    conversation.created_at
                                ),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => handleArchive(e, conversation.id)}
                              >
                                {conversation.is_archived ? (
                                  <ArchiveRestore className="h-4 w-4 mr-2" />
                                ) : (
                                  <Archive className="h-4 w-4 mr-2" />
                                )}
                                {conversation.is_archived ? 'Unarchive' : 'Archive'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleDelete(e, conversation.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
