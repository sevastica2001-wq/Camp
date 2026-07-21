import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import {
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
import { addOutline, createOutline, refreshOutline, searchOutline } from 'ionicons/icons';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { Registration } from '../../core/supabase/database.types';
import {
  AddParticipantDialog,
  AddParticipantFormResult,
} from './add-participant.dialog';
import { RegistrationsService } from './registrations.service';

addIcons({ addOutline, createOutline, refreshOutline, searchOutline });

@Component({
  selector: 'app-participants-page',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonIcon,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
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
        <div class="page-inner app-fade-in">
          <header class="page-head">
            <div>
              <p class="page-eyebrow">People</p>
              <h1 class="app-brand">Participants</h1>
              <p class="app-brand-sub">
                {{ filtered().length }} shown · {{ registrations().length }} total
              </p>
            </div>
            <ion-button class="add-btn" (click)="openAdd()">
              <ion-icon slot="start" name="add-outline" />
              Add participant
            </ion-button>
          </header>

          <div class="toolbar">
            <ion-input
              class="search"
              label="Search by name"
              labelPlacement="stacked"
              [(ngModel)]="search"
              name="search"
              placeholder="Type a name…"
              (ionInput)="onSearch()"
            >
              <ion-icon slot="start" name="search-outline" aria-hidden="true" />
            </ion-input>
            <ion-select
              class="role"
              label="Role"
              labelPlacement="stacked"
              [(ngModel)]="roleFilter"
              name="roleFilter"
              interface="popover"
              (ionChange)="onRoleChange()"
            >
              <ion-select-option value="ALL">All</ion-select-option>
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
            <div class="table-wrap">
              <table class="participants-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th class="col-center">Gender</th>
                    <th class="col-center">Driver</th>
                    <th class="col-center">Place of departure</th>
                    <th class="col-center">Place after camp</th>
                    <th>Notes</th>
                    <th class="col-center col-actions">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  @for (reg of filtered(); track reg.id) {
                    <tr>
                      <td class="name-cell">
                        {{ reg.display_name }}
                        @if (reg.partner_registration_id) {
                          <span class="couple-tag">Couple</span>
                        }
                      </td>
                      <td class="col-center">{{ genderLabel(reg.gender) }}</td>
                      <td class="col-center">
                        @if (reg.transport_role === 'DRIVER') {
                          <span class="driver-chip">
                            Driver
                            <span class="driver-chip__seats"
                              >· {{ reg.available_seats }} seats</span
                            >
                          </span>
                        } @else {
                          {{ driverName(reg) }}
                        }
                      </td>
                      <td class="col-center">{{ cellOrDash(reg.departure_location) }}</td>
                      <td class="col-center">{{ cellOrDash(reg.return_location) }}</td>
                      <td class="notes-cell">{{ cellOrDash(reg.notes) }}</td>
                      <td class="col-center col-actions">
                        <button
                          type="button"
                          class="edit-btn"
                          title="Edit participant"
                          aria-label="Edit {{ reg.display_name }}"
                          (click)="openEdit(reg)"
                        >
                          <ion-icon name="create-outline" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="empty">No participants match your filters</td>
                    </tr>
                  }
                </tbody>
              </table>
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
      max-width: none;
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

    .page-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .add-btn {
      --border-radius: 12px;
      min-height: 44px;
      font-weight: 600;
      margin: 0;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .toolbar .search {
      flex: 1 1 240px;
      max-width: 360px;
      --background: var(--ctp-surface);
      --padding-start: 10px;
      --padding-end: 10px;
      border: 1px solid var(--ctp-border);
      border-radius: 10px;
    }

    .toolbar .role {
      flex: 0 0 160px;
      --background: var(--ctp-surface);
      --padding-start: 10px;
      --padding-end: 10px;
      border: 1px solid var(--ctp-border);
      border-radius: 10px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--ctp-border);
      border-radius: var(--ctp-radius);
      background: var(--ctp-surface);
      box-shadow: var(--ctp-shadow);
    }

    .participants-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.92rem;
    }

    .participants-table th {
      padding: 0.75rem 1rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ctp-text-muted);
      border-bottom: 1px solid var(--ctp-border);
      background: var(--ctp-surface-2);
      white-space: nowrap;
    }

    .participants-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--ctp-border);
      vertical-align: middle;
      color: var(--ctp-text);
    }

    .participants-table tbody tr:last-child td {
      border-bottom: none;
    }

    .participants-table tbody tr:hover td {
      background: color-mix(in srgb, var(--ctp-surface-2) 65%, transparent);
    }

    .name-cell {
      font-weight: 600;
      white-space: nowrap;
    }

    .couple-tag {
      margin-left: 0.4rem;
      display: inline-block;
      padding: 0.12rem 0.4rem;
      border-radius: 6px;
      background: var(--ctp-accent-soft);
      color: var(--ctp-accent);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      vertical-align: middle;
    }

    .col-center {
      text-align: center;
    }

    .notes-cell {
      max-width: 280px;
      color: var(--ctp-text-muted);
      word-break: break-word;
    }

    .col-actions {
      width: 4rem;
      white-space: nowrap;
    }

    .edit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border: 1px solid var(--ctp-border);
      border-radius: 8px;
      background: var(--ctp-surface-2);
      color: var(--ctp-text-muted);
      cursor: pointer;
      transition:
        color 0.15s ease,
        border-color 0.15s ease,
        background 0.15s ease;
    }

    .edit-btn:hover {
      color: var(--ctp-accent);
      border-color: var(--ctp-accent);
      background: var(--ctp-accent-soft);
    }

    .edit-btn ion-icon {
      font-size: 1.15rem;
    }

    .driver-chip {
      display: inline-flex;
      align-items: baseline;
      gap: 0.25rem;
      padding: 0.28rem 0.55rem;
      border-radius: 8px;
      border: 1px solid var(--ctp-accent);
      background: var(--ctp-accent-soft);
      color: var(--ctp-accent);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .driver-chip__seats {
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      color: var(--ctp-text);
      opacity: 0.85;
    }

    .empty {
      text-align: left;
      color: var(--ctp-text-muted);
      padding: 1.5rem 1rem !important;
    }
  `,
})
export class ParticipantsPage implements OnInit {
  private readonly campContext = inject(CampContextService);
  private readonly registrationsService = inject(RegistrationsService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly registrations = signal<Registration[]>([]);
  readonly filterTick = signal(0);

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
      return r.display_name.toLowerCase().includes(q);
    });
  });

  private driverById = new Map<string, Registration>();

  ngOnInit(): void {
    void this.load();
  }

  onSearch(): void {
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

  openAdd(): void {
    const drivers = this.registrations().filter((r) => r.transport_role === 'DRIVER');
    const ref = this.dialog.open(AddParticipantDialog, {
      width: '480px',
      data: { mode: 'add', drivers, people: this.registrations() },
    });
    ref.afterClosed().subscribe((result: AddParticipantFormResult | undefined) => {
      if (result) {
        void this.createParticipant(result);
      }
    });
  }

  openEdit(reg: Registration): void {
    const drivers = this.registrations().filter((r) => r.transport_role === 'DRIVER');
    const ref = this.dialog.open(AddParticipantDialog, {
      width: '480px',
      data: {
        mode: 'edit',
        registration: reg,
        drivers,
        people: this.registrations(),
      },
    });
    ref.afterClosed().subscribe((result: AddParticipantFormResult | undefined) => {
      if (result?.id) {
        void this.updateParticipant(result);
      }
    });
  }

  private async createParticipant(form: AddParticipantFormResult): Promise<void> {
    this.error.set(null);
    try {
      const created = await this.registrationsService.createManual({
        display_name: form.display_name,
        transport_role: form.transport_role,
        available_seats: form.available_seats ?? 0,
        departure_location: form.departure_location,
        return_location: form.return_location,
        notes: form.notes,
        gender: form.gender,
      });
      if (
        form.transport_role === 'PASSENGER' &&
        form.assigned_driver_registration_id
      ) {
        await this.registrationsService.assignPassenger(
          created.id,
          form.assigned_driver_registration_id,
        );
      }
      if (form.partner_registration_id) {
        await this.registrationsService.linkPartners(
          created.id,
          form.partner_registration_id,
        );
      }
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to add participant');
    }
  }

  private async updateParticipant(form: AddParticipantFormResult): Promise<void> {
    if (!form.id) {
      return;
    }
    this.error.set(null);
    try {
      await this.registrationsService.update(form.id, {
        display_name: form.display_name,
        transport_role: form.transport_role,
        available_seats: form.available_seats ?? 0,
        departure_location: form.departure_location ?? '',
        return_location: form.return_location ?? '',
        notes: form.notes ?? null,
        gender: form.gender,
        assigned_driver_registration_id:
          form.transport_role === 'DRIVER'
            ? null
            : (form.assigned_driver_registration_id ?? null),
      });
      await this.registrationsService.linkPartners(
        form.id,
        form.partner_registration_id ?? null,
      );
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update participant');
    }
  }

  driverName(reg: Registration): string {
    if (!reg.assigned_driver_registration_id) {
      return '—';
    }
    return this.driverById.get(reg.assigned_driver_registration_id)?.display_name ?? '—';
  }

  genderLabel(gender: Registration['gender'] | undefined): string {
    switch (gender) {
      case 'male':
        return 'Male';
      case 'female':
        return 'Female';
      default:
        return '—';
    }
  }

  cellOrDash(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : '—';
  }
}
