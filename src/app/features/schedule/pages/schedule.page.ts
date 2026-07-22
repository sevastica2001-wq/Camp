import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions,
  DateSelectArg,
  EventApi,
  EventClickArg,
  EventInput,
} from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonHeader,
  IonMenuButton,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { MatDialog } from '@angular/material/dialog';
import { CampContextService } from '../../../core/camp-context/camp-context.service';
import { PermissionService } from '../../../core/permissions/permission.service';
import {
  ScheduleEventEditDialog,
  ScheduleEventEditResult,
} from '../dialogs/schedule-event-edit.dialog';
import {
  PROGRAM_END_EXCLUSIVE,
  PROGRAM_START,
  SCHEDULE_CATEGORY_COLORS,
  ScheduleEvent,
  ScheduleEventCategory,
} from '../models/schedule.models';
import { ScheduleService } from '../services/schedule.service';

/** Same breakpoint as ion-split-pane in camp-shell (menu collapses below this). */
const COMPACT_MQ = '(max-width: 991px)';

interface DraftEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  category: ScheduleEventCategory;
  location: string;
  notes: string;
  isNew?: boolean;
}

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [
    FullCalendarModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonSpinner,
    IonNote,
    IonButton,
  ],
  template: `
    <div class="flex h-full min-h-0 flex-col">
      @if (isCompact()) {
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-menu-button />
            </ion-buttons>
            <ion-title>Schedule</ion-title>
          </ion-toolbar>
        </ion-header>
      }

      <div class="schedule-scroll min-h-0 flex-1 overflow-y-auto">
        <div class="schedule-page app-fade-in">
          <header class="schedule-header">
            <p class="page-eyebrow">Program</p>
            <h1 class="app-brand">Camp schedule</h1>
            <p class="app-brand-sub">
              {{ programLabel }}
              @if (editing()) {
                · editing — drag to move/resize, tap to rename or delete, select empty time to add
              } @else if (canEdit()) {
                · tap Edit to change the program
              } @else {
                · view only
              }
            </p>
          </header>

          @if (saveError()) {
            <ion-note color="danger" class="banner">{{ saveError() }}</ion-note>
          }

          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else if (error()) {
            <ion-note color="danger">{{ error() }}</ion-note>
          } @else {
            @if (canEdit()) {
              <div class="schedule-actions">
                @if (!editing()) {
                  <ion-button fill="outline" (click)="startEdit()" [disabled]="loading()">
                    Edit
                  </ion-button>
                } @else {
                  <ion-button fill="outline" (click)="cancelEdit()" [disabled]="saving()">
                    Cancel
                  </ion-button>
                  <ion-button (click)="saveEdit()" [disabled]="saving() || !dirty()">
                    @if (saving()) {
                      Saving…
                    } @else {
                      Save
                    }
                  </ion-button>
                }
              </div>
            }

            <div class="calendar-shell" [class.calendar-shell--editing]="editing()">
              @for (epoch of [calendarEpoch()]; track epoch) {
                <full-calendar #calendar [options]="calendarOptions()" />
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    .schedule-scroll {
      background: var(--ctp-page-gradient);
    }

    .schedule-page {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 1rem 1rem 1.5rem;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      box-sizing: border-box;
    }

    @media (min-width: 992px) {
      .schedule-page {
        padding: 1.25rem 1.5rem 1.75rem;
      }
    }

    .schedule-header {
      flex: 0 0 auto;
      margin-bottom: 0.75rem;
    }

    .schedule-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0 0 0.65rem;
    }

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .banner {
      display: block;
      margin-bottom: 0.75rem;
    }

    .calendar-shell {
      flex: 1 1 auto;
      width: 100%;
      min-height: min(70vh, 820px);
      padding: 0.75rem;
      border-radius: var(--ctp-radius, 12px);
      border: 1px solid var(--ctp-border);
      background: var(--ctp-surface);
      --fc-border-color: var(--ctp-border);
      --fc-page-bg-color: transparent;
      --fc-neutral-bg-color: var(--ctp-surface-2);
      --fc-list-event-hover-bg-color: var(--ctp-surface-2);
      --fc-today-bg-color: color-mix(in srgb, var(--ctp-accent) 12%, transparent);
    }

    .calendar-shell--editing {
      border-color: var(--ctp-accent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--ctp-accent) 35%, transparent);
    }

    .calendar-shell ::ng-deep full-calendar,
    .calendar-shell ::ng-deep .fc {
      width: 100%;
      color: var(--ctp-text);
    }

    .calendar-shell ::ng-deep .fc-view-harness {
      min-height: 560px;
    }

    .calendar-shell ::ng-deep .fc-toolbar-title {
      font-size: 1.05rem;
      font-weight: 650;
    }

    .calendar-shell ::ng-deep .fc-button {
      background: var(--ctp-surface-2);
      border-color: var(--ctp-border);
      color: var(--ctp-text);
      text-transform: none;
      box-shadow: none;
    }

    .calendar-shell ::ng-deep .fc-button-primary:not(:disabled).fc-button-active,
    .calendar-shell ::ng-deep .fc-button-primary:not(:disabled):active {
      background: var(--ctp-accent);
      border-color: var(--ctp-accent);
      color: #fff;
    }

    .calendar-shell ::ng-deep .fc-col-header-cell-cushion,
    .calendar-shell ::ng-deep .fc-timegrid-slot-label-cushion {
      color: var(--ctp-text-muted);
    }

    @media (max-width: 991px) {
      .calendar-shell ::ng-deep .fc-toolbar {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
      }

      .calendar-shell ::ng-deep .fc-view-harness {
        min-height: 420px;
      }
    }
  `,
})
export class SchedulePage implements OnInit, OnDestroy {
  private readonly schedule = inject(ScheduleService);
  private readonly campContext = inject(CampContextService);
  private readonly permissions = inject(PermissionService);
  private readonly alertCtrl = inject(AlertController);
  private readonly dialog = inject(MatDialog);
  private readonly calendarRef = viewChild<FullCalendarComponent>('calendar');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly events = signal<ScheduleEvent[]>([]);
  readonly editing = signal(false);
  readonly dirty = signal(false);
  readonly isCompact = signal(this.readCompact());
  readonly canEdit = computed(() => this.permissions.isOrganizer());
  readonly programLabel = '10–15 August 2026';
  /** Remount calendar when entering/leaving edit or discarding. */
  readonly calendarEpoch = signal(0);

