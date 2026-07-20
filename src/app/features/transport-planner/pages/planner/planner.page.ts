import { Component, computed, inject, signal, viewChild, ElementRef, OnInit } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { animate, style, transition, trigger } from '@angular/animations';
import { IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Passenger, Problem } from '../../models/transport.models';
import { TransportStore } from '../../store/transport.store';
import { AssignmentService } from '../../services/assignment.service';
import { AutoAssignService } from '../../services/auto-assign.service';
import { ImportExportService } from '../../services/import-export.service';
import { BackupService } from '../../services/backup.service';
import { CommandHistoryService } from '../../services/command-history.service';
import { PermissionService } from '../../../../core/permissions/permission.service';
import { CampContextService } from '../../../../core/camp-context/camp-context.service';
import { SummaryBar } from '../../components/summary-bar/summary-bar';
import { PlannerToolbar } from '../../components/planner-toolbar/planner-toolbar';
import { ProblemsPanel } from '../../components/problems-panel/problems-panel';
import { DriverColumn } from '../../components/driver-column/driver-column';
import { PassengerCard } from '../../components/passenger-card/passenger-card';
import { DriverEditDialog } from '../../dialogs/driver-edit.dialog';
import { AddPersonDialog } from '../../dialogs/add-person.dialog';
import { AutoAssignSummaryDialog } from '../../dialogs/auto-assign-summary.dialog';

