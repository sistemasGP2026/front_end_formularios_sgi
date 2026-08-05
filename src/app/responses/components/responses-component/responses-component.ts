import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ResponseInterface } from '../../interfaces/response.interface';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { BadgeModule } from 'primeng/badge';
import { SelectModule } from 'primeng/select';
import { FormService } from '../../../forms/services/form.service';
import { Form } from '../../../forms/interfaces/form.interface';
import { ResponseService } from '../../services/response.service';
import { CheckboxModule } from 'primeng/checkbox';
import { PdfService } from '../../../shared/services/pdf.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';

export interface FormGroup {
  formCode: string;
  count: number;
  responses: ResponseInterface[];
}

@Component({
  standalone: true,
  selector: 'responses-component',
  imports: [
    CommonModule,
    ConfirmDialogModule,
    CheckboxModule,
    DatePickerModule,
    FormsModule,
    RouterModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    AvatarModule,
    BadgeModule,
    SkeletonModule,
    TooltipModule,
    ToggleSwitchModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './responses-component.html',
})
export class ResponsesComponent implements OnInit {

  private readonly formService = inject(FormService);
  private readonly responseService = inject(ResponseService);
  private readonly pdfService = inject(PdfService);
  private confirmService = inject(ConfirmationService);

  loading = signal(true);
  responses = signal<ResponseInterface[]>([]);
  forms = signal<Form[]>([]);
  selectedFormCode = signal<string | null>(null);
  form = signal<Form | null>(null);
  selectedResponse = signal<ResponseInterface | null>(null);
  selectedResponses = signal<string[]>([]);
  selectAll = signal(false);

  searchSidebar = signal('');
  searchList = signal('');
  selectedCategory = signal<string | null>(null);
  deletingMany = signal(false);

  selectedCategories = signal<string[]>([]);

  today = new Date();

  deletingResponse = signal(false);
  dateRange = signal<Date[] | null>(null);

  toggleCategory(cat: string): void {
    const current = this.selectedCategories();
    if (current.includes(cat)) {
      this.selectedCategories.set(current.filter(c => c !== cat));
    } else {
      this.selectedCategories.set([...current, cat]);
    }
  }

  categoriesOnly = [
    { value: 'GESTION_DIRECCION', label: 'Gestión de Dirección' },
    { value: 'GESTION_INTEGRAL', label: 'Gestión Integral' },
    { value: 'GESTION_COMERCIAL', label: 'Gestión Comercial' },
    { value: 'GESTION_COMPRAS', label: 'Gestión de Compras' },
    { value: 'OPERACION_LOGISTICA', label: 'Operación Logística' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
    { value: 'GESTION_FINANCIERA', label: 'Gestión Financiera' },
    { value: 'GESTION_HUMANA', label: 'Gestión Humana' },
    { value: 'PREPARADOS_ESTERILES', label: 'Preparados Estériles' },
    { value: 'DISTRIBUCION_MEDICAMENTOS', label: 'Distribución de Medicamentos' },
  ];

  filteredForms = computed(() => {
    const search = this.searchSidebar().toLowerCase().trim();
    const cats = this.selectedCategories();

    return this.forms().filter(f => {
      const matchSearch = !search
        || f.name.toLowerCase().includes(search)
        || f.code.toLowerCase().includes(search);
      const matchCat = cats.length === 0 || cats.includes(f.category);
      return matchSearch && matchCat;
    });
  });

  filteredResponses = computed(() => {
    const search = this.searchList().toLowerCase().trim();
    if (!search) return this.responses();
    return this.responses().filter(r =>
      r.filledBy.fullName.toLowerCase().includes(search) ||
      r.filledBy.email.toLowerCase().includes(search)
    );
  });

  ngOnInit(): void {
    this.getAllForms();
  }

  private getAllForms() {
    this.formService.getAllForms().subscribe({
      next: (resp) => {
        this.forms.set(resp);
        this.loading.set(false);
      }
    });
  }

  selectedForm(code: string) {
    this.form.set(null);
    this.responses.set([]);
    this.selectedResponse.set(null);
    this.selectedResponses.set([]);
    this.selectAll.set(false);
    this.searchList.set('');
    this.dateRange.set(null);

    this.formService.getFormByCode(code).subscribe({
      next: (resp) => this.form.set(resp)
    });

    this.loadResponses(code);
  }

  loadResponses(code: string, range?: Date[] | null) {
    const [start, end] = range ?? [];
    const startDate = start ? this.formatDate(start) : undefined;
    const endDate = end ? this.formatDate(end) : undefined;

    console.log('[loadResponses] code:', code, 'startDate:', startDate, 'endDate:', endDate);

    this.responseService.getResponsesByForm(code, startDate, endDate).subscribe({
      next: (resp) => this.responses.set(resp),
      error: (err) => console.log(err),
    });
  }

  onDateRangeChange(range: Date[] | null) {
    this.dateRange.set(range);
    if (!range || (range[0] && range[1])) {
      this.loadResponses(this.form()!.code, range);
    }
  }

  clearDateRange() {
    this.dateRange.set(null);
    this.loadResponses(this.form()!.code, null);
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  selectResponse(response: ResponseInterface): void {
    this.selectedResponse.set(response);
  }

  getResponses() {
    const code = this.selectedFormCode();
    if (code) {
      this.responseService.getResponsesByForm(code).subscribe({
        next: (resp) => this.responses.set(resp),
        error: (err) => console.log(err)
      });
    }
  }

  getDataEntries(data: Record<string, unknown>): { key: string; value: unknown }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  toggleResponse(responseId: string, checked: boolean) {
    if (checked) {
      this.selectedResponses.update(ids => [...ids, responseId]);
    } else {
      this.selectedResponses.update(ids => ids.filter(id => id !== responseId));
      this.selectAll.set(false);
    }
  }

  toggleAllResponses(checked: boolean) {
    this.selectAll.set(checked);
    if (checked) {
      this.selectedResponses.set(this.responses().map(r => r._id));
    } else {
      this.selectedResponses.set([]);
    }
  }

  isSelected(responseId: string): boolean {
    return this.selectedResponses().includes(responseId);
  }

  downloadResponse(response: ResponseInterface | null) {
    const form = this.form();
    const target = response ?? this.responses().find(
      r => this.selectedResponses().includes(r._id)
    ) ?? null;
    if (!target || !form) return;
    this.pdfService.generateResponsePdf(target, form);
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  isArray(value: unknown): boolean { return Array.isArray(value); }

  isStringArray(value: unknown): boolean {
    return Array.isArray(value) && value.every(v => typeof v === 'string' || typeof v === 'number');
  }

  asArray(value: unknown): unknown[] { return value as unknown[]; }

  asObjectArray(value: unknown): Record<string, unknown>[] {
    return value as Record<string, unknown>[];
  }

  getObjectEntries(obj: Record<string, unknown>): { key: string; value: unknown }[] {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  getFieldLabel(fieldName: string): string {
    const field = this.form()?.fields?.find(f => f.name === fieldName);
    return field?.label ?? fieldName;
  }

  getCatLabel(value: string): string {
    return this.categoriesOnly.find(c => c.value === value)?.label ?? value;
  }

  getCatColor(cat: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      SST: { bg: '#E6F1FB', text: '#0C447C' },
      CALIDAD: { bg: '#E1F5EE', text: '#085041' },
      GESTION_HUMANA: { bg: '#EEEDFE', text: '#3C3489' },
      MANTENIMIENTO: { bg: '#FAEEDA', text: '#633806' },
      COMERCIAL: { bg: '#FCF0FB', text: '#6B1F6A' },
      FINANCIERA: { bg: '#FEF3E2', text: '#7A4100' },
      DIRECCION: { bg: '#E2F4FE', text: '#0A4C6A' },
      OPERACION_LOGISTICA: { bg: '#E8F5E9', text: '#1B5E20' },
      PREPARADOS_ESTERILES: { bg: '#FCE4EC', text: '#880E4F' },
      DISTRIBUCION_MEDICAMENTOS: { bg: '#E0F7FA', text: '#006064' },
    };
    return map[cat?.toUpperCase()] ?? { bg: '#F1EFE8', text: '#444441' };
  }

  getRowLabel(fieldName: string, rowId: string): string {
    const field = this.form()?.fields?.find(f => f.name === fieldName);
    const row = field?.rows?.find(r => r.id === rowId);
    return row?.label ?? rowId;
  }

  getColumnLabel(fieldName: string, colKey: string): string {
    const field = this.form()?.fields?.find(f => f.name === fieldName);
    const col = field?.columns?.find((c: any) => c.key === colKey);
    return col?.label ?? colKey;
  }

  isTableField(fieldName: string): boolean {
    const field = this.form()?.fields?.find(f => f.name === fieldName);
    return field?.type === 'checklist-table' || field?.type === 'inventory-table';
  }

  getTableColumns(fieldName: string): any[] {
    const field = this.form()?.fields?.find(f => f.name === fieldName);
    return field?.columns ?? [];
  }

  deleteResponse(responseId: string): void {
    this.confirmService.confirm({
      message: '¿Estás seguro de eliminar esta respuesta?',
      header: 'Eliminar respuesta',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletingResponse.set(true);
        this.responseService.deleteResponse(responseId).subscribe({
          next: () => {
            this.selectedResponse.set(null);
            this.deletingResponse.set(false);
            const code = this.form()?.code;
            if (code) {
              this.responseService.getResponsesByForm(code).subscribe({
                next: (resp) => this.responses.set(resp)
              });
            }
          },
          error: () => this.deletingResponse.set(false)
        });
      }
    });
  }

  deleteManySelected(): void {
    const ids = this.selectedResponses();
    if (ids.length === 0) return;

    this.confirmService.confirm({
      message: `¿Eliminar ${ids.length} respuesta${ids.length !== 1 ? 's' : ''} seleccionada${ids.length !== 1 ? 's' : ''}?`,
      header: 'Eliminar respuestas',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletingMany.set(true);

        this.responseService.deleteManyResponses(ids).subscribe({
          next: () => {
            const idsEliminados = ids;
            this.responses.update(current =>
              current.filter(r => !idsEliminados.includes(r._id))
            );

            this.selectedResponses.set([]);
            this.selectAll.set(false);
            this.selectedResponse.set(null);
            this.deletingMany.set(false);

            this.getResponses();
          },
          error: (error) => {
            console.error('Error al eliminar:', error);
            this.deletingMany.set(false);
          }
        });
      }
    });
  }
}