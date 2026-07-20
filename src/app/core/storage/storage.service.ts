import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';

/**
 * Supabase Storage helpers for avatars, camp images, and documents.
 * Create buckets in Supabase dashboard: avatars, camp-images, documents (public read or RLS as needed).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async uploadAvatar(file: File): Promise<string> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      throw new Error('Not signed in');
    }
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await this.supabase.client.storage.from('avatars').upload(path, file, {
      upsert: true,
    });
    if (error) {
      throw new Error(error.message);
    }
    const { data } = this.supabase.client.storage.from('avatars').getPublicUrl(path);
    await this.auth.updateProfile({ avatar_url: data.publicUrl });
    return data.publicUrl;
  }

  async uploadCampImage(campId: string, file: File): Promise<string> {
    const path = `${campId}/${Date.now()}-${file.name}`;
    const { error } = await this.supabase.client.storage.from('camp-images').upload(path, file, {
      upsert: true,
    });
    if (error) {
      throw new Error(error.message);
    }
    const { data } = this.supabase.client.storage.from('camp-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async uploadDocument(campId: string, file: File): Promise<string> {
    const path = `${campId}/${Date.now()}-${file.name}`;
    const { error } = await this.supabase.client.storage.from('documents').upload(path, file);
    if (error) {
      throw new Error(error.message);
    }
    const { data } = this.supabase.client.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  }
}
