import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Declare gtag as a global function
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

export const GA_TRACKING_ID = 'G-SPF76S08BM';

export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Send pageview with a custom path
    window.gtag('config', GA_TRACKING_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  // Function to track custom events
  const trackEvent = (
    action: string,
    category: string,
    label: string,
    value?: number
  ) => {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  };

  return { trackEvent };
};