import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '../firebase';

// Verfolgt den Online-Status und die Anzahl der noch nicht mit dem Server
// synchronisierten Schreibvorgänge. Der Zähler wird in localStorage
// persistiert, damit nach einem App-Neustart im Offline-Zustand weiterhin
// "ausstehende Änderungen" angezeigt werden (Firestore hält die Queue
// selbst in IndexedDB).

const STORAGE_KEY = 'pendingWritesCount';

// Schreibvorgänge aus einer früheren Sitzung, die noch in der Firestore-Queue
// liegen. Sie können nicht einzeln beobachtet werden – waitForPendingWrites()
// meldet, wann sie alle bestätigt wurden.
let restoredPending = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
let sessionPending = 0;
let online = typeof navigator === 'undefined' ? true : navigator.onLine;
let flushWatcherActive = false;

const listeners = new Set();

function totalPending() {
  return restoredPending + sessionPending;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, String(totalPending()));
  } catch { /* ignore */ }
}

export function getSyncState() {
  if (!online) return totalPending() > 0 ? 'offline-pending' : 'offline';
  return totalPending() > 0 ? 'syncing' : 'online';
}

export function getPendingCount() {
  return totalPending();
}

function notify() {
  const state = getSyncState();
  listeners.forEach(l => l(state));
}

export function subscribeSyncState(listener) {
  listeners.add(listener);
  listener(getSyncState());
  return () => listeners.delete(listener);
}

// Wird von db.js für jeden Schreibvorgang aufgerufen. Zählt hoch, bis der
// Server den Vorgang bestätigt (oder er endgültig fehlschlägt).
export function trackWrite(promise) {
  sessionPending += 1;
  persist();
  notify();
  const done = () => {
    sessionPending = Math.max(0, sessionPending - 1);
    persist();
    notify();
  };
  promise.then(done, done);
}

// Räumt den aus der vorherigen Sitzung übernommenen Zähler auf, sobald
// Firestore alle gequeuten Schreibvorgänge bestätigt hat.
function watchRestoredWrites() {
  if (flushWatcherActive || restoredPending === 0) return;
  flushWatcherActive = true;
  waitForPendingWrites(db)
    .then(() => {
      restoredPending = 0;
      persist();
      notify();
    })
    .catch(() => { /* z.B. bei Nutzerwechsel – Zähler unangetastet lassen */ })
    .finally(() => { flushWatcherActive = false; });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true;
    notify();
    watchRestoredWrites();
  });
  window.addEventListener('offline', () => {
    online = false;
    notify();
  });
  watchRestoredWrites();
}
