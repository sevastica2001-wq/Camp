import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProfile } from '../supabase/database.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(null);
  private readonly _user = signal<User | null>(null);
  private readonly _profile = signal<UserProfile | null>(null);
  private readonly _ready = signal(false);

  readonly session = this._session.asReadonly();
  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly isAuthenticated = computed(() => !!this._session());
  readonly isAnonymous = computed(() => !!this._user()?.is_anonymous);
  readonly canCreateCamps = computed(() => !!this._profile()?.can_create_camps);

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    const { data, error } = await this.supabase.client.auth.getSession();
    if (error && this.isInvalidRefreshError(error)) {
      await this.clearLocalAuth();
    } else if (data.session) {
      // Stored refresh tokens can be revoked/missing (e.g. after guest sessions).
      // Validate before treating the user as signed in.
      const { error: userError } = await this.supabase.client.auth.getUser();
      if (userError && this.isInvalidRefreshError(userError)) {
        await this.clearLocalAuth();
      } else {
        this._session.set(data.session);
        this._user.set(data.session.user);
        await this.ensureProfile(data.session.user);
      }
    }

    this._ready.set(true);

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
      if (session?.user) {
        void this.ensureProfile(session.user);
      } else {
        this._profile.set(null);
      }
    });
  }

  /** Drop browser session only — ignores API errors from already-dead refresh tokens. */
  private async clearLocalAuth(): Promise<void> {
    // Remove stored tokens first so GoTrue does not attempt a doomed refresh.
    this.wipeAuthStorage();
    try {
      await this.supabase.client.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    this._session.set(null);
    this._user.set(null);
    this._profile.set(null);
  }

  private wipeAuthStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.*-auth-token/.test(key)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  private isInvalidRefreshError(error: { message?: string } | null | undefined): boolean {
    const msg = error?.message ?? '';
    return /refresh token/i.test(msg);
  }

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
        },
      },
    });
    if (error) {
      return { error: error.message };
    }
    if (data.user) {
      await this.ensureProfile(data.user, input.firstName, input.lastName);
    }
    return { error: null };
  }

  async login(email: string, password: string): Promise<{ error: string | null }> {
    // Clear anonymous/stale sessions first so a dead refresh token cannot block password login.
    await this.clearLocalAuth();
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error && this.isInvalidRefreshError(error)) {
      await this.clearLocalAuth();
      const retry = await this.supabase.client.auth.signInWithPassword({ email, password });
      return { error: retry.error?.message ?? null };
    }
    return { error: error?.message ?? null };
  }

  /** Silent guest session (requires Anonymous provider enabled in Supabase Auth). */
  async signInAsGuest(): Promise<{ error: string | null }> {
    await this.clearLocalAuth();
    const { data, error } = await this.supabase.client.auth.signInAnonymously();
    if (error) {
      return { error: error.message };
    }
    if (data.user) {
      await this.ensureProfile(data.user, 'Guest', 'Viewer');
    }
    return { error: null };
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.client.auth.signOut({ scope: 'local' });
    } catch {
      // ignore stale refresh-token errors on logout
    }
    this._session.set(null);
    this._user.set(null);
    this._profile.set(null);
    await this.router.navigateByUrl('/login');
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error?.message ?? null };
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<{ error: string | null }> {
    const user = this._user();
    if (!user) {
      return { error: 'Not signed in' };
    }
    const { data, error } = await this.supabase.client
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) {
      return { error: error.message };
    }
    this._profile.set(data as UserProfile);
    return { error: null };
  }

  private async ensureProfile(
    user: User,
    firstName?: string,
    lastName?: string,
  ): Promise<void> {
    const { data: existing } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      this._profile.set(existing as UserProfile);
      return;
    }

    const row = {
      id: user.id,
      email: user.email ?? '',
      first_name:
        firstName ??
        (user.user_metadata?.['first_name'] as string | undefined) ??
        '',
      last_name:
        lastName ??
        (user.user_metadata?.['last_name'] as string | undefined) ??
        '',
      can_create_camps: false,
    };

    const { data, error } = await this.supabase.client
      .from('users')
      .upsert(row)
      .select('*')
      .single();

    if (!error && data) {
      this._profile.set(data as UserProfile);
    }
  }
}
