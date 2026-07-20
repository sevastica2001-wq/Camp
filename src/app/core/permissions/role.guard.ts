import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CampContextService } from '../camp-context/camp-context.service';
import { PermissionService } from '../permissions/permission.service';
import { CampRole } from '../supabase/database.types';

export const campMemberGuard: CanActivateFn = async (route) => {
  const campId = route.paramMap.get('campId');
  const ctx = inject(CampContextService);
  const router = inject(Router);
  if (!campId) {
    return router.createUrlTree(['/dashboard']);
  }
  try {
    await ctx.setCampById(campId);
    if (!ctx.membership()) {
      return router.createUrlTree(['/dashboard']);
    }
    return true;
  } catch {
    return router.createUrlTree(['/dashboard']);
  }
};

export const roleGuard =
  (...roles: CampRole[]): CanActivateFn =>
  () => {
    const permissions = inject(PermissionService);
    const router = inject(Router);
    if (permissions.hasRole(...roles)) {
      return true;
    }
    const campId = inject(CampContextService).campId();
    return router.createUrlTree(campId ? ['/camp', campId, 'dashboard'] : ['/dashboard']);
  };
