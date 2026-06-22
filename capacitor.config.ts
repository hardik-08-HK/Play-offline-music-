import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myofflinemusic.app',
  appName: 'My Offline Music',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
