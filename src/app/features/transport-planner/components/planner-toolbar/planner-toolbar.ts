import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { TransportStore } from '../../store/transport.store';
import { ThemeService } from '../../../../core/theme.service';
import { CampContextService } from '../../../../core/camp-context/camp-context.service';
import { CommandHistoryService } from '../../services/command-history.service';
import { ThemeMode } from '../../models/transport.models';

@Component({
  selector: 'app-planner-toolbar',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTooltipModule,
    RouterLink,
  ],
  template: `
    <div
      class="no-print flex flex-wrap items-center gap-3 border-b border-[var(--ctp-border)] bg-[var(--ctp-surface)] px-4 py-3"
    >
      <div class="relative min-w-[220px] flex-1">
        <span
          class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-[var(--ctp-text-muted)]"
          >search</span
        >
        <input
          class="w-full rounded-xl border border-[var(--ctp-border)] bg-[var(--ctp-bg)] py-2.5 pr-3 pl-10 text-sm outline-none focus:border-[var(--ctp-accent)]"
          type="search"
          placeholder="Search passenger, driver, car, city…"
          [ngModel]="store.search()"
          (ngModelChange)="store.setSearch($event)"
        />
      </div>

      <button mat-stroked-button type="button" [matMenuTriggerFor]="filtersMenu">
        <span class="material-symbols-outlined mr-1 text-[18px] align-middle">filter_list</span>
        Filters
      </button>
      <mat-menu #filtersMenu="matMenu" class="filters-menu">
        <div class="flex w-72 flex-col gap-2 p-3" (click)="$event.stopPropagation()">
          <mat-checkbox
            [checked]="store.filters().assigned"
            (change)="store.setFilters({ assigned: !!$event.checked })"
            >Assigned</mat-checkbox
          >
          <mat-checkbox
            [checked]="store.filters().unassigned"
            (change)="store.setFilters({ unassigned: !!$event.checked })"
            >Unassigned</mat-checkbox
          >
          <mat-checkbox
            [checked]="store.filters().driversWithSeats"
            (change)="store.setFilters({ driversWithSeats: !!$event.checked })"
            >Drivers with seats</mat-checkbox
          >
          <mat-checkbox
            [checked]="store.filters().driversFull"
            (change)="store.setFilters({ driversFull: !!$event.checked })"
            >Drivers full</mat-checkbox
          >
          <mat-checkbox
            [checked]="store.filters().driversOverCapacity"
            (change)="store.setFilters({ driversOverCapacity: !!$event.checked })"
            >Drivers over capacity</mat-checkbox
          >

          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <mat-label>Departure city</mat-label>
            <mat-select
              [value]="store.filters().departureCity"
              (selectionChange)="store.setFilters({ departureCity: $event.value })"
            >
              <mat-option value="">All</mat-option>
              @for (city of store.departureCities(); track city) {
                <mat-option [value]="city">{{ city }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <mat-label>Return city</mat-label>
            <mat-select
              [value]="store.filters().returnCity"
              (selectionChange)="store.setFilters({ returnCity: $event.value })"
            >
              <mat-option value="">All</mat-option>
              @for (city of store.returnCities(); track city) {
                <mat-option [value]="city">{{ city }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-button type="button" (click)="store.resetFilters()">Reset filters</button>
        </div>
      </mat-menu>

      @if (!readOnly()) {
        <button mat-flat-button color="primary" type="button" (click)="addPerson.emit()">
          <span class="material-symbols-outlined mr-1 text-[18px] align-middle">person_add</span>
          Add person
        </button>
      }
      <button mat-stroked-button type="button" [matMenuTriggerFor]="exportMenu">
        <span class="material-symbols-outlined mr-1 text-[18px] align-middle">download</span>
        Export
      </button>
      <mat-menu #exportMenu="matMenu">
        <button mat-menu-item type="button" (click)="exportPassengers.emit()">Passengers CSV</button>
        <button mat-menu-item type="button" (click)="exportDrivers.emit()">Drivers CSV</button>
        @if (!readOnly()) {
          <button mat-menu-item type="button" (click)="downloadSeed.emit()">
            Download seed for publish
          </button>
          <button mat-menu-item type="button" (click)="downloadBackup.emit()">
            Download backup JSON
          </button>
          <button mat-menu-item type="button" (click)="importBackup.emit()">
            Import backup JSON…
          </button>
          <button mat-menu-item type="button" (click)="resetSeed.emit()">
            Reset to published seed
          </button>
        }
      </mat-menu>

      @if (!readOnly()) {
        <button mat-stroked-button type="button" (click)="autoAssign.emit()">
          <span class="material-symbols-outlined mr-1 text-[18px] align-middle">auto_fix_high</span>
          Auto Assign
        </button>
      }

      @if (!readOnly()) {
        <a mat-stroked-button [routerLink]="overviewLink()">
          <span class="material-symbols-outlined mr-1 text-[18px] align-middle">print</span>
          Overview
        </a>
      }

      <div class="ml-auto flex items-center gap-1">
        @if (!readOnly()) {
          <button
            mat-icon-button
            type="button"
            matTooltip="Undo (Ctrl+Z)"
            [disabled]="!history.canUndo()"
            (click)="history.undo()"
          >
            <span class="material-symbols-outlined">undo</span>
          </button>
          <button
            mat-icon-button
            type="button"
            matTooltip="Redo (Ctrl+Shift+Z)"
            [disabled]="!history.canRedo()"
            (click)="history.redo()"
          >
            <span class="material-symbols-outlined">redo</span>
          </button>
        }
        <button
          mat-icon-button
          type="button"
          [matTooltip]="'Theme: ' + themeLabel()"
          (click)="theme.cycleTheme()"
        >
          <span class="material-symbols-outlined">{{ themeIcon() }}</span>
        </button>
      </div>
    </div>
  `,
})
export class PlannerToolbar {
  readonly store = inject(TransportStore);
  readonly theme = inject(ThemeService);
  readonly history = inject(CommandHistoryService);
  private readonly campContext = inject(CampContextService);

  readonly readOnly = input(false);

  readonly addPerson = output<void>();
  readonly exportPassengers = output<void>();
  readonly exportDrivers = output<void>();
  readonly downloadSeed = output<void>();
  readonly downloadBackup = output<void>();
  readonly importBackup = output<void>();
  readonly resetSeed = output<void>();
  readonly autoAssign = output<void>();

  overviewLink(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id, 'overview'] : ['/dashboard'];
  }

  readonly themeLabel = computed(() => {
    const t = this.theme.theme();
    return t.charAt(0).toUpperCase() + t.slice(1);
  });

  readonly themeIcon = computed(() => {
    const map: Record<ThemeMode, string> = {
      light: 'light_mode',
      dark: 'dark_mode',
      system: 'contrast',
    };
    return map[this.theme.theme()];
  });
}
