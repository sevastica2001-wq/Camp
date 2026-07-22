import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LodgingPerson } from '../models/lodging.models';
import { genderLabel } from '../utils/lodging.rules';

@Component({
  selector: 'app-lodging-person-card',
  standalone: true,
  imports: [MatTooltipModule],
  template: `
    <article
      class="cursor-grab rounded-[10px] border border-[var(--ctp-border)] bg-[var(--ctp-surface)] p-3 shadow-[var(--ctp-shadow)] transition hover:-translate-y-0.5 active:cursor-grabbing"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h4 class="truncate text-sm font-semibold text-[var(--ctp-text)]">
            {{ person().name }}
          </h4>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              class="rounded-md bg-[var(--ctp-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ctp-text-muted)]"
              [matTooltip]="'Gender: ' + person().gender"
            >
              {{ genderLabel(person().gender) }}
            </span>
            @if (person().partnerId) {
              <span
                class="rounded-md bg-[var(--ctp-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ctp-accent)]"
              >
                Couple
              </span>
            }
            @if (person().roommateIds.length > 0) {
              <span
                class="rounded-md bg-[var(--ctp-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ctp-text-muted)]"
                [matTooltip]="roommateTooltip()"
              >
                +{{ person().roommateIds.length }} roommate{{
                  person().roommateIds.length === 1 ? '' : 's'
                }}
              </span>
            }
          </div>
        </div>
        @if (person().notes) {
          <span
            class="material-symbols-outlined shrink-0 text-[18px] text-[var(--ctp-text-muted)]"
            [matTooltip]="person().notes!"
            >sticky_note_2</span
          >
        }
      </div>
    </article>
  `,
})
export class LodgingPersonCard {
  readonly person = input.required<LodgingPerson>();
  readonly genderLabel = genderLabel;

  readonly roommateTooltip = computed(() => {
    const n = this.person().roommateIds?.length ?? 0;
    return n
      ? `Preferred roommates move with this person (${n})`
      : '';
  });
}
