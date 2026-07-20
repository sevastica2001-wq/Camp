import { InjectionToken } from '@angular/core';
import { AppState } from '../models/transport.models';

export interface ITransportRepository {
  load(campId: string): Promise<AppState>;
  save(campId: string, state: AppState): Promise<void>;
  clear(campId: string): Promise<void>;
}

export const TRANSPORT_REPOSITORY = new InjectionToken<ITransportRepository>(
  'TRANSPORT_REPOSITORY',
);
