import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '@/components/CommandPalette';
import { useSidebarState } from '@/hooks/useSidebarState';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { expanded, toggle } = useSidebarState();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar expanded={expanded} onToggle={toggle} />
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-200 ease-in-out',
          expanded ? 'ml-[calc(256px+24px)]' : 'ml-[calc(64px+24px)]'
        )}
      >
        <div className="pt-3 pr-3">
          <Header />
        </div>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};
