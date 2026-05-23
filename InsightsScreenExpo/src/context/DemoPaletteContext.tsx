import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  buildDemoPaletteLayers,
  resolveDemoPaletteTheme,
  type DemoPaletteId,
  type DemoPaletteLayers,
  type ResolvedDemoPaletteTheme,
} from '../theme/demoPaletteTheme';

export type DemoPaletteContextValue = {
  paletteId: DemoPaletteId;
  setPaletteId: (id: DemoPaletteId) => void;
  layers: DemoPaletteLayers;
  theme: ResolvedDemoPaletteTheme | null;
};

const DemoPaletteContext = createContext<DemoPaletteContextValue | null>(null);

export function DemoPaletteProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteId] = useState<DemoPaletteId>('default');
  const theme = useMemo(() => resolveDemoPaletteTheme(paletteId), [paletteId]);
  const layers = useMemo(() => buildDemoPaletteLayers(theme), [theme]);
  const value = useMemo(
    () => ({
      paletteId,
      setPaletteId,
      layers,
      theme,
    }),
    [paletteId, layers, theme],
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
