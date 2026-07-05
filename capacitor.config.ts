import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for the native Android shell. iOS is intentionally not added
 * yet (blocked on Apple developer funding); the data layer already abstracts
 * native vs web HTTP, so `npx cap add ios` later is an isolated step.
 *
 * On Android the app calls THabella directly through the native HTTP bridge
 * (see src/data/thabellaClient.ts) — no backend, bypassing browser CORS.
 */
const config: CapacitorConfig = {
  appId: 'de.thd.roomfinder',
  appName: 'THD Room Finder',
  webDir: 'dist',
  backgroundColor: '#F4F6FA',
  android: {
    backgroundColor: '#F4F6FA',
  },
};

export default config;
