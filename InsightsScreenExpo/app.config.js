require('dotenv/config');

module.exports = {
  expo: {
    plugins: [
      'expo-dev-client',
      'expo-background-task',
      './plugins/withStripIosPushEntitlement.js',
      './plugins/withHealthKitGlucoseBackground.js',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'PRISM logs your location over time to connect glucose spikes with where you were.',
          locationAlwaysAndWhenInUsePermission:
            'PRISM records location in the background so glucose events can be matched to places even when the app is closed.',
          isIosBackgroundLocationEnabled: true,
        },
      ],
      '@react-native-community/datetimepicker',
      'expo-secure-store',
    ],
    name: 'PRISM',
    slug: 'prism',
    scheme: 'prism',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/PRISM.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.martindnha.InsightsScreenExpo',
      buildNumber: '1',
      entitlements: {
        'com.apple.developer.healthkit': true,
      },
      infoPlist: {
        /** Declares standard/exempt-only crypto so App Store Connect usually skips per-build export questions. */
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDisplayName: 'PRISM',
        NSHealthShareUsageDescription: 'PRISM reads your Apple Health data to show personalized insights.',
        NSHealthUpdateUsageDescription: 'PRISM may write selected wellness updates to Apple Health.',
        NSLocalNetworkUsageDescription:
          'PRISM connects to your development server on the local network while you build and test the app.',
        NSBonjourServices: ['_expo._tcp'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.martindnha.InsightsScreenExpo',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '17875af3-526d-43d8-aac5-fdaf6489499a',
      },
    },
  },
};
