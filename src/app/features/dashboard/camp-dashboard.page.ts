import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { RegistrationsService } from '../participants/registrations.service';

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
        <div class="app-page-inner app-fade-in">
          <p class="page-eyebrow">Overview</p>
          <h1 class="app-brand">{{ campName() }}</h1>
          <ion-badge color="primary" class="status-badge">{{ campStatus() }}</ion-badge>

          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else {
            <section class="app-panel ion-margin-top">
              <h2 class="app-section-title">Transportation</h2>
              <div class="stats-grid">
                <div class="stat-tile">
                  <div class="stat-tile__value">{{ stats().drivers }}</div>
                  <div class="stat-tile__label">Drivers</div>
                </div>
                <div class="stat-tile">
                  <div class="stat-tile__value">{{ stats().passengers }}</div>
                  <div class="stat-tile__label">Passengers</div>
                </div>
                <div class="stat-tile">
                  <div class="stat-tile__value">{{ stats().unassigned }}</div>
                  <div class="stat-tile__label">Unassigned</div>
                </div>
                <div class="stat-tile">
                  <div class="stat-tile__value">{{ stats().remainingSeats }}</div>
                  <div class="stat-tile__label">Seats left</div>
                </div>
              </div>
              <p class="hint">{{ stats().totalSeats }} total seats across all drivers</p>
              <ion-button expand="block" class="cta" [routerLink]="transportationLink()">
                Open transportation planner
              </ion-button>
            </section>
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

    .status-badge {
      margin-top: 0.65rem;
      text-transform: capitalize;
    }

    .hint {
      color: var(--ctp-text-muted);
      font-size: 0.9rem;
      margin: 0.85rem 0 0;
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

  readonly loading = signal(true);
  readonly stats = signal({
    drivers: 0,
    passengers: 0,
    unassigned: 0,
    totalSeats: 0,
    remainingSeats: 0,
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
      if (campId) {
        this.stats.set(await this.registrations.stats(campId));
      }
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.loadStats();
    (event.target as HTMLIonRefresherElement).complete();
  }

  transportationLink(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id, 'transportation'] : ['/dashboard'];
  }
}
