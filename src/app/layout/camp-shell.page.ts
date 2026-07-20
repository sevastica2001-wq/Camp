import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  contrastOutline,
  homeOutline,
  logOutOutline,
  peopleOutline,
  personOutline,
  settingsOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth/auth.service';
import { CampContextService } from '../core/camp-context/camp-context.service';
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
});

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
      <ion-menu contentId="camp-content" type="overlay" class="camp-menu">
        <div class="camp-nav">
          <header class="camp-nav__brand">
            <p class="camp-nav__eyebrow">Camp</p>
            <h1 class="camp-nav__title">{{ campName() }}</h1>
            @if (campLocation()) {
              <p class="camp-nav__location">{{ campLocation() }}</p>
            }
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
                    >
                      <ion-icon [name]="item.icon" aria-hidden="true" />
                      <span>{{ item.label }}</span>
                    </a>
                  </ion-menu-toggle>
                }
              </nav>

              <p class="camp-nav__section">Coming soon</p>
              <nav class="camp-nav__tabs" aria-label="Upcoming features">
                @for (item of upcomingItems(); track item.label) {
                  <ion-menu-toggle autoHide="true">
                    <a
                      class="camp-nav__tab camp-nav__tab--soon"
                      [routerLink]="item.link"
                      routerLinkActive="camp-nav__tab--active"
                    >
                      <ion-icon [name]="item.icon" aria-hidden="true" />
                      <span>{{ item.label }}</span>
                      <em>Soon</em>
                    </a>
                  </ion-menu-toggle>
                }
              </nav>

              <p class="camp-nav__section">Account</p>
              <nav class="camp-nav__tabs camp-nav__tabs--footer" aria-label="Account">
                <ion-menu-toggle autoHide="true">
                  <a
                    class="camp-nav__tab"
                    [routerLink]="settingsLink()"
                    routerLinkActive="camp-nav__tab--active"
                  >
                    <ion-icon name="settings-outline" aria-hidden="true" />
                    <span>Settings</span>
                  </a>
                </ion-menu-toggle>
                <ion-menu-toggle autoHide="true">
                  <a class="camp-nav__tab" routerLink="/dashboard">
                    <ion-icon name="arrow-back-outline" aria-hidden="true" />
                    <span>My Camps</span>
                  </a>
                </ion-menu-toggle>
                <button type="button" class="camp-nav__tab" (click)="cycleTheme()">
                  <ion-icon name="contrast-outline" aria-hidden="true" />
                  <span>Theme: {{ themeLabel() }}</span>
                </button>
                <button type="button" class="camp-nav__tab" (click)="logout()">
                  <ion-icon name="log-out-outline" aria-hidden="true" />
                  <span>Logout</span>
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
    }

    .camp-nav {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ctp-surface);
    }

    .camp-nav__brand {
      flex-shrink: 0;
      padding: calc(1.15rem + env(safe-area-inset-top, 0px)) 1.15rem 1rem;
      background:
        linear-gradient(
          160deg,
          color-mix(in srgb, var(--ctp-accent) 22%, transparent),
          transparent 68%
        ),
        var(--ctp-surface);
      border-bottom: 1px solid var(--ctp-border);
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
      font-size: 1.45rem;
      font-weight: 600;
      line-height: 1.2;
      margin: 0.35rem 0 0;
      color: var(--ctp-text);
    }

    .camp-nav__location {
      margin: 0.35rem 0 0;
      color: var(--ctp-text-muted);
      font-size: 0.88rem;
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
      padding: 0.85rem 0.7rem calc(1rem + env(safe-area-inset-bottom, 0px));
    }

    .camp-nav__section {
      margin: 0.85rem 0.55rem 0.4rem;
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-text-muted);
    }

    .camp-nav__section:first-child {
      margin-top: 0.15rem;
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
      padding: 0.72rem 0.8rem;
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
      font-size: 1.2rem;
      color: var(--ctp-accent);
    }

    .camp-nav__tab span {
      flex: 1;
      min-width: 0;
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

    .camp-shell-content {
      background: var(--ctp-page-gradient);
    }
  `,
})
export class CampShellPage implements OnInit {
  private readonly campContext = inject(CampContextService);
  private readonly auth = inject(AuthService);
  private readonly registrations = inject(RegistrationsService);
  private readonly theme = inject(ThemeService);

  readonly campName = computed(() => this.campContext.currentCamp()?.name ?? 'Camp');
  readonly campLocation = computed(() => this.campContext.currentCamp()?.location ?? '');
  readonly showDriverPortal = signal(false);
  readonly themeLabel = computed(() => {
    const t = this.theme.theme();
    return t === 'system' ? 'System' : t === 'dark' ? 'Dark' : 'Light';
  });

  readonly workspaceItems = computed((): NavItem[] => {
    const items: NavItem[] = [
      { label: 'Dashboard', icon: 'home-outline', link: this.dashboardLink(), exact: true },
      { label: 'Transport planner', icon: 'car-outline', link: this.transportationLink() },
      { label: 'Participants', icon: 'people-outline', link: this.participantsLink() },
      { label: 'My registration', icon: 'person-outline', link: this.myRegistrationLink() },
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
    {
      label: 'Room management',
      icon: 'bed-outline',
      link: this.moduleLink('rooms'),
      soon: true,
    },
    { label: 'Tasks', icon: 'checkbox-outline', link: this.moduleLink('tasks'), soon: true },
  ]);

  ngOnInit(): void {
    void this.loadMenuFlags();
  }

  cycleTheme(): void {
    this.theme.cycleTheme();
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
