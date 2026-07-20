import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonMenuButton,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, personOutline, refreshOutline, searchOutline } from 'ionicons/icons';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { Registration } from '../../core/supabase/database.types';
import { RegistrationsService } from './registrations.service';

addIcons({ createOutline, personOutline, refreshOutline, searchOutline });

@Component({
  selector: 'app-participants-page',
  standalone: true,
  imports: [
    FormsModule,
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
    IonInput,
    IonSelect,
    IonSelectOption,
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
        <ion-title>Participants</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="reload()">
            <ion-icon slot="icon-only" name="refresh-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="app-page">
        <div class="app-page-inner app-fade-in">
          <p class="page-eyebrow">People</p>
          <h1 class="app-brand">Participants</h1>
          <p class="app-brand-sub">{{ filtered().length }} shown · {{ registrations().length }} total</p>

          <div class="actions">
            <ion-button expand="block" [routerLink]="registrationLink()">
              <ion-icon slot="start" name="create-outline" />
              Register for transport
            </ion-button>
            <ion-button expand="block" fill="outline" [routerLink]="myRegistrationLink()">
              <ion-icon slot="start" name="person-outline" />
              My registration
            </ion-button>
          </div>

          <div class="filters app-panel">
            <ion-input
              label="Search"
              labelPlacement="stacked"
              [(ngModel)]="search"
              name="search"
              placeholder="Name or location"
              (ionInput)="onSearch($event)"
            />
            <ion-select
              label="Role"
              labelPlacement="stacked"
              [(ngModel)]="roleFilter"
              name="roleFilter"
              interface="popover"
              (ionChange)="onRoleChange()"
            >
              <ion-select-option value="ALL">All roles</ion-select-option>
              <ion-select-option value="DRIVER">Drivers</ion-select-option>
              <ion-select-option value="PASSENGER">Passengers</ion-select-option>
            </ion-select>
          </div>

          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else if (error()) {
            <ion-note color="danger">{{ error() }}</ion-note>
          } @else {
            <div class="roster">
              @for (reg of filtered(); track reg.id) {
                <article class="roster-row">
                  <div class="roster-row__main">
                    <h3>{{ reg.display_name }}</h3>
                    <p>Departure: {{ reg.departure_location || '—' }}</p>
                    @if (reg.transport_role === 'PASSENGER') {
                      <p>Driver: {{ driverName(reg) }}</p>
                    }
                  </div>
                  <ion-badge [color]="roleColor(reg.transport_role)">
                    {{ reg.transport_role }}
                  </ion-badge>
                </article>
              } @empty {
                <p class="empty">No registrations match your filters</p>
              }
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

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .actions {
      display: grid;
      gap: 0.55rem;
      margin: 1rem 0;
    }

    .actions ion-button {
      --border-radius: 12px;
      min-height: 46px;
      font-weight: 600;
      margin: 0;
    }

    .filters {
      display: grid;
      gap: 0.65rem;
      margin-bottom: 1rem;
    }

    .filters ion-input,
    .filters ion-select {
      --background: var(--ctp-surface-2);
      --padding-start: 10px;
      --padding-end: 10px;
      border-radius: 10px;
    }

    .roster-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.9rem 0;
      border-bottom: 1px solid var(--ctp-border);
    }

    .roster-row h3 {
      margin: 0 0 0.25rem;
      font-size: 1.05rem;
      font-weight: 600;
    }

    .roster-row p {
      margin: 0.1rem 0 0;
      color: var(--ctp-text-muted);
      font-size: 0.9rem;
    }

    .empty {
      color: var(--ctp-text-muted);
      text-align: center;
      padding: 1.5rem 0;
    }
  `,
})
export class ParticipantsPage implements OnInit {
  private readonly campContext = inject(CampContextService);
  private readonly registrationsService = inject(RegistrationsService);
  private readonly permissions = inject(PermissionService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly registrations = signal<Registration[]>([]);
  readonly filterTick = signal(0);
  readonly isOrganizer = computed(() => this.permissions.isOrganizer());

  search = '';
  roleFilter: 'ALL' | 'DRIVER' | 'PASSENGER' = 'ALL';

  readonly filtered = computed(() => {
    this.filterTick();
    const q = this.search.trim().toLowerCase();
    return this.registrations().filter((r) => {
      if (this.roleFilter !== 'ALL' && r.transport_role !== this.roleFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        r.display_name.toLowerCase().includes(q) ||
        (r.departure_location ?? '').toLowerCase().includes(q)
      );
    });
  });

  private driverById = new Map<string, Registration>();

  ngOnInit(): void {
    void this.load();
  }

  onSearch(_event: Event): void {
    this.filterTick.update((n) => n + 1);
  }

  onRoleChange(): void {
    this.filterTick.update((n) => n + 1);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const campId = this.campContext.requireCampId();
      const list = await this.registrationsService.listForCamp(campId);
      this.driverById = new Map(
        list.filter((r) => r.transport_role === 'DRIVER').map((d) => [d.id, d]),
      );
      this.registrations.set(list);
      this.filterTick.update((n) => n + 1);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load participants');
    } finally {
      this.loading.set(false);
    }
  }

  async reload(): Promise<void> {
    await this.load();
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  driverName(reg: Registration): string {
    if (!reg.assigned_driver_registration_id) {
      return 'Unassigned';
    }
    return this.driverById.get(reg.assigned_driver_registration_id)?.display_name ?? 'Unknown';
  }

  roleColor(role: string): string {
    return role === 'DRIVER' ? 'secondary' : 'primary';
  }

  registrationLink(): string[] {
    return [...this.campBase(), 'registration'];
  }

  myRegistrationLink(): string[] {
    return [...this.campBase(), 'me'];
  }

  private campBase(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id] : ['/dashboard'];
  }
}
