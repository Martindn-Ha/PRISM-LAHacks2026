import { type TextStyle, type ViewStyle } from 'react-native';

/** Design reference: iPhone 14 width in points. */
export const REFERENCE_WIDTH = 390;

/** Base readability bump on top of design tokens. */
export const TEXT_SCALE = 1.15;

/** Scale factor from screen width; clamped so SE stays legible and Pro Max doesn't balloon. */
export function deviceTextMultiplier(windowWidth: number): number {
  const ratio = windowWidth / REFERENCE_WIDTH;
  return Math.min(Math.max(ratio, 0.88), 1.1);
}

export function scaleFontSize(base: number, windowWidth: number): number {
  return Math.round(base * TEXT_SCALE * deviceTextMultiplier(windowWidth));
}

export function scaleLineHeight(base: number, windowWidth: number): number {
  return Math.round(base * TEXT_SCALE * deviceTextMultiplier(windowWidth));
}

export function scaleSpacing(base: number, windowWidth: number): number {
  return Math.round(base * deviceTextMultiplier(windowWidth));
}

const LAYOUT_PROPS = [
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'gap',
  'top',
  'left',
  'right',
  'bottom',
  'minHeight',
  'minWidth',
  'maxHeight',
  'maxWidth',
  'borderRadius',
] as const;

export function scaleViewStyleSpacing(style: ViewStyle & TextStyle, windowWidth: number): ViewStyle & TextStyle {
  const next = { ...style } as ViewStyle & TextStyle;
  for (const prop of LAYOUT_PROPS) {
    const value = next[prop];
    if (typeof value === 'number') {
      next[prop] = scaleSpacing(value, windowWidth);
    }
  }
  if (next.shadowOffset) {
    const { width, height } = next.shadowOffset;
    next.shadowOffset = {
      width: typeof width === 'number' ? scaleSpacing(width, windowWidth) : width,
      height: typeof height === 'number' ? scaleSpacing(height, windowWidth) : height,
    };
  }
  if (typeof next.shadowRadius === 'number') {
    next.shadowRadius = scaleSpacing(next.shadowRadius, windowWidth);
  }
  return next;
}

/** Scale layout spacing on selected style keys (e.g. gauge cluster). */
export function scaleStyleKeysLayout<T extends Record<string, ViewStyle | TextStyle>>(
  record: T,
  keys: readonly (keyof T)[],
  windowWidth: number,
): T {
  const scaled = { ...record };
  for (const key of keys) {
    if (scaled[key]) {
      scaled[key] = scaleViewStyleSpacing(scaled[key] as ViewStyle & TextStyle, windowWidth) as T[typeof key];
    }
  }
  return scaled;
}

/** Scale `fontSize` / `lineHeight` on a flat style record (one StyleSheet.create argument). */
export function scaleStyleRecord<T extends Record<string, ViewStyle | TextStyle>>(
  record: T,
  windowWidth: number,
): T {
  const scaled = {} as T;
  for (const key of Object.keys(record) as (keyof T)[]) {
    const style = { ...record[key] } as TextStyle & ViewStyle;
    if (typeof style.fontSize === 'number') {
      style.fontSize = scaleFontSize(style.fontSize, windowWidth);
    }
    if (typeof style.lineHeight === 'number') {
      style.lineHeight = scaleLineHeight(style.lineHeight, windowWidth);
    }
    scaled[key] = style as T[typeof key];
  }
  return scaled;
}
