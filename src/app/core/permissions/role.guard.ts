import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CampContextService } from '../camp-context/camp-context.service';
import { PermissionService } from './permission.service';
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

/** Default camp landing: viewers → transportation, others → dashboard. */
export const campHomeRedirect: CanActivateFn = () => {
  const permissions = inject(PermissionService);
  const ctx = inject(CampContextService);
  const router = inject(Router);
  const campId = ctx.campId();
  if (!campId) {
    return router.createUrlTree(['/dashboard']);
  }
  if (permissions.isViewer()) {
    return router.createUrlTree(['/camp', campId, 'transportation']);
  }
  return router.createUrlTree(['/camp', campId, 'dashboard']);
};

/** Block VIEWER from organizer/participant-only routes. */
export const rejectViewerGuard: CanActivateFn = () => {
  const permissions = inject(PermissionService);
  const ctx = inject(CampContextService);
  const router = inject(Router);
  if (!permissions.isViewer()) {
    return true;
  }
  const campId = ctx.campId();
  return router.createUrlTree(
    campId ? ['/camp', campId, 'transportation'] : ['/dashboard'],
  );
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
