import { Component, computed, input, output } from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDragEnter,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Driver, Passenger, Problem } from '../../models/transport.models';
import { LocationBadgePipe } from '../../pipes/location-badge.pipe';
import { SeatIndicator } from '../seat-indicator/seat-indicator';
import { PassengerCard } from '../passenger-card/passenger-card';
import { ScrollIntoViewDirective } from '../../directives/scroll-into-view.directive';
import { isOverCapacity } from '../../utils/seat.utils';

@Component({
  selector: 'app-driver-column',
  standalone: true,
  imports: [
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LocationBadgePipe,
    SeatIndicator,
    PassengerCard,
    ScrollIntoViewDirective,
  ],
  template: `
    <section
      class="flex h-full min-h-[320px] w-full flex-col rounded-[var(--ctp-radius)] border border-[var(--ctp-border)] bg-[var(--ctp-surface)] shadow-[var(--ctp-shadow)]"
      [appScrollIntoView]="focusDriverId()"
      [scrollTargetId]="driver().id"
      [attr.data-driver-id]="driver().id"
    >
      <header class="border-b border-[var(--ctp-border)] p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3
              class="text-base font-semibold tracking-tight break-words [overflow-wrap:anywhere]"
              [matTooltip]="driver().name"
            >
              {{ driver().name }}
            </h3>
            @if (driver().carModel || driver().carColor) {
              <p class="mt-0.5 text-xs text-[var(--ctp-text-muted)] break-words [overflow-wrap:anywhere]">
                {{ driver().carModel }}
                @if (driver().carColor) {
                  <span>· {{ driver().carColor }}</span>
                }
              </p>
            }
          </div>
          <div class="flex shrink-0 items-center gap-0.5">
            <button
              mat-icon-button
              type="button"
              matTooltip="Edit driver"
              (click)="edit.emit(driver().id)"
            >
              <span class="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button
              mat-icon-button
              type="button"
              [matTooltip]="collapsed() ? 'Expand' : 'Collapse'"
              (click)="toggleCollapse.emit(driver().id)"
            >
              <span class="material-symbols-outlined text-[20px]">
                {{ collapsed() ? 'expand_more' : 'expand_less' }}
              </span>
            </button>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <span
            class="rounded-md bg-[var(--ctp-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ctp-accent)]"
          >
            {{ driver().departureLocation | locationBadge }}
          </span>
          <span
            class="rounded-md bg-[var(--ctp-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ctp-text-muted)]"
          >
            → {{ driver().returnLocation | locationBadge }}
          </span>
        </div>

        <div class="mt-3">
          <app-seat-indicator [driver]="driver()" />
        </div>

        @if (columnProblems().length) {
          <ul class="mt-3 space-y-1">
            @for (problem of columnProblems(); track problem.id) {
              <li
                class="rounded-md px-2 py-1 text-[11px]"
                [class]="severityClass(problem.severity)"
              >
                {{ problem.message }}
              </li>
            }
          </ul>
        }
      </header>

      @if (!collapsed()) {
        <div
          class="drop-list flex flex-1 flex-col gap-2 overflow-y-auto p-3"
          cdkDropList
          [id]="dropListId()"
          [cdkDropListData]="passengers()"
          [cdkDropListConnectedTo]="connectedLists()"
          [cdkDropListEnterPredicate]="enterPredicate"
          (cdkDropListDropped)="onDrop($event)"
          (cdkDropListEntered)="onEntered($event)"
          (cdkDropListExited)="exited.emit()"
          [class]="dropClass()"
        >
          @for (passenger of passengers(); track passenger.id) {
            <div
              cdkDrag
              [cdkDragData]="passenger"
              (cdkDragStarted)="entered.emit({ passengerId: passenger.id, driverId: driver().id })"
            >
              <app-passenger-card [passenger]="passenger" />
            </div>
          } @empty {
            <div
              class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ctp-border)] p-4 text-center text-xs text-[var(--ctp-text-muted)]"
            >
              Drop passengers here
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class DriverColumn {
  readonly driver = input.required<Driver>();
  readonly passengers = input.required<Passenger[]>();
  readonly problems = input<Problem[]>([]);
  readonly collapsed = input(false);
  readonly connectedLists = input<string[]>([]);
  readonly focusDriverId = input<string | null>(null);
  readonly dropHighlight = input<'ok' | 'warn' | 'danger' | null>(null);
  readonly canEnter = input<(passengerId: string, driverId: string) => boolean>(
    () => true,
  );

  readonly edit = output<string>();
  readonly toggleCollapse = output<string>();
  readonly dropped = output<CdkDragDrop<Passenger[]>>();
  readonly entered = output<{ passengerId: string; driverId: string }>();
  readonly exited = output<void>();

  readonly dropListId = computed(() => `driver-${this.driver().id}`);
  readonly columnProblems = computed(() =>
    this.problems().filter((p) => p.driverId === this.driver().id).slice(0, 3),
  );

  readonly dropClass = computed(() => {
    const h = this.dropHighlight();
    if (h === 'warn') return 'drop-highlight-warn';
    if (h === 'danger') return 'drop-highlight-danger';
    if (h === 'ok') return 'drop-highlight-ok';
    return '';
  });

  readonly enterPredicate = (drag: CdkDrag<Passenger>, _drop: CdkDropList) => {
    return this.canEnter()(drag.data.id, this.driver().id);
  };

  onDrop(event: CdkDragDrop<Passenger[]>): void {
    this.dropped.emit(event);
  }

  onEntered(event: CdkDragEnter<Passenger[]>): void {
    const passenger = event.item.data as unknown as Passenger;
    this.entered.emit({ passengerId: passenger.id, driverId: this.driver().id });
  }

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

  protected readonly isOverCapacity = isOverCapacity;
}
