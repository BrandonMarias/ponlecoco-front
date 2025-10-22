import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ponlecoco.app',
  appName: 'PonleCoco',
  webDir: 'dist/jeopardimania-front/browser',
  server: {
    androidScheme: 'https',
    allowNavigation: ['https://ponlecoco.com', 'http://143.244.178.3:3000', 'https://143.244.178.3:3000']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1f2937",
      showSpinner: false,
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1f2937'
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '793028581863-psmf3our0ip9snb792gbfqfto465dknm.apps.googleusercontent.com',
      androidClientId: '793028581863-f6i66dqk89pscpj9b3n9lf6jmuhv5du9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
