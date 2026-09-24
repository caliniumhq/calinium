import { useCallback, useEffect, useState } from 'react';

export function useAppRoute() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/');
  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigate = useCallback((destination) => {
    const current = `${window.location.pathname}${window.location.search}`;
    if (destination === current) return;
    window.history.pushState({}, '', destination);
    // Route matching intentionally uses only the path. Query parameters may
    // carry a Shopify billing-return binding and must remain available to the
    // project screen after SPA navigation.
    setPathname(window.location.pathname || '/');
    window.scrollTo?.({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);
  return { pathname, navigate };
}
