import { InjectionToken } from '@angular/core';
import { AppState } from '../models/transport.models';

export interface ITransportRepository {
  load(campId: string): Promise<AppState>;
  save(campId: string, state: AppState): Promise<void>;
  clear(campId: string): Promise<void>;
  /** Single-row assignment patch — used for drag/drop instead of full camp rewrite. */
  assignPassenger(passengerId: string, driverId: string | null): Promise<void>;
}

export const TRANSPORT_REPOSITORY = new InjectionToken<ITransportRepository>(
  'TRANSPORT_REPOSITORY',
);
