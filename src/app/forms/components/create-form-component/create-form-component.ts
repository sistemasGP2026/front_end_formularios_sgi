import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormService } from '../../services/form.service';
import { AssignUserPermissionPage } from '../assign-user-permission-page/assign-user-permission-page';
import { UserResponse } from '../../../usuarios/interfaces/users.response.interface';
import { UsuarioService } from '../../../usuarios/services/usuario.service';

@Component({
  selector: 'create-form-component',
  standalone: true,
  imports: [
    AssignUserPermissionPage,
    CommonModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    ToastModule,
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
  jsonInput = signal('');
  jsonError = signal('');
  parsedForm = signal<any | null>(null);

  formName = computed(() => this.parsedForm()?.name ?? '');
  formCode = computed(() => this.parsedForm()?.code ?? '');
  formCategory = computed(() => this.parsedForm()?.category ?? '');
  formSections = computed(() => this.parsedForm()?.sections ?? []);
  formFields = computed(() => this.parsedForm()?.fields ?? []);

  ngOnInit(): void {
    this.loadUsers();
  }

  openModal(): void {
    this.visible = true;
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
    const current = this.parsedForm();
    if (!current) return;

    const existingUsernames = new Set(
      (current.permissions?.users ?? []).map((u: any) => u.username)
    );

    const newUsers = users
      .filter(u => !existingUsernames.has(u.username))
      .map(u => ({ username: u.username, email: u.email, name: u.fullName }));

    this.parsedForm.set({
      ...current,
      permissions: {
        ...current.permissions,
        users: [...(current.permissions?.users ?? []), ...newUsers]
      }
    });

    this.messageService.add({
      severity: 'success',
      summary: 'Usuarios agregados',
      detail: `${newUsers.length} usuario(s) agregado(s)`,
      life: 3000
    });
  }

  removeUser(username: string): void {
    const current = this.parsedForm();
    if (!current) return;

    this.parsedForm.set({
      ...current,
      permissions: {
        ...current.permissions,
        users: current.permissions.users.filter(
          (u: any) => u.username !== username
        )
      }
    });
  }

  createForm(): void {
    const form = this.parsedForm();
    if (!form) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin formulario',
        detail: 'Pega un JSON válido antes de guardar',
        life: 4000
      });
      return;
    }

    this.loading.set(true);

    this.formService.createForm(form).subscribe({
      next: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Formulario creado',
          detail: 'El formulario fue creado correctamente',
          life: 4000
        });
        this.jsonInput.set('');
        this.parsedForm.set(null);
        this.jsonError.set('');
      },
      // create-form-component.ts — en el error del createForm
      error: (err) => {
        this.loading.set(false);
        const error = err?.error;

        // Si es array de mensajes de validación
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

        // Si es string
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