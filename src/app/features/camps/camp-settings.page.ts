import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonMenuButton,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { copyOutline, duplicateOutline, linkOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import {
  CampInvitation,
  CampMemberWithUser,
  CampRole,
  CampStatus,
} from '../../core/supabase/database.types';
import { PermissionService } from '../../core/permissions/permission.service';
import { CampsService } from '../camps/camps.service';

addIcons({ copyOutline, duplicateOutline, linkOutline });

@Component({
  selector: 'app-camp-settings-page',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonMenuButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
          <ion-back-button [defaultHref]="dashboardLink()" />
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="app-page">
        <div class="app-page-inner app-fade-in">
          <p class="page-eyebrow">Camp</p>
          <h1 class="app-brand">Settings</h1>
          <p class="app-brand-sub">Details, members, invites, and lifecycle.</p>

          @if (!isOrganizer()) {
            <ion-note color="warning">Only organizers can edit camp settings.</ion-note>
          }

          @if (loading()) {
            <div class="ion-text-center ion-padding">
              <ion-spinner />
            </div>
          } @else {
            <form (ngSubmit)="saveCamp()">
              <section class="app-panel">
                <h2 class="app-section-title">Camp details</h2>
                <ion-list lines="none" class="form-fields">
                  <ion-item>
                    <ion-input
                      label="Name"
                      labelPlacement="stacked"
                      [(ngModel)]="form.name"
                      name="name"
                      [readonly]="!isOrganizer()"
                      required
                    />
                  </ion-item>
                  <ion-item>
                    <ion-textarea
                      label="Description"
                      labelPlacement="stacked"
                      [(ngModel)]="form.description"
                      name="description"
                      [readonly]="!isOrganizer()"
                      autoGrow="true"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      label="Location"
                      labelPlacement="stacked"
                      [(ngModel)]="form.location"
                      name="location"
                      [readonly]="!isOrganizer()"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-select
                      label="Status"
                      labelPlacement="stacked"
                      [(ngModel)]="form.status"
                      name="status"
                      [disabled]="!isOrganizer()"
                    >
                      @for (status of statusOptions; track status) {
                        <ion-select-option [value]="status">{{ status }}</ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                </ion-list>

                @if (saveError()) {
                  <ion-note color="danger">{{ saveError() }}</ion-note>
                }

                @if (isOrganizer()) {
                  <ion-button expand="block" type="submit" class="cta" [disabled]="saving()">
                    @if (saving()) {
                      <ion-spinner name="crescent" />
                    } @else {
                      Save changes
                    }
                  </ion-button>
                }
              </section>
            </form>

            @if (isOrganizer()) {
              <section class="app-panel">
                <h2 class="app-section-title">Members</h2>
                <p class="section-hint">Promote trusted people to help organize this camp.</p>
                @if (memberError()) {
                  <ion-note color="danger">{{ memberError() }}</ion-note>
                }
                <div class="member-list">
                  @for (m of members(); track m.id) {
                    <div class="member-row">
                      <div class="member-row__text">
                        <strong>{{ memberName(m) }}</strong>
                        <span>{{ m.user?.email || m.user_id }}</span>
                      </div>
                      <ion-select
                        [ngModel]="m.role"
                        [ngModelOptions]="{ standalone: true }"
                        interface="popover"
                        [disabled]="updatingMemberId() === m.id || m.user_id === myUserId()"
                        (ngModelChange)="onRoleChange(m, $event)"
                      >
                        @for (role of roleOptions; track role) {
                          <ion-select-option [value]="role">{{ role }}</ion-select-option>
                        }
                      </ion-select>
                    </div>
                  } @empty {
                    <p class="empty">No members yet</p>
                  }
                </div>
              </section>

              <section class="app-panel">
                <h2 class="app-section-title">Invitations</h2>
                <p class="section-hint">
                  Participant links for everyone; organizer links only for co-leaders.
                </p>
                <ion-list lines="none" class="form-fields">
                  <ion-item>
                    <ion-input
                      label="Invitation slug"
                      labelPlacement="stacked"
                      [(ngModel)]="inviteSlug"
                      name="inviteSlug"
                      placeholder="summer-retreat-2026"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-select
                      label="Invite as"
                      labelPlacement="stacked"
                      [(ngModel)]="inviteRole"
                      name="inviteRole"
                    >
                      @for (role of inviteRoleOptions; track role) {
                        <ion-select-option [value]="role">{{ role }}</ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                </ion-list>
                <ion-button
                  expand="block"
                  class="cta"
                  (click)="createInvitation()"
                  [disabled]="creatingInvite()"
                >
                  Create invitation
                </ion-button>

                @if (lastJoinUrl()) {
                  <button type="button" class="join-url" (click)="copyJoinUrl()">
                    {{ lastJoinUrl() }}
                    <span>Tap to copy · {{ lastInviteRole() }}</span>
                  </button>
                }

                <div class="invite-list">
                  @for (inv of invitations(); track inv.id) {
                    <div class="invite-row">
                      <div class="invite-row__text">
                        <strong>{{ inv.slug }} / {{ inv.code }}</strong>
                        <span class="invite-row__url">
                          {{ inv.invited_role || 'PARTICIPANT' }} · {{ joinUrl(inv) }}
                        </span>
                      </div>
                      <ion-button fill="outline" size="small" (click)="copyUrl(inv)">Copy</ion-button>
                    </div>
                  } @empty {
                    <p class="empty">No invitations yet</p>
                  }
                </div>
              </section>

              <ion-button
                expand="block"
                fill="outline"
                color="secondary"
                class="cta"
                (click)="duplicateCamp()"
                [disabled]="duplicating()"
              >
                Duplicate camp
              </ion-button>
            }
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

    .section-hint {
      margin: 0 0 0.85rem;
      color: var(--ctp-text-muted);
      font-size: 0.9rem;
    }

    .form-fields {
      background: transparent;
    }

    .form-fields ion-item {
      --background: var(--ctp-surface-2);
      --border-radius: 12px;
      margin-bottom: 0.55rem;
    }

    .cta {
      margin-top: 0.85rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }

    .join-url {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      width: 100%;
      margin-top: 0.85rem;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      border: 1px dashed var(--ctp-accent);
      background: var(--ctp-accent-soft);
      color: var(--ctp-text);
      font: inherit;
      text-align: left;
      word-break: break-all;
      cursor: pointer;
    }

    .join-url span {
      font-size: 0.78rem;
      color: var(--ctp-text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .invite-list,
    .member-list {
      margin-top: 1rem;
    }

    .invite-row,
    .member-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--ctp-border);
    }

    .invite-row__text,
    .member-row__text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      flex: 1;
    }

    .member-row__text span,
    .invite-row__url {
      color: var(--ctp-text-muted);
      font-size: 0.85rem;
      word-break: break-all;
    }

    .member-row ion-select {
      max-width: 150px;
      min-width: 120px;
    }

    .empty {
      color: var(--ctp-text-muted);
      margin: 0.5rem 0 0;
    }
  `,
})
export class CampSettingsPage implements OnInit {
  readonly campId = input<string>();

  private readonly campsService = inject(CampsService);
  private readonly campContext = inject(CampContextService);
  private readonly permissions = inject(PermissionService);
  private readonly auth = inject(AuthService);
  private readonly alertCtrl = inject(AlertController);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly creatingInvite = signal(false);
  readonly duplicating = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly memberError = signal<string | null>(null);
  readonly updatingMemberId = signal<string | null>(null);
  readonly invitations = signal<CampInvitation[]>([]);
  readonly members = signal<CampMemberWithUser[]>([]);
  readonly lastJoinUrl = signal<string | null>(null);
  readonly lastInviteRole = signal<CampRole>('PARTICIPANT');

  readonly isOrganizer = computed(() => this.permissions.isOrganizer());
  readonly myUserId = computed(() => this.auth.user()?.id ?? null);

  readonly statusOptions: CampStatus[] = [
    'draft',
    'registration_open',
    'planning',
    'active',
    'finished',
    'archived',
  ];

  readonly roleOptions: CampRole[] = ['ADMIN', 'ORGANIZER', 'VOLUNTEER', 'PARTICIPANT'];
  readonly inviteRoleOptions: CampRole[] = ['PARTICIPANT', 'VOLUNTEER', 'ORGANIZER'];

  form = {
    name: '',
    description: '',
    location: '',
    status: 'draft' as CampStatus,
  };

  inviteSlug = '';
  inviteRole: CampRole = 'PARTICIPANT';

  ngOnInit(): void {
    void this.load();
  }

  memberName(m: CampMemberWithUser): string {
    const first = m.user?.first_name?.trim() ?? '';
    const last = m.user?.last_name?.trim() ?? '';
    const full = `${first} ${last}`.trim();
    return full || m.user?.email || 'Member';
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const camp = this.campContext.currentCamp();
      if (camp) {
        this.form = {
          name: camp.name,
          description: camp.description,
          location: camp.location,
          status: camp.status,
        };
        this.inviteSlug = camp.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      const id = this.campId() ?? this.campContext.campId();
      if (id) {
        const [invites, members] = await Promise.all([
          this.campsService.listInvitations(id),
          this.campsService.listMembersWithUsers(id),
        ]);
        this.invitations.set(invites);
        this.members.set(members);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async saveCamp(): Promise<void> {
    if (!this.isOrganizer()) {
      return;
    }
    const id = this.campId() ?? this.campContext.campId();
    if (!id) {
      return;
    }
    this.saveError.set(null);
    this.saving.set(true);
    try {
      const updated = await this.campsService.updateCamp(id, {
        name: this.form.name.trim(),
        description: this.form.description.trim(),
        location: this.form.location.trim(),
        status: this.form.status,
      });
      await this.campContext.setCampById(id);
      this.form.status = updated.status;
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  async onRoleChange(member: CampMemberWithUser, role: CampRole): Promise<void> {
    if (!role || role === member.role) {
      return;
    }
    this.memberError.set(null);
    this.updatingMemberId.set(member.id);
    try {
      await this.campsService.updateMemberRole(member.id, role);
      this.members.update((list) =>
        list.map((m) => (m.id === member.id ? { ...m, role } : m)),
      );
    } catch (err) {
      this.memberError.set(err instanceof Error ? err.message : 'Failed to update role');
      const id = this.campId() ?? this.campContext.campId();
      if (id) {
        this.members.set(await this.campsService.listMembersWithUsers(id));
      }
    } finally {
      this.updatingMemberId.set(null);
    }
  }

  async createInvitation(): Promise<void> {
    const id = this.campId() ?? this.campContext.campId();
    if (!id || !this.inviteSlug.trim()) {
      return;
    }
    this.creatingInvite.set(true);
    try {
      const inv = await this.campsService.createInvitation(
        id,
        this.inviteSlug.trim(),
        this.inviteRole,
      );
      this.invitations.set(await this.campsService.listInvitations(id));
      this.lastJoinUrl.set(this.joinUrl(inv));
      this.lastInviteRole.set(inv.invited_role ?? this.inviteRole);
    } finally {
      this.creatingInvite.set(false);
    }
  }

  joinUrl(inv: CampInvitation): string {
    return `${window.location.origin}/join/${inv.slug}/${inv.code}`;
  }

  copyJoinUrl(): void {
    const url = this.lastJoinUrl();
    if (url) {
      void navigator.clipboard.writeText(url);
    }
  }

  copyUrl(inv: CampInvitation): void {
    void navigator.clipboard.writeText(this.joinUrl(inv));
  }

  async duplicateCamp(): Promise<void> {
    const id = this.campId() ?? this.campContext.campId();
    if (!id) {
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Duplicate camp',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'New camp name',
          value: `${this.form.name} (copy)`,
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Duplicate',
          handler: (data: { name?: string }) => {
            void this.runDuplicate(id, data.name?.trim() ?? '');
          },
        },
      ],
    });
    await alert.present();
  }

  private async runDuplicate(sourceId: string, newName: string): Promise<void> {
    if (!newName) {
      return;
    }
    this.duplicating.set(true);
    try {
      const created = await this.campsService.duplicateCamp(sourceId, newName);
      await this.router.navigate(['/camp', created.id, 'dashboard']);
    } finally {
      this.duplicating.set(false);
    }
  }

  dashboardLink(): string {
    const id = this.campId() ?? this.campContext.campId();
    return id ? `/camp/${id}/dashboard` : '/dashboard';
  }
}
