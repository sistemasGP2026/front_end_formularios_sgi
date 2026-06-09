import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../auth/services/auth.service';
import { FirstNamePipe } from '../pipes/first-name-pipe';
import { FormService } from '../forms/services/form.service';
import { signal } from '@angular/core';
import { Form } from '../forms/interfaces/form.interface';

export interface ModuleCardData {
  icon: string;
  title: string;
  description: string;
  badgeColor?: string;
  accentColor?: string;
  route?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TagModule, FirstNamePipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly formService = inject(FormService);

  currentUser = this.authService.currentUser();
  mascotaVisible = true;

  publicForms = signal<Form[]>([]);
  loadingPublicForms = signal(false);

  ngOnInit(): void {
    this.getPublicForms();
  }
  isAdmin = computed(() =>
    this.authService.currentUser()?.roles?.includes('ADMIN') ?? false
  );

  // Formularios asignados — solo para usuarios regulares
  myForms = signal<Form[]>([]);
  loadingForms = signal(false);

  adminModules: ModuleCardData[] = [
    {
      icon: 'pi pi-file',
      title: 'Gestión de Formularios',
      description: 'Crea, edita y publica formularios dinámicos para tu organización.',
      accentColor: '#00649B',
      route: '/formularios',
    },
    {
      icon: 'pi pi-users',
      title: 'Gestión de Usuarios',
      description: 'Administra usuarios, roles y permisos de acceso al sistema.',
      accentColor: '#32C6C6',
      route: '/usuarios',
    },
    {
      icon: 'pi pi-chart-line',
      title: 'Reportes y Analítica',
      description: 'Visualiza métricas, tendencias y reportes de actividad.',
      accentColor: '#002E42',
      route: '/reportes',
    },
    {
      icon: 'pi pi-comments',
      title: 'Respuestas',
      description: 'Consulta y gestiona las respuestas recibidas en los formularios.',
      accentColor: '#00649B',
      route: '/respuestas',
    },
  ];

  userModules: ModuleCardData[] = [
    {
      icon: 'pi pi-file-edit',
      title: 'Mis formularios',
      description: 'Accede y diligencia los formularios que tienes asignados.',
      accentColor: '#00649B',
      route: '/formularios',
    },
    {
      icon: 'pi pi-history',
      title: 'Historial',
      description: 'Consulta los formularios que has respondido anteriormente.',
      accentColor: '#32C6C6',
      route: '/historial',
    },
  ];

  get modules(): ModuleCardData[] {
    return this.isAdmin() ? this.adminModules : this.userModules;
  }

  constructor() {
    if (!this.isAdmin()) {
      this.loadingForms.set(true);
      this.formService.getMyFormsAssigned().subscribe({
        next: (data) => {
          this.myForms.set(data);
          this.loadingForms.set(false);
        },
        error: () => this.loadingForms.set(false)
      });
    }
  }

  getPublicForms(): void {
    this.loadingPublicForms.set(true);

    this.formService.getPublicForms().subscribe({
      next: (data) => {
        this.publicForms.set(data);
        this.loadingPublicForms.set(false);
      },
      error: (error) => {
        console.error(error);
        this.loadingPublicForms.set(false);
      }
    });
  }
  toggleMascota(): void {
    this.mascotaVisible = !this.mascotaVisible;
  }
}