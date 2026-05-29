import { Routes } from '@angular/router';
import { isNotAuthenticatedGuard } from './auth/guards/is-not-authenticated-guard';
import { isAuthenticatedGuard } from './auth/guards/is-authenticated-guard';
import { SharedComponent } from './shared/shared';
import { isAdminGuard } from './auth/guards/is-admin-guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [isNotAuthenticatedGuard],
    loadChildren: () => import('./auth/routes/auth.routes').then(m => m.authRoutes),
  },
  {
    path: '',
    canActivate: [isAuthenticatedGuard],
    component: SharedComponent, 
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'formularios',
        loadChildren: () => import('./forms/routes/forms.routes').then(m => m.formsRoutes),
      },
      {
        path: 'respuestas',
        canActivateChild:[isAdminGuard],
        loadChildren: () => import('./responses/routes/responses.routes').then(m => m.ResponsesRoutes),
      },
      {
        path: 'usuarios',
        canActivateChild:[isAdminGuard],
        loadChildren: () => import('./usuarios/routes/usuarios.routes').then(m => m.usuarioRoutes),
      },
      {
        path: 'reportes',
        canActivateChild:[isAdminGuard],
        loadChildren: () => import('./reportes/routes/reportes.routes').then(m => m.reportesRoutes),
      },
      {
        path: 'historial',
        loadComponent: () => import('./historial-component/historial-component').then(m => m.HistorialComponent)
      }
    ],
  },
  { path: '**', redirectTo: 'auth' },
];
