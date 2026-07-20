import { Injectable, inject } from '@angular/core';
import { AppState } from '../models/transport.models';
import { getPublishedSeed, normalizeAppState } from '../utils/seed.utils';
import { CommandHistoryService } from './command-history.service';
import { TransportStore } from '../store/transport.store';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly store = inject(TransportStore);
  private readonly history = inject(CommandHistoryService);

  /** Download current data as published-seed.json (drop into the repo before publishing). */
  downloadPublishedSeedFile(): void {
    this.downloadJson('published-seed.json', this.store.snapshot());
  }

  /** Download a dated full backup of the current LocalStorage state. */
  downloadBackup(): void {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.downloadJson(`camp-transport-backup-${stamp}.json`, this.store.snapshot());
  }

  async importBackupFile(file: File): Promise<void> {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<AppState>;
    const next = normalizeAppState(parsed);
    this.history.replaceStateCommand('Import backup', next, true);
  }

  /** Replace local data with the snapshot shipped in the app build. */
  resetToPublishedSeed(): void {
    const seed = getPublishedSeed();
    this.history.replaceStateCommand('Reset to published seed', seed, true);
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
