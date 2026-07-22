import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
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
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  createOutline,
  optionsOutline,
  refreshOutline,
  searchOutline,
} from 'ionicons/icons';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { Registration } from '../../core/supabase/database.types';
import {
  AddParticipantDialog,
  AddParticipantFormResult,
} from './add-participant.dialog';
import {
  BatchEditParticipantsDialog,
  BatchEditParticipantsResult,
} from './batch-edit-participants.dialog';
import { MAX_ROOMMATE_LINK_SELECTION } from './roommate.constants';
import { RegistrationsService } from './registrations.service';

addIcons({ addOutline, createOutline, optionsOutline, refreshOutline, searchOutline });

@Component({
  selector: 'app-participants-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatMenuModule,
    IonHeader,
    IonIcon,
    IonToolbar,
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
                @if (selectedCount() > 0) {
                  <span> · {{ selectedCount() }} selected</span>
                }
              </p>
            </div>
            <div class="head-actions">
              <ion-button
                class="batch-btn"
                fill="outline"
                [disabled]="selectedCount() === 0"
                [matMenuTriggerFor]="batchMenu"
              >
                <ion-icon slot="start" name="options-outline" />
                Batch functions
              </ion-button>
              <mat-menu #batchMenu="matMenu">
                <button mat-menu-item type="button" (click)="openBatchEdit()">
                  Edit fields…
                </button>
                <button
                  mat-menu-item
                  type="button"
                  [disabled]="!canLinkRoommates()"
                  (click)="linkSelectedAsRoommates()"
                >
                  Link as roommates
                  @if (selectedCount() > maxLinkSelection) {
                    <span class="menu-hint"> · max {{ maxLinkSelection }} for this</span>
                  } @else if (selectedCount() === 1) {
                    <span class="menu-hint"> · select at least 2</span>
                  }
                </button>
              </mat-menu>
              <ion-button class="add-btn" (click)="openAdd()">
                <ion-icon slot="start" name="add-outline" />
                Add participant
              </ion-button>
            </div>
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
          } @else if (error() && registrations().length === 0) {
            <ion-note color="danger">{{ error() }}</ion-note>
          } @else {
            @if (error()) {
              <ion-note color="danger" class="batch-error">{{ error() }}</ion-note>
            }
            <div class="table-wrap">
              <table class="participants-table">
                <thead>
                  <tr>
                    <th class="col-check">
                      <input
                        type="checkbox"
                        class="row-check"
                        [checked]="allFilteredSelected()"
                        [indeterminate]="someFilteredSelected()"
                        [disabled]="filtered().length === 0"
                        aria-label="Select all shown participants"
                        (change)="toggleSelectAll($event)"
                      />
                    </th>
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
                    <tr [class.row-selected]="isSelected(reg.id)">
                      <td class="col-check">
                        <input
                          type="checkbox"
                          class="row-check"
                          [checked]="isSelected(reg.id)"
                          [attr.aria-label]="'Select ' + reg.display_name"
                          (change)="toggleSelected(reg.id, $event)"
                        />
                      </td>
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
                      <td colspan="8" class="empty">No participants match your filters</td>
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

    .head-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
    }

    .add-btn,
    .batch-btn {
      --border-radius: 12px;
      min-height: 44px;
      font-weight: 600;
      margin: 0;
    }

    .batch-btn {
      --border-width: 1px;
    }

    .menu-hint {
      color: var(--ctp-text-muted);
      font-size: 0.75rem;
    }

    .batch-error {
      display: block;
      margin-bottom: 0.75rem;
      white-space: pre-line;
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

    .col-check {
      width: 2.75rem;
      text-align: center;
      padding-left: 0.75rem !important;
      padding-right: 0.35rem !important;
    }

    .row-check {
      width: 1.05rem;
      height: 1.05rem;
      accent-color: var(--ctp-accent);
      cursor: pointer;
      vertical-align: middle;
    }

    .row-selected td {
      background: color-mix(in srgb, var(--ctp-accent-soft) 55%, transparent);
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
  readonly selectedIds = signal<Set<string>>(new Set());

  search = '';
  roleFilter: 'ALL' | 'DRIVER' | 'PASSENGER' = 'ALL';
  readonly maxLinkSelection = MAX_ROOMMATE_LINK_SELECTION;

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

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly allFilteredSelected = computed(() => {
    const rows = this.filtered();
    if (!rows.length) {
      return false;
    }
    const selected = this.selectedIds();
    return rows.every((r) => selected.has(r.id));
  });

  readonly someFilteredSelected = computed(() => {
    const rows = this.filtered();
    const selected = this.selectedIds();
    const n = rows.filter((r) => selected.has(r.id)).length;
    return n > 0 && n < rows.length;
  });

  readonly canLinkRoommates = computed(() => {
    const n = this.selectedCount();
    return n >= 2 && n <= MAX_ROOMMATE_LINK_SELECTION;
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

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelected(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.error.set(null);
    this.selectedIds.update((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const filteredIds = this.filtered().map((r) => r.id);
    this.error.set(null);
    this.selectedIds.update((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of filteredIds) {
          next.add(id);
        }
      } else {
        for (const id of filteredIds) {
          next.delete(id);
        }
      }
      return next;
    });
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
      const valid = new Set(list.map((r) => r.id));
      this.selectedIds.update((prev) => new Set([...prev].filter((id) => valid.has(id))));
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
      data: { mode: 'add', drivers, people: this.registrations(), roommateIds: [] },
    });
    ref.afterClosed().subscribe((result: AddParticipantFormResult | undefined) => {
      if (result) {
        void this.createParticipant(result);
      }
    });
  }

  openBatchEdit(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      return;
    }
    const drivers = this.registrations().filter((r) => r.transport_role === 'DRIVER');
    const ref = this.dialog.open(BatchEditParticipantsDialog, {
      width: '520px',
      data: {
        count: ids.length,
        selectedIds: ids,
        drivers,
        people: this.registrations(),
      },
    });
    ref.afterClosed().subscribe((result: BatchEditParticipantsResult | undefined) => {
      if (result) {
        void this.applyBatchEdit(ids, result);
      }
    });
  }

  linkSelectedAsRoommates(): void {
    void this.linkSelectedAsRoommatesAsync();
  }

  private async linkSelectedAsRoommatesAsync(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (ids.length < 2) {
      this.error.set('Select at least 2 people to link as roommates');
      return;
    }
    if (ids.length > MAX_ROOMMATE_LINK_SELECTION) {
      this.error.set(
        `Link as roommates is limited to ${MAX_ROOMMATE_LINK_SELECTION} selected people`,
      );
      return;
    }

    const campId = this.campContext.requireCampId();
    const byId = new Map(this.registrations().map((r) => [r.id, r]));
    const scoped = ids.filter((id) => byId.get(id)?.camp_id === campId);
    if (scoped.length !== ids.length) {
      this.error.set('All selected participants must belong to this camp');
      return;
    }

    // Expanded group = selected people + anyone they already list as a roommate
    const existingCounts = new Map<string, number>();
    const group = new Set(scoped);
    try {
      for (const id of scoped) {
        const current = await this.registrationsService.listRoommateIds(id);
        existingCounts.set(id, current.length);
        for (const rid of current) {
          group.add(rid);
        }
      }
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Failed to load existing roommates',
      );
      return;
    }

    if (group.size > MAX_ROOMMATE_LINK_SELECTION) {
      const withExisting = scoped
        .filter((id) => (existingCounts.get(id) ?? 0) > 0)
        .map((id) => {
          const n = existingCounts.get(id) ?? 0;
          const name = byId.get(id)?.display_name ?? id;
          return `${name} (already has ${n} roommate${n === 1 ? '' : 's'})`;
        });
      const details =
        withExisting.length > 0
          ? `\n\nParticipants who already have roommates:\n• ${withExisting.join('\n• ')}`
          : '';
      this.error.set(
        `The group is too big (${group.size} people including existing roommates; max is ${MAX_ROOMMATE_LINK_SELECTION}).${details}`,
      );
      return;
    }

    const names = scoped.map((id) => byId.get(id)!.display_name).join(', ');
    const ok = window.confirm(
      `Link these ${scoped.length} people as roommates?\n\n${names}\n\nEach will list the others as preferred roommates (replaces their current roommate list with this group). Links go both ways.`,
    );
    if (!ok) {
      return;
    }

    this.error.set(null);
    try {
      for (const id of scoped) {
        const others = scoped.filter((rid) => rid !== id);
        await this.registrationsService.setRoommates(id, others, campId);
      }
      this.selectedIds.set(new Set());
      await this.load();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Failed to link roommates',
      );
    }
  }

  openEdit(reg: Registration): void {
    void this.openEditAsync(reg);
  }

  private async openEditAsync(reg: Registration): Promise<void> {
    const drivers = this.registrations().filter((r) => r.transport_role === 'DRIVER');
    let roommateIds: string[] = [];
    try {
      roommateIds = await this.registrationsService.listRoommateIds(reg.id);
    } catch {
      roommateIds = [];
    }
    const ref = this.dialog.open(AddParticipantDialog, {
      width: '480px',
      data: {
        mode: 'edit',
        registration: reg,
        drivers,
        people: this.registrations(),
        roommateIds,
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
      await this.registrationsService.setRoommates(created.id, form.roommate_ids ?? []);
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
      await this.registrationsService.setRoommates(form.id, form.roommate_ids ?? []);
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update participant');
    }
  }

  private async applyBatchEdit(
    ids: string[],
    patch: BatchEditParticipantsResult,
  ): Promise<void> {
    this.error.set(null);
    try {
      const campId = this.campContext.requireCampId();
      const byId = new Map(this.registrations().map((r) => [r.id, r]));
      // Only apply to participants that belong to the active camp
      const scopedIds = ids.filter((id) => byId.get(id)?.camp_id === campId);
      if (!scopedIds.length) {
        throw new Error('No selected participants belong to this camp');
      }

      if (
        patch.transport_role === 'PASSENGER' &&
        patch.assigned_driver_registration_id
      ) {
        const driver = byId.get(patch.assigned_driver_registration_id);
        if (
          !driver ||
          driver.camp_id !== campId ||
          driver.transport_role !== 'DRIVER'
        ) {
          throw new Error('Assigned driver must belong to this camp');
        }
      }

      if (patch.partner_registration_id) {
        const partner = byId.get(patch.partner_registration_id);
        if (!partner || partner.camp_id !== campId) {
          throw new Error('Partner must belong to this camp');
        }
      }

      if (patch.roommate_ids?.length) {
        for (const rid of patch.roommate_ids) {
          const roommate = byId.get(rid);
          if (!roommate || roommate.camp_id !== campId) {
            throw new Error('Roommates must belong to this camp');
          }
        }
      }

      const bulkPatch: Partial<Registration> = {};
      if (patch.gender !== undefined) {
        bulkPatch.gender = patch.gender;
      }
      if (patch.departure_location !== undefined) {
        bulkPatch.departure_location = patch.departure_location;
      }
      if (patch.return_location !== undefined) {
        bulkPatch.return_location = patch.return_location;
      }
      if (patch.notes !== undefined) {
        bulkPatch.notes = patch.notes;
      }
      if (patch.transport_role !== undefined) {
        bulkPatch.transport_role = patch.transport_role;
        bulkPatch.available_seats = patch.available_seats ?? 0;
        bulkPatch.assigned_driver_registration_id =
          patch.transport_role === 'DRIVER'
            ? null
            : (patch.assigned_driver_registration_id ?? null);
      }

      if (Object.keys(bulkPatch).length) {
        await this.registrationsService.bulkUpdate(scopedIds, bulkPatch);
      }

      // Partner links + roommate preferences need per-row reconciliation.
      for (const id of scopedIds) {
        if (patch.partner_registration_id !== undefined) {
          await this.registrationsService.linkPartners(
            id,
            patch.partner_registration_id,
          );
        }
        if (patch.roommate_ids !== undefined) {
          await this.registrationsService.setRoommates(
            id,
            patch.roommate_ids.filter((rid) => rid !== id),
            campId,
          );
        }
      }
      this.selectedIds.set(new Set());
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update participants');
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
