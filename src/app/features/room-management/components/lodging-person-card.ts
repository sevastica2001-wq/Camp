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
      class="cursor-grab rounded-md border border-[var(--ctp-border)] bg-[var(--ctp-surface)] px-2 py-1.5 shadow-[var(--ctp-shadow)] transition hover:-translate-y-0.5 active:cursor-grabbing"
    >
      <div class="flex items-center gap-1.5">
        <h4 class="min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-[var(--ctp-text)]">
          {{ person().name }}
        </h4>
        <span
          class="shrink-0 rounded px-1 py-px text-[9px] font-semibold leading-none text-[var(--ctp-text-muted)] bg-[var(--ctp-surface-2)]"
          [matTooltip]="'Gender: ' + person().gender"
        >
          {{ genderLabel(person().gender) }}
        </span>
        @if (person().notes) {
          <span
            class="material-symbols-outlined shrink-0 text-[14px] text-[var(--ctp-text-muted)]"
            [matTooltip]="person().notes!"
            >sticky_note_2</span
          >
        }
      </div>
      @if (person().partnerId || person().roommateIds.length > 0) {
        <div class="mt-1 flex flex-wrap gap-1">
          @if (person().partnerId) {
            <span
              class="rounded px-1 py-px text-[9px] font-medium leading-none text-[var(--ctp-accent)] bg-[var(--ctp-accent-soft)]"
            >
              Couple
            </span>
          }
          @if (person().roommateIds.length > 0) {
            <span
              class="rounded px-1 py-px text-[9px] font-medium leading-none text-[var(--ctp-text-muted)] bg-[var(--ctp-surface-2)]"
              [matTooltip]="roommateTooltip()"
            >
              +{{ person().roommateIds.length }} roommate{{
                person().roommateIds.length === 1 ? '' : 's'
              }}
            </span>
          }
        </div>
      }
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
