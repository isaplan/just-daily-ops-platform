"use client";

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Wait for i18n to be ready before rendering
    i18n.on('initialized', () => {
      setIsReady(true);
    });
    
    // If already initialized, set ready immediately
    if (i18n.isInitialized) {
      setIsReady(true);
    }
  }, []);

  if (!isClient || !isReady) {
    // Return children without i18n during SSR and until i18n is ready
    return <>{children}</>;
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
