import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TransportStore } from '../../store/transport.store';
import { Driver, Passenger } from '../../models/transport.models';
import { normalizeLocation } from '../../utils/id.utils';
import { resolvePassengers } from '../../utils/seat.utils';

interface CityGroup {
  city: string;
  drivers: Array<{ driver: Driver; passengers: Passenger[] }>;
}

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="min-h-full bg-[var(--ctp-bg)]">
      <header
        class="no-print sticky top-0 z-20 flex items-center justify-between border-b border-[var(--ctp-border)] bg-[var(--ctp-surface)] px-6 py-4"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.12em] text-[var(--ctp-text-muted)]">
            Camp Transportation Planner
          </p>
          <h1 class="text-xl font-semibold">Transportation Overview</h1>
        </div>
        <div class="flex gap-2">
          <a mat-stroked-button routerLink="/planner">Back to Planner</a>
          <button mat-flat-button color="primary" type="button" (click)="print()">Print</button>
        </div>
      </header>

      <main class="mx-auto max-w-[210mm] px-8 py-10">
        @for (group of groups(); track group.city) {
          <section class="print-city mb-12">
            <h2
              class="mb-6 border-b-2 border-[var(--ctp-text)] pb-2 text-2xl font-bold tracking-wide uppercase"
            >
              {{ group.city }}
            </h2>

            @for (entry of group.drivers; track entry.driver.id; let last = $last) {
              <article class="mb-6">
                <h3 class="mb-2 text-lg font-semibold">
                  🚗 {{ entry.driver.name }}
                  <span class="text-sm font-normal text-[var(--ctp-text-muted)]">
                    · {{ entry.driver.carModel }}
                    @if (entry.driver.carColor) {
                      ({{ entry.driver.carColor }})
                    }
                  </span>
                </h3>
                <p class="mb-2 text-sm text-[var(--ctp-text-muted)]">
                  {{ entry.driver.departureLocation }} → {{ entry.driver.returnLocation }} ·
                  {{ entry.passengers.length }}/{{ entry.driver.availableSeats }} seats
                </p>
                <div>
                  <p class="mb-1 text-xs font-semibold tracking-wide text-[var(--ctp-text-muted)] uppercase">
                    Passengers
                  </p>
                  <ul class="space-y-1">
                    @for (passenger of entry.passengers; track passenger.id) {
                      <li class="text-base">{{ passenger.name }}</li>
                    } @empty {
                      <li class="text-sm text-[var(--ctp-text-muted)] italic">No passengers</li>
                    }
                  </ul>
                </div>
                @if (!last) {
                  <hr class="mt-6 border-[var(--ctp-border)]" />
                }
              </article>
            }

            <div class="mt-8 text-center text-sm tracking-[0.3em] text-[var(--ctp-text-muted)]">
              ===================
            </div>
          </section>
        } @empty {
          <p class="text-center text-[var(--ctp-text-muted)]">No drivers to display.</p>
        }
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100%;
    }

    @media print {
      main {
        max-width: none;
        padding: 0;
      }
    }
  `,
})
export class OverviewPage {
  private readonly store = inject(TransportStore);

  readonly groups = computed<CityGroup[]>(() => {
    const passengers = this.store.passengers();
    const map = new Map<string, CityGroup>();

    for (const driver of this.store.drivers()) {
      const key = normalizeLocation(driver.departureLocation) || 'unknown';
      const label = driver.departureLocation.trim() || 'Unknown';
      if (!map.has(key)) {
        map.set(key, { city: label, drivers: [] });
      }
      map.get(key)!.drivers.push({
        driver,
        passengers: resolvePassengers(driver, passengers),
      });
    }

    return [...map.values()].sort((a, b) => a.city.localeCompare(b.city));
  });

  print(): void {
    window.print();
  }
}
