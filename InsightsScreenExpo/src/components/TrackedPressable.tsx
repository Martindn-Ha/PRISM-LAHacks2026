import { Pressable, type PressableProps } from 'react-native';
import { logUiInteraction } from '../lib/uiInteractionLog';

export type TrackedPressableProps = PressableProps & {
  trackId: string;
};

export function TrackedPressable({ trackId, onPress, ...rest }: TrackedPressableProps) {
  return (
    <Pressable
      {...rest}
      onPress={(event) => {
        logUiInteraction({ target: trackId, gesture: 'tap' });
        onPress?.(event);
      }}
    />
  );
}
