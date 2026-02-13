import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Search, Plus, Paperclip, Send } from 'lucide-react';
import { useState } from 'react';

const conversations = [
  { id: 1, name: 'Victoria Sterling', lastMessage: 'Thank you for the portfolio update...', time: '10:32 AM', unread: 2 },
  { id: 2, name: 'Harrison Trust Team', lastMessage: 'The quarterly review is scheduled for...', time: '9:45 AM', unread: 0 },
  { id: 3, name: 'Compliance Department', lastMessage: 'Please review the attached KYC documents', time: 'Yesterday', unread: 1 },
  { id: 4, name: 'CIO Office', lastMessage: 'New market outlook report available', time: 'Yesterday', unread: 0 },
  { id: 5, name: 'Raghavan Family Office', lastMessage: 'Regarding the real estate allocation...', time: 'Jan 27', unread: 0 },
];

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
        {/* Conversations List */}
        <div className="w-80 flex-shrink-0 glass rounded-xl flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Messages</h2>
              <Button size="icon" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-9 bg-secondary/50" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation.id === conv.id ? 'bg-primary/10' : 'hover:bg-secondary/50'
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {conv.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{conv.name}</span>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {conv.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 glass rounded-xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/20 text-primary">
                {selectedConversation.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{selectedConversation.name}</h3>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-start">
              <div className="max-w-[70%] bg-secondary/50 rounded-2xl rounded-bl-md p-4">
                <p className="text-sm">Hi Priya, I wanted to discuss the recent portfolio rebalancing recommendations.</p>
                <span className="text-xs text-muted-foreground mt-2 block">10:28 AM</span>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-br-md p-4">
                <p className="text-sm">Of course! I've reviewed the analysis and have some thoughts on the equity allocation.</p>
                <span className="text-xs opacity-70 mt-2 block">10:30 AM</span>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[70%] bg-secondary/50 rounded-2xl rounded-bl-md p-4">
                <p className="text-sm">Thank you for the portfolio update. The diversification strategy looks solid. Can we schedule a call to discuss the emerging markets exposure?</p>
                <span className="text-xs text-muted-foreground mt-2 block">10:32 AM</span>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input placeholder="Type a message..." className="flex-1 bg-secondary/50" />
              <Button size="icon" className="bg-gradient-gold hover:opacity-90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
