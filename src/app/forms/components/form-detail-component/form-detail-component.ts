import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
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
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
    RouterLink,
    RouterModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './form-detail-component.html',
})
export class FormDetailComponent implements OnInit {

  visible          = false;
  visibleEdit      = false; // ← modal de edición
  mode: 'preview' | 'respond' = 'preview';
  form: Form | null = null;
  sectionsWithFields: SectionWithFields[] = [];
  loading = true;

  showResponsesPanel = false;
  responses: ResponseInterface[] = [];
  responsesTotal = 0;

  selectedUsers = signal<string[]>([]);
  userList      = signal<UserResponse[]>([]);

  // ─── edición via JSON ───────────────────────────────
  editJsonInput  = '';
  editJsonError  = '';
  editParsed: any = null;
  editSaving     = false;
  // ────────────────────────────────────────────────────

  private message        = inject(MessageService);
  private usuarioService = inject(UsuarioService);
  private route          = inject(ActivatedRoute);
  private formService    = inject(FormService);
  private cdr            = inject(ChangeDetectorRef);
  private router         = inject(Router);
  private responseService = inject(ResponseService);

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');
    const mode = this.route.snapshot.queryParamMap.get('mode');
    this.mode  = mode === 'respond' ? 'respond' : 'preview';

    if (!code) { this.router.navigate(['/formularios']); return; }
    this.loadForm(code.toUpperCase());
  }

  // ─── EDICIÓN ─────────────────────────────────────────

  openEditModal(): void {
    if (!this.form) return;

    // Pre-cargar el JSON actual del formulario en el editor
    const { _id, __v, createdAt, updatedAt, createdBy, deleted, ...editableForm } = this.form as any;
    this.editJsonInput = JSON.stringify(editableForm, null, 2);
    this.editJsonError = '';
    this.editParsed    = editableForm;
    this.visibleEdit   = true;
  }

  onEditJsonChange(value: string): void {
    this.editJsonInput = value;
    this.editJsonError = '';
    this.editParsed    = null;

    if (!value.trim()) return;

    try {
      const parsed = JSON.parse(value);
      const error  = this.validateEditForm(parsed);
      if (error) { this.editJsonError = error; return; }
      this.editParsed = parsed;
    } catch {
      this.editJsonError = 'JSON inválido — verifica la sintaxis';
    }
  }

  private validateEditForm(form: any): string | null {
    if (!form.name?.trim())     return 'Falta el campo "name"';
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

    const code = this.form.code;
    this.formService.updateForm(code, this.editParsed).subscribe({
      next: (updated) => {
        this.form             = updated;
        this.sectionsWithFields = this.buildSectionsWithFields(updated);
        this.editSaving       = false;
        this.visibleEdit      = false;
        this.message.add({
          severity: 'success',
          summary:  'Formulario actualizado',
          detail:   `v${updated.version} guardada correctamente`,
          life:     4000
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.editSaving   = false;
        this.editJsonError = err?.error?.message ?? 'Error al actualizar el formulario';
      }
    });
  }

  // ─── RESPUESTAS ──────────────────────────────────────

  toggleResponsesPanel(): void {
    this.showResponsesPanel = !this.showResponsesPanel;
    if (this.showResponsesPanel && this.responses.length === 0) {
      this.loadResponses();
    }
  }

  openAssignModal(): void {
    this.visible = true;
    if (this.userList().length > 0) return;
    this.usuarioService.getAllUsers().subscribe({
      next: (users) => this.userList.set(users),
      error: (err)  => console.log(err)
    });
  }

  loadResponses(): void {
    if (!this.form) return;
    this.responseService.getResponsesByForm(this.form.code).subscribe({
      next: (resp) => {
        this.responses      = resp;
        this.responsesTotal = resp.length;
        if (this.responsesTotal > 0) this.showResponsesPanel = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.responses      = [];
        this.responsesTotal = 0;
      }
    });
  }

  closeResponsesPanel(): void { this.showResponsesPanel = false; }

  assigPermision(usernames: string[]): void {
    const code = this.route.snapshot.paramMap.get('code');
    if (!code) return;
    this.formService.assignPermissionToUser(code, usernames).subscribe({
      next: (data) => {
        this.form?.permissions.users.push(...data);
        this.message.add({ severity: 'success', summary: 'Realizado', detail: 'Permiso asignado correctamente' });
      },
      error: (err) => console.log(err)
    });
  }

  private loadForm(code: string): void {
    this.loading = true;
    this.formService.getFormByCode(code).subscribe({
      next: (form) => {
        if (!form) { this.router.navigate(['/formularios']); return; }
        this.form               = form;
        this.sectionsWithFields = this.buildSectionsWithFields(form);
        this.loading            = false;
        this.loadResponses();
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
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

  getInitials(fullName: string): string {
    return fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, any> = {
      PUBLISHED: 'success', DRAFT: 'warn', ARCHIVED: 'secondary', CLOSED: 'danger',
    };
    return map[status] ?? 'info';
  }

  goBack(): void { this.router.navigate(['/formularios']); }
}