import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const AMOUNTS_VISIBLE_KEY = '@rumi/amounts_visible';

type AmountPrivacyContextValue = {
  /** When false, monetary displays show a mask. Preference is persisted. */
  amountsVisible: boolean;
  setAmountsVisible: (visible: boolean) => void;
  toggleAmountsVisible: () => void;
};

const AmountPrivacyContext = createContext<AmountPrivacyContextValue | null>(null);

export function AmountPrivacyProvider({ children }: { children: ReactNode }) {
  const [amountsVisible, setAmountsVisibleState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(AMOUNTS_VISIBLE_KEY);
        if (!cancelled && raw === '1') setAmountsVisibleState(true);
        if (!cancelled && raw === '0') setAmountsVisibleState(false);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAmountsVisible = useCallback((visible: boolean) => {
    setAmountsVisibleState(visible);
    void AsyncStorage.setItem(AMOUNTS_VISIBLE_KEY, visible ? '1' : '0');
  }, []);

  const toggleAmountsVisible = useCallback(() => {
    setAmountsVisibleState((v) => {
      const next = !v;
      void AsyncStorage.setItem(AMOUNTS_VISIBLE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      amountsVisible,
      setAmountsVisible,
      toggleAmountsVisible,
    }),
    [amountsVisible, setAmountsVisible, toggleAmountsVisible]
  );

  // Avoid flashing the wrong mask before storage loads.
  if (!hydrated) {
    return (
      <AmountPrivacyContext.Provider
        value={{
          amountsVisible: false,
          setAmountsVisible,
          toggleAmountsVisible,
        }}>
        {children}
      </AmountPrivacyContext.Provider>
    );
  }

  return (
    <AmountPrivacyContext.Provider value={value}>
      {children}
    </AmountPrivacyContext.Provider>
  );
}

export function useAmountPrivacy(): AmountPrivacyContextValue {
  const ctx = useContext(AmountPrivacyContext);
  if (!ctx) {
    throw new Error('useAmountPrivacy must be used within AmountPrivacyProvider');
  }
  return ctx;
}
