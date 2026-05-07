import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

import firebaseConfig from '../firebase.config.json';

const hasConfig = Boolean(
  firebaseConfig?.apiKey &&
    firebaseConfig?.appId &&
    firebaseConfig?.projectId
);

export const firebaseConfigReady = hasConfig;

const app = hasConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

export const auth = app
  ? (() => {
      try {
        return initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        return getAuth(app);
      }
    })()
  : null;

export const firebaseApp = app;
