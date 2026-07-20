import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AutoAssignResult } from '../services/auto-assign.service';

@Component({
  selector: 'app-auto-assign-summary-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Auto assign summary</h2>
    <mat-dialog-content class="space-y-3 pt-2">
      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-xl bg-[var(--ctp-success-soft)] p-3 text-center">
          <p class="text-2xl font-semibold text-[var(--ctp-success)]">{{ data.assignedCount }}</p>
          <p class="text-xs text-[var(--ctp-text-muted)]">Assigned</p>
        </div>
        <div class="rounded-xl bg-[var(--ctp-warning-soft)] p-3 text-center">
          <p class="text-2xl font-semibold text-[var(--ctp-warning)]">{{ data.skippedCount }}</p>
          <p class="text-xs text-[var(--ctp-text-muted)]">Skipped</p>
        </div>
        <div class="rounded-xl bg-[var(--ctp-surface-2)] p-3 text-center">
          <p class="text-2xl font-semibold">{{ data.remainingUnassigned }}</p>
          <p class="text-xs text-[var(--ctp-text-muted)]">Still unassigned</p>
        </div>
      </div>

      @if (data.assignments.length) {
        <div class="max-h-56 overflow-y-auto rounded-xl border border-[var(--ctp-border)]">
          <ul class="divide-y divide-[var(--ctp-border)]">
            @for (item of data.assignments; track $index) {
              <li class="px-3 py-2 text-sm">
                <span class="font-medium">{{ item.passengerName }}</span>
                <span class="text-[var(--ctp-text-muted)]"> → </span>
                {{ item.driverName }}
              </li>
            }
          </ul>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `,
})
export class AutoAssignSummaryDialog {
  readonly data = inject<AutoAssignResult>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<AutoAssignSummaryDialog>);
}
