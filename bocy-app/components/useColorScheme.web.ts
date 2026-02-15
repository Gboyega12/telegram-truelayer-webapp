import { useEffect, useState } from 'react';

export function useColorScheme() {
  const [scheme, setScheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setScheme(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return scheme;
}
