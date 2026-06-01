import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
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

  loading = signal(true);
  forms = signal<Form[]>([]);

  isAdmin = computed(() =>
    this.authService.currentUser()?.roles?.includes('ADMIN') ?? false
  );

  selectedCategoria = signal<string | null>(null);

  categorias = [
    {
      code: 'DIRECCION',
      label: 'Gestion de Direccion',
      imagen: 'categories/direcion.png',
      bgColor: '#EEEDFE',
      textColor: '#3C3489'
    },
    {
      code: 'GESTION_INTEGRAL',
      label: 'Gestión Integral',
      imagen: 'categories/calidad.png',
      bgColor: '#E6F1FB',
      textColor: '#0C447C',
    },

    {
      code: 'OPERACION_LOGISTICA',
      label: 'Operación Logística del Servicio Farmacéutico',
      imagen: 'categories/comercial.png',
      bgColor: '#E1F5EE',
      textColor: '#085041',
    },

    {
      code: 'PREPARADOS_ESTERILES',
      label: 'Elaboración y Adecuación de Preparados Estériles y no Estériles',
      imagen: 'categories/comercial.png',
      bgColor: '#E1F5EE',
      textColor: '#085041',
    },

    {
      code: 'DISTRIBUCION_MEDICAMENTOS',
      label: 'Distribución de Medicamentos, Dispositivos Médicos e Insumos',
      imagen: 'categories/comercial.png',
      bgColor: '#E1F5EE',
      textColor: '#085041',
    },

    {
      code: 'GESTION_COMPRAS',
      label: 'Gestión de Compras',
      imagen: 'categories/financiera.png',
      bgColor: '#FAEEDA',
      textColor: '#633806',
    },

    {
      code: 'GESTION_HUMANA',
      label: 'Gestión Humana',
      imagen: 'categories/gh.png',
      bgColor: '#E1F5EE',
      textColor: '#085041',
    },

    {
      code: 'GESTION_COMERCIAL',
      label: 'Gestión Comercial',
      imagen: 'categories/comercial.png',
      bgColor: '#FAEEDA',
      textColor: '#633806',
    },

    {
      code: 'GESTION_FINANCIERA',
      label: 'Gestión Financiera',
      imagen: 'categories/financiera.png',
      bgColor: '#E6F1FB',
      textColor: '#0C447C',
    },

    {
      code: 'MANTENIMIENTO',
      label: 'Mantenimiento',
      imagen: 'categories/mantenimiento.png',
      bgColor: '#EEEDFE',
      textColor: '#3C3489',
    },
  ];

  // Filtra categorías según los formularios asignados al usuario
  categoriasVisibles = computed(() => {
    if (this.isAdmin()) return this.categorias;

    const cats = new Set(
      this.forms().map(f => f.category?.toUpperCase())
    );

    return this.categorias.filter(c => cats.has(c.code));
  });

  ngOnInit(): void {
    const load$ = this.isAdmin()
      ? this.formService.getAllForms()
      : this.formService.getMyFormsAssigned();

    load$.subscribe({
      next: (data) => {
        console.log(data);
        this.forms.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectCategoria(code: string): void {
    this.selectedCategoria.set(code);
  }
}