import { Component, computed, HostBinding, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bedOutline,
  calculatorOutline,
  carOutline,
  carSportOutline,
  checkboxOutline,
  chevronBackOutline,
  chevronForwardOutline,
  contrastOutline,
  homeOutline,
  logOutOutline,
  peopleOutline,
  personOutline,
  settingsOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth/auth.service';
import { CampContextService } from '../core/camp-context/camp-context.service';
import { PermissionService } from '../core/permissions/permission.service';
import { ThemeService } from '../core/theme.service';
import { RegistrationsService } from '../features/participants/registrations.service';

addIcons({
  homeOutline,
  peopleOutline,
  carOutline,
  carSportOutline,
  personOutline,
  settingsOutline,
  arrowBackOutline,
  logOutOutline,
  contrastOutline,
  calculatorOutline,
  bedOutline,
  checkboxOutline,
  chevronBackOutline,
  chevronForwardOutline,
});

const SIDEBAR_KEY = 'camp-shell-nav-collapsed';

interface NavItem {
  label: string;
  icon: string;
  link: string[];
  exact?: boolean;
  soon?: boolean;
}

@Component({
  selector: 'app-camp-shell-page',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonIcon,
    IonMenuToggle,
    IonRouterOutlet,
  ],
  template: `
    <ion-split-pane when="(min-width: 992px)" contentId="camp-content">
      <ion-menu
        contentId="camp-content"
        type="overlay"
        class="camp-menu"
        [class.camp-menu--collapsed]="collapsed()"
      >
        <div class="camp-nav">
          <header class="camp-nav__brand">
            <div class="camp-nav__brand-row">
              <div class="camp-nav__brand-text">
                <p class="camp-nav__eyebrow">Camp</p>
                <h1 class="camp-nav__title" [title]="campName()">{{ campName() }}</h1>
                @if (campLocation()) {
                  <p class="camp-nav__location" [title]="campLocation()">{{ campLocation() }}</p>
                }
              </div>
              <button
                type="button"
                class="camp-nav__collapse"
                (click)="toggleCollapsed()"
                [attr.aria-label]="collapsed() ? 'Expand menu' : 'Collapse menu'"
                [title]="collapsed() ? 'Expand menu' : 'Collapse menu'"
              >
                <ion-icon
                  [name]="collapsed() ? 'chevron-forward-outline' : 'chevron-back-outline'"
                />
              </button>
            </div>
          </header>

          <ion-content class="camp-nav__scroll" [scrollY]="true">
            <div class="camp-nav__inner">
              <p class="camp-nav__section">Workspace</p>
              <nav class="camp-nav__tabs" aria-label="Camp features">
                @for (item of workspaceItems(); track item.label) {
                  <ion-menu-toggle autoHide="true">
                    <a
                      class="camp-nav__tab"
                      [routerLink]="item.link"
                      routerLinkActive="camp-nav__tab--active"
                      [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                      [attr.title]="item.label"
                      [attr.aria-label]="item.label"
                    >
                      <ion-icon [name]="item.icon" aria-hidden="true" />
                      <span>{{ item.label }}</span>
                    </a>
                  </ion-menu-toggle>
                }
              </nav>

              @if (!isViewer()) {
                <p class="camp-nav__section">Coming soon</p>
                <nav class="camp-nav__tabs" aria-label="Upcoming features">
                  @for (item of upcomingItems(); track item.label) {
                    <ion-menu-toggle autoHide="true">
                      <a
                        class="camp-nav__tab camp-nav__tab--soon"
                        [routerLink]="item.link"
                        routerLinkActive="camp-nav__tab--active"
                        [attr.title]="item.label + ' (soon)'"
                        [attr.aria-label]="item.label + ' (coming soon)'"
                      >
                        <ion-icon [name]="item.icon" aria-hidden="true" />
                        <span>{{ item.label }}</span>
                        <em>Soon</em>
                      </a>
                    </ion-menu-toggle>
                  }
                </nav>
              }

              <p class="camp-nav__section">Account</p>
              <nav class="camp-nav__tabs camp-nav__tabs--footer" aria-label="Account">
                @if (!isViewer()) {
                  <ion-menu-toggle autoHide="true">
                    <a
                      class="camp-nav__tab"
                      [routerLink]="settingsLink()"
                      routerLinkActive="camp-nav__tab--active"
                      title="Settings"
                      aria-label="Settings"
                    >
                      <ion-icon name="settings-outline" aria-hidden="true" />
                      <span>Settings</span>
                    </a>
                  </ion-menu-toggle>
                  <ion-menu-toggle autoHide="true">
                    <a
                      class="camp-nav__tab"
                      routerLink="/dashboard"
                      title="My Camps"
                      aria-label="My Camps"
                    >
                      <ion-icon name="arrow-back-outline" aria-hidden="true" />
                      <span>My Camps</span>
                    </a>
                  </ion-menu-toggle>
                }
                <button
                  type="button"
                  class="camp-nav__tab"
                  (click)="cycleTheme()"
                  [title]="'Theme: ' + themeLabel()"
                  [attr.aria-label]="'Theme: ' + themeLabel()"
                >
                  <ion-icon name="contrast-outline" aria-hidden="true" />
                  <span>Theme: {{ themeLabel() }}</span>
                </button>
                <button
                  type="button"
                  class="camp-nav__tab"
                  (click)="logout()"
                  [title]="logoutLabel()"
                  [attr.aria-label]="logoutLabel()"
                >
                  <ion-icon name="log-out-outline" aria-hidden="true" />
                  <span>{{ logoutLabel() }}</span>
                </button>
              </nav>
            </div>
          </ion-content>
        </div>
      </ion-menu>

      <div class="ion-page camp-shell-content" id="camp-content">
        <ion-router-outlet />
      </div>
    </ion-split-pane>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    ion-split-pane {
      height: 100%;
    }

    .camp-menu {
      --width: 272px;
      --background: var(--ctp-surface);
      border-right: 1px solid var(--ctp-border);
      max-width: var(--width);
      transition: max-width 200ms ease;
    }

    .camp-menu--collapsed {
      --width: 72px;
    }

    .camp-nav {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ctp-surface);
      overflow: hidden;
    }

    .camp-nav__brand {
      flex-shrink: 0;
      padding: calc(0.85rem + env(safe-area-inset-top, 0px)) 0.65rem 0.75rem;
      background:
        linear-gradient(
          160deg,
          color-mix(in srgb, var(--ctp-accent) 22%, transparent),
          transparent 68%
        ),
        var(--ctp-surface);
      border-bottom: 1px solid var(--ctp-border);
    }

    .camp-nav__brand-row {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
    }

    .camp-nav__brand-text {
      flex: 1;
      min-width: 0;
      padding-left: 0.45rem;
    }

    .camp-nav__eyebrow {
      margin: 0;
      font-size: 0.7rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ctp-accent);
      font-weight: 700;
    }

    .camp-nav__title {
      font-family: var(--ctp-font-display);
      font-size: 1.35rem;
      font-weight: 600;
      line-height: 1.2;
      margin: 0.3rem 0 0;
      color: var(--ctp-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .camp-nav__location {
      margin: 0.3rem 0 0;
      color: var(--ctp-text-muted);
      font-size: 0.85rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .camp-nav__collapse {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 2.1rem;
      height: 2.1rem;
      margin: 0;
      border: 1px solid var(--ctp-border);
      border-radius: 10px;
      background: var(--ctp-surface-2);
      color: var(--ctp-accent);
      cursor: pointer;
    }

    .camp-nav__collapse:hover,
    .camp-nav__collapse:focus-visible {
      background: var(--ctp-accent-soft);
      outline: none;
    }

    .camp-nav__collapse ion-icon {
      font-size: 1.15rem;
    }

    .camp-nav__scroll {
      flex: 1;
      min-height: 0;
      --background: var(--ctp-surface);
    }

    .camp-nav__inner {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: 0.75rem 0.55rem calc(1rem + env(safe-area-inset-bottom, 0px));
    }

    .camp-nav__section {
      margin: 0.75rem 0.45rem 0.35rem;
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-text-muted);
      white-space: nowrap;
      overflow: hidden;
    }

    .camp-nav__section:first-child {
      margin-top: 0.1rem;
    }

    .camp-nav__tabs {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .camp-nav__tabs--footer {
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid var(--ctp-border);
    }

    .camp-nav__tab {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      width: 100%;
      margin: 0;
      padding: 0.72rem 0.75rem;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: var(--ctp-text);
      font: inherit;
      font-weight: 560;
      font-size: 0.95rem;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition:
        background 160ms ease,
        color 160ms ease;
    }

    .camp-nav__tab ion-icon {
      flex-shrink: 0;
      font-size: 1.25rem;
      color: var(--ctp-accent);
    }

    .camp-nav__tab span {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .camp-nav__tab em {
      font-style: normal;
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-text-muted);
      background: var(--ctp-surface-2);
      border-radius: 999px;
      padding: 0.18rem 0.45rem;
    }

    .camp-nav__tab:hover,
    .camp-nav__tab:focus-visible {
      background: var(--ctp-surface-2);
      outline: none;
    }

    .camp-nav__tab--active {
      background: var(--ctp-accent-soft);
      color: var(--ctp-accent);
      box-shadow: inset 3px 0 0 var(--ctp-accent);
      font-weight: 650;
    }

    .camp-nav__tab--soon:not(.camp-nav__tab--active) {
      color: color-mix(in srgb, var(--ctp-text) 78%, transparent);
    }

    ion-menu-toggle {
      display: block;
    }

    /* Icon rail */
    .camp-menu--rail .camp-nav__brand-text,
    .camp-menu--rail .camp-nav__section,
    .camp-menu--rail .camp-nav__tab span,
    .camp-menu--rail .camp-nav__tab em {
      display: none;
    }

    .camp-menu--rail .camp-nav__brand-row {
      justify-content: center;
    }

    .camp-menu--rail .camp-nav__brand {
      padding-left: 0.45rem;
      padding-right: 0.45rem;
    }

    .camp-menu--rail .camp-nav__inner {
      padding-left: 0.4rem;
      padding-right: 0.4rem;
    }

    .camp-menu--rail .camp-nav__tab {
      justify-content: center;
      padding: 0.78rem 0.4rem;
      gap: 0;
    }

    .camp-menu--rail .camp-nav__tab--active {
      box-shadow: none;
    }

    .camp-menu--rail .camp-nav__tabs--footer {
      border-top-color: transparent;
    }

    .camp-shell-content {
      background: var(--ctp-page-gradient);
      min-width: 0;
    }

    @media (max-width: 991px) {
      .camp-menu {
        --width: 280px;
      }

      .camp-menu--rail {
        --width: 280px;
      }

      .camp-menu--rail .camp-nav__brand-text,
      .camp-menu--rail .camp-nav__section,
      .camp-menu--rail .camp-nav__tab span,
      .camp-menu--rail .camp-nav__tab em {
        display: initial;
      }

      .camp-menu--rail .camp-nav__tab span {
        display: block;
        flex: 1;
      }

      .camp-menu--rail .camp-nav__tab em {
        display: inline-block;
      }

      .camp-menu--rail .camp-nav__tab {
        justify-content: flex-start;
        padding: 0.72rem 0.75rem;
        gap: 0.7rem;
      }

      .camp-nav__collapse {
        display: none;
      }
    }
  `,
})
export class CampShellPage implements OnInit {
  private readonly campContext = inject(CampContextService);
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  private readonly registrations = inject(RegistrationsService);
  private readonly theme = inject(ThemeService);

