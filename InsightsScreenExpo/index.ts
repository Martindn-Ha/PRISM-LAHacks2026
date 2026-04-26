import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import App from './App';

function Root() {
  return React.createElement(GestureHandlerRootView, { style: { flex: 1 } }, React.createElement(App));
}

registerRootComponent(Root);
