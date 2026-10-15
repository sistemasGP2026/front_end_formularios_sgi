import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DraftService } from '../responses/services/draft.service';
import { DraftInterface } from '../responses/interfaces/draft.interface';

@Component({
  selector: 'app-borradores-component',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, ToastModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './borradores-component.html',
})
export class BorradoresComponent implements OnInit {

  private readonly draftService = inject(DraftService);
  private readonly router = inject(Router);
  private readonly message = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);

  loading = signal(true);
  drafts  = signal<DraftInterface[]>([]);
  deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.draftService.getMyDrafts().subscribe({
      next: (data) => {
        this.drafts.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Abre el formulario en modo respuesta con el borrador cargado. */
  continueDraft(draft: DraftInterface): void {
    this.router.navigate(['/formularios', draft.formCode], {
      queryParams: { mode: 'respond', draft: draft._id },
    });
  }

  discardDraft(draft: DraftInterface, event: Event): void {
    event.stopPropagation();
    this.confirmService.confirm({
      message: `¿Descartar el borrador de "${draft.formName}"? Se perderá lo diligenciado hasta ahora.`,
      header: 'Descartar borrador',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, descartar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletingId.set(draft._id);
        this.draftService.deleteDraft(draft._id).subscribe({
          next: () => {
            this.drafts.update(list => list.filter(d => d._id !== draft._id));
            this.deletingId.set(null);
            this.message.add({
              severity: 'success',
              summary: 'Borrador descartado',
              detail: `${draft.formCode} fue eliminado de tus borradores`,
              life: 3000,
            });
          },
          error: (err) => {
            this.deletingId.set(null);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: err?.error?.message ?? 'No se pudo descartar el borrador',
              life: 4000,
            });
          },
        });
      },
    });
  }

  progressPercent(draft: DraftInterface): number {
    const { filled, total } = draft.progress ?? { filled: 0, total: 0 };
    if (!total) return 0;
    return Math.min(100, Math.round((filled / total) * 100));
  }
}
