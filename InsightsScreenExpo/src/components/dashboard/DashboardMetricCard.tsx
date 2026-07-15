import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { TrackedTouchableOpacity } from '../TrackedTouchableOpacity';

type DashboardMetricCardProps = {
  label: string;
  value: string;
  unit: string;
  subtitle?: string;
  /**
   * Health-score impact for this metric when it is part of today’s score.
   * Red −shortfall when below perfect; otherwise green +contribution.
   */
  scoreImpact?: { contribution: number; shortfall: number } | null;
  accessibilityHint: string;
  accessibilityLabel: string;
  trackId: string;
  onPress: () => void;
};

/** Approximate bold numeral width as a fraction of font size. */
function fitSingleLineFontSize(text: string, width: number, maxSize: number, minSize: number): number {
  if (width <= 0) {
    return maxSize;
  }
  const chars = Math.max(text.length, 1);
  const fitted = Math.floor(width / (chars * 0.56));
  return Math.max(minSize, Math.min(maxSize, fitted));
}

export function DashboardMetricCard({
  label,
  value,
  unit,
  subtitle,
  scoreImpact,
  accessibilityHint,
  accessibilityLabel,
  trackId,
  onPress,
}: DashboardMetricCardProps) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const [valueWidth, setValueWidth] = useState(0);
  const maxValueFontSize = styles.metricValue.fontSize ?? 29;
  const minValueFontSize = Math.round(maxValueFontSize * 0.35);
  const valueFontSize = useMemo(
    () => fitSingleLineFontSize(value, valueWidth, maxValueFontSize, minValueFontSize),
    [maxValueFontSize, minValueFontSize, value, valueWidth],
  );

  const impactLabel =
    scoreImpact == null
      ? value !== '—'
        ? 'stale'
        : null
      : scoreImpact.shortfall > 0
        ? `−${scoreImpact.shortfall}`
        : `+${scoreImpact.contribution}`;
  const impactIsShortfall = scoreImpact != null && scoreImpact.shortfall > 0;
  const impactIsStale = impactLabel === 'stale';

  return (
    <TrackedTouchableOpacity
      accessibilityHint={accessibilityHint}
      accessibilityLabel={
        impactIsStale
          ? `${accessibilityLabel}, not counting toward health score`
          : impactLabel != null
            ? `${accessibilityLabel}, ${impactLabel} health score points`
            : accessibilityLabel
      }
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={[mergePaletteLayer(layers, 'glassCard', styles.glassCard), styles.dashboardMetricCard]}
      trackId={trackId}
    >
      <View style={styles.metricTitleRow}>
        <Text
          adjustsFontSizeToFit
          ellipsizeMode="tail"
          minimumFontScale={0.65}
          numberOfLines={1}
          style={[mergePaletteLayer(layers, 'metricLabel', styles.metricLabel), styles.metricTitleLabel]}
        >
          {label}
        </Text>
        {unit ? (
          <Text
            adjustsFontSizeToFit
            ellipsizeMode="tail"
            minimumFontScale={0.65}
            numberOfLines={1}
            style={mergePaletteLayer(layers, 'metricUnit', styles.metricUnit)}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {subtitle ? (
        <Text
          adjustsFontSizeToFit
          ellipsizeMode="tail"
          minimumFontScale={0.75}
          numberOfLines={1}
          style={mergePaletteLayer(layers, 'metricUnit', styles.metricUnit)}
        >
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.metricValueBlock}>
        <View
          style={styles.metricValueWrap}
          onLayout={(e) => {
            const nextWidth = e.nativeEvent.layout.width;
            setValueWidth((prev) => (prev === nextWidth ? prev : nextWidth));
          }}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              mergePaletteLayer(layers, 'metricValue', styles.metricValue),
              { fontSize: valueFontSize, lineHeight: Math.round(valueFontSize * 1.08) },
            ]}
          >
            {value}
          </Text>
        </View>
        {impactLabel != null ? (
          <Text
            style={[
              styles.metricScoreShortfall,
              impactIsStale
                ? styles.metricScoreStale
                : impactIsShortfall
                  ? null
                  : styles.metricScoreContribution,
            ]}
          >
            {impactLabel}
          </Text>
        ) : null}
      </View>
    </TrackedTouchableOpacity>
  );
}
