import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';

type DashboardMetricCardProps = {
  label: string;
  value: string;
  unit: string;
  subtitle?: string;
  accessibilityHint: string;
  accessibilityLabel: string;
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
  accessibilityHint,
  accessibilityLabel,
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

  return (
    <TouchableOpacity
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={[mergePaletteLayer(layers, 'glassCard', styles.glassCard), styles.dashboardMetricCard]}
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
    </TouchableOpacity>
  );
}
