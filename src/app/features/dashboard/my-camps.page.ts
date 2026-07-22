import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  closeOutline,
  enterOutline,
  locationOutline,
  logOutOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme.service';
import { Camp, CampRole } from '../../core/supabase/database.types';
import { CampsService } from '../camps/camps.service';

addIcons({
  addOutline,
  calendarOutline,
  locationOutline,
  closeOutline,
  logOutOutline,
  enterOutline,
});

type CampWithRole = Camp & { role: CampRole };

@Component({
  selector: 'app-my-camps-page',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonBadge,
    IonFab,
    IonFabButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonInput,
    IonTextarea,
    IonItem,
    IonList,
    IonNote,
    IonModal,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>My Camps</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="logout()">
            <ion-icon slot="icon-only" name="log-out-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="app-page">
        <div class="app-page-inner app-page-inner--wide app-fade-in">
          <p class="page-eyebrow">Camp Platform</p>
          <h1 class="app-brand">Your camps</h1>
          <p class="app-brand-sub">
            Join with an invite, or open a camp you already belong to.
          </p>

          <section class="app-panel join-panel">
            <h2 class="app-section-title">Join a camp</h2>
            <p class="join-hint">
              Paste an invite link, <code>slug/code</code>, or the invite code alone.
            </p>
            <ion-list lines="none" class="create-fields">
              <ion-item>
                <ion-input
                  label="Invite"
                  labelPlacement="stacked"
                  [(ngModel)]="joinToken"
                  name="joinToken"
                  placeholder="summer-camp/ABC123 or full link"
                />
              </ion-item>
            </ion-list>
            @if (joinError()) {
              <ion-note color="danger">{{ joinError() }}</ion-note>
            }
            <ion-button
              expand="block"
              class="cta"
              (click)="joinCamp()"
              [disabled]="joining() || !joinToken.trim()"
            >
              @if (joining()) {
                <ion-spinner name="crescent" />
              } @else {
                <ion-icon slot="start" name="enter-outline" />
                Join camp
              }
            </ion-button>
          </section>

          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else if (!camps().length) {
            <div class="app-panel empty-panel">
              <h2 class="app-section-title">No camps yet</h2>
              <p class="camp-card__meta">
                Ask an organizer for an invite link.
                @if (canCreate()) {
                  Or create a camp if you’re a camp creator.
                }
              </p>
              @if (canCreate()) {
                <ion-button expand="block" class="cta" (click)="openCreate()">
                  Create camp
                </ion-button>
              }
            </div>
          } @else {
            <div class="camp-card-grid">
              @for (camp of camps(); track camp.id) {
                <button type="button" class="camp-card" (click)="openCamp(camp.id)">
                  <div class="camp-card__top">
                    <h2 class="camp-card__title">{{ camp.name }}</h2>
                    <ion-badge [color]="roleColor(camp.role)">{{ camp.role }}</ion-badge>
                  </div>
                  @if (camp.location) {
                    <p class="camp-card__meta">
                      <ion-icon name="location-outline" />
                      {{ camp.location }}
                    </p>
                  }
                  @if (camp.start_date) {
                    <p class="camp-card__meta">
                      <ion-icon name="calendar-outline" />
                      {{ camp.start_date }}
                      @if (camp.end_date) {
                        – {{ camp.end_date }}
                      }
                    </p>
                  }
                </button>
              }
            </div>
          }
        </div>
      </div>

      @if (canCreate()) {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button color="primary" (click)="openCreate()">
            <ion-icon name="add-outline" />
          </ion-fab-button>
        </ion-fab>
      }

      <ion-modal [isOpen]="showCreateForm()" (didDismiss)="cancelCreate()">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>New camp</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="cancelCreate()">
                  <ion-icon slot="icon-only" name="close-outline" />
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form (ngSubmit)="createCamp()">
              <ion-list lines="none" class="create-fields">
                <ion-item>
                  <ion-input
                    label="Name"
                    labelPlacement="stacked"
                    [(ngModel)]="createForm.name"
                    name="name"
                    required
                  />
                </ion-item>
                <ion-item>
                  <ion-textarea
                    label="Description"
                    labelPlacement="stacked"
                    [(ngModel)]="createForm.description"
                    name="description"
                    autoGrow="true"
                  />
                </ion-item>
                <ion-item>
                  <ion-input
                    label="Location"
                    labelPlacement="stacked"
                    [(ngModel)]="createForm.location"
                    name="location"
                  />
                </ion-item>
                <ion-item>
                  <ion-input
                    label="Start date"
                    labelPlacement="stacked"
                    type="date"
                    [(ngModel)]="createForm.start_date"
                    name="start_date"
                  />
                </ion-item>
                <ion-item>
                  <ion-input
                    label="End date"
                    labelPlacement="stacked"
                    type="date"
                    [(ngModel)]="createForm.end_date"
                    name="end_date"
                  />
                </ion-item>
              </ion-list>

              @if (createError()) {
                <ion-note color="danger">{{ createError() }}</ion-note>
              }

              <ion-button expand="block" type="submit" class="cta" [disabled]="creating()">
                @if (creating()) {
                  <ion-spinner name="crescent" />
                } @else {
                  Create camp
                }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: `
    ion-content {
      --background: transparent;
    }

    ion-toolbar {
      --background: color-mix(in srgb, var(--ctp-surface) 88%, transparent);
    }

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .join-panel {
      margin: 1.15rem 0 1.35rem;
    }

    .join-hint {
      margin: 0 0 0.75rem;
      color: var(--ctp-text-muted);
      font-size: 0.92rem;
    }

    .join-hint code {
      font-size: 0.85em;
      background: var(--ctp-surface-2);
      padding: 0.1rem 0.35rem;
      border-radius: 6px;
    }

    .camp-card {
      width: 100%;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }

    .camp-card__top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.55rem;
    }

    .camp-card__meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.25rem 0 0;
    }

    .empty-panel {
      margin-top: 0.25rem;
      animation: app-rise 420ms ease both;
    }

    .cta {
      margin-top: 1rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }

    .create-fields {
      background: transparent;
    }

    .create-fields ion-item {
      --background: var(--ctp-surface-2);
      --border-radius: 12px;
      margin-bottom: 0.65rem;
    }
  `,
})
export class MyCampsPage implements OnInit {
  private readonly campsService = inject(CampsService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly camps = signal<CampWithRole[]>([]);
  readonly loading = signal(true);
  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly joining = signal(false);
  readonly joinError = signal<string | null>(null);
  readonly canCreate = computed(() => this.auth.canCreateCamps());

  joinToken = '';

  createForm = {
    name: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
  };

  ngOnInit(): void {
    void this.theme;
    void this.loadCamps();
  }

  async loadCamps(): Promise<void> {
    this.loading.set(true);
    try {
      this.camps.set(await this.campsService.listMyCamps());
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.loadCamps();
    (event.target as HTMLIonRefresherElement).complete();
  }

  openCamp(campId: string): void {
    void this.router.navigate(['/camp', campId, 'dashboard']);
  }

  openCreate(): void {
    if (!this.canCreate()) {
      return;
    }
    this.showCreateForm.set(true);
    this.createError.set(null);
  }

  cancelCreate(): void {
    this.showCreateForm.set(false);
    this.createError.set(null);
    this.resetCreateForm();
  }

  logout(): void {
    void this.auth.logout();
  }

  async joinCamp(): Promise<void> {
    if (!this.joinToken.trim()) {
      return;
    }
    this.joinError.set(null);
    this.joining.set(true);
    try {
      const campId = await this.campsService.joinWithInviteToken(this.joinToken.trim());
      this.joinToken = '';
      await this.router.navigate(['/camp', campId, 'dashboard']);
    } catch (err) {
      this.joinError.set(err instanceof Error ? err.message : 'Failed to join camp');
    } finally {
      this.joining.set(false);
    }
  }

  async createCamp(): Promise<void> {
    if (!this.canCreate()) {
      this.createError.set('You are not allowed to create camps.');
      return;
    }
    if (!this.createForm.name.trim()) {
      this.createError.set('Name is required');
      return;
    }
    this.createError.set(null);
    this.creating.set(true);
    try {
      const camp = await this.campsService.createCamp({
        name: this.createForm.name.trim(),
        description: this.createForm.description.trim() || undefined,
        location: this.createForm.location.trim() || undefined,
        start_date: this.createForm.start_date || null,
        end_date: this.createForm.end_date || null,
      });
      this.showCreateForm.set(false);
      this.resetCreateForm();
      await this.router.navigate(['/camp', camp.id, 'dashboard']);
    } catch (err) {
      this.createError.set(err instanceof Error ? err.message : 'Failed to create camp');
    } finally {
      this.creating.set(false);
    }
  }

  roleColor(role: CampRole): string {
    switch (role) {
      case 'ADMIN':
      case 'ORGANIZER':
        return 'primary';
      case 'VOLUNTEER':
        return 'secondary';
      default:
        return 'medium';
    }
  }

  private resetCreateForm(): void {
    this.createForm = {
      name: '',
      description: '',
      location: '',
      start_date: '',
      end_date: '',
    };
  }
}
