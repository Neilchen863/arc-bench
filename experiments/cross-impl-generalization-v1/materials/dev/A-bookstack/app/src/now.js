import { createContext, useContext } from 'react';
import { api } from './api.js';

export const NowContext = createContext(null);
export const useNow = () => useContext(NowContext);

// Business date for stamping created/updated metadata (never the machine clock).
export async function businessNow(cached) {
  if (cached) return cached;
  return api.now();
}
