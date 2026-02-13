import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'wealthos-sidebar-expanded';

export const useSidebarState = () => {
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return { expanded, toggle };
};
