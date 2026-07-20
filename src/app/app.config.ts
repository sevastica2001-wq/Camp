import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';
import { TRANSPORT_REPOSITORY } from './features/transport-planner/services/transport-repository.token';
import { SupabaseTransportRepository } from './features/transport-planner/services/supabase-transport.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideIonicAngular({}),
    { provide: TRANSPORT_REPOSITORY, useClass: SupabaseTransportRepository },
  ],
};
