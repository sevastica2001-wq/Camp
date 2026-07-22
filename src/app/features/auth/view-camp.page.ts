import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonNote, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth/auth.service';
import { CampsService } from '../camps/camps.service';

interface InvitationLookup {
  invitation_id: string;
  camp_id: string;
  camp_name: string;
  camp_status: string;
  slug: string;
  code: string;
  invited_role?: string;
}

@Component({
  selector: 'app-view-camp-page',
  standalone: true,
  imports: [RouterLink, IonContent, IonNote, IonSpinner],
  template: `
    <ion-content [fullscreen]="true">
      <div class="auth-shell">
        <div class="auth-shell__panel">
          @if (loading() || joining()) {
            <div class="ion-text-center">
              <ion-spinner />
              <p class="muted">Opening guest view…</p>
            </div>
          } @else if (error()) {
            <p class="auth-eyebrow">Guest view</p>
            <h1 class="app-brand">Unable to open</h1>
            <ion-note color="danger">{{ error() }}</ion-note>
            <div class="auth-shell__links">
              <a routerLink="/login">Back to sign in</a>
            </div>
          } @else if (invitation()) {
            <p class="auth-eyebrow">Guest view</p>
            <h1 class="app-brand">{{ invitation()!.camp_name }}</h1>
            <p class="app-brand-sub">Continuing as guest…</p>
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

    .muted {
      margin-top: 0.75rem;
      color: var(--ctp-text-muted);
    }
  `,
})
export class ViewCampPage {
  readonly slug = input.required<string>();
  readonly code = input.required<string>();

  readonly auth = inject(AuthService);
  private readonly campsService = inject(CampsService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly joining = signal(false);
  readonly error = signal<string | null>(null);
  readonly invitation = signal<InvitationLookup | null>(null);

  constructor() {
    effect(() => {
      void this.loadAndEnter(this.slug(), this.code());
    });
  }

  private async loadAndEnter(slug: string, code: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const started = Date.now();
      while (!this.auth.ready() && Date.now() - started < 4000) {
        await new Promise((r) => setTimeout(r, 50));
      }

      const result = (await this.campsService.lookupInvitation(
        slug,
        code,
      )) as InvitationLookup | null;
      if (!result) {
        this.error.set('Guest link not found or expired.');
        this.invitation.set(null);
        return;
      }
      if (result.invited_role && result.invited_role !== 'VIEWER') {
        this.error.set('This invitation is not a guest viewer link. Use the join link instead.');
        this.invitation.set(null);
        return;
      }
      this.invitation.set(result);

      this.joining.set(true);
      if (!this.auth.isAuthenticated()) {
        const guest = await this.auth.signInAsGuest();
        if (guest.error) {
          this.error.set(
            guest.error.toLowerCase().includes('anonymous')
              ? 'Guest sign-in is not enabled yet. Ask an organizer to turn on Anonymous auth in Supabase.'
              : guest.error,
          );
          return;
        }
      }

      const campId = await this.campsService.joinWithInvite(slug, code);
      await this.router.navigate(['/camp', campId, 'transportation']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to open guest view');
    } finally {
      this.joining.set(false);
      this.loading.set(false);
    }
  }
}

/** Parse pasted guest link: full URL, `/view/slug/code`, or `slug/code`. */
export function parseGuestViewToken(raw: string): { slug: string; code: string } | null {
  let v = raw.trim();
  if (!v) {
    return null;
  }
  if (v.includes('/view/')) {
    v = v.split('/view/')[1] ?? '';
  } else if (v.includes('/join/')) {
    v = v.split('/join/')[1] ?? '';
  }
  v = v.replace(/^\/+|\/+$/g, '');
  const parts = v.split(/[/\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return { slug: parts[0], code: parts[1] };
  }
  return null;
}
