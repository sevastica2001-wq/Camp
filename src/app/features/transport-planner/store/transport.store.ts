import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  AppSettings,
  AppState,
  DEFAULT_FILTERS,
  Driver,
  Passenger,
  PlannerFilters,
  ThemeMode,
  createEmptyState,
} from '../models/transport.models';
import { filterDrivers, filterPassengers, uniqueLocations } from '../utils/filter.utils';
import { computeSummary, detectProblems } from '../validators/transport.validators';
import { TRANSPORT_REPOSITORY } from '../services/transport-repository.token';
import { CampContextService } from '../../../core/camp-context/camp-context.service';

@Injectable({ providedIn: 'root' })
export class TransportStore {
  private readonly repository = inject(TRANSPORT_REPOSITORY);
  private readonly campContext = inject(CampContextService);

  private readonly _state = signal<AppState>(createEmptyState());
  private readonly _search = signal('');
  private readonly _unassignedSearch = signal('');
  private readonly _filters = signal<PlannerFilters>({ ...DEFAULT_FILTERS });
  private readonly _focusDriverId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _campId = signal<string | null>(null);
  private readonly _hydrated = signal(false);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private skipNextSave = false;

  readonly state = this._state.asReadonly();
  readonly search = this._search.asReadonly();
  readonly unassignedSearch = this._unassignedSearch.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly focusDriverId = this._focusDriverId.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly drivers = computed(() => this._state().drivers);
  readonly passengers = computed(() => this._state().passengers);
  readonly settings = computed(() => this._state().settings);

  readonly unassignedPassengers = computed(() =>
    this._state().passengers.filter((p) => !p.assignedDriverId),
  );

  readonly problems = computed(() => detectProblems(this._state()));
  readonly summary = computed(() => computeSummary(this._state(), this.problems()));

  readonly filteredUnassigned = computed(() =>
    filterPassengers(
      this.unassignedPassengers(),
      this._filters(),
      this._unassignedSearch(),
    ),
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
      const campId = this._campId();
      const hydrated = this._hydrated();
      untracked(() => {
        if (!hydrated || !campId || this.skipNextSave) {
          this.skipNextSave = false;
          return;
        }
        this.scheduleSave(campId, snapshot);
      });
    });
  }

  async loadForCamp(campId: string): Promise<void> {
    this._loading.set(true);
    this._hydrated.set(false);
    try {
      const state = await this.repository.load(campId);
      this.skipNextSave = true;
      this._campId.set(campId);
      this._state.set(state);
      this._hydrated.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  async ensureLoaded(): Promise<void> {
    const campId = this.campContext.campId();
    if (!campId) {
      return;
    }
    if (this._campId() === campId && this._hydrated()) {
      return;
    }
    await this.loadForCamp(campId);
  }

  snapshot(): AppState {
    return this._state();
  }

  replaceState(state: AppState): void {
    this._state.set(structuredClone(state));
  }

  /**
   * Optimistic local assign/unassign + one PATCH.
   * Skips the full-camp save effect used by import/bulk replace.
   */
  applyPassengerAssignment(
    passengerId: string,
    driverId: string | null,
    nextState: AppState,
  ): void {
    this.skipNextSave = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this._state.set(structuredClone(nextState));
    void this.repository.assignPassenger(passengerId, driverId).catch((err) => {
      console.error('Failed to assign passenger', err);
    });
  }

  setSearch(value: string): void {
    this._search.set(value);
  }

  setUnassignedSearch(value: string): void {
    this._unassignedSearch.set(value);
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

  private scheduleSave(campId: string, state: AppState): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      void this.repository.save(campId, state).catch((err) => {
        console.error('Failed to save transport state', err);
      });
    }, 400);
  }
}
