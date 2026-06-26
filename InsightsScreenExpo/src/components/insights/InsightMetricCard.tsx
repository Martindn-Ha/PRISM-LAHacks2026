import { Pressable, Text, View } from 'react-native';
import {
  insightTabLabel,
  QUICK_ACTION_THEME_COLOR_BY_TAB,
  type InsightTab,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightTabIcon } from '../icons/InsightTabIcon';

type InsightMetricCardProps = {
  metric: InsightTab;
  groupColor: string;
  fillHeight?: boolean;
  greyedOut?: boolean;
  onPress: () => void;
};

export function InsightMetricCard({
  metric,
  groupColor,
  fillHeight = false,
  greyedOut = false,
  onPress,
}: InsightMetricCardProps) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const iconColor = greyedOut ? (theme?.textMuted ?? '#64748b') : (theme?.textMuted ?? '#94a3b8');
  const accentColor = greyedOut ? '#64748b' : (QUICK_ACTION_THEME_COLOR_BY_TAB[metric] ?? groupColor);
  const bandColor = greyedOut ? '#64748b' : groupColor;

  return (
    <Pressable
      accessibilityHint="Opens metric details"
      accessibilityLabel={insightTabLabel(metric)}
      accessibilityRole="button"
      accessibilityState={{ disabled: greyedOut }}
      onPress={onPress}
      style={({ pressed }) => [
        mergePaletteLayer(layers, 'insightsMetricCard', styles.insightsMetricCard),
        fillHeight && styles.insightsMetricCardFill,
        greyedOut && styles.insightsMetricCardGreyedOut,
        pressed && styles.insightsMetricCardPressed,
      ]}
    >
      <View style={[styles.insightsMetricCardBand, { backgroundColor: bandColor }]} />
      <View style={[styles.insightsMetricCardContent, fillHeight && styles.insightsMetricCardContentFill]}>
        <View style={[styles.insightsMetricCardIconWrap, { borderColor: accentColor }]}>
          <InsightTabIcon color={iconColor} metric={metric} size={20} />
        </View>
        <Text
          numberOfLines={2}
          style={[
            mergePaletteLayer(layers, 'insightsMetricCardLabel', styles.insightsMetricCardLabel),
            greyedOut && styles.insightsMetricCardLabelGreyedOut,
          ]}
        >
          {insightTabLabel(metric)}
        </Text>
      </View>
    </Pressable>
  );
}
