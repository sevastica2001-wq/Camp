import { Routes } from '@angular/router';
import { ShellLayout } from './layout/shell-layout';

export const routes: Routes = [
  {
    path: '',
    component: ShellLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'planner' },
      {
        path: 'planner',
        loadComponent: () =>
          import('./features/transport-planner/pages/planner/planner.page').then(
            (m) => m.PlannerPage,
          ),
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/transport-planner/pages/overview/overview.page').then(
            (m) => m.OverviewPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'planner' },
];
