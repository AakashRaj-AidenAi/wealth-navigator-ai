import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'wealthos-sidebar-expanded';

export type SidebarMode = 'nav' | 'chat';

export const useSidebarState = () => {
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [mode, setMode] = useState<SidebarMode>('nav');
  const [prevExpanded, setPrevExpanded] = useState(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const openChat = useCallback(() => {
    setPrevExpanded(expanded);
    setMode('chat');
    setExpanded(true);
  }, [expanded]);

  const closeChat = useCallback(() => {
    setMode('nav');
    setExpanded(prevExpanded);
  }, [prevExpanded]);

  return { expanded, toggle, mode, openChat, closeChat };
};
