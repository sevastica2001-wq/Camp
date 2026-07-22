import { Injectable, inject } from '@angular/core';
import { CampContextService } from '../camp-context/camp-context.service';
import { CampRole, CampStatus } from '../supabase/database.types';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly campContext = inject(CampContextService);

  hasRole(...roles: CampRole[]): boolean {
    const role = this.campContext.role();
    return !!role && roles.includes(role);
  }

  isOrganizer(): boolean {
    return this.hasRole('ADMIN', 'ORGANIZER');
  }

  isViewer(): boolean {
    return this.hasRole('VIEWER');
  }

  isParticipant(): boolean {
    return this.hasRole('PARTICIPANT', 'VOLUNTEER', 'ORGANIZER', 'ADMIN');
  }

  canManageTransport(): boolean {
    const status = this.campContext.currentCamp()?.status;
    if (!this.isOrganizer()) {
      return false;
    }
    return status !== 'finished' && status !== 'archived';
  }

  /** Alias for assignment mutations (transport + lodging). */
  canMutateAssignments(): boolean {
    return this.canManageTransport();
  }

  canEditOwnRegistration(): boolean {
    const status = this.campContext.currentCamp()?.status;
    return status === 'registration_open' || status === 'draft';
  }

  isReadOnlyCamp(): boolean {
    const status = this.campContext.currentCamp()?.status as CampStatus | undefined;
    return status === 'active' || status === 'finished' || status === 'archived';
  }

  canViewCamp(): boolean {
    return !!this.campContext.membership();
  }
}
