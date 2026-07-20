import { Injectable, inject } from '@angular/core';
import { AppState } from '../models/transport.models';
import { getPublishedSeed, normalizeAppState } from '../utils/seed.utils';
import { createId } from '../utils/id.utils';
import { CommandHistoryService } from './command-history.service';
import { TransportStore } from '../store/transport.store';
import { CampContextService } from '../../../core/camp-context/camp-context.service';
import { TRANSPORT_REPOSITORY } from './transport-repository.token';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly store = inject(TransportStore);
  private readonly history = inject(CommandHistoryService);
  private readonly campContext = inject(CampContextService);
  private readonly repository = inject(TRANSPORT_REPOSITORY);

  downloadPublishedSeedFile(): void {
    this.downloadJson('published-seed.json', this.store.snapshot());
  }

  downloadBackup(): void {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.downloadJson(`camp-transport-backup-${stamp}.json`, this.store.snapshot());
  }

  async importBackupFile(file: File): Promise<void> {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<AppState>;
    const next = this.remapIds(normalizeAppState(parsed));
    this.history.replaceStateCommand('Import backup', next, true);
    await this.persistNow(next);
  }

  async importPublishedSeedIntoCamp(): Promise<void> {
    const next = this.remapIds(getPublishedSeed());
    this.history.replaceStateCommand('Import published seed', next, true);
    await this.persistNow(next);
  }

  resetToPublishedSeed(): void {
    const seed = this.remapIds(getPublishedSeed());
    this.history.replaceStateCommand('Reset to published seed', seed, true);
    void this.persistNow(seed);
  }

  private async persistNow(state: AppState): Promise<void> {
    const campId = this.campContext.campId();
    if (!campId) {
      return;
    }
    await this.repository.save(campId, state);
  }

  /** Ensure all entity ids are valid UUIDs for Postgres. */
  private remapIds(state: AppState): AppState {
    const driverMap = new Map<string, string>();
    const passengerMap = new Map<string, string>();

    const drivers = state.drivers.map((d) => {
      const id = isUuid(d.id) ? d.id : createId();
      driverMap.set(d.id, id);
      return { ...d, id, assignedPassengers: [] as string[] };
    });

    const passengers = state.passengers.map((p) => {
      const id = isUuid(p.id) ? p.id : createId();
      passengerMap.set(p.id, id);
      const assigned = p.assignedDriverId
        ? (driverMap.get(p.assignedDriverId) ?? undefined)
        : undefined;
      return { ...p, id, assignedDriverId: assigned };
    });

    for (const d of drivers) {
      const original = state.drivers.find((x) => driverMap.get(x.id) === d.id || x.id === d.id);
      const assigned = (original?.assignedPassengers ?? [])
        .map((pid) => passengerMap.get(pid) ?? (isUuid(pid) ? pid : null))
        .filter((x): x is string => !!x);
      // Also from passenger side
      const fromPassengers = passengers
        .filter((p) => p.assignedDriverId === d.id)
        .map((p) => p.id);
      d.assignedPassengers = [...new Set([...assigned, ...fromPassengers])];
    }

    return { ...state, drivers, passengers };
  }

  private downloadJson(filename: string, state: AppState): void {
    const content = JSON.stringify(state, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
