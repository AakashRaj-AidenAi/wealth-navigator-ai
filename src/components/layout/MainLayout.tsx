import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '@/components/CommandPalette';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useChatSidebar } from '@/hooks/useChatSidebar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { isOpen: chatOpen, toggle: toggleChat, close: closeChat } = useChatSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn(
        "ml-16 flex flex-col min-h-screen transition-all duration-300",
        chatOpen && "mr-[380px]"
      )}>
        <Header onToggleChat={toggleChat} chatOpen={chatOpen} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <ChatSidebar isOpen={chatOpen} onClose={closeChat} />
      <CommandPalette />
    </div>
  );
};