  readonly campName = computed(() => this.campContext.currentCamp()?.name ?? 'Camp');
  readonly campLocation = computed(() => this.campContext.currentCamp()?.location ?? '');
  readonly showDriverPortal = signal(false);
  readonly collapsed = signal(this.readCollapsed());
  readonly isViewer = computed(() => this.permissions.isViewer());
  readonly logoutLabel = computed(() =>
    this.auth.isAnonymous() || this.permissions.isViewer() ? 'Exit guest' : 'Logout',
  );
  readonly themeLabel = computed(() => {
    const t = this.theme.theme();
    return t === 'system' ? 'System' : t === 'dark' ? 'Dark' : 'Light';
  });

  @HostBinding('class.shell-collapsed')
  get hostCollapsed(): boolean {
    return this.collapsed();
  }

  readonly workspaceItems = computed((): NavItem[] => {
    if (this.permissions.isViewer()) {
      return [
        { label: 'Transport planner', icon: 'car-outline', link: this.transportationLink() },
        { label: 'Room management', icon: 'bed-outline', link: this.roomsLink() },
      ];
    }
    const items: NavItem[] = [
      { label: 'Dashboard', icon: 'home-outline', link: this.dashboardLink(), exact: true },
      { label: 'Transport planner', icon: 'car-outline', link: this.transportationLink() },
      { label: 'Participants', icon: 'people-outline', link: this.participantsLink() },
      { label: 'Room management', icon: 'bed-outline', link: this.roomsLink() },
    ];
    if (this.showDriverPortal()) {
      items.push({
        label: 'Driver portal',
        icon: 'car-sport-outline',
        link: this.driverPortalLink(),
      });
    }
    return items;
  });

