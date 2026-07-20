import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Driver } from '../models/transport.models';

export interface DriverEditDialogData {
  driver: Driver;
}

@Component({
  selector: 'app-driver-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit driver</h2>
    <mat-dialog-content class="flex flex-col gap-3 pt-2">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="model.name" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Car model</mat-label>
        <input matInput [(ngModel)]="model.carModel" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Car color</mat-label>
        <input matInput [(ngModel)]="model.carColor" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Available seats</mat-label>
        <input matInput type="number" min="0" [(ngModel)]="model.availableSeats" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Departure</mat-label>
        <input matInput [(ngModel)]="model.departureLocation" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Place after camp</mat-label>
        <input matInput [(ngModel)]="model.returnLocation" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="3" [(ngModel)]="model.notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
})
export class DriverEditDialog {
  private readonly data = inject<DriverEditDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DriverEditDialog, Partial<Driver> | undefined>);

  model = {
    name: this.data.driver.name,
    carModel: this.data.driver.carModel,
    carColor: this.data.driver.carColor,
    availableSeats: this.data.driver.availableSeats,
    departureLocation: this.data.driver.departureLocation,
    returnLocation: this.data.driver.returnLocation,
    notes: this.data.driver.notes ?? '',
  };

  save(): void {
    this.ref.close({
      name: this.model.name.trim(),
      carModel: this.model.carModel.trim(),
      carColor: this.model.carColor.trim(),
      availableSeats: Number(this.model.availableSeats) || 0,
      departureLocation: this.model.departureLocation.trim(),
      returnLocation: this.model.returnLocation.trim(),
      notes: this.model.notes.trim() || undefined,
    });
  }
}
