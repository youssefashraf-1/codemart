import { storageKeys } from './store';
import { soundKey } from './feedback';
import { assistantKeys } from './assistant/assistant';

/** Snapshots and clears CodeMart browser storage, returning a function that restores it. */
export function isolateStorage(): () => void {
  const keys: [Storage, string][] = [
    [localStorage, storageKeys.records],
    [localStorage, soundKey],
    [sessionStorage, storageKeys.session],
    [sessionStorage, storageKeys.cart],
    [sessionStorage, assistantKeys.history],
    [sessionStorage, assistantKeys.apiKey],
  ];
  const snapshots = keys.map(([storage, key]) => storage.getItem(key));
  keys.forEach(([storage, key]) => storage.removeItem(key));
  // Keep tests silent.
  localStorage.setItem(soundKey, 'false');
  return () =>
    keys.forEach(([storage, key], index) => {
      const value = snapshots[index];
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    });
}
