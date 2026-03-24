import { useEffect } from 'react';

const TAWK_WIDGET_URL =
  import.meta.env.VITE_TAWK_WIDGET_URL ||
  'https://embed.tawk.to/69c1453487eb871c37b1aaf1/1jkdfcl5p';

export default function TawkChat() {
  useEffect(() => {
    if (!TAWK_WIDGET_URL) return;
    const s0 = document.getElementsByTagName('script')[0];
    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = TAWK_WIDGET_URL;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode?.insertBefore(s1, s0);

    return () => {
      s1.parentNode?.removeChild(s1);
    };
  }, []);

  return null;
}
