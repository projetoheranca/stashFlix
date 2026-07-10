import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; // Cache invalidation
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// TODO: O usuário precisará colocar as chaves reais aqui depois.
// Atualmente, usando chaves de mock para evitar que a compilação quebre.
const firebaseConfig = {
  apiKey: "AIzaSyC_eubyoduh1lr8nep8-cbrqEaSwM6FZ_g",
  authDomain: "stashflixapp.firebaseapp.com",
  databaseURL: "https://stashflixapp-default-rtdb.firebaseio.com",
  projectId: "stashflixapp",
  storageBucket: "stashflixapp.firebasestorage.app",
  messagingSenderId: "1064065932739",
  appId: "1:1064065932739:web:31122892778c447ff93176",
  measurementId: "G-NMQ2R9RJ0X"
};

// Initialize Firebase only if not already initialized
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firebase Authentication and get a reference to the service
// Using AsyncStorage for persistence in React Native / Expo
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

export { app, auth, db, storage };
