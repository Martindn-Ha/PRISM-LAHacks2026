import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

export type DemoPaletteId = 'default' | 'palette1' | 'palette2' | 'palette3' | 'palette4' | 'palette5';

export type DemoPaletteChoice = {
  id: DemoPaletteId;
  label: string;
  swatches: readonly [string, string, string, string] | null;
};

export const DEMO_PALETTE_CHOICES: DemoPaletteChoice[] = [
  { id: 'default', label: 'Default palette', swatches: null },
  { id: 'palette1', label: 'Palette 1', swatches: ['#222831', '#393E46', '#00ADB5', '#EEEEEE'] },
  { id: 'palette2', label: 'Palette 2', swatches: ['#E3FDFD', '#CBF1F5', '#A6E3E9', '#71C9CE'] },
  { id: 'palette3', label: 'Palette 3', swatches: ['#F9F7F7', '#DBE2EF', '#3F72AF', '#112D4E'] },
  { id: 'palette4', label: 'Palette 4', swatches: ['#FFF5E4', '#FFE3E1', '#FFD1D1', '#FF9494'] },
  { id: 'palette5', label: 'Palette 5', swatches: ['#F9F5F6', '#F8E8EE', '#FDCEDF', '#F2BED1'] },
];

/** Canvas when no demo palette is selected (matches legacy `appStyles.container`). */
export const DEFAULT_APP_CANVAS = '#111827';

export type ResolvedDemoPaletteTheme = {
  isLight: boolean;
  screenBackground: string;
  elevated: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderOnLight: string;
  borderGlass: string;
  shadowTint: string;
  sidebarPanel: string;
  success: string;
};

