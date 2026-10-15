import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { Form, FormField, FormSection } from '../../interfaces/form.interface';
import { FormService } from '../../services/form.service';
import { ResponseInterface } from '../../../responses/interfaces/response.interface';
import { ResponseService } from '../../../responses/services/response.service';
import { FormPreviewComponent } from '../pages/form-preview/form-preview';
import { AssignUserPermissionPage } from '../assign-user-permission-page/assign-user-permission-page';
import { UserResponse } from '../../../usuarios/interfaces/users.response.interface';
import { UsuarioService } from '../../../usuarios/services/usuario.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PdfService } from '../../../shared/services/pdf.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from '../../../auth/services/auth.service';
import { User } from '../../../auth/interfaces/signIn.response';
import { DraftService } from '../../../responses/services/draft.service';
import { DraftInterface } from '../../../responses/interfaces/draft.interface';
import { catchError, forkJoin, of } from 'rxjs';

export interface SectionWithFields {
  section: FormSection;
  fields: FormField[];
}

@Component({
  selector: 'form-detail-component',
  standalone: true,
  imports: [
    AssignUserPermissionPage,
    CommonModule,
    DatePipe,
    FormsModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    DividerModule,
    DialogModule,
    FormPreviewComponent,
    RouterModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './form-detail-component.html',
  styleUrl: './form-detail-component.css',
})
export class FormDetailComponent implements OnInit {
  visible = false;
  visibleEdit = false;
  visibleApproverModal = false;
  mode: 'preview' | 'respond' = 'preview';
  loading = true;
  deleting = false;

  form: Form | null = null;
  sectionsWithFields: SectionWithFields[] = [];
  responses: ResponseInterface[] = [];
  responsesTotal = 0;
  showResponsesPanel = false;

  selectedUsers = signal<string[]>([]);
  userList = signal<UserResponse[]>([]);
  currentUser = signal<User | null>(null);

  // Borradores (modo respond)
  draftId: string | null = null;
  draftData: Record<string, unknown> | null = null;
  draftSavedAt: string | null = null;
  /** Borradores previos del usuario para este formulario (se ofrece continuar el más reciente). */
  availableDrafts: DraftInterface[] = [];

  editJsonInput = '';
  editJsonError = '';
  editParsed: any = null;
  editSaving = false;

  private message = inject(MessageService);
  private confirmService = inject(ConfirmationService);
  private usuarioService = inject(UsuarioService);
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private responseService = inject(ResponseService);
  private pdfService = inject(PdfService);
  private authService = inject(AuthService);
  private draftService = inject(DraftService);

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');
    const mode = this.route.snapshot.queryParamMap.get('mode');
    this.mode = mode === 'respond' ? 'respond' : 'preview';
    this.draftId = this.mode === 'respond'
      ? this.route.snapshot.queryParamMap.get('draft')
      : null;

    if (!code) { this.router.navigate(['/formularios']); return; }
    this.loadForm(code.toUpperCase());
    this.currentUser.set(this.authService.currentUser());
  }

  private loadForm(code: string): void {
    this.loading = true;

    // En modo respond el borrador (si viene en la URL) se carga junto con el formulario,
    // para que la vista previa nazca ya con los datos restaurados.
    // Un 404 significa que ya no existe; cualquier otro error se reporta como fallo de carga.
    const draft$ = this.draftId
      ? this.draftService.getDraft(this.draftId).pipe(
          catchError((err) => of(err?.status === 404 ? null : 'error' as const)),
        )
      : of(null);

    forkJoin({ form: this.formService.getFormByCode(code), draft: draft$ }).subscribe({
      next: ({ form, draft }) => {
        if (!form) { this.router.navigate(['/formularios']); return; }
        this.form = form;
         if (!form.permissions.approvers) {
        form.permissions.approvers = [];
      }
        this.applyDraft(draft, form);
        this.sectionsWithFields = this.buildSectionsWithFields(form);
        this.loading = false;
        this.loadResponses();
        if (this.mode === 'respond' && !this.draftId) this.loadAvailableDrafts();
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  private applyDraft(draft: DraftInterface | null | 'error', form: Form): void {
    // Un borrador solo puede continuarse sobre el formulario al que pertenece.
    if (draft && draft !== 'error' && draft.formCode === form.code) {
      this.draftId = draft._id;
      this.draftData = draft.data;
      this.draftSavedAt = draft.updatedAt;
      return;
    }

    if (this.draftId) {
      // El borrador de la URL no sirve aquí (se envió, se descartó, es de otro formulario
      // o no se pudo cargar): se continúa en limpio y se limpia la URL.
      this.draftId = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { draft: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.message.add({
        severity: draft === 'error' ? 'warn' : 'info',
        summary: draft === 'error' ? 'No se pudo cargar el borrador' : 'Borrador no disponible',
        detail: draft === 'error'
          ? 'Revisa tu conexión e inténtalo de nuevo desde "Borradores". Puedes diligenciar el formulario desde cero.'
          : 'Ese borrador ya fue enviado, descartado o pertenece a otro formulario. Puedes diligenciar el formulario desde cero.',
        life: 5000,
      });
    }
  }

  /** Borradores previos del usuario para este formulario, el más reciente primero. */
  private loadAvailableDrafts(): void {
    if (!this.form) return;
    this.draftService.getMyDrafts(this.form.code).subscribe({
      next: (drafts) => {
        this.availableDrafts = drafts;
        this.cdr.detectChanges();
      },
      error: () => { this.availableDrafts = []; },
    });
  }

  /** El hijo guardó un borrador: se sincroniza el id y se oculta el aviso de borradores previos. */
  onDraftSaved(draft: DraftInterface): void {
    this.draftId = draft._id;
    this.draftSavedAt = draft.updatedAt;
    this.availableDrafts = [];
    this.cdr.detectChanges();
  }

  /** Continúa un borrador sobre el formulario ya cargado (sin recargar la página). */
  continueDraft(draft: DraftInterface): void {
    this.draftId = draft._id;
    this.draftData = draft.data;
    this.draftSavedAt = draft.updatedAt;
    this.availableDrafts = [];

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { draft: draft._id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.cdr.detectChanges();
  }

  private buildSectionsWithFields(form: Form): SectionWithFields[] {
    return (form.sections ?? [])
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        section,
        fields: (form.fields ?? [])
          .filter((f) => f.sectionId === section.id)
          .sort((a, b) => a.order - b.order),
      }));
  }

  loadResponses(): void {
    if (!this.form) return;
    this.responseService.getResponsesByForm(this.form.code).subscribe({
      next: (resp) => {
        this.responses = resp;
        this.responsesTotal = resp.length;
        if (this.responsesTotal > 0) this.showResponsesPanel = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.responses = [];
        this.responsesTotal = 0;
      },
    });
  }

  toggleResponsesPanel(): void {
    this.showResponsesPanel = !this.showResponsesPanel;
    if (this.showResponsesPanel && this.responses.length === 0) {
      this.loadResponses();
    }
  }

  closeResponsesPanel(): void { this.showResponsesPanel = false; }

  deleteForm(): void {
    if (!this.form) return;
    this.confirmService.confirm({
      message: `¿Eliminar el formulario "${this.form.name}"? Quedará inactivo pero podrá reactivarse.`,
      header: 'Eliminar formulario',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleting = true;
        this.formService.deleteForm(this.form!.code).subscribe({
          next: () => {
            this.deleting = false;
            this.message.add({
              severity: 'success',
              summary: 'Formulario eliminado',
              detail: `${this.form!.code} fue desactivado correctamente`,
              life: 3000,
            });
            setTimeout(() => this.router.navigate(['/formularios']), 2000);
          },
          error: (err) => {
            this.deleting = false;
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: err?.error?.message ?? 'No se pudo eliminar el formulario',
              life: 4000,
            });
          },
        });
      },
    });
  }

  openAssignModal(): void {
    this.visible = true;
    if (this.userList().length > 0) return;
    this.usuarioService.getAllUsers().subscribe({
      next: (users) => this.userList.set(users),
    });
  }

  assigPermision(users: UserResponse[]): void {
    const code = this.route.snapshot.paramMap.get('code');
    if (!code || users.length === 0) return;
    const usernames = users.map(u => u.username);
    this.formService.assignPermissionToUser(code, usernames).subscribe({
      next: (data) => {
        this.form?.permissions.users.push(...data);
        this.message.add({
          severity: 'success',
          summary: 'Realizado',
          detail: 'Permiso asignado correctamente',
        });
      },
    });
  }

  removeUserPermission(username: string): void {
    if (!this.form) return;
    this.formService.deletePermissionToUSer(this.form.code, username).subscribe({
      next: () => {
        this.form!.permissions.users = this.form!.permissions.users.filter(
          u => u.username !== username
        );
        this.message.add({
          severity: 'success',
          summary: 'Acceso removido',
          detail: `@${username} ya no tiene acceso a este formulario`,
          life: 3000,
        });
      },
      error: (err) => {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'No se pudo remover el acceso',
          life: 3000,
        });
      },
    });
  }

  openAssignApproverModal(): void {
    this.visibleApproverModal = true;
    this.usuarioService.getAllUsers().subscribe({
      next: (users) => this.userList.set(
        users.filter(u => u.rol?.includes('APPROVER'))
      ),
    });
  }

  assigApprover(users: UserResponse[]): void {
    const code = this.form?.code;
    if (!code || users.length === 0) return;
    const usernames = users.map(u => u.username);
    this.formService.assignApproverToForm(code, usernames).subscribe({
      next: (data) => {
        this.form!.permissions.approvers = [
          ...(this.form!.permissions.approvers ?? []),
          ...data,
        ];
        this.message.add({
          severity: 'success',
          summary: 'Aprobador asignado',
          detail: 'El aprobador fue agregado correctamente',
          life: 3000,
        });
      },
      error: (err) => {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'No se pudo asignar el aprobador',
          life: 3000,
        });
      },
    });
  }

  removeApprover(username: string): void {
    if (!this.form) return;
    this.formService.removeApproverFromForm(this.form.code, username).subscribe({
      next: () => {
        this.form = {
          ...this.form!,
          permissions: {
            ...this.form!.permissions,
            approvers: this.form!.permissions.approvers.filter(
              a => a.username !== username
            ),
          },
        };
        this.message.add({
          severity: 'success',
          summary: 'Aprobador removido',
          detail: `@${username} ya no puede aprobar este formulario`,
          life: 3000,
        });
      },
      error: (err) => {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'No se pudo remover el aprobador',
          life: 3000,
        });
      },
    });
  }

  openEditModal(): void {
    if (!this.form) return;
    const { _id, __v, createdAt, updatedAt, createdBy, deleted, ...editableForm } = this.form as any;

    if (editableForm.documentDate) {
      const d = new Date(editableForm.documentDate);
      if (!isNaN(d.getTime())) {
        editableForm.documentDate = d.toISOString().split('T')[0];
      }
    }

    this.editJsonInput = JSON.stringify(editableForm, null, 2);
    this.editJsonError = '';
    this.editParsed = editableForm;
    this.visibleEdit = true;
  }


  onEditJsonChange(value: string): void {
    this.editJsonInput = value;
    this.editJsonError = '';
    this.editParsed = null;
    if (!value.trim()) return;
    try {
      const parsed = JSON.parse(value);
      const error = this.validateEditForm(parsed);
      if (error) { this.editJsonError = error; return; }
      this.editParsed = parsed;
    } catch {
      this.editJsonError = 'JSON inválido — verifica la sintaxis';
    }
  }

  private validateEditForm(form: any): string | null {
    if (!form.name?.trim()) return 'Falta el campo "name"';
    if (!form.category?.trim()) return 'Falta el campo "category"';
    if (!Array.isArray(form.sections) || form.sections.length === 0)
      return 'Debe tener al menos una sección en "sections"';
    if (!Array.isArray(form.fields))
      return 'El campo "fields" debe ser un array';
    if (form.version !== undefined && (isNaN(form.version) || form.version < 1))
      return '"version" debe ser un número mayor o igual a 1';
    return null;
  }

  saveEdit(): void {
    if (!this.editParsed || !this.form) return;
    this.editSaving = true;

    // La versión la asigna el backend (versión actual + 1): no se envía para que el
    // incremento sea automático aunque el JSON editado conserve la versión anterior (OQ-010).
    const { _id, __v, code, version, createdAt, updatedAt, createdBy, deleted, ...payload } = this.editParsed;

    this.formService.updateForm(this.form.code, payload).subscribe({
      next: (updated) => {
        console.log(updated);
        this.sectionsWithFields = this.buildSectionsWithFields(updated);
        this.editSaving = false;
        this.visibleEdit = false;
        this.message.add({
          severity: 'success',
          summary: 'Formulario actualizado',
          detail: `v${updated.version} guardada correctamente`,
          life: 4000,
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.log(err);
        this.editSaving = false;
        this.editJsonError = err?.error?.message ?? 'Error al actualizar el formulario';
      },
    });
  }

  printForm(): void {
    if (!this.form) return;
    this.pdfService.printForm(this.form);
  }

  downloadPdf(): void {
    if (!this.form) return;
    this.pdfService.generateFormPdf(this.form);
  }

  getInitials(fullName: string): string {
    return fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  goBack(): void {
    if (this.form?.category) {
      this.router.navigate(['/formularios', 'categoria', this.form.category]);
    } else {
      this.router.navigate(['/formularios']);
    }
  }
}