  readonly upcomingItems = computed((): NavItem[] => [
    { label: 'Budgeting', icon: 'calculator-outline', link: this.moduleLink('budgeting'), soon: true },
    { label: 'Tasks', icon: 'checkbox-outline', link: this.moduleLink('tasks'), soon: true },
  ]);

  ngOnInit(): void {
    void this.loadMenuFlags();
  }

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
  }

  cycleTheme(): void {
    this.theme.cycleTheme();
  }

  private readCollapsed(): boolean {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      if (raw === null) {
        return true;
      }
      return raw === '1';
    } catch {
      return true;
    }
  }

  private async loadMenuFlags(): Promise<void> {
    try {
      const campId = this.campContext.campId();
      if (!campId) {
        return;
      }
      const mine = await this.registrations.getMine(campId);
      this.showDriverPortal.set(mine?.transport_role === 'DRIVER');
    } catch {
      this.showDriverPortal.set(false);
    }
  }

  private campBase(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id] : ['/dashboard'];
  }

  dashboardLink(): string[] {
    return [...this.campBase(), 'dashboard'];
  }

  myRegistrationLink(): string[] {
    return [...this.campBase(), 'me'];
  }

  driverPortalLink(): string[] {
    return [...this.campBase(), 'driver'];
  }

  participantsLink(): string[] {
    return [...this.campBase(), 'participants'];
  }

  roomsLink(): string[] {
    return [...this.campBase(), 'rooms'];
  }

  transportationLink(): string[] {
    return [...this.campBase(), 'transportation'];
  }

  settingsLink(): string[] {
    return [...this.campBase(), 'settings'];
  }

  moduleLink(slug: string): string[] {
    return [...this.campBase(), 'modules', slug];
  }

  logout(): void {
    this.campContext.clear();
    void this.auth.logout();
  }
}
