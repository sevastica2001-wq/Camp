import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PersonGender, Registration } from '../../core/supabase/database.types';

export interface BatchEditParticipantsDialogData {
  count: number;
  drivers: Registration[];
  people: Registration[];
  /** Selected registration ids — excluded from partner/roommate of self only at apply time */
  selectedIds: string[];
}

export interface BatchEditParticipantsResult {
  gender?: PersonGender;
  partner_registration_id?: string | null;
  roommate_ids?: string[];
  transport_role?: 'DRIVER' | 'PASSENGER';
  available_seats?: number;
  assigned_driver_registration_id?: string | null;
  departure_location?: string;
  return_location?: string;
  notes?: string | null;
}

const NONE_OPTION = { id: '', display_name: 'None' } as Registration;
const UNASSIGNED_OPTION = { id: '', display_name: 'Unassigned' } as Registration;

@Component({
  selector: 'app-batch-edit-participants-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit {{ data.count }} participants</h2>
    <mat-dialog-content>
      <p class="hint">
        Check the fields you want to change. Unchecked fields stay as they are. Names are
        not edited.
      </p>

      <div class="field-row">
        <mat-checkbox [(ngModel)]="applyGender" name="applyGender">Gender</mat-checkbox>
        <div class="gender-toggle" [class.disabled]="!applyGender" role="group" aria-label="Gender">
          <button
            type="button"
            class="gender-btn"
            [disabled]="!applyGender"
            [class.gender-btn--active]="gender() === 'female'"
            (click)="setGender('female')"
          >
            Female
          </button>
          <button
            type="button"
            class="gender-btn"
            [disabled]="!applyGender"
            [class.gender-btn--active]="gender() === 'male'"
            (click)="setGender('male')"
          >
            Male
          </button>
        </div>
      </div>

      @if (partnerOptions.length) {
        <div class="field-row">
          <mat-checkbox [(ngModel)]="applyPartner" name="applyPartner"
            >Partner / spouse</mat-checkbox
          >
          <mat-form-field
            appearance="outline"
            class="w-full"
            subscriptSizing="dynamic"
            [class.field-disabled]="!applyPartner"
          >
            <mat-label>Partner / spouse</mat-label>
            <input
              #partnerInput
              matInput
              type="text"
              placeholder="Type to search…"
              [disabled]="!applyPartner"
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
            </mat-autocomplete>
          </mat-form-field>
        </div>
      }

      @if (roommateCandidateOptions().length || roommateIds().length) {
        <div class="field-row">
          <mat-checkbox [(ngModel)]="applyRoommates" name="applyRoommates"
            >Preferred roommates</mat-checkbox
          >
          <div [class.field-disabled]="!applyRoommates">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Preferred roommates</mat-label>
              <input
                #roommateInput
                matInput
                type="text"
                placeholder="Type to search and add…"
                [disabled]="!applyRoommates"
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
              </mat-autocomplete>
            </mat-form-field>
            @if (selectedRoommates().length) {
              <ul class="chip-list">
                @for (person of selectedRoommates(); track person.id) {
                  <li class="chip">
                    <span>{{ person.display_name }}</span>
                    <button
                      type="button"
                      class="chip__remove"
                      [disabled]="!applyRoommates"
                      [attr.aria-label]="'Remove ' + person.display_name"
                      (click)="removeRoommate(person.id)"
                    >
                      ×
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      }

      <div class="field-row">
        <mat-checkbox [(ngModel)]="applyRole" name="applyRole">Driver / seats</mat-checkbox>
        <div [class.field-disabled]="!applyRole">
          <div
            class="flex items-center justify-between rounded-xl border border-[var(--ctp-border)] bg-[var(--ctp-bg)] px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium">Make them drivers?</p>
              <p class="text-xs text-[var(--ctp-text-muted)]">Applies to all selected</p>
            </div>
            <mat-slide-toggle
              [(ngModel)]="isDriver"
              color="primary"
              [disabled]="!applyRole"
            >
              {{ isDriver ? 'Yes' : 'No' }}
            </mat-slide-toggle>
          </div>

          @if (isDriver) {
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Seats available</mat-label>
              <input
                matInput
                type="number"
                min="0"
                [(ngModel)]="availableSeats"
                [disabled]="!applyRole"
              />
            </mat-form-field>
          } @else if (drivers.length) {
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Assign to driver</mat-label>
              <input
                #driverInput
                matInput
                type="text"
                placeholder="Type to search…"
                [disabled]="!applyRole"
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
              </mat-autocomplete>
            </mat-form-field>
          }
        </div>
      </div>

      <div class="field-row">
        <mat-checkbox [(ngModel)]="applyDeparture" name="applyDeparture"
          >Place of departure</mat-checkbox
        >
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Place of departure</mat-label>
          <input matInput [(ngModel)]="departureLocation" [disabled]="!applyDeparture" />
        </mat-form-field>
      </div>

      <div class="field-row">
        <mat-checkbox [(ngModel)]="applyReturn" name="applyReturn"
          >Place after camp</mat-checkbox
        >
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Place after camp</mat-label>
          <input matInput [(ngModel)]="returnLocation" [disabled]="!applyReturn" />
        </mat-form-field>
      </div>

      <div class="field-row">
        <mat-checkbox [(ngModel)]="applyNotes" name="applyNotes">Notes</mat-checkbox>
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="3" [(ngModel)]="notes" [disabled]="!applyNotes"></textarea>
        </mat-form-field>
      </div>

      @if (error()) {
        <p class="text-sm text-[var(--ctp-danger)]">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        Apply to {{ data.count }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      display: flex !important;
      flex-direction: column;
      gap: 1rem;
      padding-top: 0.25rem;
      max-height: min(70vh, 640px);
    }

    .hint {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ctp-text-muted);
      line-height: 1.4;
    }

    .field-row {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    :host ::ng-deep .mat-mdc-form-field {
      width: 100%;
      margin: 0;
    }

    .field-disabled {
      opacity: 0.55;
      pointer-events: none;
    }

    .gender-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .gender-toggle.disabled {
      opacity: 0.55;
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
    }

    .gender-btn:disabled {
      cursor: not-allowed;
    }

    .gender-btn--active {
      border-color: var(--ctp-accent);
      background: var(--ctp-accent-soft);
      color: var(--ctp-accent);
    }

    .chip-list {
      list-style: none;
      margin: 0.35rem 0 0;
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
  `,
})
export class BatchEditParticipantsDialog {
  readonly data = inject<BatchEditParticipantsDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(
    MatDialogRef<BatchEditParticipantsDialog, BatchEditParticipantsResult | undefined>,
  );
  private readonly partnerTrigger = viewChild(MatAutocompleteTrigger);

  readonly noneOption = NONE_OPTION;
  readonly unassignedOption = UNASSIGNED_OPTION;

  readonly selectedIdSet = new Set(this.data.selectedIds);
  readonly drivers = (this.data.drivers ?? []).filter((d) => !this.selectedIdSet.has(d.id));
  readonly partnerOptions = (this.data.people ?? [])
    .filter((p) => !this.selectedIdSet.has(p.id))
    .slice()
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  readonly peopleById = new Map((this.data.people ?? []).map((p) => [p.id, p]));

  applyGender = false;
  applyPartner = false;
  applyRoommates = false;
  applyRole = false;
  applyDeparture = false;
  applyReturn = false;
  applyNotes = false;

  readonly gender = signal<'male' | 'female' | null>(null);
  readonly partnerQuery = signal('');
  readonly driverQuery = signal('Unassigned');
  readonly roommateQuery = signal('');
  readonly partnerId = signal('');
  readonly assignedDriverId = signal('');
  readonly roommateIds = signal<string[]>([]);
  readonly error = signal<string | null>(null);

  isDriver = false;
  availableSeats: number | null = 4;
  departureLocation = '';
  returnLocation = '';
  notes = '';

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

  setGender(value: 'male' | 'female'): void {
    if (!this.applyGender) {
      return;
    }
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
    const result: BatchEditParticipantsResult = {};
    let any = false;

    if (this.applyGender) {
      if (!this.gender()) {
        this.error.set('Pick Female or Male, or uncheck Gender');
        return;
      }
      result.gender = this.gender()!;
      any = true;
    }

    if (this.applyPartner) {
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
      result.partner_registration_id = partnerId;
      any = true;
    }

    if (this.applyRoommates) {
      result.roommate_ids = [...this.roommateIds()];
      any = true;
    }

    if (this.applyRole) {
      if (this.isDriver) {
        const seats = Number(this.availableSeats);
        if (!Number.isFinite(seats) || seats < 0) {
          this.error.set('Enter a valid number of available seats');
          return;
        }
        result.transport_role = 'DRIVER';
        result.available_seats = seats;
        result.assigned_driver_registration_id = null;
      } else {
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
        result.transport_role = 'PASSENGER';
        result.available_seats = 0;
        result.assigned_driver_registration_id = driverId;
      }
      any = true;
    }

    if (this.applyDeparture) {
      result.departure_location = this.departureLocation.trim();
      any = true;
    }
    if (this.applyReturn) {
      result.return_location = this.returnLocation.trim();
      any = true;
    }
    if (this.applyNotes) {
      result.notes = this.notes.trim() || null;
      any = true;
    }

    if (!any) {
      this.error.set('Check at least one field to update');
      return;
    }

    this.ref.close(result);
  }
}
