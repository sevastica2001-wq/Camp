import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-content [fullscreen]="true">
      <div class="auth-shell">
        <div class="auth-shell__panel">
          <p class="auth-eyebrow">Camp Platform</p>
          <h1 class="app-brand">Welcome back</h1>
          <p class="app-brand-sub">Sign in to manage camps, rides, and registrations.</p>

          <form class="auth-form" (ngSubmit)="submit()">
            <ion-list lines="none" class="auth-fields">
              <ion-item>
                <ion-input
                  label="Email"
                  labelPlacement="stacked"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  autocomplete="email"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  label="Password"
                  labelPlacement="stacked"
                  type="password"
                  name="password"
                  [(ngModel)]="password"
                  required
                  autocomplete="current-password"
                />
              </ion-item>
            </ion-list>

            @if (error()) {
              <ion-note color="danger">{{ error() }}</ion-note>
            }

            <ion-button expand="block" type="submit" class="auth-submit" [disabled]="loading()">
              @if (loading()) {
                <ion-spinner name="crescent" />
              } @else {
                Sign in
              }
            </ion-button>
          </form>

          <div class="auth-shell__links">
            <a routerLink="/forgot-password">Forgot password?</a>
            <a routerLink="/register">Create account</a>
          </div>
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

    .auth-form {
      margin-top: 1.5rem;
    }

    .auth-fields {
      background: transparent;
      margin-bottom: 0.75rem;
    }

    .auth-fields ion-item {
      --background: var(--ctp-surface-2);
      --border-radius: 12px;
      margin-bottom: 0.65rem;
      --padding-start: 12px;
      --inner-padding-end: 12px;
    }

    .auth-submit {
      margin-top: 0.5rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      const result = await this.auth.login(this.email.trim(), this.password);
      if (result.error) {
        this.error.set(result.error);
        return;
      }
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
      await this.router.navigateByUrl(returnUrl);
    } finally {
      this.loading.set(false);
    }
  }
}
