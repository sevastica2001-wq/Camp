import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Passenger } from '../../models/transport.models';
import { LocationBadgePipe } from '../../pipes/location-badge.pipe';

@Component({
  selector: 'app-passenger-card',
  standalone: true,
  imports: [MatButtonModule, MatTooltipModule, LocationBadgePipe],
  template: `
    <article
      class="passenger-card group cursor-grab rounded-[10px] border border-[var(--ctp-border)] bg-[var(--ctp-surface)] p-3 shadow-[var(--ctp-shadow)] transition hover:-translate-y-0.5 active:cursor-grabbing"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h4
            class="text-sm font-semibold text-[var(--ctp-text)] break-words [overflow-wrap:anywhere]"
            [matTooltip]="passenger().name"
          >
            {{ passenger().name }}
          </h4>
          <div class="mt-2 flex flex-wrap gap-1.5">
            @if (passenger().departureLocation) {
              <span
                class="rounded-md bg-[var(--ctp-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ctp-accent)]"
              >
                {{ passenger().departureLocation | locationBadge }}
              </span>
            }
            @if (passenger().returnLocation) {
              <span
                class="rounded-md bg-[var(--ctp-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ctp-text-muted)]"
              >
                → {{ passenger().returnLocation | locationBadge }}
              </span>
            }
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-0.5 text-[var(--ctp-text-muted)]">
          @if (editable()) {
            <button
              mat-icon-button
              type="button"
              class="!h-8 !w-8"
              matTooltip="Edit person"
              (click)="onEdit($event)"
              (mousedown)="$event.stopPropagation()"
              (pointerdown)="$event.stopPropagation()"
            >
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
          }
          @if (passenger().phone) {
            <span
              class="material-symbols-outlined text-[18px]"
              [matTooltip]="passenger().phone!"
              >call</span
            >
          }
          @if (passenger().notes) {
            <span
              class="material-symbols-outlined text-[18px]"
              [matTooltip]="passenger().notes!"
              >sticky_note_2</span
            >
          }
        </div>
      </div>
    </article>
  `,
})
export class PassengerCard {
  readonly passenger = input.required<Passenger>();
  readonly editable = input(false);
  readonly edit = output<string>();
  readonly selected = output<string>();

  onEdit(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.edit.emit(this.passenger().id);
  }
}