  private baseline: ScheduleEvent[] = [];
  private deletedIds = new Set<string>();
  private mediaQuery: MediaQueryList | null = null;
  private readonly onViewportChange = (): void => {
    this.isCompact.set(this.readCompact());
  };

  readonly calendarOptions = computed((): CalendarOptions => {
    const compact = this.isCompact();
    const editing = this.editing();
    void this.calendarEpoch();
    return {
      plugins: [interactionPlugin, timeGridPlugin, dayGridPlugin, listPlugin],
      initialView: compact ? 'listWeek' : 'timeGridWeek',
      initialDate: PROGRAM_START,
      validRange: {
        start: PROGRAM_START,
        end: PROGRAM_END_EXCLUSIVE,
      },
      headerToolbar: compact
        ? {
            left: 'prev,next',
            center: 'title',
            right: 'timeGridDay,listWeek',
          }
        : {
            left: 'title',
            center: '',
            right: 'timeGridWeek,timeGridDay,listWeek',
          },
      height: 'auto',
      expandRows: true,
      slotMinTime: '07:00:00',
      slotMaxTime: '23:30:00',
      allDaySlot: false,
      weekends: true,
      hiddenDays: [0],
      editable: editing,
      selectable: editing,
      selectMirror: editing,
      eventStartEditable: editing,
      eventDurationEditable: editing,
      nowIndicator: true,
      navLinks: false,
      events: this.toCalendarEvents(this.events()),
      eventDisplay: 'block',
      dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric' },
      locale: 'ro',
      select: editing ? (arg) => this.onSelect(arg) : undefined,
      eventClick: editing ? (arg) => void this.onEventClick(arg) : undefined,
      eventDrop: editing ? () => this.markDirtyFromCalendar() : undefined,
      eventResize: editing ? () => this.markDirtyFromCalendar() : undefined,
    };
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia(COMPACT_MQ);
      this.mediaQuery.addEventListener('change', this.onViewportChange);
      this.isCompact.set(this.mediaQuery.matches);
    }
    void this.load();
  }

  ngOnDestroy(): void {
    this.mediaQuery?.removeEventListener('change', this.onViewportChange);
  }

  startEdit(): void {
    if (!this.canEdit() || this.loading()) {
      return;
    }
    this.baseline = structuredClone(this.events());
    this.deletedIds = new Set();
    this.dirty.set(false);
    this.saveError.set(null);
    this.editing.set(true);
    this.calendarEpoch.update((n) => n + 1);
  }

  async cancelEdit(): Promise<void> {
    if (!this.editing()) {
      return;
    }
    if (this.dirty()) {
      const alert = await this.alertCtrl.create({
        header: 'Discard changes?',
        message: 'Unsaved schedule edits will be lost.',
        buttons: [
          { text: 'Keep editing', role: 'cancel' },
          {
            text: 'Discard',
            role: 'destructive',
            handler: () => this.discardEdit(),
          },
        ],
      });
      await alert.present();
      return;
    }
    this.discardEdit();
  }

