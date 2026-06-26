import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

/** Canvas background (matches legacy `appStyles.container`). */
export const DEFAULT_APP_CANVAS = '#111827';

export type AppColorScheme = 'dark' | 'light';

export const APP_COLOR_SCHEME_STORAGE_KEY = 'prism.appColorScheme';

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

export const DARK_APP_THEME: ResolvedDemoPaletteTheme = {
  isLight: false,
  screenBackground: '#111827',
  elevated: '#1f2937',
  accent: '#60a5fa',
  accentSoft: 'rgba(96,165,250,0.22)',
  accentBorder: 'rgba(96,165,250,0.72)',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  borderOnLight: 'rgba(255,255,255,0.22)',
  borderGlass: 'rgba(255,255,255,0.38)',
  shadowTint: '#ffffff',
  sidebarPanel: '#0f172a',
  success: '#22c55e',
};

export const LIGHT_APP_THEME: ResolvedDemoPaletteTheme = {
  isLight: true,
  screenBackground: '#dfe5ec',
  elevated: '#e9eef3',
  accent: '#3b6fd9',
  accentSoft: 'rgba(59,111,217,0.16)',
  accentBorder: 'rgba(59,111,217,0.38)',
  textPrimary: '#1e293b',
  textSecondary: '#4b5c72',
  textMuted: '#64748b',
  borderOnLight: 'rgba(30,41,59,0.12)',
  borderGlass: 'rgba(30,41,59,0.1)',
  shadowTint: 'rgba(30,41,59,0.14)',
  sidebarPanel: '#e9eef3',
  success: '#15803d',
};

