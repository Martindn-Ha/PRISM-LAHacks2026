import { Ionicons } from '@expo/vector-icons';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { useAppChrome } from '../../hooks/useAppChrome';

type Props = {
  activeTab: string;
  alertCount: number;
  alertBadgeBounceAnim: Animated.Value;
  onMenuPress: () => void;
  onAlertsPress: () => void;
};

export function AppHeader({
  activeTab,
  alertCount,
  alertBadgeBounceAnim,
  onMenuPress,
  onAlertsPress,
}: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const { headerPaddingTop } = useAppChrome();
  const iconColor = theme.textPrimary;

  return (
    <View style={[mergePaletteLayer(layers, 'appHeader', styles.appHeader), { paddingTop: headerPaddingTop }]}>
      <View style={styles.appHeaderRow}>
        <View style={styles.appHeaderSide}>
          <TouchableOpacity
            accessibilityLabel="Open menu"
            accessibilityRole="button"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPress={onMenuPress}
            style={mergePaletteLayer(layers, 'appHeaderMenuBtn', styles.appHeaderMenuBtn)}
          >
            <Ionicons color={iconColor} name="menu" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.appHeaderTitleWrap}>
          <Text style={mergePaletteLayer(layers, 'appHeaderTitle', styles.appHeaderTitle)}>{activeTab}</Text>
        </View>

        <View style={[styles.appHeaderSide, styles.appHeaderSideRight]}>
          <TouchableOpacity
            accessibilityLabel={alertCount > 0 ? `${alertCount} events` : 'Event logs'}
            accessibilityRole="button"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPress={onAlertsPress}
            style={styles.appHeaderAlertBtn}
          >
            <View>
              <Ionicons color={theme.accent} name={alertCount > 0 ? 'notifications' : 'notifications-outline'} size={26} />
              {alertCount > 0 ? (
                <Animated.View
                  style={[
                    mergePaletteLayer(layers, 'alertBadge', styles.appHeaderAlertBadge),
                    {
                      transform: [
                        {
                          translateY: alertBadgeBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -3],
                          }),
                        },
                        {
                          scale: alertBadgeBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.appHeaderAlertBadgeText}>{alertCount}</Text>
                </Animated.View>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