  async saveEdit(): Promise<void> {
    if (!this.editing() || !this.dirty() || this.saving()) {
      return;
    }
    const campId = this.campContext.requireCampId();
    const draft = this.collectDraftFromCalendar();
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const saved = await this.schedule.saveDraft(campId, draft, [...this.deletedIds]);
      this.events.set(saved);
      this.baseline = structuredClone(saved);
      this.deletedIds = new Set();
      this.dirty.set(false);
      this.editing.set(false);
      this.calendarEpoch.update((n) => n + 1);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      this.saving.set(false);
    }
  }

  private discardEdit(): void {
    this.events.set(structuredClone(this.baseline));
    this.deletedIds = new Set();
    this.dirty.set(false);
    this.saveError.set(null);
    this.editing.set(false);
    this.calendarEpoch.update((n) => n + 1);
  }

  private onSelect(arg: DateSelectArg): void {
    arg.view.calendar.unselect();
    const ref = this.dialog.open(ScheduleEventEditDialog, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        title: '',
        startsAt: arg.start,
        endsAt: arg.end ?? arg.start,
        category: 'other' as ScheduleEventCategory,
        location: '',
        creating: true,
      },
    });
    ref.afterClosed().subscribe((result: ScheduleEventEditResult | undefined) => {
      if (!result || result.action !== 'save') {
        return;
      }
      const colors =
        SCHEDULE_CATEGORY_COLORS[result.category] ?? SCHEDULE_CATEGORY_COLORS.other;
      const id = `new-${crypto.randomUUID()}`;
      arg.view.calendar.addEvent({
        id,
        title: result.location ? `${result.title} · ${result.location}` : result.title,
        start: result.startsAt,
        end: result.endsAt,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        textColor: colors.textColor,
        extendedProps: {
          category: result.category,
          location: result.location,
          notes: '',
          isNew: true,
        },
      });
      this.dirty.set(true);
    });
  }

  private onEventClick(arg: EventClickArg): void {
    const ev = arg.event;
    const location = (ev.extendedProps['location'] as string) || '';
    const category =
      (ev.extendedProps['category'] as ScheduleEventCategory) || 'other';
    const ref = this.dialog.open(ScheduleEventEditDialog, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        title: stripLocationSuffix(ev.title, location),
        startsAt: ev.start ?? new Date(),
        endsAt: ev.end ?? ev.start ?? new Date(),
        category,
        location,
        creating: false,
      },
    });
    ref.afterClosed().subscribe((result: ScheduleEventEditResult | undefined) => {
      if (!result) {
        return;
      }
      if (result.action === 'delete') {
        if (!String(ev.id).startsWith('new-')) {
          this.deletedIds.add(ev.id);
        }
        ev.remove();
        this.dirty.set(true);
        return;
      }
      const colors =
        SCHEDULE_CATEGORY_COLORS[result.category] ?? SCHEDULE_CATEGORY_COLORS.other;
      ev.setProp(
        'title',
        result.location ? `${result.title} · ${result.location}` : result.title,
      );
      ev.setStart(result.startsAt);
      ev.setEnd(result.endsAt);
      ev.setExtendedProp('category', result.category);
      ev.setExtendedProp('location', result.location);
      ev.setProp('backgroundColor', colors.backgroundColor);
      ev.setProp('borderColor', colors.borderColor);
      ev.setProp('textColor', colors.textColor);
      this.dirty.set(true);
    });
  }

  private markDirtyFromCalendar(): void {
    this.dirty.set(true);
  }

  private collectDraftFromCalendar(): DraftEvent[] {
    const api = this.calendarRef()?.getApi();
    const source = api ? api.getEvents() : [];
    return source.map((ev) => eventApiToDraft(ev));
  }

  private async load(): Promise<void> {
    const campId = this.campContext.requireCampId();
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.schedule.ensureSeeded(campId);
      const list = await this.schedule.listEvents(campId);
      this.events.set(list);
      this.baseline = structuredClone(list);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      this.loading.set(false);
    }
  }

  private readCompact(): boolean {
    return typeof window !== 'undefined' && window.matchMedia(COMPACT_MQ).matches;
  }

  private toCalendarEvents(rows: ScheduleEvent[]): EventInput[] {
    return rows.map((row) => {
      const colors = SCHEDULE_CATEGORY_COLORS[row.category] ?? SCHEDULE_CATEGORY_COLORS.other;
      return {
        id: row.id,
        title: row.location ? `${row.title} · ${row.location}` : row.title,
        start: row.starts_at,
        end: row.ends_at,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        textColor: colors.textColor,
        extendedProps: {
          category: row.category,
          notes: row.notes,
          location: row.location,
          isNew: false,
        },
      };
    });
  }
}

function stripLocationSuffix(title: string, location?: string): string {
  if (location && title.endsWith(` · ${location}`)) {
    return title.slice(0, -(location.length + 3));
  }
  return title;
}

function eventApiToDraft(ev: EventApi): DraftEvent {
  const location = (ev.extendedProps['location'] as string) || '';
  const category = (ev.extendedProps['category'] as ScheduleEventCategory) || 'other';
  const notes = (ev.extendedProps['notes'] as string) || '';
  const isNew = !!ev.extendedProps['isNew'] || String(ev.id).startsWith('new-');
  const start = ev.start;
  const end = ev.end ?? ev.start;
  return {
    id: ev.id,
    title: stripLocationSuffix(ev.title, location),
    starts_at: (start ?? new Date()).toISOString(),
    ends_at: (end ?? start ?? new Date()).toISOString(),
    category,
    location,
    notes,
    isNew,
  };
}
