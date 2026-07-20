import { Injectable } from '@angular/core';
import {
  APP_STATE_VERSION,
  AppState,
  DEFAULT_SETTINGS,
  createEmptyState,
} from '../models/transport.models';
import { ITransportRepository } from './transport-repository.token';

const STORAGE_KEY = 'camp-transport-planner:v1';

@Injectable()
export class LocalStorageTransportRepository implements ITransportRepository {
  load(): AppState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as AppState;
      return this.normalize(parsed);
    } catch {
      return null;
    }
  }

  save(state: AppState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private normalize(state: AppState): AppState {
    const empty = createEmptyState();
    return {
      version: state.version ?? APP_STATE_VERSION,
      drivers: Array.isArray(state.drivers) ? state.drivers : [],
      passengers: Array.isArray(state.passengers) ? state.passengers : [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...state.settings,
        csvColumnMapping: state.settings?.csvColumnMapping ?? {},
        collapsedDriverIds: state.settings?.collapsedDriverIds ?? [],
      },
    };
  }
}
