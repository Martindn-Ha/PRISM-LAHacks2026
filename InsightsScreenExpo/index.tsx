// Gesture handler must stay first (Expo + RNGH). Do not import reanimated before this — it can crash startup and leave "main" unregistered.
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DemoPaletteProvider, useDemoPalette } from './src/context/DemoPaletteContext';
import AppScreen from './src/screens/AppScreen';
import { getAppCanvasBackground } from './src/theme/demoPaletteTheme';

function ThemedGestureRoot() {
  const { theme } = useDemoPalette();
  const canvasBg = getAppCanvasBackground(theme);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: canvasBg }}>
      <AppScreen />
    </GestureHandlerRootView>
  );
}

function Root() {
  return (
    <DemoPaletteProvider>
      <ThemedGestureRoot />
    </DemoPaletteProvider>
  );
}

registerRootComponent(Root);
