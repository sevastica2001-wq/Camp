import { Component, input } from '@angular/core';
import { PlannerSummary } from '../../models/transport.models';

@Component({
  selector: 'app-summary-bar',
  standalone: true,
  template: `
    <div
      class="sticky top-0 z-30 border-b border-[var(--ctp-border)] bg-[color-mix(in_srgb,var(--ctp-surface)_92%,transparent)] backdrop-blur-md"
    >
      <div class="flex items-center gap-6 overflow-x-auto px-6 py-3">
        <div class="mr-2 shrink-0">
          <p class="text-xs font-medium uppercase tracking-[0.12em] text-[var(--ctp-text-muted)]">
            Camp Transport
          </p>
          <p class="text-sm font-semibold">Planner</p>
        </div>
        @for (item of items; track item.key) {
          <div class="shrink-0">
            <p class="text-[11px] uppercase tracking-wide text-[var(--ctp-text-muted)]">
              {{ item.label }}
            </p>
            <p class="text-lg font-semibold tabular-nums" [class]="item.class?.(summary()) ?? ''">
              {{ valueOf(item.key) }}
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class SummaryBar {
  readonly summary = input.required<PlannerSummary>();

  readonly items: Array<{
    key: keyof PlannerSummary;
    label: string;
    class?: (s: PlannerSummary) => string;
  }> = [
    { key: 'drivers', label: 'Drivers' },
    { key: 'passengers', label: 'Passengers' },
    { key: 'assigned', label: 'Assigned' },
    {
      key: 'unassigned',
      label: 'Unassigned',
      class: (s) => (s.unassigned > 0 ? 'text-[var(--ctp-warning)]' : ''),
    },
    { key: 'totalSeats', label: 'Total Seats' },
    {
      key: 'remainingSeats',
      label: 'Remaining',
      class: (s) => (s.remainingSeats < 0 ? 'text-[var(--ctp-danger)]' : 'text-[var(--ctp-success)]'),
    },
    {
      key: 'overCapacityDrivers',
      label: 'Over Capacity',
      class: (s) => (s.overCapacityDrivers > 0 ? 'text-[var(--ctp-danger)]' : ''),
    },
    {
      key: 'warnings',
      label: 'Warnings',
      class: (s) => (s.warnings > 0 ? 'text-[var(--ctp-warning)]' : ''),
    },
  ];

  valueOf(key: keyof PlannerSummary): number {
    return this.summary()[key];
  }
}
