"use client";

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Return children without i18n during SSR
    return <>{children}</>;
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
