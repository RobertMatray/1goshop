import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '1GoShop',
  slug: '1goshop',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: ['onegoshop'],
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.robertmatray.onegoshop',
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.robertmatray.onegoshop',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4CAF50',
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#4CAF50',
      },
    ],
    [
      'react-native-edge-to-edge',
      {
        android: { enforceNavigationBarContrast: false },
      },
    ],
    ['expo-localization'],
  ],
  extra: {
    eas: {
      projectId: '',
    },
  },
})
