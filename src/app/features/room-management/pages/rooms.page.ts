import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import {
  IonButtons,
  IonHeader,
  IonMenuButton,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { CampContextService } from '../../../core/camp-context/camp-context.service';
import { PermissionService } from '../../../core/permissions/permission.service';
import { LodgingPersonCard } from '../components/lodging-person-card';
import { LodgingRoomColumn } from '../components/lodging-room-column';
import { DragAutoScrollDirective } from '../directives/drag-auto-scroll.directive';
import { LodgingPerson } from '../models/lodging.models';
import { LodgingStore } from '../store/lodging.store';

@Component({
  selector: 'app-rooms-page',
  standalone: true,
  imports: [
    FormsModule,
    DragDropModule,
    CdkScrollable,
    DragAutoScrollDirective,
    LodgingPersonCard,
    LodgingRoomColumn,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonNote,
    IonSpinner,
  ],
  template: `
    <div class="flex h-full min-h-0 flex-col">
      @if (!permissions.canManageTransport()) {
        <div
          class="border-b border-[var(--ctp-warning)] bg-[var(--ctp-warning-soft)] px-4 py-2 text-sm text-[var(--ctp-warning)]"
        >
          @if (permissions.isViewer()) {
            View only — guest access. You can browse rooms but not change assignments.
          } @else {
            Camp is {{ campStatus() }} — room assignments are view-only for your role/status.
          }
        </div>
      }

      @if (!isDesktopWorkbench()) {
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-menu-button />
            </ion-buttons>
            <ion-title>Rooms</ion-title>
          </ion-toolbar>
        </ion-header>
        <div class="app-page min-h-0 flex-1 overflow-y-auto">
          <div class="app-page-inner app-fade-in">
            <div class="desktop-only-banner">
              <span class="material-symbols-outlined text-[var(--ctp-sky)]">desktop_windows</span>
              <p>
                <strong>Edit on desktop.</strong>
                Open Camp on a screen ≥1024px to drag people into rooms.
              </p>
            </div>
            <p class="page-eyebrow">Lodging</p>
            <h1 class="app-brand">Room overview</h1>
            <p class="app-brand-sub">
              {{ store.summary().occupied }}/{{ store.summary().capacity }} beds filled ·
              {{ store.summary().unassigned }} unassigned
            </p>
            @for (building of store.activeBuildings(); track building.id) {
              <section class="app-panel mt-3">
                <h2 class="app-section-title">{{ building.name }}</h2>
                <p class="muted">
                  {{ building.siteName }} · {{ bedsFor(building.id) }} beds
                </p>
                @for (room of roomsFor(building.id); track room.id) {
                  <div class="room-line">
                    <strong>{{ room.name }}</strong>
                    <span
                      >{{ store.getRoomOccupants(room).length }}/{{ room.capacity }}
                      @if (store.getRoomOccupants(room).length > room.capacity) {
                        <span class="text-[var(--ctp-danger)]"> · over capacity</span>
                      }
                      · {{ store.roomPolicyLabel(room) }}</span
                    >
                  </div>
                }
              </section>
            }
            @for (building of store.unavailableBuildings(); track building.id) {
              <section class="app-panel mt-3 opacity-70">
                <h2 class="app-section-title">{{ building.name }}</h2>
                <p class="muted">Under construction / unavailable</p>
              </section>
            }
          </div>
        </div>
      } @else {
        <div class="flex min-h-0 flex-1 flex-col">
          <header
            class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ctp-border)] bg-[var(--ctp-surface)] px-4 py-3"
          >
            <div>
              <p class="page-eyebrow">Lodging</p>
              <h1 class="text-xl font-semibold tracking-tight">Room management</h1>
              <p class="text-xs text-[var(--ctp-text-muted)]">
                {{ store.summary().occupied }}/{{ store.summary().capacity }} beds ·
                {{ store.summary().unassigned }} unassigned ·
                {{ store.summary().buildings }} cabins
              </p>
            </div>
          </header>

          @if (store.loading()) {
            <div class="flex flex-1 items-center justify-center">
              <ion-spinner />
            </div>
          } @else if (store.error() && store.buildings().length === 0) {
            <div class="p-4">
              <ion-note color="danger">{{ store.error() }}</ion-note>
            </div>
          } @else {
            @if (store.error()) {
              <div class="border-b border-red-200 bg-red-50 px-4 py-2">
                <ion-note color="danger">{{ store.error() }}</ion-note>
              </div>
            }
            <div class="flex min-h-0 flex-1" cdkDropListGroup>
              <aside
                class="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--ctp-border)] bg-[var(--ctp-surface)]"
              >
                <header class="border-b border-[var(--ctp-border)] px-4 py-3">
                  <h2 class="text-sm font-semibold">Unassigned</h2>
                  <p class="text-xs text-[var(--ctp-text-muted)]">
                    {{ store.filteredUnassigned().length }} people
                    @if (permissions.canManageTransport()) {
                      · drag into a room
                    }
                  </p>
                </header>
                <div class="space-y-2 border-b border-[var(--ctp-border)] px-3 py-2">
                  <input
                    class="w-full rounded-lg border border-[var(--ctp-border)] bg-[var(--ctp-bg)] px-3 py-2 text-sm"
                    type="search"
                    placeholder="Search by name…"
                    [ngModel]="store.search()"
                    (ngModelChange)="store.search.set($event)"
                  />
                  <select
                    class="w-full rounded-lg border border-[var(--ctp-border)] bg-[var(--ctp-bg)] px-3 py-2 text-sm"
                    [ngModel]="store.genderFilter()"
                    (ngModelChange)="store.genderFilter.set($event)"
                  >
                    <option value="ALL">All genders</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                </div>
                <div
                  class="drop-list flex flex-1 flex-col gap-2 overflow-y-auto p-3"
                  cdkDropList
                  cdkScrollable
                  id="unassigned"
                  [cdkDropListData]="store.filteredUnassigned()"
                  [cdkDropListConnectedTo]="roomListIds()"
                  (cdkDropListDropped)="onDrop($event, null)"
                  (cdkDropListEntered)="activeDropTarget.set('unassigned')"
                  (cdkDropListExited)="clearHighlight()"
                  [class]="unassignedHighlightClass()"
                >
                  @for (person of store.filteredUnassigned(); track person.id) {
                    <div
                      cdkDrag
                      [cdkDragDisabled]="!permissions.canManageTransport()"
                      [cdkDragData]="person"
                      (cdkDragStarted)="onDragStarted(person.id)"
                      (cdkDragEnded)="onDragEnded()"
                    >
                      <app-lodging-person-card [person]="person" />
                    </div>
                  } @empty {
                    <div
                      class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ctp-border)] p-4 text-center text-xs text-[var(--ctp-text-muted)]"
                    >
                      Everyone is housed
                    </div>
                  }
                </div>
              </aside>

              <div
                class="min-h-0 flex-1 overflow-y-auto p-4"
                cdkScrollable
                [appDragAutoScroll]="isDragging()"
              >
                @for (site of sites(); track site) {
                  <section class="mb-8">
                    <h2
                      class="mb-3 text-sm font-semibold tracking-wide text-[var(--ctp-text-muted)] uppercase"
                    >
                      {{ site }}
                    </h2>
                    @for (building of buildingsForSite(site); track building.id) {
                      <div class="mb-6">
                        <div class="mb-2 flex items-baseline justify-between gap-2">
                          <h3 class="text-base font-semibold">{{ building.name }}</h3>
                          <span class="text-xs text-[var(--ctp-text-muted)]">
                            {{ roomsFor(building.id).length }} rooms ·
                            {{ bedsFor(building.id) }} beds
                          </span>
                        </div>
                        @if (building.status !== 'active') {
                          <p
                            class="rounded-lg border border-dashed border-[var(--ctp-border)] px-4 py-6 text-sm text-[var(--ctp-text-muted)]"
                          >
                            Under construction — not available for assignment
                          </p>
                        } @else {
                          <div class="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                            @for (room of roomsFor(building.id); track room.id) {
                              <app-lodging-room-column
                                [room]="room"
                                [occupants]="store.getRoomOccupants(room)"
                                [connectedLists]="connectedFor(room.id)"
                                [dropHighlight]="highlightFor(room.id)"
                                [policyLabel]="store.roomPolicyLabel(room)"
                                [canEnter]="canEnterFn"
                                [activePersonId]="activePersonId()"
                                [editable]="permissions.canManageTransport()"
                                (dropped)="onDrop($event, room.id)"
                                (entered)="onEntered($event)"
                                (exited)="clearHighlight()"
                                (dragStarted)="onDragStarted($event)"
                                (dragEnded)="onDragEnded()"
                              />
                            }
                          </div>
                        }
                      </div>
                    }
                  </section>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .muted {
      margin: 0 0 0.5rem;
      color: var(--ctp-text-muted);
      font-size: 0.88rem;
    }

    .room-line {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.45rem 0;
      border-bottom: 1px solid var(--ctp-border);
      font-size: 0.92rem;
    }

    .room-line span {
      color: var(--ctp-text-muted);
      font-size: 0.85rem;
    }

    .drop-highlight-ok {
      outline: 2px solid var(--ctp-success);
      outline-offset: -2px;
      border-radius: 8px;
    }
  `,
})
export class RoomsPage implements OnInit {
  readonly store = inject(LodgingStore);
  readonly permissions = inject(PermissionService);
  private readonly campContext = inject(CampContextService);

  readonly activeDropTarget = signal<string | null>(null);
  readonly activePersonId = signal<string | null>(null);
  readonly isDragging = signal(false);
  readonly campStatus = computed(() => this.campContext.currentCamp()?.status ?? 'draft');
  readonly isDesktopWorkbench = signal(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );

  readonly canEnterFn = (personId: string, roomId: string) =>
    this.permissions.canManageTransport() && this.store.canEnter(personId, roomId);

  readonly sites = computed(() => {
    const names: string[] = [];
    for (const b of this.store.buildings()) {
      if (!names.includes(b.siteName)) {
        names.push(b.siteName);
      }
    }
    return names;
  });

  readonly roomListIds = computed(() =>
    this.store
      .rooms()
      .filter((r) => {
        const building = this.store.buildings().find((b) => b.id === r.buildingId);
        return building?.status === 'active';
      })
      .map((r) => `room-${r.id}`),
  );

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(min-width: 1024px)');
      const sync = (): void => this.isDesktopWorkbench.set(mq.matches);
      sync();
      mq.addEventListener('change', sync);
    }
    void this.store.ensureLoaded();
  }

  buildingsForSite(site: string) {
    return this.store.buildings().filter((b) => b.siteName === site);
  }

  roomsFor(buildingId: string) {
    return this.store.roomsByBuilding().get(buildingId) ?? [];
  }

  bedsFor(buildingId: string): number {
    return this.roomsFor(buildingId).reduce((sum, room) => sum + room.capacity, 0);
  }

  connectedFor(roomId: string): string[] {
    return [
      'unassigned',
      ...this.roomListIds().filter((id) => id !== `room-${roomId}`),
    ];
  }

  highlightFor(roomId: string): 'ok' | 'warn' | 'danger' | null {
    if (this.activeDropTarget() !== `room-${roomId}`) {
      return null;
    }
    const personId = this.activePersonId();
    if (!personId) {
      return null;
    }
    const result = this.store.evaluateDrop(personId, roomId);
    if (result === 'blocked' || result === null) {
      return null;
    }
    return result;
  }

  unassignedHighlightClass(): string {
    return this.activeDropTarget() === 'unassigned' ? 'drop-highlight-ok' : '';
  }

  onDragStarted(personId: string): void {
    this.activePersonId.set(personId);
    this.isDragging.set(true);
  }

  onDragEnded(): void {
    this.isDragging.set(false);
    this.clearHighlight();
  }

  onEntered(event: { personId: string; roomId: string }): void {
    if (event.personId) {
      this.activePersonId.set(event.personId);
    }
    this.activeDropTarget.set(`room-${event.roomId}`);
  }

  clearHighlight(): void {
    this.activeDropTarget.set(null);
    this.activePersonId.set(null);
  }

  onDrop(event: CdkDragDrop<LodgingPerson[]>, targetRoomId: string | null): void {
    this.clearHighlight();
    if (!this.permissions.canManageTransport()) {
      return;
    }
    const person = event.item.data as LodgingPerson;
    if (!person) {
      return;
    }
    if (event.previousContainer === event.container) {
      return;
    }
    void this.store.movePerson(person.id, targetRoomId);
  }
}
