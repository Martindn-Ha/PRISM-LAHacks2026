import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import {
  APP_COLOR_SCHEME_STORAGE_KEY,
  buildDemoPaletteLayers,
  resolveAppTheme,
  type AppColorScheme,
  type DemoPaletteLayers,
  type ResolvedDemoPaletteTheme,
} from '../theme/demoPaletteTheme';

export type DemoPaletteContextValue = {
  colorScheme: AppColorScheme;
  setColorScheme: (scheme: AppColorScheme) => void;
  layers: DemoPaletteLayers;
  theme: ResolvedDemoPaletteTheme;
};

const DemoPaletteContext = createContext<DemoPaletteContextValue | null>(null);

export function DemoPaletteProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [colorScheme, setColorSchemeState] = useState<AppColorScheme>('dark');

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(APP_COLOR_SCHEME_STORAGE_KEY).then((stored) => {
      if (cancelled) {
        return;
      }
      if (stored === 'light' || stored === 'dark') {
        setColorSchemeState(stored);
        return;
      }
      if (systemScheme === 'light' || systemScheme === 'dark') {
        setColorSchemeState(systemScheme);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [systemScheme]);

  const setColorScheme = useCallback((scheme: AppColorScheme) => {
    setColorSchemeState(scheme);
    void AsyncStorage.setItem(APP_COLOR_SCHEME_STORAGE_KEY, scheme);
  }, []);

  const theme = useMemo(() => resolveAppTheme(colorScheme), [colorScheme]);
  const layers = useMemo(() => buildDemoPaletteLayers(theme), [theme]);
  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
      layers,
      theme,
    }),
    [colorScheme, setColorScheme, layers, theme],
  );
  return <DemoPaletteContext.Provider value={value}>{children}</DemoPaletteContext.Provider>;
}

export function useDemoPalette(): DemoPaletteContextValue {
  const v = useContext(DemoPaletteContext);
  if (!v) {
    throw new Error('useDemoPalette must be used within DemoPaletteProvider');
  }
  return v;
}
