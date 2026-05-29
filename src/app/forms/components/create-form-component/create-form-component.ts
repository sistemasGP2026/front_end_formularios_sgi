import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
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
    SelectModule,
    CheckboxModule,
    ButtonModule,
    DividerModule,
    CardModule,
    AccordionModule,
    ToggleSwitchModule,
    ToastModule
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
  loading = false;
  visible = false;

  categories = [
    { label: 'CALIDAD', value: 'CALIDAD' },
    { label: 'GESTION HUMANA', value: 'GESTION HUMANA' },
    { label: 'COMERCIAL', value: 'COMERCIAL' },
    { label: 'FINANCIERA', value: 'FINANCIERA' },
    { label: 'MANTENIMIENTO', value: 'MANTENIMIENTO' }
  ];

  accessTypes = [
    { label: 'Restringido', value: 'RESTRICTED' },
    { label: 'Público', value: 'PUBLIC' }
  ];

  fieldTypes = [
    { label: 'Texto', value: 'text' },
    { label: 'Textarea', value: 'textarea' },
    { label: 'Número', value: 'number' },
    { label: 'Fecha', value: 'date' },
    { label: 'Select', value: 'select' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Checklist Table', value: 'checklist-table' },
    { label: 'Inventory Table', value: 'inventory-table' }
  ];

  ngOnInit(): void {
    this.loadUsers();
  }
  openModal() {
    this.visible = true;
  }
  form = signal<any>({
    code: '',
    name: '',
    description: '',

    category: 'CALIDAD',

    accessType: 'RESTRICTED',

    settings: {
      allowDraft: false,
      requiresSede: false,
      requiresReviewSignature: false,
      requiresApproval: false,
      showCompliance: false,
      preventDuplicates: false,
      duplicateBy: null
    },

    permissions: {
      users: []
    },

    sections: [],

    fields: []
  });

  orderedSections = computed(() => {

    return [...this.form().sections]
      .sort((a, b) => a.order - b.order);

  });

  addSection(): void {

    const current = this.form();

    const sectionId = crypto.randomUUID();

    this.form.update(form => ({

      ...form,

      sections: [

        ...form.sections,

        {
          id: sectionId,

          code: `SECTION_${form.sections.length + 1}`,

          title: `Nueva sección ${form.sections.length + 1}`,

          order: form.sections.length
        }
      ]
    }));
  }

  deleteSection(sectionId: string): void {

    this.form.update(form => ({

      ...form,

      sections: form.sections.filter(
        (s: any) => s.id !== sectionId
      ),

      fields: form.fields.filter(
        (f: any) => f.sectionId !== sectionId
      )
    }));
  }

  addField(type: string, sectionId: string): void {

    const fields = this.form().fields;

    this.form.update(form => ({

      ...form,

      fields: [

        ...form.fields,

        {
          id: crypto.randomUUID(),
          name: '',
          label: '',
          type,
          sectionId,
          required: false,
          readOnly: false,
          hidden: false,
          placeholder: null,
          helpText: null,
          minLength: null,
          maxLength: null,
          pattern: null,
          min: null,
          max: null,
          options: [],
          rows: [],
          columns: [],
          validations: [],
          conditionalRules: [],
          dataSource: null,
          order: fields.length
        }
      ]
    }));
  }

  deleteField(fieldId: string): void {
    this.form.update(form => ({
      ...form,
      fields: form.fields.filter(
        (f: any) => f.id !== fieldId
      )
    }));
  }

  getFieldsBySection(sectionId: string) {
    return this.form()
      .fields
      .filter((f: any) => f.sectionId === sectionId)
      .sort((a: any, b: any) => a.order - b.order);
  }

  addOption(field: any): void {

    field.options.push({
      label: '',
      value: '',
      isDefault: false,
      order: field.options.length
    });
  }

  removeOption(field: any, index: number): void {
    field.options.splice(index, 1);
  }

  addRow(field: any): void {
    field.rows.push({
      id: crypto.randomUUID(),
      label: '',
      order: field.rows.length
    });
  }

  removeRow(field: any, index: number): void {
    field.rows.splice(index, 1);
  }

  addColumn(field: any): void {
    field.columns.push({
      key: '',
      label: '',
      inputType: 'text',
      required: false,
      order: field.columns.length,
      options: []
    });
  }

  removeColumn(field: any, index: number): void {
    field.columns.splice(index, 1);
  }

  createForm(): void {
    const payload = this.form();

    // VALIDACIONES
    if (!payload.code?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Código requerido',
        detail: 'Debe ingresar el código del formulario',
        life: 4000
      });

      return;
    }

    if (!payload.name?.trim()) {

      this.messageService.add({
        severity: 'warn',
        summary: 'Nombre requerido',
        detail: 'Debe ingresar el nombre del formulario',
        life: 4000
      });

      return;
    }

    if (!payload.category) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Categoría requerida',
        detail: 'Seleccione una categoría',
        life: 4000
      });
      return;
    }

    if (payload.sections.length === 0) {

      this.messageService.add({
        severity: 'warn',
        summary: 'Secciones requeridas',
        detail: 'Debe agregar al menos una sección',
        life: 4000
      });

      return;
    }

    this.loading = true;

    this.formService.createForm(payload).subscribe({
      next: () => {

        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Formulario creado',
          detail: 'El formulario fue creado correctamente',
          life: 4000
        });

        this.form.set({
          code: '',
          name: '',
          description: '',
          category: 'CALIDAD',
          accessType: 'RESTRICTED',
          settings: {
            allowDraft: false,
            requiresSede: false,
            requiresReviewSignature: false,
            requiresApproval: false,
            showCompliance: false,
            preventDuplicates: false,
            duplicateBy: null
          },

          permissions: {
            users: []
          },

          sections: [],
          fields: []
        });

        this.addSection();
      },

      error: (err) => {

        this.loading = false;
        const error = err?.error;
        console.error(err);
        // VALIDACIONES MONGOOSE
        if (error?.message?.includes('validation failed')) {

          // ENUM INVALIDO
          if (error?.errors?.category?.kind === 'enum') {

            this.messageService.add({
              severity: 'error',
              summary: 'Categoría inválida',
              detail:
                `La categoría '${error.errors.category.value}' no es válida`,
              life: 5000
            });

            return;
          }

          const firstError = Object.values(error.errors)[0] as any;

          if (firstError?.kind === 'required') {
            this.messageService.add({
              severity: 'error',
              summary: 'Campo requerido',
              detail: firstError.message,
              life: 5000
            });

            return;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Error de validación',
            detail: 'Verifique los datos enviados',
            life: 5000
          });

          return;
        }

        // CODIGO DUPLICADO
        if (
          typeof error?.message === 'string' &&
          error.message.includes('Ya existe un formulario con el código')
        ) {

          this.messageService.add({
            severity: 'warn',
            summary: 'Código duplicado',
            detail: error.message,
            life: 5000
          });

          return;
        }

        if (err.status === 400) {

          this.messageService.add({
            severity: 'error',
            summary: 'Solicitud inválida',
            detail: error?.message || 'Datos inválidos',
            life: 5000
          });

          return;
        }

        if (err.status === 401) {

          this.messageService.add({
            severity: 'error',
            summary: 'Sesión expirada',
            detail: 'Debe iniciar sesión nuevamente',
            life: 5000
          });

          return;
        }

        if (err.status === 403) {

          this.messageService.add({
            severity: 'error',
            summary: 'Sin permisos',
            detail: 'No tiene permisos para crear formularios',
            life: 5000
          });

          return;
        }

        if (err.status === 404) {

          this.messageService.add({
            severity: 'error',
            summary: 'No encontrado',
            detail: 'El recurso solicitado no existe',
            life: 5000
          });

          return;
        }

        if (err.status === 500) {

          this.messageService.add({
            severity: 'error',
            summary: 'Error del servidor',
            detail: 'Ocurrió un error interno',
            life: 5000
          });

          return;
        }

        // ERROR GENERICO
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No fue posible crear el formulario',
          life: 5000
        });
      }
    });
  }

  loadUsers(): void {

    this.userService.getAllUsers().subscribe({

      next: (users) => {
        this.userList.set(users);
      },

      error: (err) => {
        console.log(err);

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No fue posible cargar los usuarios'
        });
      }

    });

  }

  assigPermision(usernames: string[]) {
    const code = this.form().code
    this.formService.assignPermissionToUser(code, usernames).subscribe({
      next: (data) => {
        this.form().permissions.users.push(...data);
        this.messageService.add({ severity: 'success', summary: 'Realizado', detail: 'Permiso asignado correctamente' });
      },
      error: (error) => console.log(error)
    });
  }

  addUsersToForm(users: UserResponse[]) {

    const currentUsers = this.form().permissions.users;

    const existingUsernames = new Set(
      currentUsers.map((u: any) => u.username)
    );

    const newUsers = users
      .filter(u => !existingUsernames.has(u.username))
      .map(u => ({
        username: u.username,
        email: u.email,
        name: u.fullName
      }));

    this.form.update(form => ({
      ...form,

      permissions: {
        ...form.permissions,

        users: [
          ...form.permissions.users,
          ...newUsers
        ]
      }
    }));

    this.messageService.add({
      severity: 'success',
      summary: 'Usuarios agregados',
      detail: `${newUsers.length} usuario(s) agregado(s)`,
      life: 3000
    });
  }

  
}