export type DemoPaletteLayers = Record<string, ViewStyle | TextStyle | undefined>;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) {
    return { r: 17, g: 24, b: 39 };
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => {
    const v = Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 0;
    return v.toString(16).padStart(2, '0');
  };
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Label for text on a solid accent-filled control (never same hue as fill at low contrast). */
function labelOnSolidAccent(accent: string): string {
  return relativeLuminance(accent) > 0.45 ? '#0f172a' : '#ffffff';
}

/** Label on accent-soft / tinted chip fills — pastel accent type on pastel fill fails on light themes. */
function labelOnTintedControl(isLight: boolean, textPrimary: string, accent: string): string {
  return isLight ? textPrimary : mixHex('#dbeafe', accent, 0.38);
}

export function resolveDemoPaletteTheme(id: DemoPaletteId): ResolvedDemoPaletteTheme | null {
  if (id === 'default') {
    return null;
  }
  const choice = DEMO_PALETTE_CHOICES.find((c) => c.id === id);
  const slots = choice?.swatches;
  if (!slots) {
    return null;
  }
  const [c0, c1, c2, c3] = slots;
  const isLight = relativeLuminance(c0) > 0.52;
  /** Light palettes: use true black-based type for readability on pastel fills. */
  const textPrimary = isLight
    ? '#000000'
    : relativeLuminance(c3) > 0.58
      ? c3
      : '#f8fafc';
  const textSecondary = isLight ? '#262626' : mixHex(textPrimary, '#94a3b8', 0.45);
  const textMuted = isLight ? '#525252' : '#94a3b8';
  const accent = c2;
  const accentSoft = withAlpha(accent, isLight ? 0.2 : 0.22);
  const accentBorder = withAlpha(accent, 0.72);
  const borderOnLight = isLight ? withAlpha(textPrimary, 0.18) : 'rgba(255,255,255,0.22)';
  const borderGlass = isLight ? withAlpha(textPrimary, 0.28) : 'rgba(255,255,255,0.38)';
  const shadowTint = isLight ? withAlpha(textPrimary, 0.25) : '#ffffff';
  const sidebarPanel = isLight ? mixHex(c0, '#0f172a', 0.08) : mixHex(c0, '#000000', 0.42);
  const success = isLight ? mixHex(accent, '#15803d', 0.35) : '#86efac';

  /**
   * Light demo swatches use near-white c0; using c0 alone reads as “plain white” on device.
   * Blend c1 + c2 into the canvas so the palette is visible while staying in the same family.
   */
  const screenBackground = isLight ? mixHex(mixHex(c0, c1, 0.52), c2, 0.24) : c0;

  return {
    isLight,
    screenBackground,
    elevated: c1,
    accent,
    accentSoft,
    accentBorder,
    textPrimary,
    textSecondary,
    textMuted,
    borderOnLight,
    borderGlass,
    shadowTint,
    sidebarPanel,
    success,
  };
}

/** Recursively flatten style arrays so native never receives nested arrays (can trigger HostFunction errors). */
function collectStylePieces(out: unknown[], piece: StyleProp<ViewStyle | TextStyle> | undefined): void {
  if (piece === null || piece === undefined || piece === false) {
    return;
  }
  if (Array.isArray(piece)) {
    for (const inner of piece) {
      collectStylePieces(out, inner as StyleProp<ViewStyle | TextStyle>);
    }
    return;
  }
  out.push(piece);
}

/** Applies a named palette layer plus optional base styles; always returns a single style or `undefined` (never a nested style array). */
export function mergePaletteLayer(
  layers: DemoPaletteLayers,
  key: string,
  ...styleParts: StyleProp<ViewStyle | TextStyle>[]
): StyleProp<ViewStyle | TextStyle> {
  const flat: unknown[] = [];
  for (const p of styleParts) {
    collectStylePieces(flat, p);
  }
  collectStylePieces(flat, layers[key]);
  const merged = flat.filter(Boolean) as Array<ViewStyle | TextStyle>;
  if (merged.length === 0) {
    return undefined;
  }
  if (merged.length === 1) {
    return merged[0];
  }
  try {
    return StyleSheet.flatten(merged as StyleProp<ViewStyle | TextStyle>);
  } catch {
    return Object.assign({}, ...merged) as ViewStyle | TextStyle;
  }
}

/**
 * Compose palette-aware styles with plain styles or animated objects.
 * Flattens to a single object so `style={[ ... ]}` never nests palette arrays (Fabric-safe).
 */
export function paletteStyleList(
  ...parts: Array<StyleProp<ViewStyle | TextStyle> | false | null | undefined>
): StyleProp<ViewStyle | TextStyle> {
  const flat: unknown[] = [];
  for (const p of parts) {
    collectStylePieces(flat, p as StyleProp<ViewStyle | TextStyle>);
  }
  const merged = flat.filter(Boolean) as Array<ViewStyle | TextStyle>;
  if (merged.length === 0) {
    return undefined;
  }
  if (merged.length === 1) {
    return merged[0];
  }
  try {
    return StyleSheet.flatten(merged as StyleProp<ViewStyle | TextStyle>);
  } catch {
    return Object.assign({}, ...merged) as ViewStyle | TextStyle;
  }
}

export function buildDemoPaletteLayers(theme: ResolvedDemoPaletteTheme | null): DemoPaletteLayers {
  if (!theme) {
    return {};
  }
  const t = theme;
  const chipInactiveBg = t.isLight ? withAlpha(t.screenBackground, 0.65) : withAlpha(t.elevated, 0.55);
  const chipInactiveBorder = t.borderOnLight;
  const chipActiveBg = t.accentSoft;
  const chipActiveBorder = t.accentBorder;
  const chipActiveText = labelOnTintedControl(t.isLight, t.textPrimary, t.accent);
  const chipInactiveText = t.isLight ? t.textSecondary : t.textMuted;
  const ctaFill = t.accent;
  const ctaLabel = labelOnSolidAccent(t.accent);
  const cardBg = t.isLight ? withAlpha(t.elevated, 0.92) : withAlpha(t.elevated, 0.88);
  const cardBorder = t.isLight ? withAlpha(t.textPrimary, 0.12) : 'rgba(148,163,184,0.22)';

  const L = (c: string): TextStyle => ({ color: c });
  const B = (c: string): ViewStyle => ({ backgroundColor: c });

  const layers: DemoPaletteLayers = {
    container: B(t.screenBackground),
    gridOverlay: { ...B(t.screenBackground), opacity: 0.28 },
    topGlow: { backgroundColor: withAlpha(t.accent, t.isLight ? 0.14 : 0.12) },
    content: B(t.screenBackground),
    mapScreen: B(t.screenBackground),
    goalsScreen: B(t.screenBackground),
    insightsScreen: B(t.screenBackground),
    insightsHubScroll: B(t.screenBackground),
    insightsDetailScreen: B(t.screenBackground),
    insightsDetailScroll: B(t.screenBackground),
    insightsDetailScrollContent: B(t.screenBackground),
    resourcesScreen: B(t.screenBackground),
    bottomNav: B(t.screenBackground),
    /** Fills the absolute tab stack above the nav (otherwise iOS shows default white through transparent layers). */
    tabStackLayer: B(t.screenBackground),
    navIcon: L(t.isLight ? t.textPrimary : t.textMuted),
    navText: L(t.isLight ? t.textPrimary : t.textMuted),
    navActive: L(t.accent),
    navAlertBadge: { borderColor: t.screenBackground },
    greeting: L(t.textPrimary),
    date: L(t.textPrimary),
    dateTimeSub: L(t.textSecondary),
    menuLine: B(t.textPrimary),
    weatherText: L(t.textPrimary),
    weatherSubText: L(t.textSecondary),
    scoreLabel: L(t.textMuted),
    score: L(t.textPrimary),
    scoreUnit: L(t.textMuted),
    scoreSub: L(t.textMuted),
    metricLabel: L(t.textMuted),
    metricValue: L(t.textPrimary),
    metricUnit: L(t.textMuted),
    glassCard: {
      borderColor: t.borderGlass,
      shadowColor: t.shadowTint,
      /** Was fully transparent in base styles — without a fill, iOS scroll chrome + light palettes read as “all white”. */
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.9) : withAlpha(t.elevated, 0.42),
    },
    glassCardLarge: {
      borderColor: t.borderGlass,
      shadowColor: t.shadowTint,
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.88) : withAlpha(t.elevated, 0.4),
    },
    foodCard: { borderColor: t.borderGlass, backgroundColor: t.isLight ? withAlpha(t.elevated, 0.88) : withAlpha(t.elevated, 0.35) },
    neuralAdvisorDivider: { backgroundColor: t.borderGlass },
    sectionLabel: L(t.textMuted),
    quickIcon: { borderColor: t.borderGlass, shadowColor: t.shadowTint },
    quickIconGlyph: L(t.textMuted),
    quickText: L(t.textMuted),
    activityContainer: {
      borderColor: t.borderGlass,
      shadowColor: t.shadowTint,
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.86) : withAlpha(t.elevated, 0.38),
    },
    activityLabel: L(t.textMuted),
    activityValue: L(t.textPrimary),
    activityDivider: { backgroundColor: t.borderGlass },
    cardTitle: L(t.textPrimary),
    cardText: L(t.textSecondary),
    cardBadge: L(t.accent),
    /** “NEURAL AI ADVISOR” chip — accent-only on light glass reads as low-contrast; anchor to primary type. */
    neuralAdvisorBadge: L(t.isLight ? mixHex(t.textPrimary, t.accent, 0.38) : t.accent),
    /** Primary body color so carousel copy never sits as “muted gray on muted glass” (unreadable on light palettes). */
    advisorGallerySlideText: {
      color: t.textPrimary,
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
    },
    advisorGallerySlideTextSteady: {
      color: t.textPrimary,
      fontSize: 22,
      lineHeight: 30,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    foodToggleBtn: { borderColor: t.accentBorder },
    foodToggleGlyph: L(t.accent),
    foodBtn: { borderColor: t.accentBorder },
    foodBtnText: L(t.accent),
    alertBadge: { borderColor: t.isLight ? t.borderGlass : withAlpha(t.screenBackground, 0.92) },
    alertText: L(mixHex('#ca8a04', t.accent, 0.4)),
    alertsModalBackdrop: {
      backgroundColor: t.isLight ? withAlpha(t.textPrimary, 0.34) : withAlpha('#020617', 0.72),
    },
    alertsModalCard: {
      borderColor: t.borderGlass,
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.98) : t.sidebarPanel,
    },
    alertsBackBtn: {
      borderColor: t.borderGlass,
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.92) : withAlpha(t.sidebarPanel, 0.88),
    },
    alertsTitle: L(t.textPrimary),
    alertsSubtitle: L(t.textMuted),
    challengeModalBackdrop: {
      backgroundColor: t.isLight ? withAlpha(t.textPrimary, 0.3) : withAlpha('#020617', 0.68),
    },
    challengeModalCard: {
      borderColor: t.borderGlass,
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.99) : withAlpha(t.sidebarPanel, 0.98),
    },
    challengeModalTitle: L(t.textPrimary),
    challengeModalHint: L(t.textMuted),
    challengeInput: {
      borderColor: t.borderGlass,
      backgroundColor: t.isLight ? withAlpha(t.screenBackground, 0.72) : withAlpha(t.screenBackground, 0.38),
      color: t.textPrimary,
    },
    challengeModalCancelBtn: { borderColor: t.borderGlass },
    challengeModalCancelText: L(t.textSecondary),
    challengeModalCreateBtn: { borderColor: ctaFill, backgroundColor: ctaFill },
    challengeModalCreateText: L(ctaLabel),
    advisorGalleryPrimaryBtn: { borderColor: ctaFill, backgroundColor: ctaFill },
    advisorGalleryPrimaryBtnText: L(ctaLabel),
    advisorGallerySecondaryBtn: { borderColor: chipInactiveBorder },
    advisorGallerySecondaryBtnText: L(t.isLight ? t.textPrimary : t.textSecondary),
    advisorGalleryPagerDot: { backgroundColor: t.textMuted },
    advisorGalleryPagerDotActive: B(t.accent),
    sidebarPanel: { ...B(t.sidebarPanel), borderRightColor: t.borderGlass },
    sidebarTitle: L(t.textPrimary),
    sidebarClose: L(t.textPrimary),
    sidebarItemText: L(t.textSecondary),
    sidebarDivider: { backgroundColor: t.borderGlass },
    sidebarSection: { borderColor: t.borderGlass },
    sidebarSectionTitle: L(t.textPrimary),
    demoToggleLabel: L(t.textSecondary),
    demoTogglePill: { borderColor: chipInactiveBorder, backgroundColor: chipInactiveBg },
    demoTogglePillActive: { backgroundColor: t.accentSoft, borderColor: t.accentBorder },
    demoTogglePillText: L(chipInactiveText),
    demoTogglePillTextActive: L(chipActiveText),
    demoDropdownBtn: { borderColor: chipInactiveBorder, backgroundColor: chipInactiveBg },
    demoDropdownText: L(chipInactiveText),
    demoPaletteRow: {
      borderColor: chipInactiveBorder,
      backgroundColor: chipInactiveBg,
    },
    demoPaletteRowActive: {
      borderColor: t.accentBorder,
      backgroundColor: t.accentSoft,
    },
    demoPaletteRowLabel: L(t.textPrimary),
    demoPaletteRowHint: L(t.textMuted),

    mapTitle: L(t.textPrimary),
    mapSubtitle: L(t.textSecondary),
    mapLayerChip: { borderColor: chipInactiveBorder, backgroundColor: chipInactiveBg },
    mapLayerChipActive: { borderColor: t.accentBorder, backgroundColor: t.accentSoft },
    mapLayerChipText: L(chipInactiveText),
    mapLayerChipTextActive: L(chipActiveText),
    mapContainer: { borderColor: t.borderGlass },

    goalsTitle: L(t.textPrimary),
    goalsSubtitle: L(t.textSecondary),
    goalsTab: { borderColor: chipInactiveBorder, backgroundColor: chipInactiveBg },
    goalsTabActive: { borderColor: t.accentBorder, backgroundColor: t.accentSoft },
    goalsTabText: L(chipInactiveText),
    goalsTabTextActive: L(chipActiveText),
    goalsCard: { backgroundColor: cardBg, borderColor: cardBorder },
    goalsCardTitle: L(t.textPrimary),
    goalsCardDetail: L(t.textSecondary),
    goalsCardMeta: L(t.textMuted),
    communityDetailCard: { backgroundColor: cardBg, borderColor: cardBorder },
    communityDetailTitle: L(t.textPrimary),
    communityDetailMeta: L(t.textMuted),
    communityDetailSub: L(t.textSecondary),
    communityActionLabel: L(t.textSecondary),

    resourcesTitle: L(t.textPrimary),
    resourcesSubtitle: L(t.textSecondary),
    resourcesCardBody: L(t.textSecondary),
    resourcesCardTitle: L(t.textPrimary),
    logEventTime: L(t.textMuted),
    logEventSource: L(t.textSecondary),

    insightsTitle: L(t.textPrimary),
    insightsHealthTagline: L(t.textSecondary),
    insightsHealthTaglineConnected: L(t.success),
    insightsTrendWindowLabel: L(t.textMuted),
    insightsTrendWindowChip: { borderColor: chipInactiveBorder, backgroundColor: chipInactiveBg },
    insightsTrendWindowChipActive: { borderColor: t.accentBorder, backgroundColor: t.accentSoft },
    insightsTrendWindowChipText: L(chipInactiveText),
    insightsTrendWindowChipTextActive: L(chipActiveText),
    insightsStarredGalleryEmptyText: L(t.textSecondary),
    insightsSectionLabel: L(t.textMuted),
    insightsSearchPanel: { borderColor: t.borderGlass, backgroundColor: chipInactiveBg },
    quickMetricSearchInput: { ...L(t.textPrimary), borderColor: chipInactiveBorder, backgroundColor: t.screenBackground },
    quickMetricOptionChip: { borderColor: chipInactiveBorder, backgroundColor: chipInactiveBg },
    quickMetricOptionChipActive: { borderColor: t.accentBorder, backgroundColor: t.accentSoft },
    quickMetricOptionText: L(chipInactiveText),
    quickMetricOptionTextActive: L(chipActiveText),
    insightsQuickToThemesDivider: { backgroundColor: t.borderGlass },
    insightsGroupCard: { borderColor: t.borderGlass, backgroundColor: cardBg },
    insightsGroupTitle: L(t.textPrimary),
    insightsGroupSubtitle: L(t.textSecondary),
    insightsGroupChevron: L(t.textMuted),
    insightsTabText: L(t.textPrimary),
    insightsTabStarText: L(t.textMuted),
    insightsDetailSubtitle: L(t.textSecondary),
    insightsCardEyebrow: L(t.textMuted),
    insightsDetailOverviewTitle: L(t.textPrimary),
    insightsDetailOverviewSummary: L(t.textSecondary),
    insightsCard: { borderColor: t.borderGlass, backgroundColor: chipInactiveBg },
    insightsCardSection: L(t.textPrimary),
    insightsChartUnit: L(t.textMuted),
    insightsLineChartRangeLegend: L(t.textMuted),
    insightsLineChartAxisValue: L(t.textPrimary),
    insightsLineChartAxisDate: L(t.textMuted),
    insightsChartValue: L(t.textPrimary),
    insightsChartLabel: L(t.textMuted),
    healthConnectBtn: { borderColor: ctaFill, backgroundColor: ctaFill },
    healthConnectBtnText: L(ctaLabel),
    healthErrorText: L('#fca5a5'),
    insightsLlmRegenerateText: L(t.isLight ? mixHex(t.textPrimary, t.accent, 0.35) : '#93c5fd'),

    profileShowcaseBackdrop: { backgroundColor: withAlpha(t.screenBackground, 0.82) },
    profileShowcaseCard: { backgroundColor: t.isLight ? t.elevated : t.sidebarPanel, borderColor: t.borderGlass },
    profileShowcaseTitle: L(t.textPrimary),
    profileShowcaseSubtitle: L(t.textSecondary),
    profilePersonalityLabel: L(t.textMuted),
    profilePersonalityCode: L(t.textPrimary),
    profilePersonalityName: L(t.textSecondary),
    profileBadgesSectionLabel: L(t.textPrimary),
    profileBadgesSectionHint: L(t.textMuted),
    profileBadgeName: L(t.textPrimary),
    profileBadgeNameLocked: L(t.textMuted),
  };

  return layers;
}

export function getAppCanvasBackground(theme: ResolvedDemoPaletteTheme | null): string {
  if (!theme) {
    return DEFAULT_APP_CANVAS;
  }
  return theme.screenBackground;
}
