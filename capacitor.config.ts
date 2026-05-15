import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rksucatas.app',
  appName: 'RK Sucatas',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // url: 'https://rk-sucatas-api.onrender.com',  // Remova ou comente para builds de produção
    cleartext: true
  }
};

export default config;
