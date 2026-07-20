import { InjectionToken } from '@angular/core';
import { AppState } from '../models/transport.models';

export interface ITransportRepository {
  load(): AppState | null;
  save(state: AppState): void;
  clear(): void;
}

export const TRANSPORT_REPOSITORY = new InjectionToken<ITransportRepository>(
  'TRANSPORT_REPOSITORY',
);
