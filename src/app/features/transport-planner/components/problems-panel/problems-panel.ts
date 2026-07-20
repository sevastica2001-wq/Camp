import { Component, input, output } from '@angular/core';
import { Problem } from '../../models/transport.models';

@Component({
  selector: 'app-problems-panel',
  standalone: true,
  template: `
    <aside
      class="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--ctp-border)] bg-[var(--ctp-surface)]"
    >
      <div class="border-b border-[var(--ctp-border)] px-4 py-3">
        <h2 class="text-sm font-semibold">Problems</h2>
        <p class="text-xs text-[var(--ctp-text-muted)]">
          {{ problems().length }} detected · click to focus
        </p>
      </div>
      <ul class="flex-1 space-y-2 overflow-y-auto p-3">
        @for (problem of problems(); track problem.id) {
          <li>
            <button
              type="button"
              class="w-full rounded-lg border border-[var(--ctp-border)] px-3 py-2 text-left transition hover:bg-[var(--ctp-surface-2)]"
              (click)="select.emit(problem)"
            >
              <span
                class="mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                [class]="severityClass(problem.severity)"
              >
                {{ problem.severity }}
              </span>
              <p class="text-xs leading-snug text-[var(--ctp-text)]">{{ problem.message }}</p>
            </button>
          </li>
        } @empty {
          <li class="rounded-lg bg-[var(--ctp-success-soft)] px-3 py-4 text-center text-xs text-[var(--ctp-success)]">
            All clear — no problems detected
          </li>
        }
      </ul>
    </aside>
  `,
})
export class ProblemsPanel {
  readonly problems = input.required<Problem[]>();
  readonly select = output<Problem>();

  severityClass(severity: string): string {
    switch (severity) {
      case 'error':
        return 'bg-[var(--ctp-danger-soft)] text-[var(--ctp-danger)]';
      case 'warning':
        return 'bg-[var(--ctp-warning-soft)] text-[var(--ctp-warning)]';
      default:
        return 'bg-[var(--ctp-info-soft)] text-[var(--ctp-info)]';
    }
  }
}
