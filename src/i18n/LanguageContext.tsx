import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type Language,
  type TranslationKey,
  translations,
} from '@/src/i18n/translations';

const STORAGE_KEY = 'rumi:language:v1';

type TranslateOptions = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, options?: TranslateOptions) => string;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, options?: TranslateOptions): string {
  if (!options) return template;
  return Object.entries(options).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );
}

function detectDeviceLanguage(): Language {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return tag.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectDeviceLanguage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (mounted) {
        if (saved === 'en' || saved === 'es') {
          setLanguageState(saved);
        } else {
          setLanguageState(detectDeviceLanguage());
        }
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, options?: TranslateOptions) => {
      const dict = translations[language];
      const template = dict[key] ?? translations.en[key] ?? key;
      return interpolate(template, options);
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, ready }),
    [language, setLanguage, t, ready]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
