// pending-approvals.component.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ResponseService } from '../responses/services/response.service';
import { FormService } from '../forms/services/form.service';
import { ResponseInterface } from '../responses/interfaces/response.interface';
import { Form } from '../forms/interfaces/form.interface';


@Component({
  selector: 'pending-approvals',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, TagModule, DialogModule,
    SkeletonModule, ToastModule, ConfirmDialogModule,
    IconFieldModule, InputIconModule, InputTextModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pending-approvals.html',
})
export class PendingApprovalsComponent implements OnInit {

  private responseService = inject(ResponseService);
  private formService     = inject(FormService);
  private message         = inject(MessageService);
  private confirmService  = inject(ConfirmationService);

  loading         = signal(true);
  pending         = signal<ResponseInterface[]>([]);
  formsMap        = signal<Map<string, Form>>(new Map());
  selected        = signal<ResponseInterface | null>(null);
  processing      = signal(false);
  searchTerm      = signal('');
  showRejectModal = false;
  rejectionReason = '';
  rejectingId     = '';

  filteredPending = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.pending();
    return this.pending().filter(r =>
      r.filledBy.fullName.toLowerCase().includes(term) ||
      r.formCode.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadPending();
  }

  private loadPending(): void {
    this.loading.set(true);
    this.responseService.getPendingResponses().subscribe({
      next: (resp) => {
        this.pending.set(resp);
        this.loading.set(false);
        this.loadForms(resp);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadForms(responses: ResponseInterface[]): void {
    const codes = [...new Set(responses.map(r => r.formCode))];
    if (codes.length === 0) return;

    const map = new Map<string, Form>();
    let loaded = 0;

    for (const code of codes) {
      this.formService.getFormByCode(code).subscribe({
        next: (form) => {
          map.set(code, form);
          loaded++;
          if (loaded === codes.length) this.formsMap.set(new Map(map));
        },
      });
    }
  }

  getForm(code: string): Form | undefined {
    return this.formsMap().get(code);
  }

  getFieldLabel(formCode: string, fieldName: string): string {
    const field = this.getForm(formCode)?.fields?.find(f => f.name === fieldName);
    return field?.label ?? fieldName;
  }

  getDataEntries(data: Record<string, unknown>): { key: string; value: unknown }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  isArray(value: unknown): boolean { return Array.isArray(value); }

  isTableArray(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0 &&
      typeof (value as any[])[0] === 'object' && !Array.isArray((value as any[])[0]);
  }

  getTableColumns(formCode: string, fieldName: string): any[] {
    return this.getForm(formCode)?.fields?.find(f => f.name === fieldName)?.columns ?? [];
  }

  getRowLabel(formCode: string, fieldName: string, rowId: string): string {
    const field = this.getForm(formCode)?.fields?.find(f => f.name === fieldName);
    return field?.rows?.find(r => r.id === rowId)?.label ?? rowId;
  }

  selectResponse(r: ResponseInterface): void { this.selected.set(r); }

  approve(response: ResponseInterface): void {
    this.confirmService.confirm({
      message:     `¿Aprobar la respuesta de ${response.filledBy.fullName}?`,
      header:      'Aprobar respuesta',
      icon:        'pi pi-check-circle',
      acceptLabel: 'Sí, aprobar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.processing.set(true);
        this.responseService.approveResponse(response._id, 'APPROVED').subscribe({
          next: () => {
            this.pending.update(l => l.filter(r => r._id !== response._id));
            if (this.selected()?._id === response._id) this.selected.set(null);
            this.processing.set(false);
            this.message.add({ severity: 'success', summary: 'Aprobada', detail: 'Respuesta aprobada correctamente', life: 3000 });
          },
          error: (err) => {
            this.processing.set(false);
            this.message.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo aprobar', life: 3000 });
          },
        });
      },
    });
  }

  openRejectModal(response: ResponseInterface): void {
    this.rejectingId     = response._id;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectionReason.trim()) {
      this.message.add({ severity: 'warn', summary: 'Requerido', detail: 'Ingresa una razón de rechazo', life: 3000 });
      return;
    }
    this.processing.set(true);
    this.responseService.approveResponse(this.rejectingId, 'REJECTED', this.rejectionReason).subscribe({
      next: () => {
        this.pending.update(l => l.filter(r => r._id !== this.rejectingId));
        if (this.selected()?._id === this.rejectingId) this.selected.set(null);
        this.showRejectModal = false;
        this.processing.set(false);
        this.message.add({ severity: 'info', summary: 'Rechazada', detail: 'Respuesta rechazada', life: 3000 });
      },
      error: (err) => {
        this.processing.set(false);
        this.message.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo rechazar', life: 3000 });
      },
    });
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    return ({ APPROVED: 'success', PENDING: 'warn', REJECTED: 'danger' } as any)[status] ?? 'info';
  }

  getStatusLabel(status: string): string {
    return ({ APPROVED: 'Aprobada', PENDING: 'Pendiente', REJECTED: 'Rechazada' } as any)[status] ?? status;
  }
}