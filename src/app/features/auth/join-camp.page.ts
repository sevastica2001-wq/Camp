import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth/auth.service';
import { CampsService } from '../camps/camps.service';

interface InvitationLookup {
  invitation_id: string;
  camp_id: string;
  camp_name: string;
  camp_status: string;
  slug: string;
  code: string;
}

@Component({
  selector: 'app-join-camp-page',
  standalone: true,
  imports: [RouterLink, IonContent, IonButton, IonNote, IonSpinner],
  template: `
    <ion-content [fullscreen]="true">
      <div class="auth-shell">
        <div class="auth-shell__panel">
          @if (loading()) {
            <div class="ion-text-center">
              <ion-spinner />
            </div>
          } @else if (error()) {
            <p class="auth-eyebrow">Invitation</p>
            <h1 class="app-brand">Unable to join</h1>
            <ion-note color="danger">{{ error() }}</ion-note>
            <div class="auth-shell__links">
              <a routerLink="/dashboard">Go to My Camps</a>
            </div>
          } @else if (invitation()) {
            <p class="auth-eyebrow">You’re invited</p>
            <h1 class="app-brand">{{ invitation()!.camp_name }}</h1>
            <p class="app-brand-sub">Join this camp to register for transportation and updates.</p>

            @if (!auth.isAuthenticated()) {
              <ion-note color="warning">
                Sign in or create an account to accept this invitation.
              </ion-note>
              <ion-button
                expand="block"
                class="auth-submit"
                [routerLink]="['/login']"
                [queryParams]="{ returnUrl: returnUrl() }"
              >
                Sign in to join
              </ion-button>
              <ion-button
                expand="block"
                fill="outline"
                class="auth-submit-outline"
                [routerLink]="['/register']"
                [queryParams]="{ returnUrl: returnUrl() }"
              >
                Create account
              </ion-button>
            } @else if (joining()) {
              <div class="ion-text-center ion-padding">
                <ion-spinner />
                <p>Joining camp…</p>
              </div>
            } @else if (joined()) {
              <ion-note color="success">You have joined the camp!</ion-note>
            } @else {
              <ion-button expand="block" class="auth-submit" (click)="join()">
                Join camp
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

    .auth-eyebrow {
      margin: 0 0 0.4rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .auth-submit {
      margin-top: 1.25rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }

    .auth-submit-outline {
      margin-top: 0.65rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }
  `,
})
export class JoinCampPage {
  readonly slug = input.required<string>();
  readonly code = input.required<string>();

  readonly auth = inject(AuthService);
  private readonly campsService = inject(CampsService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly joining = signal(false);
  readonly joined = signal(false);
  readonly error = signal<string | null>(null);
  readonly invitation = signal<InvitationLookup | null>(null);

  constructor() {
    effect(() => {
      void this.loadInvitation(this.slug(), this.code());
    });

    effect(() => {
      const inv = this.invitation();
      if (
        !this.auth.ready() ||
        !this.auth.isAuthenticated() ||
        !inv ||
        this.joined() ||
        this.joining() ||
        this.loading()
      ) {
        return;
      }
      void this.join();
    });
  }

  returnUrl(): string {
    return `/join/${this.slug()}/${this.code()}`;
  }

  private async loadInvitation(slug: string, code: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.campsService.lookupInvitation(slug, code);
      if (!result) {
        this.error.set('Invitation not found or expired.');
        this.invitation.set(null);
        return;
      }
      this.invitation.set(result as InvitationLookup);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      this.loading.set(false);
    }
  }

  async join(): Promise<void> {
    if (!this.auth.isAuthenticated() || this.joining() || this.joined()) {
      if (!this.auth.isAuthenticated()) {
        await this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.returnUrl() },
        });
      }
      return;
    }

    this.joining.set(true);
    this.error.set(null);
    try {
      const campId = await this.campsService.joinWithInvite(this.slug(), this.code());
      this.joined.set(true);
      await this.router.navigate(['/camp', campId, 'dashboard']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to join camp');
    } finally {
      this.joining.set(false);
    }
  }
}
