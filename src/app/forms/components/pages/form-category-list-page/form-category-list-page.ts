import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormService } from '../../../services/form.service';
import { Form } from '../../../interfaces/form.interface';
import { AuthService } from '../../../../auth/services/auth.service';

@Component({
  selector: 'form-category-list-page',
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './form-category-list-page.html',
})
export class FormCategoryListPage implements OnInit {

  private readonly formService = inject(FormService);
  private readonly authService = inject(AuthService);
  private router      = inject(Router);

  loading = signal(true);
  forms = signal<Form[]>([]);
  isUserAdmin = false;
  isApprover  = false;

  isAdmin = computed(() =>
    this.authService.currentUser()?.roles?.includes('ADMIN') ?? false
  );

  selectedCategoria = signal<string | null>(null);

  categorias = [
  { code: 'GESTION_DIRECCION',         label: 'Gestión de Dirección',     descripcion: 'Dirección y estrategia',           imagen: 'categories/direccion.png',    bgColor: '#E2F4FE', textColor: '#0A4C6A' },
  { code: 'GESTION_INTEGRAL',          label: 'Gestión Integral',          descripcion: 'Gestión del sistema integrado',    imagen: 'categories/calidad.png',      bgColor: '#E6F1FB', textColor: '#0C447C' },
  { code: 'GESTION_COMERCIAL',         label: 'Gestión Comercial',         descripcion: 'Ventas y clientes',                imagen: 'categories/comercial.png',    bgColor: '#FCF0FB', textColor: '#6B1F6A' },
  { code: 'GESTION_COMPRAS',           label: 'Gestión de Compras',        descripcion: 'Compras y proveedores',            imagen: 'categories/compras.png',      bgColor: '#FEF3E2', textColor: '#7A4100' },
  { code: 'OPERACION_LOGISTICA',       label: 'Operación Logística',       descripcion: 'Logística de servicio',            imagen: 'categories/comercial.png',    bgColor: '#E8F5E9', textColor: '#1B5E20' },
  { code: 'MANTENIMIENTO',             label: 'Mantenimiento',             descripcion: 'Equipos e instalaciones',          imagen: 'categories/mantenimiento.png',bgColor: '#FAEEDA', textColor: '#633806' },
  { code: 'GESTION_FINANCIERA',        label: 'Gestión Financiera',        descripcion: 'Presupuesto y costos',             imagen: 'categories/financiera.png',   bgColor: '#E1F5EE', textColor: '#085041' },
  { code: 'GESTION_HUMANA',            label: 'Gestión Humana',            descripcion: 'Personal y talento',               imagen: 'categories/gh.png',           bgColor: '#EEEDFE', textColor: '#3C3489' },
  { code: 'PREPARADOS_ESTERILES',      label: 'Preparados Estériles',      descripcion: 'Elaboración de preparados',        imagen: 'categories/calidad.png',      bgColor: '#FCE4EC', textColor: '#880E4F' },
  { code: 'DISTRIBUCION_MEDICAMENTOS', label: 'Distribución de Medicamentos', descripcion: 'Distribución y medicamentos',  imagen: 'categories/comercial.png',    bgColor: '#E0F7FA', textColor: '#006064' },
];

  ngOnInit(): void {
    const user       = this.authService.currentUser();
    this.isUserAdmin = user?.roles?.includes('ADMIN') ?? false;
    this.isApprover  = user?.roles?.includes('APPROVER') ?? false;

    this.loadForms();
  }

  private loadForms(): void {
    if (this.isUserAdmin) {
      // Admin ve todos los formularios
      this.formService.getAllForms().subscribe({
        next: (forms) => this.forms.set(forms.filter(f => !f.deleted)),
      });
    } else {
      // USER y APPROVER ven formularios públicos
      // más los formularios restringidos donde tienen permiso
      this.formService.getPublicForms().subscribe({
        next: (publicForms) => {
          this.formService.getMyFormsAssigned().subscribe({
            next: (assignedForms) => {
              // Combina y deduplica por code
              const all = [...publicForms, ...assignedForms];
              const unique = Array.from(
                new Map(all.map(f => [f.code, f])).values()
              );
              this.forms.set(unique.filter(f => !f.deleted));
            },
            error: () => this.forms.set(publicForms.filter(f => !f.deleted)),
          });
        },
        error: () => this.forms.set([]),
      });
    }
  }

  selectCategoria(code: string): void {
    this.router.navigate(['/formularios/categoria', code]);
  }
}