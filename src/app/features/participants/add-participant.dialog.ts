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
import { Registration, PersonGender } from '../../core/supabase/database.types';

export interface AddParticipantDialogData {
  drivers: Registration[];
  people: Registration[];
  mode?: 'add' | 'edit';
  registration?: Registration;
  roommateIds?: string[];
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
  roommate_ids: string[];
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
    MatAutocompleteModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit participant' : 'Add participant' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Full name</mat-label>
        <input matInput [(ngModel)]="name" required autocomplete="name" />
      </mat-form-field>

      <div class="gender-block">
        <p class="gender-block__label">Gender</p>
        <div class="gender-toggle" role="group" aria-label="Gender">
          <button
            type="button"
            class="gender-btn"
            [class.gender-btn--active]="gender() === 'female'"
            (click)="setGender('female')"
          >
            Female
          </button>
          <button
            type="button"
            class="gender-btn"
            [class.gender-btn--active]="gender() === 'male'"
            (click)="setGender('male')"
          >
            Male
          </button>
        </div>
      </div>

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

      @if (roommateCandidateOptions().length || roommateIds().length) {
        <div class="roommate-block">
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <mat-label>Preferred roommates</mat-label>
            <input
              #roommateInput
              matInput
              type="text"
              placeholder="Type to search and add…"
              [ngModel]="roommateQuery()"
              (ngModelChange)="onRoommateQueryChange($event)"
              [matAutocomplete]="roommateAuto"
            />
            <mat-autocomplete
              #roommateAuto="matAutocomplete"
              (optionSelected)="onRoommateSelected($event, roommateInput)"
            >
              @for (person of filteredRoommateCandidates(); track person.id) {
                <mat-option [value]="person">{{ person.display_name }}</mat-option>
              }
              @if (
                roommateCandidateOptions().length &&
                !filteredRoommateCandidates().length &&
                roommateQuery().trim()
              ) {
                <mat-option disabled>No matches for “{{ roommateQuery() }}”</mat-option>
              }
            </mat-autocomplete>
            <mat-hint>Add one or more — links both ways; they move together into rooms</mat-hint>
          </mat-form-field>

          @if (selectedRoommates().length) {
            <ul class="chip-list">
              @for (person of selectedRoommates(); track person.id) {
                <li class="chip">
                  <span>{{ person.display_name }}</span>
                  <button
                    type="button"
                    class="chip__remove"
                    [attr.aria-label]="'Remove ' + person.display_name"
                    (click)="removeRoommate(person.id)"
                  >
                    ×
                  </button>
                </li>
              }
            </ul>
            <button
              type="button"
              class="clear-roommates-btn"
              (click)="clearAllRoommates()"
            >
              Clear all roommates
            </button>
          }
        </div>
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

    .gender-block__label {
      margin: 0 0 0.45rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ctp-text-muted);
    }

    .gender-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .gender-btn {
      min-height: 44px;
      border-radius: 10px;
      border: 1px solid var(--ctp-border);
      background: var(--ctp-bg);
      color: var(--ctp-text);
      font-weight: 600;
      font-size: 0.92rem;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background 0.15s ease,
        color 0.15s ease;
    }

    .gender-btn:hover {
      border-color: var(--ctp-accent);
    }

    .gender-btn--active {
      border-color: var(--ctp-accent);
      background: var(--ctp-accent-soft);
      color: var(--ctp-accent);
    }

    .roommate-block {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .chip-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.35rem 0.28rem 0.65rem;
      border-radius: 999px;
      border: 1px solid var(--ctp-border);
      background: var(--ctp-surface-2);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .chip__remove {
      width: 1.35rem;
      height: 1.35rem;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: var(--ctp-text-muted);
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }

    .chip__remove:hover {
      color: var(--ctp-danger);
      background: color-mix(in srgb, var(--ctp-danger) 12%, transparent);
    }

    .clear-roommates-btn {
      align-self: flex-start;
      margin-top: 0.15rem;
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--ctp-danger) 35%, var(--ctp-border));
      background: transparent;
      color: var(--ctp-danger);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .clear-roommates-btn:hover {
      background: color-mix(in srgb, var(--ctp-danger) 10%, transparent);
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

  readonly peopleById = new Map((this.data.people ?? []).map((p) => [p.id, p]));

  readonly partnerQuery = signal('');
  readonly driverQuery = signal('');
  readonly roommateQuery = signal('');
  readonly partnerId = signal(this.data.registration?.partner_registration_id ?? '');
  readonly assignedDriverId = signal(
    this.data.registration?.assigned_driver_registration_id ?? '',
  );
  readonly roommateIds = signal<string[]>([...(this.data.roommateIds ?? [])]);
  /** No default — neither Male nor Female selected until the user picks. */
  readonly gender = signal<PersonGender | null>(
    this.data.registration?.gender === 'male' || this.data.registration?.gender === 'female'
      ? this.data.registration.gender
      : null,
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

  readonly roommateCandidateOptions = computed(() => {
    const selected = new Set(this.roommateIds());
    return this.partnerOptions.filter((p) => !selected.has(p.id));
  });

  readonly filteredRoommateCandidates = computed(() => {
    const q = this.roommateQuery().trim().toLocaleLowerCase();
    const list = this.roommateCandidateOptions();
    if (!q) {
      return list;
    }
    return list.filter((p) => p.display_name.toLocaleLowerCase().includes(q));
  });

  readonly selectedRoommates = computed(() =>
    this.roommateIds()
      .map((id) => this.peopleById.get(id))
      .filter((p): p is Registration => !!p),
  );

  name = this.data.registration?.display_name ?? '';
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

  setGender(value: 'male' | 'female'): void {
    this.gender.set(this.gender() === value ? null : value);
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

  onRoommateQueryChange(value: string): void {
    if (typeof value !== 'string') {
      return;
    }
    this.roommateQuery.set(value);
  }

  onRoommateSelected(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    const value = event.option.value as Registration;
    if (value?.id) {
      this.roommateIds.update((ids) => (ids.includes(value.id) ? ids : [...ids, value.id]));
    }
    this.roommateQuery.set('');
    input.value = '';
    queueMicrotask(() => input.focus());
  }

  removeRoommate(id: string): void {
    this.roommateIds.update((ids) => ids.filter((x) => x !== id));
  }

  clearAllRoommates(): void {
    const count = this.roommateIds().length;
    if (!count) {
      return;
    }
    const label = count === 1 ? '1 roommate link' : `${count} roommate links`;
    const ok = window.confirm(
      `Clear all roommates?\n\nThis will unlink ${label} both ways (they will also lose this person from their roommate list). You still need to Save to apply.`,
    );
    if (!ok) {
      return;
    }
    this.roommateIds.set([]);
    this.roommateQuery.set('');
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

    const gender: PersonGender = this.gender() ?? 'unspecified';

    const base = {
      id: this.editId,
      display_name,
      departure_location: this.departureLocation.trim(),
      return_location: this.returnLocation.trim(),
      notes: this.notes.trim() || undefined,
      gender,
      partner_registration_id: partnerId,
      roommate_ids: this.roommateIds(),
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