@Component({
  selector: 'app-planner-page',
  standalone: true,
  imports: [
    DragDropModule,
    SummaryBar,
    PlannerToolbar,
    ProblemsPanel,
    DriverColumn,
    PassengerCard,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  template: `
    <div class="flex h-full min-h-0 flex-col" [@fadeIn]>
      @if (!permissions.canManageTransport()) {
        <div
          class="border-b border-[var(--ctp-warning)] bg-[var(--ctp-warning-soft)] px-4 py-2 text-sm text-[var(--ctp-warning)]"
        >
          Camp is {{ campStatus() }} — transportation is view-only for your role/status.
        </div>
      }

      @if (!isDesktopWorkbench()) {
        <div class="flex h-full min-h-0 flex-col">
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-menu-button />
              </ion-buttons>
              <ion-title>Transportation</ion-title>
            </ion-toolbar>
          </ion-header>
          <div class="app-page min-h-0 flex-1 overflow-y-auto">
            <div class="app-page-inner app-fade-in">
              <div class="desktop-only-banner">
                <span class="material-symbols-outlined text-[var(--ctp-sky)]">desktop_windows</span>
                <p>
                  <strong>Edit on desktop.</strong>
                  This phone view is read-only. Open Camp on a screen ≥1024px to drag, assign, and
                  export.
                </p>
              </div>

              <p class="page-eyebrow">Transportation</p>
              <h1 class="app-brand">Trip overview</h1>
              <p class="app-brand-sub">Summary of drivers, passengers, and open problems.</p>

              <app-summary-bar [summary]="store.summary()" />

              <section class="app-panel mt-4">
                <h2 class="app-section-title">Problems ({{ store.problems().length }})</h2>
                @for (problem of store.problems(); track problem.id) {
                  <p class="problem-line">{{ problem.message }}</p>
                } @empty {
                  <p class="empty-line">No problems right now</p>
                }
              </section>

              <section class="app-panel mt-3">
                <h2 class="app-section-title">Unassigned ({{ unassignedCount() }})</h2>
                @for (p of store.passengers(); track p.id) {
                  @if (!p.assignedDriverId) {
                    <div class="roster-line">
                      <strong>{{ p.name }}</strong>
                      <span>{{ p.departureLocation || '—' }}</span>
                    </div>
                  }
                }
              </section>

              <section class="app-panel mt-3">
                <h2 class="app-section-title">Drivers ({{ store.drivers().length }})</h2>
                @for (driver of store.drivers(); track driver.id) {
                  <div class="driver-block">
                    <div class="driver-block__head">
                      <strong>{{ driver.name }}</strong>
                      <span
                        >{{ assignment.getDriverPassengers(driver).length }}/{{
                          driver.availableSeats
                        }}
                        seats</span
                      >
                    </div>
                    <p class="driver-block__meta">
                      {{ driver.departureLocation }} → {{ driver.returnLocation }}
                    </p>
                    <ul class="driver-block__passengers">
                      @for (p of assignment.getDriverPassengers(driver); track p.id) {
                        <li>{{ p.name }}</li>
                      } @empty {
                        <li class="empty-line">No passengers</li>
                      }
                    </ul>
                  </div>
                } @empty {
                  <p class="empty-line">No drivers yet</p>
                }
              </section>
            </div>
          </div>
        </div>
      } @else {
        <div class="planner-desktop-workbench flex h-full min-h-0 flex-col overflow-x-auto">
          <app-summary-bar [summary]="store.summary()" />
          <app-planner-toolbar
            (addPerson)="openAddPerson()"
            (exportPassengers)="importExport.exportPassengersCsv()"
            (exportDrivers)="importExport.exportDriversCsv()"
            (downloadSeed)="backup.downloadPublishedSeedFile()"
            (downloadBackup)="backup.downloadBackup()"
            (importBackup)="triggerImportBackup()"
            (resetSeed)="resetToPublishedSeed()"
            (autoAssign)="runAutoAssign()"
          />
          <input
            #backupInput
            class="hidden"
            type="file"
            accept="application/json,.json"
            (change)="onBackupFileSelected($event)"
          />

          <div class="flex min-h-0 flex-1">
            <app-problems-panel
              class="no-print"
              [problems]="store.problems()"
              (select)="onProblemSelect($event)"
            />

            <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4" cdkDropListGroup>
              <section
                class="flex max-h-[280px] min-h-[180px] flex-col rounded-[var(--ctp-radius)] border border-[var(--ctp-border)] bg-[var(--ctp-surface)] shadow-[var(--ctp-shadow)]"
              >
                <header class="border-b border-[var(--ctp-border)] px-4 py-3">
                  <h3 class="text-base font-semibold">Unassigned</h3>
                  <p class="text-xs text-[var(--ctp-text-muted)]">
                    {{ store.filteredUnassigned().length }} passengers
                  </p>
                </header>
                <div
                  class="drop-list flex flex-1 gap-2 overflow-x-auto overflow-y-hidden p-3"
                  cdkDropList
                  id="unassigned"
                  cdkDropListOrientation="horizontal"
                  [cdkDropListData]="unassignedList()"
                  [cdkDropListConnectedTo]="driverListIds()"
                  (cdkDropListDropped)="onDrop($event, null)"
                  (cdkDropListEntered)="activeDropTarget.set('unassigned')"
                  (cdkDropListExited)="clearHighlight()"
                  [class]="unassignedHighlightClass()"
                >
                  @for (passenger of store.filteredUnassigned(); track passenger.id) {
                    <div
                      class="w-[220px] shrink-0"
                      cdkDrag
                      [cdkDragData]="passenger"
                      (cdkDragStarted)="activePassengerId.set(passenger.id)"
                      (cdkDragEnded)="clearHighlight()"
                    >
                      <app-passenger-card
                        [passenger]="passenger"
                        [editable]="true"
                        (edit)="openEditPerson($event)"
                      />
                    </div>
                  } @empty {
                    <div
                      class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ctp-border)] p-4 text-center text-xs text-[var(--ctp-text-muted)]"
                    >
                      No unassigned passengers — use Add person to create one
                    </div>
                  }
                </div>
              </section>

              <section class="min-h-0 flex-1">
                <div class="mb-3 flex items-center justify-between">
                  <h3
                    class="text-sm font-semibold tracking-wide text-[var(--ctp-text-muted)] uppercase"
                  >
                    Drivers
                  </h3>
                  <p class="text-xs text-[var(--ctp-text-muted)]">
                    {{ store.filteredDrivers().length }} cards · max 5 per row
                  </p>
                </div>

                <div class="grid grid-cols-3 gap-4 xl:grid-cols-5">
                  @for (driver of store.filteredDrivers(); track driver.id) {
                    <app-driver-column
                      class="min-w-0"
                      [driver]="driver"
                      [passengers]="assignment.getDriverPassengers(driver)"
                      [problems]="store.problems()"
                      [collapsed]="store.isDriverCollapsed(driver.id)"
                      [connectedLists]="connectedFor(driver.id)"
                      [focusDriverId]="store.focusDriverId()"
                      [dropHighlight]="highlightFor(driver.id)"
                      [canEnter]="canEnterFn"
                      (edit)="openEditDriver($event)"
                      (toggleCollapse)="store.toggleDriverCollapsed($event)"
                      (dropped)="onDrop($event, driver.id)"
                      (entered)="onEntered($event)"
                      (exited)="clearHighlight()"
                    />
                  } @empty {
                    <div
                      class="col-span-3 rounded-[var(--ctp-radius)] border border-dashed border-[var(--ctp-border)] bg-[var(--ctp-surface)] px-6 py-16 text-center xl:col-span-5"
                    >
                      <p class="text-sm font-medium">No drivers yet</p>
                      <p class="mt-1 text-xs text-[var(--ctp-text-muted)]">
                        Click Add person, turn on “Is driver”, and set available seats
                      </p>
                    </div>
                  }
                </div>
              </section>
            </div>
          </div>
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

    :host ::ng-deep app-driver-column {
      display: block;
      height: 100%;
      min-height: 320px;
    }

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .problem-line,
    .roster-line,
    .empty-line {
      margin: 0;
      padding: 0.45rem 0;
      border-bottom: 1px solid var(--ctp-border);
      font-size: 0.92rem;
    }

    .roster-line {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .roster-line span,
    .empty-line,
    .driver-block__meta {
      color: var(--ctp-text-muted);
      font-size: 0.88rem;
    }

    .driver-block {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--ctp-border);
    }

    .driver-block__head {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .driver-block__passengers {
      margin: 0.4rem 0 0;
      padding-left: 1.1rem;
      font-size: 0.9rem;
    }
  `,
})
export class PlannerPage implements OnInit {
  readonly store = inject(TransportStore);
  readonly assignment = inject(AssignmentService);
  readonly autoAssign = inject(AutoAssignService);
  readonly importExport = inject(ImportExportService);
  readonly backup = inject(BackupService);
  readonly history = inject(CommandHistoryService);
  readonly permissions = inject(PermissionService);
  private readonly campContext = inject(CampContextService);
  private readonly dialog = inject(MatDialog);
  private readonly backupInput = viewChild<ElementRef<HTMLInputElement>>('backupInput');

  readonly activeDropTarget = signal<string | null>(null);
  readonly activePassengerId = signal<string | null>(null);
  readonly campStatus = computed(() => this.campContext.currentCamp()?.status ?? 'draft');
  readonly isDesktopWorkbench = signal(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );

  readonly unassignedCount = computed(
    () => this.store.passengers().filter((p) => !p.assignedDriverId).length,
  );

  async ngOnInit(): Promise<void> {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(min-width: 1024px)');
      const sync = (): void => this.isDesktopWorkbench.set(mq.matches);
      sync();
      mq.addEventListener('change', sync);
    }
    await this.store.ensureLoaded();
  }

  readonly unassignedList = computed(() => this.store.filteredUnassigned());

  readonly driverListIds = computed(() =>
    this.store.filteredDrivers().map((d) => `driver-${d.id}`),
  );

  readonly canEnterFn = (passengerId: string, driverId: string) =>
    this.assignment.canEnter(passengerId, driverId);

  connectedFor(driverId: string): string[] {
    return ['unassigned', ...this.driverListIds().filter((id) => id !== `driver-${driverId}`)];
  }

  highlightFor(driverId: string): 'ok' | 'warn' | 'danger' | null {
    if (this.activeDropTarget() !== `driver-${driverId}`) {
      return null;
    }
    const passengerId = this.activePassengerId();
    if (!passengerId) {
      return null;
    }
    const result = this.assignment.evaluateDrop(passengerId, driverId);
    if (result === 'blocked' || result === null) {
      return null;
    }
    return result;
  }

  unassignedHighlightClass(): string {
    return this.activeDropTarget() === 'unassigned' ? 'drop-highlight-ok' : '';
  }

  onEntered(event: { passengerId: string; driverId: string }): void {
    this.activePassengerId.set(event.passengerId);
    this.activeDropTarget.set(`driver-${event.driverId}`);
  }

  clearHighlight(): void {
    this.activeDropTarget.set(null);
    this.activePassengerId.set(null);
  }

  onDrop(event: CdkDragDrop<Passenger[]>, targetDriverId: string | null): void {
    this.clearHighlight();
    const passenger = event.item.data as Passenger;
    if (!passenger) {
      return;
    }

    if (event.previousContainer === event.container) {
      return;
    }

    this.assignment.dropPassenger(passenger.id, targetDriverId);
  }

  onProblemSelect(problem: Problem): void {
    if (problem.driverId) {
      this.store.setFocusDriver(problem.driverId);
      queueMicrotask(() => this.store.setFocusDriver(problem.driverId!));
      return;
    }
    if (problem.passengerId) {
      const passenger = this.store.getPassenger(problem.passengerId);
      if (passenger?.assignedDriverId) {
        this.store.setFocusDriver(passenger.assignedDriverId);
      }
    }
  }

  openEditDriver(driverId: string): void {
    const driver = this.store.getDriver(driverId);
    if (!driver) {
      return;
    }
    const ref = this.dialog.open(DriverEditDialog, {
      width: '480px',
      data: { driver },
    });
    ref.afterClosed().subscribe((patch) => {
      if (patch) {
        this.history.updateDriver(driverId, patch);
      }
    });
  }

  openAddPerson(): void {
    const ref = this.dialog.open(AddPersonDialog, {
      width: '520px',
      maxHeight: '90vh',
      data: { mode: 'create' },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.history.addPerson(result);
      }
    });
  }

  triggerImportBackup(): void {
    this.backupInput()?.nativeElement.click();
  }

  async onBackupFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      await this.backup.importBackupFile(file);
    } catch {
      window.alert('Could not import that file. Use a backup JSON from this app.');
    }
  }

  resetToPublishedSeed(): void {
    const ok = window.confirm(
      'Replace camp transportation data with the published seed snapshot? You can undo once.',
    );
    if (ok) {
      void this.backup.importPublishedSeedIntoCamp();
    }
  }

  openEditPerson(passengerId: string): void {
    const passenger = this.store.getPassenger(passengerId);
    if (!passenger) {
      return;
    }
    const ref = this.dialog.open(AddPersonDialog, {
      width: '520px',
      maxHeight: '90vh',
      data: {
        mode: 'edit',
        passengerId: passenger.id,
        name: passenger.name,
        isDriver: false,
        assignedDriverId: passenger.assignedDriverId ?? '',
        departureLocation: passenger.departureLocation,
        returnLocation: passenger.returnLocation,
        notes: passenger.notes ?? '',
      },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.history.updatePerson(passengerId, result);
      }
    });
  }

  runAutoAssign(): void {
    const result = this.autoAssign.run();
    this.dialog.open(AutoAssignSummaryDialog, {
      width: '520px',
      data: result,
    });
  }
}
