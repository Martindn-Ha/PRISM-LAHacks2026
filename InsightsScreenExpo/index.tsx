// Background tasks must load before the app root renders.
import './src/tasks/locationLogTask';
import './src/tasks/backgroundGlucoseTask';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoPaletteProvider, useDemoPalette } from './src/context/DemoPaletteContext';
import { TypographyProvider } from './src/context/TypographyContext';
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
    <SafeAreaProvider>
      <TypographyProvider>
        <DemoPaletteProvider>
          <ThemedGestureRoot />
        </DemoPaletteProvider>
      </TypographyProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
