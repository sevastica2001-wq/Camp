import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonMenuButton,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { TransportRole } from '../../core/supabase/database.types';
import { RegistrationsService } from './registrations.service';

addIcons({ saveOutline });

const DEFAULT_LOCATION = 'Bucuresti';

@Component({
  selector: 'app-registration-form-page',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonIcon,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
          <ion-back-button [defaultHref]="participantsLink()" />
        </ion-buttons>
        <ion-title>Registration</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="app-page">
        <div class="app-page-inner app-page-inner--narrow app-fade-in">
          <p class="page-eyebrow">Transport</p>
          <h1 class="app-brand">Your registration</h1>
          <p class="app-brand-sub">Tell us your role and travel details for this camp.</p>

          @if (!canEdit()) {
            <ion-note color="warning">
              Registration is read-only while the camp is not accepting edits.
            </ion-note>
          }

          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else {
            <form (ngSubmit)="save()">
              <section class="app-panel">
                <h2 class="app-section-title">Basics</h2>
                <ion-list lines="none" class="form-fields">
                  <ion-item>
                    <ion-input
                      label="Display name"
                      labelPlacement="stacked"
                      [(ngModel)]="form.display_name"
                      name="display_name"
                      [readonly]="!canEdit()"
                      required
                    />
                  </ion-item>
                  <ion-item>
                    <ion-select
                      label="Transport role"
                      labelPlacement="stacked"
                      [(ngModel)]="form.transport_role"
                      name="transport_role"
                      [disabled]="!canEdit()"
                    >
                      <ion-select-option value="PASSENGER">Passenger</ion-select-option>
                      <ion-select-option value="DRIVER">Driver</ion-select-option>
                    </ion-select>
                  </ion-item>
                  <ion-item>
                    <ion-input
                      label="Departure location"
                      labelPlacement="stacked"
                      [(ngModel)]="form.departure_location"
                      name="departure_location"
                      [readonly]="!canEdit()"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      label="Return location"
                      labelPlacement="stacked"
                      [(ngModel)]="form.return_location"
                      name="return_location"
                      [readonly]="!canEdit()"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-textarea
                      label="Notes"
                      labelPlacement="stacked"
                      [(ngModel)]="form.notes"
                      name="notes"
                      [readonly]="!canEdit()"
                      autoGrow="true"
                    />
                  </ion-item>
                </ion-list>
              </section>

              @if (form.transport_role === 'DRIVER') {
                <section class="app-panel">
                  <h2 class="app-section-title">Vehicle</h2>
                  <ion-list lines="none" class="form-fields">
                    <ion-item>
                      <ion-input
                        label="Available seats"
                        labelPlacement="stacked"
                        type="number"
                        min="0"
                        [(ngModel)]="form.available_seats"
                        name="available_seats"
                        [readonly]="!canEdit()"
                      />
                    </ion-item>
                    <ion-item>
                      <ion-input
                        label="Car model"
                        labelPlacement="stacked"
                        [(ngModel)]="form.car_model"
                        name="car_model"
                        [readonly]="!canEdit()"
                      />
                    </ion-item>
                    <ion-item>
                      <ion-input
                        label="Car color"
                        labelPlacement="stacked"
                        [(ngModel)]="form.car_color"
                        name="car_color"
                        [readonly]="!canEdit()"
                      />
                    </ion-item>
                    <ion-item>
                      <ion-input
                        label="License plate"
                        labelPlacement="stacked"
                        [(ngModel)]="form.license_plate"
                        name="license_plate"
                        [readonly]="!canEdit()"
                      />
                    </ion-item>
                  </ion-list>
                </section>
              }

              @if (saveError()) {
                <ion-note color="danger">{{ saveError() }}</ion-note>
              }

              @if (canEdit()) {
                <ion-button expand="block" type="submit" class="cta" [disabled]="saving()">
                  @if (saving()) {
                    <ion-spinner name="crescent" />
                  } @else {
                    <ion-icon slot="start" name="save-outline" />
                    Save registration
                  }
                </ion-button>
              }
            </form>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content {
      --background: transparent;
    }

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .app-panel + .app-panel {
      margin-top: 0.85rem;
    }

    .form-fields {
      background: transparent;
    }

    .form-fields ion-item {
      --background: var(--ctp-surface-2);
      --border-radius: 12px;
      margin-bottom: 0.55rem;
    }

    .cta {
      margin-top: 1.15rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }
  `,
})
export class RegistrationFormPage implements OnInit {
  private readonly registrationsService = inject(RegistrationsService);
  private readonly campContext = inject(CampContextService);
  private readonly permissions = inject(PermissionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly canEdit = computed(
    () => this.permissions.canEditOwnRegistration() || this.permissions.isOrganizer(),
  );

  form = {
    display_name: '',
    transport_role: 'PASSENGER' as TransportRole,
    departure_location: DEFAULT_LOCATION,
    return_location: DEFAULT_LOCATION,
    notes: '',
    available_seats: 4,
    car_model: '',
    car_color: '',
    license_plate: '',
  };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const existing = await this.registrationsService.getMine();
      if (existing) {
        this.form = {
          display_name: existing.display_name,
          transport_role: existing.transport_role,
          departure_location: existing.departure_location || DEFAULT_LOCATION,
          return_location: existing.return_location || DEFAULT_LOCATION,
          notes: existing.notes ?? '',
          available_seats: existing.available_seats || 4,
          car_model: existing.car_model,
          car_color: existing.car_color,
          license_plate: existing.license_plate,
        };
      } else {
        const profile = this.auth.profile();
        const name = profile
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : '';
        this.form.display_name = name;
      }
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (!this.canEdit()) {
      return;
    }
    this.saveError.set(null);
    this.saving.set(true);
    try {
      await this.registrationsService.upsertMine({
        display_name: this.form.display_name.trim(),
        transport_role: this.form.transport_role,
        departure_location: this.form.departure_location.trim(),
        return_location: this.form.return_location.trim(),
        notes: this.form.notes.trim() || undefined,
        available_seats:
          this.form.transport_role === 'DRIVER' ? Number(this.form.available_seats) : 0,
        car_model: this.form.transport_role === 'DRIVER' ? this.form.car_model.trim() : '',
        car_color: this.form.transport_role === 'DRIVER' ? this.form.car_color.trim() : '',
        license_plate:
          this.form.transport_role === 'DRIVER' ? this.form.license_plate.trim() : '',
      });
      await this.router.navigate([...this.campBase(), 'me']);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  participantsLink(): string {
    const id = this.campContext.campId();
    return id ? `/camp/${id}/participants` : '/dashboard';
  }

  private campBase(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id] : ['/dashboard'];
  }
}
