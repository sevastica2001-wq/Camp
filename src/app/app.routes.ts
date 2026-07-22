import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import {
  campMemberGuard,
  rejectViewerGuard,
} from './core/permissions/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'join/:slug/:code',
    loadComponent: () =>
      import('./features/auth/join-camp.page').then((m) => m.JoinCampPage),
  },
  {
    path: 'view/:slug/:code',
    loadComponent: () =>
      import('./features/auth/view-camp.page').then((m) => m.ViewCampPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/my-camps.page').then((m) => m.MyCampsPage),
  },
  {
    path: 'camp/:campId',
    canActivate: [authGuard, campMemberGuard],
    loadComponent: () =>
      import('./layout/camp-shell.page').then((m) => m.CampShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/dashboard/camp-dashboard.page').then(
            (m) => m.CampDashboardPage,
          ),
      },
      {
        path: 'settings',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/camps/camp-settings.page').then((m) => m.CampSettingsPage),
      },
      {
        path: 'transportation',
        loadComponent: () =>
          import('./features/transport-planner/pages/planner/planner.page').then(
            (m) => m.PlannerPage,
          ),
      },
      {
        path: 'overview',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/transport-planner/pages/overview/overview.page').then(
            (m) => m.OverviewPage,
          ),
      },
      {
        path: 'participants',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/participants/participants.page').then(
            (m) => m.ParticipantsPage,
          ),
      },
      {
        path: 'registration',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/participants/registration-form.page').then(
            (m) => m.RegistrationFormPage,
          ),
      },
      {
        path: 'driver',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/dashboard/driver-portal.page').then(
            (m) => m.DriverPortalPage,
          ),
      },
      {
        path: 'me',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/dashboard/participant-portal.page').then(
            (m) => m.ParticipantPortalPage,
          ),
      },
      {
        path: 'rooms',
        loadComponent: () =>
          import('./features/room-management/pages/rooms.page').then((m) => m.RoomsPage),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/schedule/pages/schedule.page').then((m) => m.SchedulePage),
      },
      { path: 'modules/rooms', redirectTo: 'rooms', pathMatch: 'full' },
      {
        path: 'modules/schedule',
        redirectTo: 'schedule',
        pathMatch: 'full',
      },
      {
        path: 'modules/:module',
        canActivate: [rejectViewerGuard],
        loadComponent: () =>
          import('./features/dashboard/coming-soon.page').then((m) => m.ComingSoonPage),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
