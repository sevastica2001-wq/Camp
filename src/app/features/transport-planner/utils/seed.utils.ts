import {
  APP_STATE_VERSION,
  AppState,
  DEFAULT_SETTINGS,
  createEmptyState,
} from '../models/transport.models';
import publishedSeed from '../data/published-seed.json';

/** Shared snapshot shipped with the app (used when LocalStorage is empty). */
export function getPublishedSeed(): AppState {
  return normalizeAppState(publishedSeed as Partial<AppState>);
}

export function normalizeAppState(raw: Partial<AppState> | null | undefined): AppState {
  const empty = createEmptyState();
  if (!raw || typeof raw !== 'object') {
    return empty;
  }

  return {
    version: typeof raw.version === 'number' ? raw.version : APP_STATE_VERSION,
    drivers: Array.isArray(raw.drivers) ? structuredClone(raw.drivers) : [],
    passengers: Array.isArray(raw.passengers) ? structuredClone(raw.passengers) : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...raw.settings,
      csvColumnMapping: raw.settings?.csvColumnMapping ?? {},
      collapsedDriverIds: raw.settings?.collapsedDriverIds ?? [],
    },
  };
}

export function hasSeedContent(state: AppState): boolean {
  return state.drivers.length > 0 || state.passengers.length > 0;
}
