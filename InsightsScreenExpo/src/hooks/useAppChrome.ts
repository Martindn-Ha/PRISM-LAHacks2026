import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_CONTENT_GAP = 8;
const BOTTOM_NAV_ROW_TOP_PAD = 4;
const BOTTOM_NAV_BOTTOM_PAD = 6;
/** Icon + label row height (excluding safe-area padding). */
const BOTTOM_NAV_ROW = 51;
/** Diameter of the raised center tab button. */
export const NAV_CENTER_BUTTON_SIZE = 60;
/** Align circle bottom with side-icon row (labels sit below). */
const NAV_CENTER_BUTTON_BOTTOM_OFFSET = 19;

export function useAppChrome() {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = insets.top + HEADER_CONTENT_GAP;
  const bottomNavPaddingBottom = insets.bottom + BOTTOM_NAV_BOTTOM_PAD;
  const bottomNavHeight = BOTTOM_NAV_ROW_TOP_PAD + BOTTOM_NAV_ROW + bottomNavPaddingBottom;

  return {
    insets,
    headerPaddingTop,
    bottomNavPaddingBottom,
    bottomNavHeight,
    bottomNavRowTopPad: BOTTOM_NAV_ROW_TOP_PAD,
    navCenterButtonSize: NAV_CENTER_BUTTON_SIZE,
    navCenterButtonBottomOffset: NAV_CENTER_BUTTON_BOTTOM_OFFSET,
    isAndroid: Platform.OS === 'android',
  };
}
