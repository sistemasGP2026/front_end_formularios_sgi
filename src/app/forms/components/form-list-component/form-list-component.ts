import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService, SharedModule } from 'primeng/api';
import { FormService } from '../../services/form.service';
import { Form, SectionPreview } from '../../interfaces/form.interface';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'form-list-component',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule,
    TagModule, TooltipModule, SkeletonModule,
    RouterModule, SharedModule,
    ConfirmDialogModule, ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './form-list-component.html',
})
export class FormListComponent implements OnInit {

  formList  = signal<Form[]>([]);
  search    = '';
  loading   = true;
  skeletons = Array(6);
  categoryTitle = '';

  private formService    = inject(FormService);
  private cdr            = inject(ChangeDetectorRef);
  private confirmService = inject(ConfirmationService);
  private message        = inject(MessageService);
  router                 = inject(Router);
  private route          = inject(ActivatedRoute);

  readonly categoryMap: Record<string, string> = {
    GESTION_DIRECCION:         'Gestión de Dirección',
    GESTION_INTEGRAL:          'Gestión Integral',
    GESTION_COMERCIAL:         'Gestión Comercial',
    GESTION_COMPRAS:           'Gestión de Compras',
    OPERACION_LOGISTICA:       'Operación Logística',
    MANTENIMIENTO:             'Mantenimiento',
    GESTION_FINANCIERA:        'Gestión Financiera',
    GESTION_HUMANA:            'Gestión Humana',
    PREPARADOS_ESTERILES:      'Preparados Estériles',
    DISTRIBUCION_MEDICAMENTOS: 'Distribución de Medicamentos',
  };

  ngOnInit(): void {
    const category = this.route.snapshot.paramMap.get('category');
    if (!category) { this.router.navigateByUrl('formularios'); return; }
    this.categoryTitle = this.getCatLabel(category.toUpperCase());
    this.getFormList(category.toUpperCase());
  }

  filteredForms = computed(() => {
    const term = this.search.toLowerCase().trim();
    if (!term) return this.formList();
    return this.formList().filter(f =>
      f.name.toLowerCase().includes(term) ||
      f.code.toLowerCase().includes(term) ||
      f.description?.toLowerCase().includes(term) ||
      f.createdBy?.name?.toLowerCase().includes(term)
    );
  });

  getFormList(category: string): void {
    this.loading = true;
    this.formService.getFormByCategory(category).subscribe({
      next: (data) => {
        this.formList.set(data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteForm(form: Form): void {
    this.confirmService.confirm({
      message: `¿Eliminar el formulario "${form.name}"? Quedará inactivo pero podrá reactivarse.`,
      header: 'Eliminar formulario',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.formService.deleteForm(form.code).subscribe({
          next: () => {
            this.formList.update(list =>
              list.map(f => f.code === form.code ? { ...f, deleted: true } : f)
            );
            this.message.add({
              severity: 'warn',
              summary: 'Formulario eliminado',
              detail: `${form.code} fue desactivado`,
              life: 3000
            });
          },
          error: (err) => this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'No se pudo eliminar',
            life: 3000
          })
        });
      }
    });
  }

  activateForm(form: Form): void {
    this.confirmService.confirm({
      message: `¿Activar el formulario "${form.name}"?`,
      header: 'Activar formulario',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Sí, activar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.formService.activateForm(form.code).subscribe({
          next: () => {
            this.formList.update(list =>
              list.map(f => f.code === form.code ? { ...f, deleted: false } : f)
            );
            this.message.add({
              severity: 'success',
              summary: 'Formulario activado',
              detail: `${form.code} fue activado correctamente`,
              life: 3000
            });
          },
          error: (err) => this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'No se pudo activar',
            life: 3000
          })
        });
      }
    });
  }

  getCatLabel(value: string): string {
    return this.categoryMap[value?.toUpperCase()] ?? value;
  }

  getCatColor(cat: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      GESTION_DIRECCION:         { bg: '#E2F4FE', text: '#0A4C6A' },
      GESTION_INTEGRAL:          { bg: '#E6F1FB', text: '#0C447C' },
      GESTION_COMERCIAL:         { bg: '#FCF0FB', text: '#6B1F6A' },
      GESTION_COMPRAS:           { bg: '#FEF3E2', text: '#7A4100' },
      OPERACION_LOGISTICA:       { bg: '#E8F5E9', text: '#1B5E20' },
      MANTENIMIENTO:             { bg: '#FAEEDA', text: '#633806' },
      GESTION_FINANCIERA:        { bg: '#E1F5EE', text: '#085041' },
      GESTION_HUMANA:            { bg: '#EEEDFE', text: '#3C3489' },
      PREPARADOS_ESTERILES:      { bg: '#FCE4EC', text: '#880E4F' },
      DISTRIBUCION_MEDICAMENTOS: { bg: '#E0F7FA', text: '#006064' },
    };
    return map[cat?.toUpperCase()] ?? { bg: '#F1EFE8', text: '#444441' };
  }

  getSectionCount(form: Form): number { return form.sections?.length ?? 0; }
  getFieldCount(form: Form): number   { return form.fields?.length ?? 0; }

  getSectionPreviews(form: Form): SectionPreview[] {
    return (form.sections ?? [])
      .sort((a, b) => a.order - b.order)
      .slice(0, 2)
      .map(section => ({
        title: section.title,
        fields: (form.fields ?? [])
          .filter(f => f.sectionId === section.id)
          .sort((a, b) => a.order - b.order)
          .slice(0, 2)
          .map(f => ({ label: f.label, type: f.type }))
      }));
  }
}