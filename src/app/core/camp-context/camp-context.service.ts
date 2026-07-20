import { Injectable, computed, inject, signal } from '@angular/core';
import { Camp, CampMember, CampRole } from '../supabase/database.types';
import { CampsService } from '../../features/camps/camps.service';

@Injectable({ providedIn: 'root' })
export class CampContextService {
  private readonly campsService = inject(CampsService);

  private readonly _currentCamp = signal<Camp | null>(null);
  private readonly _membership = signal<CampMember | null>(null);
  private readonly _loading = signal(false);

  readonly currentCamp = this._currentCamp.asReadonly();
  readonly membership = this._membership.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly campId = computed(() => this._currentCamp()?.id ?? null);
  readonly role = computed(() => this._membership()?.role ?? null);

  async setCampById(campId: string): Promise<void> {
    this._loading.set(true);
    try {
      const camp = await this.campsService.getCamp(campId);
      const membership = await this.campsService.getMyMembership(campId);
      this._currentCamp.set(camp);
      this._membership.set(membership);
    } finally {
      this._loading.set(false);
    }
  }

  clear(): void {
    this._currentCamp.set(null);
    this._membership.set(null);
  }

  requireCampId(): string {
    const id = this.campId();
    if (!id) {
      throw new Error('No camp selected');
    }
    return id;
  }
}
