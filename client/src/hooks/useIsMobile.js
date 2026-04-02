import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 720px)';

const getMatches = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(MOBILE_QUERY).matches;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
};

export default useIsMobile;
