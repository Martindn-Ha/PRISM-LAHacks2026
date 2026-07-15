import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Animated, Text, View } from 'react-native';
import { CENTER_NAV_LABEL, NAV_ITEMS, type NavIconKey, type NavItemLabel } from '../../constants/appNavigation';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { InsightsBulbIcon } from '../icons/WellnessIcons';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { useAppChrome } from '../../hooks/useAppChrome';
import { TrackedTouchableOpacity } from '../TrackedTouchableOpacity';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const NAV_IONICONS: Record<NavIconKey, { outline: IoniconName; filled: IoniconName }> = {
  home: { outline: 'home-outline', filled: 'home' },
  insights: { outline: 'bulb-outline', filled: 'bulb' },
  swipes: { outline: 'swap-horizontal-outline', filled: 'swap-horizontal' },
  personality: { outline: 'person-outline', filled: 'person' },
  goals: { outline: 'ribbon-outline', filled: 'ribbon' },
};

type Props = {
  activeTab: string;
  alertCount: number;
  alertBadgeBounceAnim: Animated.Value;
  onTabPress: (label: NavItemLabel) => void;
};

function NavIcon({
  icon,
  isActive,
  color,
  size = 24,
}: {
  icon: NavIconKey;
  isActive: boolean;
  color: string;
  size?: number;
}) {
  const icons = NAV_IONICONS[icon];
  if (icon === 'insights') {
    return <InsightsBulbIcon active={isActive} />;
  }
  return <Ionicons color={color} name={isActive ? icons.filled : icons.outline} size={size} />;
}

export function BottomNavBar({ activeTab, alertCount, alertBadgeBounceAnim, onTabPress }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const { bottomNavPaddingBottom, bottomNavRowTopPad, navCenterButtonBottomOffset, navCenterButtonSize } = useAppChrome();
  const inactiveColor = theme?.textMuted ?? '#71717a';
  const activeColor = theme?.accent ?? '#60a5fa';
  const centerTab = NAV_ITEMS.find((item) => item.label === CENTER_NAV_LABEL);
  const isCenterActive = activeTab === CENTER_NAV_LABEL;
  const centerIconColor = isCenterActive ? activeColor : inactiveColor;

  return (
    <View
      style={[
        mergePaletteLayer(layers, 'bottomNav', styles.bottomNav),
        { paddingBottom: bottomNavPaddingBottom },
      ]}
    >
      <View style={[styles.bottomNavRow, { paddingTop: bottomNavRowTopPad }]}>
        {NAV_ITEMS.map((item) => {
          if (item.label === CENTER_NAV_LABEL) {
            return <View key={item.label} style={styles.navItem} />;
          }

          const isActive = activeTab === item.label;
          const iconColor = isActive ? activeColor : inactiveColor;

          return (
            <TrackedTouchableOpacity
              key={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onTabPress(item.label)}
              style={styles.navItem}
              trackId={`nav.${item.label}`}
            >
              <View style={[styles.navItemInner, isActive && styles.navItemInnerActive]}>
                <View style={styles.navIconWrap}>
                  <NavIcon color={iconColor} icon={item.icon} isActive={isActive} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    mergePaletteLayer(layers, 'navText', styles.navText),
                    isActive && mergePaletteLayer(layers, 'navActive', styles.navActive),
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            </TrackedTouchableOpacity>
          );
        })}
      </View>

      {centerTab ? (
        <TrackedTouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: isCenterActive }}
          accessibilityLabel={centerTab.label}
          onPress={() => onTabPress(centerTab.label)}
          style={[
            mergePaletteLayer(layers, 'navCenterButton', styles.navCenterButton),
            {
              bottom: bottomNavPaddingBottom + navCenterButtonBottomOffset,
              width: navCenterButtonSize,
              height: navCenterButtonSize,
              borderRadius: navCenterButtonSize / 2,
            },
            isCenterActive && styles.navCenterButtonActive,
          ]}
          trackId={`nav.${centerTab.label}`}
        >
          {alertCount > 0 ? (
            <Animated.View
              style={[
                mergePaletteLayer(layers, 'navAlertBadge', styles.navAlertBadge),
                styles.navCenterAlertBadge,
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
                        outputRange: [1, 1.12],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.navAlertBadgeText}>{alertCount}</Text>
            </Animated.View>
          ) : null}
          <NavIcon color={centerIconColor} icon={centerTab.icon} isActive={isCenterActive} size={28} />
        </TrackedTouchableOpacity>
      ) : null}
    </View>
  );
}
