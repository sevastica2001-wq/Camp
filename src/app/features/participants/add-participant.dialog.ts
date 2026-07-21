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
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Registration, PersonGender } from '../../core/supabase/database.types';

export interface AddParticipantDialogData {
  drivers: Registration[];
  people: Registration[];
  mode?: 'add' | 'edit';
  registration?: Registration;
}

export interface AddParticipantFormResult {
  id?: string;
  display_name: string;
  transport_role: 'DRIVER' | 'PASSENGER';
  available_seats?: number;
  assigned_driver_registration_id?: string | null;
  departure_location?: string;
  return_location?: string;
  notes?: string;
  gender: PersonGender;
  partner_registration_id?: string | null;
}

const NONE_OPTION = { id: '', display_name: 'None' } as Registration;
const UNASSIGNED_OPTION = { id: '', display_name: 'Unassigned' } as Registration;

@Component({
  selector: 'app-add-participant-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit participant' : 'Add participant' }}</h2>
    <mat-dialog-content class="flex flex-col gap-4 pt-2">
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Full name</mat-label>
        <input matInput [(ngModel)]="name" required autocomplete="name" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Gender</mat-label>
        <mat-select [(ngModel)]="gender">
          <mat-option value="female">Female</mat-option>
          <mat-option value="male">Male</mat-option>
          <mat-option value="unspecified">Unspecified</mat-option>
        </mat-select>
      </mat-form-field>

      @if (partnerOptions.length) {
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Partner / spouse (optional)</mat-label>
          <input
            #partnerInput
            matInput
            type="text"
            placeholder="Type to search…"
            [ngModel]="partnerQuery()"
            (ngModelChange)="onPartnerQueryChange($event)"
            [matAutocomplete]="partnerAuto"
          />
          <mat-autocomplete
            #partnerAuto="matAutocomplete"
            (optionSelected)="onPartnerSelected($event, partnerInput)"
          >
            <mat-option [value]="noneOption">None</mat-option>
            @for (person of filteredPartners(); track person.id) {
              <mat-option [value]="person">{{ person.display_name }}</mat-option>
            }
            @if (partnerOptions.length && !filteredPartners().length && partnerQuery().trim()) {
              <mat-option disabled>No matches for “{{ partnerQuery() }}”</mat-option>
            }
          </mat-autocomplete>
          <mat-hint>Type to search, then click a person</mat-hint>
        </mat-form-field>
      }

      <div
        class="flex items-center justify-between rounded-xl border border-[var(--ctp-border)] bg-[var(--ctp-bg)] px-4 py-3"
      >
        <div>
          <p class="text-sm font-medium">Is this person a driver?</p>
          <p class="text-xs text-[var(--ctp-text-muted)]">
            Drivers get their own seat capacity
          </p>
        </div>
        <mat-slide-toggle [(ngModel)]="isDriver" color="primary">
          {{ isDriver ? 'Yes' : 'No' }}
        </mat-slide-toggle>
      </div>

      @if (isDriver) {
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Seats available</mat-label>
          <input matInput type="number" min="0" [(ngModel)]="availableSeats" required />
        </mat-form-field>
      } @else if (drivers.length) {
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Assign to driver</mat-label>
          <input
            #driverInput
            matInput
            type="text"
            placeholder="Type to search…"
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
              <mat-option [value]="driver">{{ driver.display_name }}</mat-option>
            }
            @if (drivers.length && !filteredDrivers().length && driverQuery().trim()) {
              <mat-option disabled>No matches for “{{ driverQuery() }}”</mat-option>
            }
          </mat-autocomplete>
          <mat-hint>Type to search, then click a driver</mat-hint>
        </mat-form-field>
      }

      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Place of departure</mat-label>
        <input matInput [(ngModel)]="departureLocation" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Place after camp</mat-label>
        <input matInput [(ngModel)]="returnLocation" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
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
    mat-dialog-content {
      display: flex !important;
      flex-direction: column;
      gap: 1.15rem;
      padding-top: 0.5rem;
    }

    :host ::ng-deep .mat-mdc-form-field {
      width: 100%;
      margin: 0;
    }
  `,
})
export class AddParticipantDialog {
  private readonly data = inject<AddParticipantDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(
    MatDialogRef<AddParticipantDialog, AddParticipantFormResult | undefined>,
  );
  private readonly partnerTrigger = viewChild(MatAutocompleteTrigger);

  readonly noneOption = NONE_OPTION;
  readonly unassignedOption = UNASSIGNED_OPTION;
  readonly isEdit = this.data.mode === 'edit' && !!this.data.registration;
  readonly editId = this.data.registration?.id;

  readonly drivers = (this.data.drivers ?? []).filter(
    (d) => d.id !== this.data.registration?.id,
  );
  readonly partnerOptions = (this.data.people ?? [])
    .filter((p) => p.id !== this.data.registration?.id)
    .slice()
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  readonly partnerQuery = signal('');
  readonly driverQuery = signal('');
  readonly partnerId = signal(this.data.registration?.partner_registration_id ?? '');
  readonly assignedDriverId = signal(
    this.data.registration?.assigned_driver_registration_id ?? '',
  );
  readonly error = signal<string | null>(null);

  readonly filteredPartners = computed(() => {
    const q = this.partnerQuery().trim().toLocaleLowerCase();
    if (!q) {
      return this.partnerOptions;
    }
    return this.partnerOptions.filter((p) =>
      p.display_name.toLocaleLowerCase().includes(q),
    );
  });

  readonly filteredDrivers = computed(() => {
    const q = this.driverQuery().trim().toLocaleLowerCase();
    if (!q) {
      return this.drivers;
    }
    return this.drivers.filter((d) => d.display_name.toLocaleLowerCase().includes(q));
  });

  name = this.data.registration?.display_name ?? '';
  gender: PersonGender = this.data.registration?.gender ?? 'unspecified';
  isDriver = this.data.registration?.transport_role === 'DRIVER';
  availableSeats: number | null = this.data.registration?.available_seats ?? 4;
  departureLocation = this.data.registration?.departure_location || 'Bucuresti';
  returnLocation = this.data.registration?.return_location || 'Bucuresti';
  notes = this.data.registration?.notes ?? '';

  constructor() {
    const partner = this.partnerOptions.find((p) => p.id === this.partnerId());
    if (partner) {
      this.partnerQuery.set(partner.display_name);
    }
    const driver = this.drivers.find((d) => d.id === this.assignedDriverId());
    if (driver) {
      this.driverQuery.set(driver.display_name);
    } else if (this.data.registration?.transport_role === 'PASSENGER') {
      this.driverQuery.set('Unassigned');
    }
  }

  onPartnerQueryChange(value: string): void {
    if (typeof value !== 'string') {
      return;
    }
    this.partnerQuery.set(value);
    const selected = this.partnerOptions.find((p) => p.id === this.partnerId());
    if (selected && value === selected.display_name) {
      return;
    }
    this.partnerId.set('');
  }

  onPartnerSelected(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    const value = event.option.value as Registration;
    if (!value?.id) {
      this.partnerId.set('');
      this.partnerQuery.set('');
      input.value = '';
    } else {
      this.partnerId.set(value.id);
      this.partnerQuery.set(value.display_name);
      input.value = value.display_name;
    }
    queueMicrotask(() => {
      this.partnerTrigger()?.closePanel();
      input.blur();
    });
  }

  onDriverQueryChange(value: string): void {
    if (typeof value !== 'string') {
      return;
    }
    this.driverQuery.set(value);
    const selected = this.drivers.find((d) => d.id === this.assignedDriverId());
    if (selected && value === selected.display_name) {
      return;
    }
    if (value === 'Unassigned') {
      return;
    }
    this.assignedDriverId.set('');
  }

  onDriverSelected(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    const value = event.option.value as Registration;
    if (!value?.id) {
      this.assignedDriverId.set('');
      this.driverQuery.set('Unassigned');
      input.value = 'Unassigned';
    } else {
      this.assignedDriverId.set(value.id);
      this.driverQuery.set(value.display_name);
      input.value = value.display_name;
    }
    queueMicrotask(() => input.blur());
  }

  save(): void {
    this.error.set(null);
    const display_name = this.name.trim();
    if (!display_name) {
      this.error.set('Full name is required');
      return;
    }

    let partnerId = this.partnerId() || null;
    if (!partnerId && this.partnerQuery().trim()) {
      const matches = this.filteredPartners();
      if (matches.length === 1) {
        partnerId = matches[0].id;
      } else if (this.partnerQuery().trim().toLowerCase() !== 'none') {
        this.error.set('Select a partner from the list, or clear the field');
        return;
      }
    }

    const base = {
      id: this.editId,
      display_name,
      departure_location: this.departureLocation.trim(),
      return_location: this.returnLocation.trim(),
      notes: this.notes.trim() || undefined,
      gender: this.gender,
      partner_registration_id: partnerId,
    };

    if (this.isDriver) {
      const seats = Number(this.availableSeats);
      if (!Number.isFinite(seats) || seats < 0) {
        this.error.set('Enter a valid number of available seats');
        return;
      }
      this.ref.close({
        ...base,
        transport_role: 'DRIVER',
        available_seats: seats,
        assigned_driver_registration_id: null,
      });
      return;
    }

    let driverId = this.assignedDriverId() || null;
    const driverQ = this.driverQuery().trim();
    if (!driverId && driverQ && driverQ.toLowerCase() !== 'unassigned') {
      const matches = this.filteredDrivers();
      if (matches.length === 1) {
        driverId = matches[0].id;
      } else {
        this.error.set('Select a driver from the list, or choose Unassigned');
        return;
      }
    }

    this.ref.close({
      ...base,
      transport_role: 'PASSENGER',
      available_seats: 0,
      assigned_driver_registration_id: driverId,
    });
  }
}
