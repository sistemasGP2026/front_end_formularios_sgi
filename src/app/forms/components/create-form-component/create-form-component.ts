import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { FormService } from '../../services/form.service';
import { AssignUserPermissionPage } from '../assign-user-permission-page/assign-user-permission-page';
import { UserResponse } from '../../../usuarios/interfaces/users.response.interface';
import { UsuarioService } from '../../../usuarios/services/usuario.service';
import { FormBuilderComponent } from '../form-builder-component/form-builder-component';
import { FormPreviewComponent, SectionWithFields } from '../pages/form-preview/form-preview';
import { Form } from '../../interfaces/form.interface';

type CreateMode = 'builder' | 'json';

@Component({
  selector: 'create-form-component',
  standalone: true,
  imports: [
    AssignUserPermissionPage,
    FormBuilderComponent,
    FormPreviewComponent,
    CommonModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    ToastModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './create-form-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateFormComponent implements OnInit {

  private readonly formService = inject(FormService);
  private readonly messageService = inject(MessageService);
  private readonly userService = inject(UsuarioService);

  userList = signal<UserResponse[]>([]);
  loading = signal(false);
  visible = false;
  /** Modo de creación: cuadro por cuadro (constructor visual) o pegando el JSON. */
  mode = signal<CreateMode>('builder');
  jsonInput = signal('');
  jsonError = signal('');
  parsedForm = signal<any | null>(null);
  /** Usuarios autorizados elegidos en el panel derecho (se conservan al cambiar de modo). */
  selectedUsers = signal<{ username: string; email: string; name: string }[]>([]);
  previewVisible = false;
  /** Se usa para que el constructor se reinicie tras guardar. */
  builderKey = signal(0);

  formName = computed(() => this.parsedForm()?.name ?? '');
  formCode = computed(() => this.parsedForm()?.code ?? '');
  formCategory = computed(() => this.parsedForm()?.category ?? '');
  formSections = computed(() => this.parsedForm()?.sections ?? []);
  formFields = computed(() => this.parsedForm()?.fields ?? []);
  isRestricted = computed(() => (this.parsedForm()?.accessType ?? 'RESTRICTED') === 'RESTRICTED');

  previewForm = computed<Form | null>(() => {
    const f = this.parsedForm();
    if (!f) return null;
    return {
      ...f,
      _id: '',
      version: f.version ?? 1,
      settings: f.settings ?? {},
      permissions: { users: [], approvers: [] },
      createdBy: { userId: '', name: '', username: '', email: '' },
      createdAt: '', updatedAt: '', deleted: false,
    } as Form;
  });

  previewSections = computed<SectionWithFields[]>(() => {
    const f = this.parsedForm();
    if (!f) return [];
    const sections = [...(f.sections ?? [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    return sections.map((section: any) => ({
      section,
      fields: (f.fields ?? [])
        .filter((x: any) => x.sectionId === section.id)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
    }));
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  setMode(mode: CreateMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    // Cada modo tiene su propia fuente; el formulario armado se vuelve a calcular al escribir.
    this.parsedForm.set(null);
    this.jsonError.set('');
    if (mode === 'json') this.onJsonChange(this.jsonInput());
  }

  openModal(): void {
    this.visible = true;
  }

  openPreview(): void {
    if (!this.parsedForm()) return;
    this.previewVisible = true;
  }

  /** Resultado del constructor visual (JSON válido o null). */
  onBuilderChange(form: any | null): void {
    if (this.mode() !== 'builder') return;
    this.parsedForm.set(form);
  }

  onJsonChange(value: string): void {
    this.jsonInput.set(value);
    this.jsonError.set('');
    this.parsedForm.set(null);

    if (!value.trim()) return;

    try {
      const parsed = JSON.parse(value);
      const error = this.validateForm(parsed);
      if (error) {
        this.jsonError.set(error);
        return;
      }
      // Usuarios que vengan dentro del JSON se pasan al panel de usuarios autorizados.
      const users = Array.isArray(parsed?.permissions?.users) ? parsed.permissions.users : [];
      if (users.length) {
        const known = new Set(this.selectedUsers().map(u => u.username));
        const extra = users
          .filter((u: any) => u?.username && !known.has(u.username))
          .map((u: any) => ({ username: u.username, email: u.email ?? '', name: u.name ?? u.username }));
        if (extra.length) this.selectedUsers.update(s => [...s, ...extra]);
      }
      delete parsed.permissions;
      this.parsedForm.set(parsed);
    } catch {
      this.jsonError.set('JSON inválido — verifica la sintaxis');
    }
  }

  private validateForm(form: any): string | null {
    if (!form.code?.trim()) return 'Falta el campo "code"';
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

  addUsersToForm(users: UserResponse[]): void {
    const existing = new Set(this.selectedUsers().map(u => u.username));
    const newUsers = users
      .filter(u => !existing.has(u.username))
      .map(u => ({ username: u.username, email: u.email, name: u.fullName }));

    this.selectedUsers.update(s => [...s, ...newUsers]);

    this.messageService.add({
      severity: 'success',
      summary: 'Usuarios agregados',
      detail: `${newUsers.length} usuario(s) agregado(s)`,
      life: 3000
    });
  }

  removeUser(username: string): void {
    this.selectedUsers.update(s => s.filter(u => u.username !== username));
  }

  createForm(): void {
    const form = this.parsedForm();
    if (!form) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin formulario',
        detail: this.mode() === 'json' ? 'Pega un JSON válido antes de guardar' : 'Completa los datos marcados antes de guardar',
        life: 4000
      });
      return;
    }

    // La API solo admite username (y banderas) en permissions.users: nombre y correo son solo para mostrar.
    const payload = {
      ...form,
      permissions: {
        users: this.isRestricted()
          ? this.selectedUsers().map(u => ({ username: u.username, canView: true, canSubmit: true }))
          : [],
      },
    };

    this.loading.set(true);

    this.formService.createForm(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Formulario creado',
          detail: `El formulario ${form.code} fue creado correctamente`,
          life: 4000
        });
        this.jsonInput.set('');
        this.parsedForm.set(null);
        this.jsonError.set('');
        this.selectedUsers.set([]);
        this.builderKey.update(k => k + 1);
      },
      error: (err) => {
        this.loading.set(false);
        const error = err?.error;

        if (Array.isArray(error?.message)) {
          const detail = error.message.join(' | ');
          this.messageService.add({
            severity: 'error',
            summary: 'Error de validación',
            detail,
            life: 8000
          });
          return;
        }

        const msg = typeof error?.message === 'string'
          ? error.message
          : 'No fue posible crear el formulario';

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: msg,
          life: 5000
        });
      }
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => this.userList.set(users),
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No fue posible cargar los usuarios'
      })
    });
  }

  getFieldsBySection(sectionId: string): any[] {
    return this.formFields()
      .filter((f: any) => f.sectionId === sectionId)
      .sort((a: any, b: any) => a.order - b.order);
  }
}