export function resolveAppTheme(scheme: AppColorScheme): ResolvedDemoPaletteTheme {
  return scheme === 'light' ? LIGHT_APP_THEME : DARK_APP_THEME;
}

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
    wellnessScreen: B(t.screenBackground),
    insightsScreen: B(t.screenBackground),
    insightsHubScroll: B(t.screenBackground),
    insightsDetailScreen: B(t.screenBackground),
    insightsDetailScroll: B(t.screenBackground),
    insightsDetailScrollContent: B(t.screenBackground),
    resourcesScreen: B(t.screenBackground),
    bottomNav: { ...B(t.screenBackground), borderTopColor: t.borderGlass },
    navCenterButton: {
      backgroundColor: t.isLight ? t.screenBackground : t.elevated,
      borderColor: t.borderGlass,
    },
    appHeader: {
      backgroundColor: t.isLight ? t.elevated : t.sidebarPanel,
      borderBottomColor: t.borderGlass,
    },
    appHeaderTitle: L(t.textPrimary),
    appHeaderSubtitle: L(t.textSecondary),
    appHeaderSubtitleMuted: L(t.textMuted),
    appHeaderMenuBtn: {
      backgroundColor: t.isLight ? withAlpha(t.screenBackground, 0.7) : withAlpha(t.elevated, 0.55),
      borderColor: t.borderGlass,
      borderWidth: StyleSheet.hairlineWidth,
    },
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
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.9) : 'transparent',
    },
    glassCardLarge: {
      borderColor: t.borderGlass,
      shadowColor: t.shadowTint,
      backgroundColor: t.isLight ? withAlpha(t.elevated, 0.88) : 'transparent',
    },
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
    insightsHealthCapsuleConnected: {
      backgroundColor: withAlpha(t.success, 0.12),
      borderColor: withAlpha(t.success, 0.35),
    },
    insightsHealthCapsuleDisconnected: {
      backgroundColor: withAlpha('#ef4444', 0.1),
      borderColor: withAlpha('#ef4444', 0.32),
    },
    insightsHealthCapsuleSyncing: {
      backgroundColor: withAlpha('#eab308', 0.14),
      borderColor: withAlpha('#eab308', 0.4),
    },
    insightsHealthCapsuleTextConnected: L(t.success),
    insightsHealthCapsuleTextDisconnected: L('#f87171'),
    insightsHealthCapsuleTextSyncing: L('#fde047'),
    insightsHealthSyncMeta: L(t.textMuted),
    quickActionsCustomizeBtn: {
      backgroundColor: withAlpha(t.textMuted, 0.12),
      borderColor: withAlpha(t.textMuted, 0.28),
    },
    quickActionsCustomizeText: L(t.textSecondary),
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
    insightsMetricSectionTitle: L(t.textPrimary),
    insightsMetricSectionDivider: { backgroundColor: t.borderGlass },
    insightsMetricSectionSubtitle: L(t.textSecondary),
    insightsMetricCard: { borderColor: t.borderGlass, backgroundColor: cardBg },
    insightsMetricCardLabel: L(t.textPrimary),
    insightsMetricCardPreview: L(t.textSecondary),
    insightsMetricCardStarBtn: { borderColor: chipInactiveBorder, backgroundColor: chipInactiveBg },
    insightsMetricCardStarBtnActive: { borderColor: 'rgba(251,191,36,0.7)', backgroundColor: 'rgba(251,191,36,0.18)' },
    insightsMetricCardStarText: L(t.textMuted),
    insightsMetricCardStarTextActive: L('#fcd34d'),
    insightsGroupCard: { borderColor: t.borderGlass, backgroundColor: cardBg },
    insightsGroupTitle: L(t.textPrimary),
    insightsGroupSubtitle: L(t.textSecondary),
    insightsGroupChevron: L(t.textMuted),
    insightsTabText: L(t.textPrimary),
    insightsTabStarText: L(t.textMuted),
    insightsDetailSubtitle: L(t.textSecondary),
    insightsMetricDescription: L(t.textMuted),
    insightsMetricSectionLabel: L(t.textSecondary),
    insightsHeartHubRowLabel: L(t.textPrimary),
    insightsHeartHubRowMeta: L(t.textMuted),
    insightsHeartHubRowNumber: L(t.textPrimary),
    insightsHeartHubRowUnit: L(t.textMuted),
    insightsMetricCardSubtitle: L(t.textMuted),
    insightsCardEyebrow: L(t.textMuted),
    insightsDetailOverviewTitle: L(t.textPrimary),
    insightsDetailOverviewSummary: L(t.textSecondary),
    insightsDetailHeroValue: L(t.textPrimary),
    insightsDetailHeroUnit: L(t.textMuted),
    insightsHeartRateHeroContext: L(t.textMuted),
    insightsHeartRateDayNavLabel: L(t.textPrimary),
    insightsHeartRateSwipeLabel: L(t.textPrimary),
    insightsChartPeriodSegmentText: L(t.textMuted),
    insightsChartPeriodSegmentTextSelected: L('#fecdd3'),
    insightsCard: { borderColor: t.borderGlass, backgroundColor: chipInactiveBg },
    insightsTrendChartCard: { borderColor: t.borderGlass, backgroundColor: chipInactiveBg },
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

    wellnessTitle: L(t.textPrimary),
    wellnessIntroInstructions: L(t.textPrimary),
    wellnessBody: L(t.textSecondary),
    wellnessHint: L(t.textMuted),
    wellnessResumeCard: { backgroundColor: cardBg, borderColor: cardBorder },
    wellnessResumeTitle: L(t.textPrimary),
    wellnessPrimaryBtn: { borderColor: ctaFill, backgroundColor: ctaFill },
    wellnessPrimaryBtnText: L(ctaLabel),
    wellnessSecondaryBtn: { borderColor: t.borderGlass },
    wellnessSecondaryBtnText: L(t.textSecondary),
    wellnessAnswerBtn: { backgroundColor: cardBg, borderColor: cardBorder },
    wellnessAnswerBtnSelected: { borderColor: withAlpha(t.accent, 0.9), backgroundColor: withAlpha(t.accent, t.isLight ? 0.14 : 0.22) },
    wellnessAnswerBtnText: L(t.textSecondary),
    wellnessAnswerBtnTextSelected: L(t.textPrimary),
    wellnessQuestionText: L(t.textPrimary),
    wellnessInsightCard: { backgroundColor: cardBg, borderColor: cardBorder },
    wellnessInsightTitle: L(t.textPrimary),
    wellnessDisclaimer: L(t.textMuted),
  };

  return layers;
}

export function getAppCanvasBackground(theme: ResolvedDemoPaletteTheme | null): string {
  if (!theme) {
    return DEFAULT_APP_CANVAS;
  }
  return theme.screenBackground;
}
