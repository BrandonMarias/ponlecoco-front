import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ponlecoco.app',
  appName: 'PonleCoco',
  webDir: 'dist/jeopardimania-front/browser',
  server: {
    androidScheme: 'https',
    allowNavigation: ['https://ponlecoco.com', 'https://game.ponlecoco.com']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1f2937",
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      launchAutoHide: true,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1f2937',
      overlaysWebView: false
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '793028581863-65tpjck5m6p356553362jlqelst8v74k.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
