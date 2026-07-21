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
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bedOutline, carOutline, peopleOutline } from 'ionicons/icons';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { LodgingService } from '../room-management/services/lodging.service';
import { RegistrationsService } from '../participants/registrations.service';

addIcons({ carOutline, peopleOutline, bedOutline });

@Component({
  selector: 'app-camp-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonBadge,
    IonButton,
    IonIcon,
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
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="app-page">
        <div class="page-inner app-fade-in">
          <p class="page-eyebrow">Overview</p>
          <h1 class="app-brand">{{ campName() }}</h1>
          <ion-badge color="primary" class="status-badge">{{ campStatus() }}</ion-badge>

          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else {
            <div class="feature-grid">
              <section class="feature-card">
                <header class="feature-card__head">
                  <ion-icon name="car-outline" aria-hidden="true" />
                  <h2>Transportation</h2>
                </header>
                <div class="stats-grid">
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ transport().drivers }}</div>
                    <div class="stat-tile__label">Drivers</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ transport().passengers }}</div>
                    <div class="stat-tile__label">Passengers</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ transport().unassigned }}</div>
                    <div class="stat-tile__label">Unassigned</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ transport().remainingSeats }}</div>
                    <div class="stat-tile__label">Seats left</div>
                  </div>
                </div>
                <p class="hint">{{ transport().totalSeats }} total seats across all drivers</p>
                <ion-button expand="block" class="cta" [routerLink]="transportationLink()">
                  Open transportation planner
                </ion-button>
              </section>

              <section class="feature-card">
                <header class="feature-card__head">
                  <ion-icon name="people-outline" aria-hidden="true" />
                  <h2>Participants</h2>
                </header>
                <div class="stats-grid">
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ participants().total }}</div>
                    <div class="stat-tile__label">Total</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ transport().drivers }}</div>
                    <div class="stat-tile__label">Drivers</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ transport().passengers }}</div>
                    <div class="stat-tile__label">Passengers</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ participants().couples }}</div>
                    <div class="stat-tile__label">Couples</div>
                  </div>
                </div>
                <p class="hint">Search, filter, and add people for this camp</p>
                <ion-button expand="block" class="cta" [routerLink]="participantsLink()">
                  Open participants
                </ion-button>
              </section>

              <section class="feature-card">
                <header class="feature-card__head">
                  <ion-icon name="bed-outline" aria-hidden="true" />
                  <h2>Room management</h2>
                </header>
                <div class="stats-grid">
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ lodging().buildings }}</div>
                    <div class="stat-tile__label">Cabins</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ lodging().rooms }}</div>
                    <div class="stat-tile__label">Rooms</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">
                      {{ lodging().occupied }}/{{ lodging().capacity }}
                    </div>
                    <div class="stat-tile__label">Beds filled</div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-tile__value">{{ lodging().unassigned }}</div>
                    <div class="stat-tile__label">Unhoused</div>
                  </div>
                </div>
                <p class="hint">Assign people to cabins and rooms by drag and drop</p>
                <ion-button expand="block" class="cta" [routerLink]="roomsLink()">
                  Open room management
                </ion-button>
              </section>
            </div>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content {
      --background: transparent;
    }

    .page-inner {
      width: 100%;
      max-width: 960px;
      margin: 0;
      padding: 1.25rem 1.25rem 2.5rem;
      text-align: left;
    }

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .status-badge {
      margin-top: 0.65rem;
      text-transform: capitalize;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      margin-top: 1.25rem;
    }

    @media (min-width: 720px) {
      .feature-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .feature-card {
      background: var(--ctp-surface);
      border: 1px solid var(--ctp-border);
      border-radius: var(--ctp-radius);
      box-shadow: var(--ctp-shadow);
      padding: 1.25rem 1.35rem;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .feature-card__head {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      margin-bottom: 0.85rem;
    }

    .feature-card__head ion-icon {
      font-size: 1.35rem;
      color: var(--ctp-accent);
    }

    .feature-card__head h2 {
      margin: 0;
      font-family: var(--ctp-font-display);
      font-size: 1.2rem;
      font-weight: 600;
    }

    .hint {
      color: var(--ctp-text-muted);
      font-size: 0.9rem;
      margin: 0.85rem 0 0;
      flex: 1;
    }

    .cta {
      margin-top: 1rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }
  `,
})
export class CampDashboardPage implements OnInit {
  private readonly campContext = inject(CampContextService);
  private readonly registrations = inject(RegistrationsService);
  private readonly lodgingService = inject(LodgingService);

  readonly loading = signal(true);
  readonly transport = signal({
    drivers: 0,
    passengers: 0,
    unassigned: 0,
    totalSeats: 0,
    remainingSeats: 0,
  });
  readonly participants = signal({ total: 0, couples: 0 });
  readonly lodging = signal({
    buildings: 0,
    rooms: 0,
    capacity: 0,
    occupied: 0,
    unassigned: 0,
  });

  readonly campName = computed(() => this.campContext.currentCamp()?.name ?? 'Camp');
  readonly campStatus = computed(() => this.campContext.currentCamp()?.status ?? 'draft');

  ngOnInit(): void {
    void this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.loading.set(true);
    try {
      const campId = this.campContext.campId();
      if (!campId) {
        return;
      }
      const [transport, list, lodging] = await Promise.all([
        this.registrations.stats(campId),
        this.registrations.listForCamp(campId),
        this.lodgingService.stats(campId),
      ]);
      this.transport.set(transport);
      const coupled = list.filter((r) => !!r.partner_registration_id).length;
      this.participants.set({
        total: list.length,
        couples: Math.floor(coupled / 2),
      });
      this.lodging.set(lodging);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.loadStats();
    (event.target as HTMLIonRefresherElement).complete();
  }

  private campBase(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id] : ['/dashboard'];
  }

  transportationLink(): string[] {
    return [...this.campBase(), 'transportation'];
  }

  participantsLink(): string[] {
    return [...this.campBase(), 'participants'];
  }

  roomsLink(): string[] {
    return [...this.campBase(), 'rooms'];
  }
}
