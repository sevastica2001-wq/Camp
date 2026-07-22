import { Component, inject, signal } from '@angular/core';
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
  PROGRAM_END,
  PROGRAM_START,
  ScheduleEventCategory,
} from '../models/schedule.models';

export interface ScheduleEventEditData {
  title: string;
  startsAt: Date;
  endsAt: Date;
  category: ScheduleEventCategory;
  location: string;
  /** When true, hide Delete (e.g. creating a new event). */
  creating?: boolean;
}

export type ScheduleEventEditResult =
  | {
      action: 'save';
      title: string;
      startsAt: Date;
      endsAt: Date;
      category: ScheduleEventCategory;
      location: string;
    }
  | { action: 'delete' };

const CATEGORIES: { value: ScheduleEventCategory; label: string }[] = [
  { value: 'checkin', label: 'Check-in' },
  { value: 'checkout', label: 'Check-out' },
  { value: 'meal', label: 'Meal' },
  { value: 'break', label: 'Break / coffee' },
  { value: 'session', label: 'Session' },
  { value: 'activity', label: 'Activity' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-schedule-event-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.creating ? 'New event' : 'Edit event' }}</h2>
    <mat-dialog-content class="dialog-body">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Title</mat-label>
        <input matInput [(ngModel)]="title" name="title" required autocomplete="off" />
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline" class="grow">
          <mat-label>Date</mat-label>
          <input
            matInput
            type="date"
            [(ngModel)]="date"
            name="date"
            [min]="minDate"
            [max]="maxDate"
            required
          />
        </mat-form-field>
      </div>

      <div class="row">
        <mat-form-field appearance="outline" class="half">
          <mat-label>Starts</mat-label>
          <input matInput type="time" [(ngModel)]="startTime" name="startTime" required />
        </mat-form-field>
        <mat-form-field appearance="outline" class="half">
          <mat-label>Ends</mat-label>
          <input matInput type="time" [(ngModel)]="endTime" name="endTime" required />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Category</mat-label>
        <mat-select [(ngModel)]="category" name="category">
          @for (opt of categories; track opt.value) {
            <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Location (optional)</mat-label>
        <input matInput [(ngModel)]="location" name="location" autocomplete="off" />
      </mat-form-field>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions class="actions" align="end">
      @if (!data.creating) {
        <button mat-button type="button" class="danger" (click)="remove()">Delete</button>
      }
      <span class="spacer"></span>
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        {{ data.creating ? 'Add' : 'Update' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      min-width: min(100vw - 2rem, 440px);
    }

    h2[mat-dialog-title] {
      margin: 0;
      padding: 1.25rem 1.5rem 0.5rem;
      font-size: 1.25rem;
      font-weight: 650;
    }

    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.5rem 1.5rem 0.75rem !important;
      min-width: min(100vw - 2rem, 440px);
    }

    .row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .grow {
      flex: 1 1 100%;
    }

    .half {
      flex: 1 1 140px;
    }

    .w-full {
      width: 100%;
    }

    .error {
      margin: 0.25rem 0 0;
      color: var(--ctp-danger, #e57373);
      font-size: 0.875rem;
    }

    .actions {
      padding: 0.5rem 1rem 1rem !important;
      gap: 0.35rem;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .danger {
      color: var(--ctp-danger, #e57373);
    }
  `,
})
export class ScheduleEventEditDialog {
  readonly data = inject<ScheduleEventEditData>(MAT_DIALOG_DATA);
  private readonly ref = inject(
    MatDialogRef<ScheduleEventEditDialog, ScheduleEventEditResult | undefined>,
  );

  readonly categories = CATEGORIES;
  readonly minDate = PROGRAM_START;
  readonly maxDate = PROGRAM_END;

  title = this.data.title;
  location = this.data.location ?? '';
  category: ScheduleEventCategory = this.data.category ?? 'other';
  date = toDateInput(this.data.startsAt);
  startTime = toTimeInput(this.data.startsAt);
  endTime = toTimeInput(this.data.endsAt);
  readonly error = signal<string | null>(null);

  save(): void {
    this.error.set(null);
    const title = this.title.trim();
    if (!title) {
      this.error.set('Title is required.');
      return;
    }
    if (!this.date || !this.startTime || !this.endTime) {
      this.error.set('Date and times are required.');
      return;
    }
    const startsAt = combineDateAndTime(this.date, this.startTime);
    const endsAt = combineDateAndTime(this.date, this.endTime);
    if (!(startsAt.getTime() < endsAt.getTime())) {
      this.error.set('End time must be after start time.');
      return;
    }
    if (this.date < PROGRAM_START || this.date > PROGRAM_END) {
      this.error.set('Date must be within 10–15 August 2026.');
      return;
    }
    this.ref.close({
      action: 'save',
      title,
      startsAt,
      endsAt,
      category: this.category,
      location: this.location.trim(),
    });
  }

  remove(): void {
    this.ref.close({ action: 'delete' });
  }
}

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeInput(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function combineDateAndTime(dateYmd: string, hhmm: string): Date {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}
