import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { getAppStyles } from '../styles/appStyles';
import { scaleFontSize, scaleSpacing } from '../theme/typography';

type TypographyContextValue = {
  styles: ReturnType<typeof getAppStyles>;
  width: number;
  ts: (base: number) => number;
  ss: (base: number) => number;
};

const TypographyContext = createContext<TypographyContextValue | null>(null);

export function TypographyProvider({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => getAppStyles(width), [width]);
  const ts = useMemo(() => (base: number) => scaleFontSize(base, width), [width]);
  const ss = useMemo(() => (base: number) => scaleSpacing(base, width), [width]);
  const value = useMemo(() => ({ styles, width, ts, ss }), [styles, width, ts, ss]);
  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
}

export function useTypography(): TypographyContextValue {
  const value = useContext(TypographyContext);
  if (!value) {
    throw new Error('useTypography must be used within TypographyProvider');
  }
  return value;
}
