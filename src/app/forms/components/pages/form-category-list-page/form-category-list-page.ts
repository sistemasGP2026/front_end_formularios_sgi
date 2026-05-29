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

  loading  = signal(true);
  forms    = signal<Form[]>([]);

  isAdmin  = computed(() =>
    this.authService.currentUser()?.roles?.includes('ADMIN') ?? false
  );

  selectedCategoria = signal<string | null>(null);

  categorias = [
    {
      code: 'CALIDAD',
      label: 'calidad',
      descripcion: 'Auditorías e inspecciones',
      imagen: 'categories/calidad.png',
      bgColor: '#E6F1FB', textColor: '#0C447C',
    },
    {
      code: 'GESTION_HUMANA',
      label: 'gestión humana',
      descripcion: 'Personal y talento',
      imagen: 'categories/gh.png',
      bgColor: '#E1F5EE', textColor: '#085041',
    },
    {
      code: 'COMERCIAL',
      label: 'comercial',
      descripcion: 'Ventas y clientes',
      imagen: 'categories/comercial.png',
      bgColor: '#FAEEDA', textColor: '#633806',
    },
    {
      code: 'FINANCIERA',
      label: 'financiera',
      descripcion: 'Presupuesto y costos',
      imagen: 'categories/financiera.png',
      bgColor: '#E6F1FB', textColor: '#0C447C',
    },
    {
      code: 'MANTENIMIENTO',
      label: 'mantenimiento',
      descripcion: 'Equipos e instalaciones',
      imagen: 'categories/mantenimiento.png',
      bgColor: '#EEEDFE', textColor: '#3C3489',
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