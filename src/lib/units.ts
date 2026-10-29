import Storage from '@/lib/kv-store';
import { UNITS_STORAGE_KEY } from '@/constants/storage';
import type { Units } from '@/lib/geo';

export async function getUnits(): Promise<Units> {
  const stored = await Storage.getItem(UNITS_STORAGE_KEY);
  return stored === 'imperial' ? 'imperial' : 'metric';
}

export async function setUnits(units: Units) {
  try {
    await Storage.setItem(UNITS_STORAGE_KEY, units);
  } catch {
    // Units preference is cosmetic; keep the in-memory default if persistence fails.
  }
}
