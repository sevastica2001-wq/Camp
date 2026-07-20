import { Injectable, effect, signal } from '@angular/core';
import { ThemeMode } from '../features/transport-planner/models/transport.models';

const THEME_KEY = 'camp-platform-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  private readonly _theme = signal<ThemeMode>(this.readInitial());

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      this.apply(this._theme());
    });

    this.mediaQuery?.addEventListener('change', () => {
      if (this._theme() === 'system') {
        this.apply('system');
      }
    });
  }

  setTheme(theme: ThemeMode): void {
    this._theme.set(theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  cycleTheme(): void {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const current = this._theme();
    const next = order[(order.indexOf(current) + 1) % order.length];
    this.setTheme(next);
  }

  private readInitial(): ThemeMode {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw;
    }
    return 'system';
  }

  private apply(theme: ThemeMode): void {
    const prefersDark = this.mediaQuery?.matches ?? false;
    const dark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  }
}
