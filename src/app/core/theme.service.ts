import { Injectable, inject, effect } from '@angular/core';
import { ThemeMode } from '../features/transport-planner/models/transport.models';
import { TransportStore } from '../features/transport-planner/store/transport.store';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly store = inject(TransportStore);
  private readonly mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  constructor() {
    effect(() => {
      const theme = this.store.settings().theme;
      this.apply(theme);
    });

    this.mediaQuery?.addEventListener('change', () => {
      if (this.store.settings().theme === 'system') {
        this.apply('system');
      }
    });
  }

  setTheme(theme: ThemeMode): void {
    this.store.setTheme(theme);
  }

  cycleTheme(): void {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const current = this.store.settings().theme;
    const next = order[(order.indexOf(current) + 1) % order.length];
    this.setTheme(next);
  }

  private apply(theme: ThemeMode): void {
    const prefersDark = this.mediaQuery?.matches ?? false;
    const dark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  }
}
