import { Component, ViewChild, inject, signal } from '@angular/core';
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
  selector: 'app-register-page',
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
          <h1 class="app-brand">Create account</h1>
          <p class="app-brand-sub">Join as an organizer or participant for your next camp.</p>

          <form class="auth-form" (ngSubmit)="submit()">
            <ion-list lines="none" class="auth-fields">
              <ion-item>
                <ion-input
                  label="First name"
                  labelPlacement="stacked"
                  name="firstName"
                  [(ngModel)]="firstName"
                  required
                  autocomplete="given-name"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  label="Last name"
                  labelPlacement="stacked"
                  name="lastName"
                  [(ngModel)]="lastName"
                  required
                  autocomplete="family-name"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  #emailInput
                  label="Email"
                  labelPlacement="stacked"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  (ionInput)="email = $any($event).detail.value ?? ''"
                  required
                  autocomplete="email"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  #passwordInput
                  label="Password"
                  labelPlacement="stacked"
                  type="password"
                  name="password"
                  [(ngModel)]="password"
                  (ionInput)="password = $any($event).detail.value ?? ''"
                  required
                  autocomplete="new-password"
                />
              </ion-item>
            </ion-list>

            @if (error()) {
              <ion-note color="danger">{{ error() }}</ion-note>
            }
            @if (info()) {
              <ion-note color="success">{{ info() }}</ion-note>
            }

            <ion-button expand="block" type="submit" class="auth-submit" [disabled]="loading()">
              @if (loading()) {
                <ion-spinner name="crescent" />
              } @else {
                Register
              }
            </ion-button>
          </form>

          <div class="auth-shell__links">
            <a routerLink="/login">Already have an account? Sign in</a>
            <a routerLink="/forgot-password">Forgot password?</a>
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
export class RegisterPage {
  @ViewChild('emailInput') private emailInput?: IonInput;
  @ViewChild('passwordInput') private passwordInput?: IonInput;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    this.info.set(null);
    this.loading.set(true);
    try {
      const [emailNative, passwordNative] = await Promise.all([
        this.emailInput?.getInputElement(),
        this.passwordInput?.getInputElement(),
      ]);
      const email = String(emailNative?.value ?? this.email).trim();
      const password = String(passwordNative?.value ?? this.password);
      if (!email || !password) {
        this.error.set('Enter email and password.');
        return;
      }
      this.email = email;
      this.password = password;

      const result = await this.auth.register({
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email,
        password,
      });
      if (result.error) {
        this.error.set(result.error);
        return;
      }
      if (result.needsEmailConfirmation) {
        this.info.set(
          'Account created. Check your email to confirm, then sign in. (Also check spam.)',
        );
        return;
      }
      await this.router.navigateByUrl(
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
