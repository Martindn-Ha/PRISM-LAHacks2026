require('dotenv/config');

module.exports = {
  expo: {
    plugins: ['./plugins/withStripIosPushEntitlement.js'],
    name: 'PRISM',
    slug: 'prism',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
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
