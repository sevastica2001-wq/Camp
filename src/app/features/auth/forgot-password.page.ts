import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  selector: 'app-forgot-password-page',
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
          <h1 class="app-brand">Reset password</h1>
          <p class="app-brand-sub">We’ll email you a link to choose a new password.</p>

          @if (success()) {
            <ion-note color="success">Check your email for a password reset link.</ion-note>
            <div class="auth-shell__links">
              <a routerLink="/login">Back to sign in</a>
            </div>
          } @else {
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
              </ion-list>

              @if (error()) {
                <ion-note color="danger">{{ error() }}</ion-note>
              }

              <ion-button expand="block" type="submit" class="auth-submit" [disabled]="loading()">
                @if (loading()) {
                  <ion-spinner name="crescent" />
                } @else {
                  Send reset link
                }
              </ion-button>
            </form>

            <div class="auth-shell__links">
              <a routerLink="/login">Back to sign in</a>
            </div>
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
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  email = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      const result = await this.auth.resetPassword(this.email.trim());
      if (result.error) {
        this.error.set(result.error);
        return;
      }
      this.success.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
