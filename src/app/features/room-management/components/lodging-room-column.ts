import { Component, computed, input, output } from '@angular/core';
import {
  CdkDragDrop,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { LodgingPerson, LodgingRoomView } from '../models/lodging.models';
import { LodgingPersonCard } from './lodging-person-card';

@Component({
  selector: 'app-lodging-room-column',
  standalone: true,
  imports: [DragDropModule, LodgingPersonCard],
  template: `
    <section
      class="flex min-h-[220px] w-full flex-col rounded-[var(--ctp-radius)] border border-[var(--ctp-border)] bg-[var(--ctp-surface)] shadow-[var(--ctp-shadow)]"
      [class.ring-2]="!!dropHighlight()"
      [class.ring-[var(--ctp-success)]]="dropHighlight() === 'ok'"
      [class.ring-[var(--ctp-danger)]]="dropHighlight() === 'danger'"
    >
      <header class="border-b border-[var(--ctp-border)] p-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="truncate text-sm font-semibold tracking-tight">{{ room().name }}</h3>
            @if (room().floor) {
              <p class="mt-0.5 text-[11px] text-[var(--ctp-text-muted)] capitalize">
                {{ floorLabel() }}
              </p>
            }
          </div>
          <span
            class="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            [class]="policyClass()"
          >
            {{ policyLabel() }}
          </span>
        </div>

        <div class="mt-2 flex items-center justify-between text-xs">
          <span class="font-medium">
            {{ occupants().length }}/{{ room().capacity }} beds
          </span>
          <span class="text-[var(--ctp-text-muted)]">{{ bathLabel() }}</span>
        </div>
        <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ctp-surface-2)]">
          <div
            class="h-full rounded-full transition-all"
            [class]="fillClass()"
            [style.width.%]="fillPercent()"
          ></div>
        </div>
        @if (room().notes) {
          <p class="mt-2 line-clamp-2 text-[11px] text-[var(--ctp-text-muted)]">
            {{ room().notes }}
          </p>
        }
      </header>

      <div
        class="drop-list flex flex-1 flex-col gap-2 p-2"
        cdkDropList
        [id]="listId()"
        [cdkDropListData]="occupants()"
        [cdkDropListConnectedTo]="connectedLists()"
        [cdkDropListEnterPredicate]="enterPredicate"
        (cdkDropListDropped)="onDropped($event)"
        (cdkDropListEntered)="entered.emit({ personId: activePersonId() ?? '', roomId: room().id })"
        (cdkDropListExited)="exited.emit()"
      >
        @for (person of occupants(); track person.id) {
          <div
            cdkDrag
            [cdkDragData]="person"
            (cdkDragStarted)="dragStarted.emit(person.id)"
            (cdkDragEnded)="dragEnded.emit()"
          >
            <app-lodging-person-card [person]="person" />
          </div>
        } @empty {
          <div
            class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ctp-border)] p-3 text-center text-[11px] text-[var(--ctp-text-muted)]"
          >
            Drop people here
          </div>
        }
      </div>
    </section>
  `,
})
export class LodgingRoomColumn {
  readonly room = input.required<LodgingRoomView>();
  readonly occupants = input.required<LodgingPerson[]>();
  readonly connectedLists = input<string[]>([]);
  readonly dropHighlight = input<'ok' | 'warn' | 'danger' | null>(null);
  readonly policyLabel = input('Open');
  readonly canEnter = input<(personId: string, roomId: string) => boolean>(() => true);
  readonly activePersonId = input<string | null>(null);

  readonly dropped = output<CdkDragDrop<LodgingPerson[]>>();
  readonly entered = output<{ personId: string; roomId: string }>();
  readonly exited = output<void>();
  readonly dragStarted = output<string>();
  readonly dragEnded = output<void>();

  readonly listId = computed(() => `room-${this.room().id}`);

  readonly fillPercent = computed(() => {
    const cap = this.room().capacity;
    if (cap <= 0) {
      return 0;
    }
    return Math.min(100, (this.occupants().length / cap) * 100);
  });

  readonly fillClass = computed(() => {
    const ratio = this.fillPercent();
    if (ratio >= 100) {
      return 'bg-[var(--ctp-danger)]';
    }
    if (ratio >= 80) {
      return 'bg-[var(--ctp-warning)]';
    }
    return 'bg-[var(--ctp-success)]';
  });

  readonly policyClass = computed(() => {
    const label = this.policyLabel().toLowerCase();
    if (label === 'male') {
      return 'bg-[var(--ctp-sky-soft,var(--ctp-accent-soft))] text-[var(--ctp-sky,var(--ctp-accent))]';
    }
    if (label === 'female') {
      return 'bg-[var(--ctp-accent-soft)] text-[var(--ctp-accent)]';
    }
    if (label === 'couple') {
      return 'bg-[var(--ctp-warning-soft)] text-[var(--ctp-warning)]';
    }
    return 'bg-[var(--ctp-surface-2)] text-[var(--ctp-text-muted)]';
  });

  readonly floorLabel = computed(() => {
    const f = this.room().floor;
    if (f === 'open_loft') {
      return 'Open loft';
    }
    return f;
  });

  readonly bathLabel = computed(() => {
    switch (this.room().bathType) {
      case 'private':
        return 'Private bath';
      case 'shared_corridor':
        return 'Shared bath';
      default:
        return '';
    }
  });

  readonly enterPredicate = (drag: { data: LodgingPerson }, _drop: unknown): boolean => {
    const person = drag.data;
    if (!person?.id) {
      return false;
    }
    return this.canEnter()(person.id, this.room().id);
  };

  onDropped(event: CdkDragDrop<LodgingPerson[]>): void {
    this.dropped.emit(event);
  }
}
