import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { TRANSPORT_REPOSITORY } from './features/transport-planner/services/transport-repository.token';
import { LocalStorageTransportRepository } from './features/transport-planner/services/local-storage-transport.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimationsAsync(),
    { provide: TRANSPORT_REPOSITORY, useClass: LocalStorageTransportRepository },
  ],
};
