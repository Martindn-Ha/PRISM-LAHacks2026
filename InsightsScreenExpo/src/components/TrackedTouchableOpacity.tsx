import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { logUiInteraction } from '../lib/uiInteractionLog';

export type TrackedTouchableOpacityProps = TouchableOpacityProps & {
  trackId: string;
};

export function TrackedTouchableOpacity({ trackId, onPress, ...rest }: TrackedTouchableOpacityProps) {
  return (
    <TouchableOpacity
      {...rest}
      onPress={(event) => {
        logUiInteraction({ target: trackId, gesture: 'tap' });
        onPress?.(event);
      }}
    />
  );
}
