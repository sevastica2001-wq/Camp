import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
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
import { carOutline, personOutline } from 'ionicons/icons';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { Registration } from '../../core/supabase/database.types';
import { RegistrationsService } from '../participants/registrations.service';

addIcons({ carOutline, personOutline });

@Component({
  selector: 'app-driver-portal-page',
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
        <ion-title>Driver portal</ion-title>
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
            <p class="page-eyebrow">Driver</p>
            <h1 class="app-brand">Not a driver yet</h1>
            <p class="app-brand-sub">Register as a driver to see your passengers here.</p>
            <ion-button expand="block" class="cta" [routerLink]="registrationLink()">
              Register as driver
            </ion-button>
          } @else if (myRegistration()!.transport_role !== 'DRIVER') {
            <p class="page-eyebrow">Driver</p>
            <h1 class="app-brand">Wrong role</h1>
            <ion-note color="warning">
              Your registration role is {{ myRegistration()!.transport_role }}.
            </ion-note>
            <ion-button expand="block" class="cta" [routerLink]="registrationLink()">
              Edit registration
            </ion-button>
          } @else {
            <p class="page-eyebrow">Driver</p>
            <h1 class="app-brand">Your ride</h1>
            <p class="app-brand-sub">{{ vehicleLabel() }}</p>

            <section class="app-panel">
              <h2 class="app-section-title">
                <ion-icon name="car-outline" />
                Vehicle
              </h2>
              <div class="detail">
                <span class="detail__label">License plate</span>
                <span class="detail__value">{{ myRegistration()!.license_plate || '—' }}</span>
              </div>
              <div class="detail">
                <span class="detail__label">Available seats</span>
                <span class="detail__value">{{ myRegistration()!.available_seats }}</span>
              </div>
              <div class="detail">
                <span class="detail__label">Departure</span>
                <span class="detail__value">{{ myRegistration()!.departure_location || '—' }}</span>
              </div>
            </section>

            <section class="app-panel">
              <h2 class="app-section-title">Passengers ({{ passengers().length }})</h2>
              @for (p of passengers(); track p.id) {
                <div class="passenger-row">
                  <ion-icon name="person-outline" />
                  <div>
                    <p class="passenger-row__name">{{ p.display_name }}</p>
                    <p class="passenger-row__meta">{{ p.phone || 'No phone' }}</p>
                    <p class="passenger-row__meta">Departure: {{ p.departure_location || '—' }}</p>
                  </div>
                </div>
              } @empty {
                <p class="empty">No passengers assigned yet</p>
              }
            </section>

            <ion-button expand="block" fill="outline" class="cta" [routerLink]="registrationLink()">
              Edit my registration
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

    .app-panel + .app-panel {
      margin-top: 0.85rem;
    }

    .app-section-title ion-icon {
      vertical-align: -2px;
      margin-right: 0.3rem;
      color: var(--ctp-accent);
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
    }

    .passenger-row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--ctp-border);
    }

    .passenger-row:last-child {
      border-bottom: none;
    }

    .passenger-row ion-icon {
      color: var(--ctp-accent);
      margin-top: 0.2rem;
    }

    .passenger-row__name {
      margin: 0;
      font-weight: 600;
    }

    .passenger-row__meta {
      margin: 0.15rem 0 0;
      color: var(--ctp-text-muted);
      font-size: 0.9rem;
    }

    .empty {
      color: var(--ctp-text-muted);
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
export class DriverPortalPage implements OnInit {
  private readonly campContext = inject(CampContextService);
  private readonly registrationsService = inject(RegistrationsService);

  readonly loading = signal(true);
  readonly myRegistration = signal<Registration | null>(null);
  readonly passengers = signal<Registration[]>([]);

  readonly vehicleLabel = computed(() => {
    const reg = this.myRegistration();
    if (!reg) {
      return '';
    }
    const parts = [reg.car_color, reg.car_model].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Vehicle details not set';
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const campId = this.campContext.requireCampId();
      const mine = await this.registrationsService.getMine(campId);
      this.myRegistration.set(mine);

      if (mine?.transport_role === 'DRIVER') {
        const all = await this.registrationsService.listForCamp(campId);
        this.passengers.set(
          all.filter(
            (r) =>
              r.transport_role === 'PASSENGER' &&
              r.assigned_driver_registration_id === mine.id,
          ),
        );
      } else {
        this.passengers.set([]);
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
