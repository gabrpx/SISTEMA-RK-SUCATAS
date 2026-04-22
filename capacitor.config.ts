import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rksucatas.app',
  appName: 'RK Sucatas',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://rk-sucatas-api.onrender.com',  // ← URL do Render após deploy
    cleartext: true
  }
};

export default config;
