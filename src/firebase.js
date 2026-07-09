import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBvhD6RYpmrFht96K7ah4rb1T8McH-dJNw",
  authDomain: "urlaubsausgabe.firebaseapp.com",
  projectId: "urlaubsausgabe",
  storageBucket: "urlaubsausgabe.firebasestorage.app",
  messagingSenderId: "96356349056",
  appId: "1:96356349056:web:f1240636276e2b949b6265",
  measurementId: "G-61GWMN6YFG"
};

const app = initializeApp(firebaseConfig);

// Offline-Persistenz: Daten werden in IndexedDB gecacht, Schreibvorgänge
// offline in eine Warteschlange gestellt und beim Reconnect synchronisiert.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics may not work in all environments
}

export { app, db, analytics };
