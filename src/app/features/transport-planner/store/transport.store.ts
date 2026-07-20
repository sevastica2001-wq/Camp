import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  AppSettings,
  AppState,
  DEFAULT_FILTERS,
  Driver,
  Passenger,
  PlannerFilters,
  ThemeMode,
} from '../models/transport.models';
import { filterDrivers, filterPassengers, uniqueLocations } from '../utils/filter.utils';
import { computeSummary, detectProblems } from '../validators/transport.validators';
import { TRANSPORT_REPOSITORY } from '../services/transport-repository.token';
import { getPublishedSeed } from '../utils/seed.utils';

@Injectable({ providedIn: 'root' })
export class TransportStore {
  private readonly repository = inject(TRANSPORT_REPOSITORY);
  private readonly _state = signal<AppState>(this.hydrate());
  private readonly _search = signal('');
  private readonly _filters = signal<PlannerFilters>({ ...DEFAULT_FILTERS });
  private readonly _focusDriverId = signal<string | null>(null);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = this._state.asReadonly();
  readonly search = this._search.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly focusDriverId = this._focusDriverId.asReadonly();

  readonly drivers = computed(() => this._state().drivers);
  readonly passengers = computed(() => this._state().passengers);
  readonly settings = computed(() => this._state().settings);

  readonly unassignedPassengers = computed(() =>
    this._state().passengers.filter((p) => !p.assignedDriverId),
  );

  readonly problems = computed(() => detectProblems(this._state()));
  readonly summary = computed(() => computeSummary(this._state(), this.problems()));

  readonly filteredUnassigned = computed(() =>
    filterPassengers(this.unassignedPassengers(), this._filters(), this._search()),
  );

  readonly filteredDrivers = computed(() =>
    filterDrivers(this._state().drivers, this._state().passengers, this._filters(), this._search()),
  );

  readonly departureCities = computed(() =>
    uniqueLocations([
      ...this._state().drivers.map((d) => d.departureLocation),
      ...this._state().passengers.map((p) => p.departureLocation),
    ]),
  );

  readonly returnCities = computed(() =>
    uniqueLocations([
      ...this._state().drivers.map((d) => d.returnLocation),
      ...this._state().passengers.map((p) => p.returnLocation),
    ]),
  );

  readonly passengersById = computed(() => {
    const map = new Map<string, Passenger>();
    for (const p of this._state().passengers) {
      map.set(p.id, p);
    }
    return map;
  });

  constructor() {
    effect(() => {
      const snapshot = this._state();
      untracked(() => this.scheduleSave(snapshot));
    });
  }

  snapshot(): AppState {
    return this._state();
  }

  replaceState(state: AppState): void {
    this._state.set(structuredClone(state));
  }

  setSearch(value: string): void {
    this._search.set(value);
  }

  setFilters(patch: Partial<PlannerFilters>): void {
    this._filters.update((current) => ({ ...current, ...patch }));
  }

  resetFilters(): void {
    this._filters.set({ ...DEFAULT_FILTERS });
  }

  setFocusDriver(driverId: string | null): void {
    this._focusDriverId.set(driverId);
  }

  updateSettings(patch: Partial<AppSettings>): void {
    this._state.update((state) => ({
      ...state,
      settings: { ...state.settings, ...patch },
    }));
  }

  setTheme(theme: ThemeMode): void {
    this.updateSettings({ theme });
  }

  toggleDriverCollapsed(driverId: string): void {
    this._state.update((state) => {
      const collapsed = new Set(state.settings.collapsedDriverIds);
      if (collapsed.has(driverId)) {
        collapsed.delete(driverId);
      } else {
        collapsed.add(driverId);
      }
      return {
        ...state,
        settings: { ...state.settings, collapsedDriverIds: [...collapsed] },
      };
    });
  }

  isDriverCollapsed(driverId: string): boolean {
    return this._state().settings.collapsedDriverIds.includes(driverId);
  }

  getPassenger(id: string): Passenger | undefined {
    return this.passengersById().get(id);
  }

  getDriver(id: string): Driver | undefined {
    return this._state().drivers.find((d) => d.id === id);
  }

  private hydrate(): AppState {
    const loaded = this.repository.load();
    if (loaded && (loaded.drivers.length > 0 || loaded.passengers.length > 0)) {
      return loaded;
    }
    // Empty LocalStorage (or empty saved state) → load shared published snapshot
    const seed = getPublishedSeed();
    this.repository.save(seed);
    return seed;
  }

  private scheduleSave(state: AppState): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.repository.save(state);
    }, 120);
  }
}
