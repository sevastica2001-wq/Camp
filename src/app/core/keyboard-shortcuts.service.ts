import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { CommandHistoryService } from '../features/transport-planner/services/command-history.service';

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private readonly history = inject(CommandHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
          return;
        }

        const mod = event.ctrlKey || event.metaKey;
        if (!mod) {
          return;
        }

        const key = event.key.toLowerCase();
        if (key === 'z' && event.shiftKey) {
          event.preventDefault();
          this.history.redo();
          return;
        }
        if (key === 'y') {
          event.preventDefault();
          this.history.redo();
          return;
        }
        if (key === 'z') {
          event.preventDefault();
          this.history.undo();
        }
      });
  }
}
