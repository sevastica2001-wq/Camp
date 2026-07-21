import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Driver } from '../models/transport.models';
import { TransportStore } from '../store/transport.store';
import {
  AddPersonDialogData,
  AddPersonFormResult,
} from '../models/add-person.model';

export type { AddPersonFormResult };

@Component({
  selector: 'app-add-person-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit() ? 'Edit person' : 'Add person' }}</h2>
    <mat-dialog-content class="flex flex-col gap-4 pt-2">
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Full name</mat-label>
        <input matInput [(ngModel)]="name" required autocomplete="name" />
      </mat-form-field>

      <div
        class="flex items-center justify-between rounded-xl border border-[var(--ctp-border)] bg-[var(--ctp-bg)] px-4 py-3"
      >
        <div>
          <p class="text-sm font-medium">Is this person a driver?</p>
          <p class="text-xs text-[var(--ctp-text-muted)]">
            Drivers get their own card with seat capacity
          </p>
        </div>
        <mat-slide-toggle [(ngModel)]="isDriver" color="primary">
          {{ isDriver ? 'Yes' : 'No' }}
        </mat-slide-toggle>
      </div>

      @if (isDriver) {
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Seats available</mat-label>
          <input matInput type="number" min="0" [(ngModel)]="availableSeats" required />
        </mat-form-field>
      } @else {
        <div class="flex flex-col gap-3">
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <mat-label>Assign to driver</mat-label>
            <input
              #driverInput
              matInput
              type="text"
              placeholder="Search drivers…"
              [ngModel]="driverQuery()"
              (ngModelChange)="onDriverQueryChange($event)"
              [matAutocomplete]="driverAuto"
            />
            <mat-autocomplete
              #driverAuto="matAutocomplete"
              (optionSelected)="onDriverSelected($event, driverInput)"
            >
              <mat-option [value]="unassignedOption">Unassigned</mat-option>
              @for (driver of filteredDrivers(); track driver.id) {
                <mat-option [value]="driver">
                  {{ driver.name }}
                  ({{ driver.assignedPassengers.length }}/{{ driver.availableSeats }})
                </mat-option>
              }
              @if (drivers().length && !filteredDrivers().length) {
                <mat-option disabled>No drivers match “{{ driverQuery() }}”</mat-option>
              }
            </mat-autocomplete>
            <mat-hint>
              @if (!drivers().length) {
                Add drivers first, or leave unassigned
              } @else {
                Type to search, then click a driver
              }
            </mat-hint>
          </mat-form-field>

          @if (selectedDriver(); as driver) {
            <div
              class="driver-pick-status flex items-center justify-between rounded-xl border border-[var(--ctp-accent)] bg-[var(--ctp-accent-soft)] px-3 py-2"
            >
              <div class="min-w-0">
                <p class="text-[11px] font-medium tracking-wide text-[var(--ctp-accent)] uppercase">
                  Selected driver
                </p>
                <p class="truncate text-sm font-semibold text-[var(--ctp-text)]">
                  {{ driver.name }}
                  <span class="font-normal text-[var(--ctp-text-muted)]">
                    · {{ driver.assignedPassengers.length }}/{{ driver.availableSeats }} seats
                  </span>
                </p>
              </div>
              <button mat-button type="button" class="!min-w-0" (click)="clearDriver(driverInput)">
                Clear
              </button>
            </div>
          } @else {
            <div
              class="driver-pick-status rounded-xl border border-dashed border-[var(--ctp-border)] bg-[var(--ctp-bg)] px-3 py-2 text-xs text-[var(--ctp-text-muted)]"
            >
              No driver selected — person will stay Unassigned
            </div>
          }
        </div>
      }

      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Place of departure</mat-label>
        <input matInput [(ngModel)]="departureLocation" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Place after camp</mat-label>
        <input matInput [(ngModel)]="returnLocation" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="3" [(ngModel)]="notes"></textarea>
      </mat-form-field>

      @if (error()) {
        <p class="text-sm text-[var(--ctp-danger)]">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    .driver-pick-status {
      margin-top: 0.25rem;
      margin-bottom: 0.85rem;
    }
  `,
})
export class AddPersonDialog {
  private readonly store = inject(TransportStore);
  private readonly data = inject<AddPersonDialogData | null>(MAT_DIALOG_DATA, {
    optional: true,
  });
  private readonly ref = inject(MatDialogRef<AddPersonDialog, AddPersonFormResult | undefined>);
  private readonly driverAutoTrigger = viewChild(MatAutocompleteTrigger);

  /** Sentinel so Unassigned is a distinct option value (not confused with Driver). */
  readonly unassignedOption = { id: '', name: 'Unassigned' } as Driver;

  readonly drivers = computed(() => this.store.drivers());
  readonly driverQuery = signal('');
  readonly assignedDriverId = signal(this.data?.assignedDriverId ?? '');
  readonly filteredDrivers = computed(() => {
    const query = this.driverQuery().trim().toLocaleLowerCase();
    const list = this.drivers();
    if (!query) {
      return list;
    }
    return list.filter((d) => d.name.toLocaleLowerCase().includes(query));
  });
  readonly selectedDriver = computed(() => {
    const id = this.assignedDriverId();
    if (!id) {
      return null;
    }
    return this.drivers().find((d) => d.id === id) ?? null;
  });
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(this.data?.mode === 'edit');

  name = this.data?.name ?? '';
  isDriver = this.data?.isDriver ?? false;
  availableSeats: number | null = this.data?.availableSeats ?? 4;
  departureLocation = this.data?.departureLocation || 'Bucuresti';
  returnLocation = this.data?.returnLocation || 'Bucuresti';
  notes = this.data?.notes ?? '';

  constructor() {
    const existing = this.selectedDriver();
    if (existing) {
      this.driverQuery.set(existing.name);
    }
  }

  onDriverQueryChange(value: string): void {
    // Ignore object stringification if autocomplete briefly writes the option value
    if (typeof value !== 'string') {
      return;
    }
    this.driverQuery.set(value);
    const selected = this.selectedDriver();
    if (selected && value === selected.name) {
      return;
    }
    this.assignedDriverId.set('');
  }

  onDriverSelected(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    const value = event.option.value as Driver | null;
    if (!value || value.id === '') {
      this.clearDriver(input);
      return;
    }

    this.assignedDriverId.set(value.id);
    this.driverQuery.set(value.name);
    input.value = value.name;

    queueMicrotask(() => {
      this.driverAutoTrigger()?.closePanel();
      input.blur();
    });
  }

  clearDriver(input?: HTMLInputElement): void {
    this.assignedDriverId.set('');
    this.driverQuery.set('');
    if (input) {
      input.value = '';
    }
    this.driverAutoTrigger()?.closePanel();
  }

  save(): void {
    this.error.set(null);
    const name = this.name.trim();
    const departureLocation = this.departureLocation.trim();
    const returnLocation = this.returnLocation.trim();
    const notes = this.notes.trim() || undefined;

    if (!name) {
      this.error.set('Full name is required');
      return;
    }

    if (this.isDriver) {
      const seats = Number(this.availableSeats);
      if (!Number.isFinite(seats) || seats < 0) {
        this.error.set('Enter a valid number of available seats');
        return;
      }
      this.ref.close({
        name,
        isDriver: true,
        availableSeats: seats,
        departureLocation,
        returnLocation,
        notes,
      });
      return;
    }

    let driverId = this.assignedDriverId() || undefined;
    if (!driverId && this.driverQuery().trim()) {
      const matches = this.filteredDrivers();
      if (matches.length === 1) {
        driverId = matches[0].id;
      } else {
        this.error.set('Select a driver from the list, or clear the field for Unassigned');
        return;
      }
    }

    this.ref.close({
      name,
      isDriver: false,
      assignedDriverId: driverId,
      departureLocation,
      returnLocation,
      notes,
    });
  }
}
