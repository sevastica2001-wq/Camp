import { Component, computed, input } from '@angular/core';
import { Driver } from '../../models/transport.models';
import { remainingSeats, seatFillRatio, seatStatus } from '../../utils/seat.utils';
import { RemainingLabelPipe, SeatLabelPipe } from '../../pipes/seat-label.pipe';

@Component({
  selector: 'app-seat-indicator',
  standalone: true,
  imports: [SeatLabelPipe, RemainingLabelPipe],
  template: `
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class="font-medium text-[var(--ctp-text)]">{{ driver() | seatLabel }}</span>
        <span [class]="statusClass()">{{ driver() | remainingLabel }}</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--ctp-surface-2)]">
        <div
          class="h-full rounded-full transition-all duration-300"
          [class]="barClass()"
          [style.width.%]="fillPercent()"
        ></div>
      </div>
    </div>
  `,
})
export class SeatIndicator {
  readonly driver = input.required<Driver>();

  readonly status = computed(() => seatStatus(this.driver()));
  readonly fillPercent = computed(() => Math.min(100, seatFillRatio(this.driver()) * 100));
  readonly remaining = computed(() => remainingSeats(this.driver()));

  readonly statusClass = computed(() => {
    switch (this.status()) {
      case 'over_capacity':
        return 'text-[var(--ctp-danger)]';
      case 'nearly_full':
        return 'text-[var(--ctp-warning)]';
      default:
        return 'text-[var(--ctp-success)]';
    }
  });

  readonly barClass = computed(() => {
    switch (this.status()) {
      case 'over_capacity':
        return 'bg-[var(--ctp-danger)]';
      case 'nearly_full':
        return 'bg-[var(--ctp-warning)]';
      default:
        return 'bg-[var(--ctp-success)]';
    }
  });
}
