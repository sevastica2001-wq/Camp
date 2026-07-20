import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { Registration } from '../../core/supabase/database.types';
import { RegistrationsService } from '../participants/registrations.service';

addIcons({ createOutline });

@Component({
  selector: 'app-participant-portal-page',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonIcon,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonBadge,
    IonButton,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>My registration</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="app-page">
        <div class="app-page-inner app-page-inner--narrow app-fade-in">
          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else if (!myRegistration()) {
            <p class="page-eyebrow">Participant</p>
            <h1 class="app-brand">Not registered yet</h1>
            <p class="app-brand-sub">Tell us how you’re getting to camp.</p>
            <ion-button expand="block" class="cta" [routerLink]="registrationLink()">
              <ion-icon slot="start" name="create-outline" />
              Register now
            </ion-button>
          } @else {
            <p class="page-eyebrow">Participant</p>
            <h1 class="app-brand">{{ myRegistration()!.display_name }}</h1>
            <div class="badge-row">
              <ion-badge [color]="roleColor()">{{ myRegistration()!.transport_role }}</ion-badge>
              <ion-badge color="medium">{{ myRegistration()!.attendance_status }}</ion-badge>
            </div>

            <section class="app-panel">
              <h2 class="app-section-title">Your trip</h2>
              <div class="detail">
                <span class="detail__label">Departure</span>
                <span class="detail__value">{{ myRegistration()!.departure_location || '—' }}</span>
              </div>
              <div class="detail">
                <span class="detail__label">Return</span>
                <span class="detail__value">{{ myRegistration()!.return_location || '—' }}</span>
              </div>
              @if (myRegistration()!.notes) {
                <div class="detail">
                  <span class="detail__label">Notes</span>
                  <span class="detail__value">{{ myRegistration()!.notes }}</span>
                </div>
              }
            </section>

            @if (myRegistration()!.transport_role === 'PASSENGER') {
              <section class="app-panel">
                <h2 class="app-section-title">Assigned driver</h2>
                @if (assignedDriver()) {
                  <p class="driver-name">{{ assignedDriver()!.display_name }}</p>
                  <p class="detail__value muted">{{ assignedDriver()!.phone || 'No phone on file' }}</p>
                  <p class="detail__value muted">
                    Departure: {{ assignedDriver()!.departure_location || '—' }}
                  </p>
                } @else {
                  <ion-note color="warning">No driver assigned yet</ion-note>
                }
              </section>
            }

            <ion-button expand="block" class="cta" [routerLink]="registrationLink()">
              <ion-icon slot="start" name="create-outline" />
              Edit registration
            </ion-button>
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

    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin: 0.75rem 0 1.15rem;
    }

    .app-panel + .app-panel {
      margin-top: 0.85rem;
    }

    .detail {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.55rem 0;
      border-bottom: 1px solid var(--ctp-border);
    }

    .detail:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .detail__label {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ctp-text-muted);
      font-weight: 600;
    }

    .detail__value {
      font-size: 1.05rem;
      color: var(--ctp-text);
    }

    .detail__value.muted,
    .muted {
      color: var(--ctp-text-muted);
      font-size: 0.95rem;
      margin: 0.2rem 0 0;
    }

    .driver-name {
      font-family: var(--ctp-font-display);
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0;
    }

    .cta {
      margin-top: 1.15rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }
  `,
})
export class ParticipantPortalPage implements OnInit {
  private readonly campContext = inject(CampContextService);
  private readonly registrationsService = inject(RegistrationsService);

  readonly loading = signal(true);
  readonly myRegistration = signal<Registration | null>(null);
  readonly assignedDriver = signal<Registration | null>(null);

  readonly roleColor = computed(() =>
    this.myRegistration()?.transport_role === 'DRIVER' ? 'secondary' : 'primary',
  );

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const campId = this.campContext.requireCampId();
      const mine = await this.registrationsService.getMine(campId);
      this.myRegistration.set(mine);

      if (mine?.assigned_driver_registration_id) {
        const all = await this.registrationsService.listForCamp(campId);
        this.assignedDriver.set(
          all.find((r) => r.id === mine.assigned_driver_registration_id) ?? null,
        );
      } else {
        this.assignedDriver.set(null);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  registrationLink(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id, 'registration'] : ['/dashboard'];
  }
}
