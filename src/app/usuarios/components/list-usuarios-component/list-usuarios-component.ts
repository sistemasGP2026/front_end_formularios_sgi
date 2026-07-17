import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { UsuarioService } from '../../services/usuario.service';
import { UserResponse } from '../../interfaces/users.response.interface';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormValidation } from '../../../helpers/form-validation.helper';
import { CreateUserModalPage } from '../create-user-modal-page/create-user-modal-page';
import { EditUserModalPage } from '../edit-user-modal-page/edit-user-modal-page';
import { ResetPasswordModalPage } from '../reset-password-modal-page/reset-password-modal-page';

@Component({
  selector: 'app-list-usuarios-component',
  standalone: true,
  imports: [
    AutoCompleteModule,
    CommonModule,
    CreateUserModalPage,
    EditUserModalPage,
    FormsModule,
    TagModule,
    ToastModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    PaginatorModule,
    PasswordModule,
    ReactiveFormsModule,
    ResetPasswordModalPage
  ],
  providers: [MessageService],
  templateUrl: './list-usuarios-component.html',
})


export class ListUsuariosComponent implements OnInit {
  FormValidation = FormValidation;
  selectedUser: UserResponse | null = null;



  users = signal<UserResponse[]>([])
  totalUsuarios = signal<number>(0)

  private usuarioService = inject(UsuarioService)
  private fb = inject(FormBuilder)
  private message = inject(MessageService)

  visibleReset = false;

  myForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(5)]],
    password: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(64)]],
    roles: ['', Validators.required]
  })

  visible: boolean = false;
  visibleEdit: boolean = false;

  ngOnInit(): void {
    this.getAllUsers();
    this.onUserUpdated();
  }

  getAllUsers() {
    this.usuarioService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set([]);
        this.users.set(data);
        this.totalUsuarios.set(data.length);
      }
    });
  }

  onUserCreated(user: UserResponse): void {
    this.users.update(users => [...users, user]);
    this.totalUsuarios.update(total => total + 1);
  }

  search = signal('');

  filteredUsers = computed(() => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.users();

    return this.users().filter(u =>
      u.fullName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.rol?.toLowerCase().includes(term)
    );
  });

  resetPassword(usuario: UserResponse): void {
    this.selectedUser = usuario;
    this.visibleReset = true;
  }


  abrirModal(): void {
    this.visible = true
  }

  guardarUsuario() {
  if (this.myForm.invalid) {
    FormValidation.markFormTouched(this.myForm);
    return;
  }

  const userFormValue = this.myForm.value;
  
  this.usuarioService.createUser(userFormValue).subscribe({
    next: (data) => {
      const nuevoUsuario: UserResponse = {
        ...data,
        rol: data.rol || data.rol|| userFormValue.roles
      };

      // USAR .update EN LUGAR DE .push() DIRECTO
      this.users.update(currentUsers => [...currentUsers, nuevoUsuario]);
      this.totalUsuarios.update(total => total + 1);

      this.message.add({ 
        severity: 'success', 
        summary: 'Completado', 
        detail: 'Usuario creado con éxito', 
        life: 3000 
      });

      this.visible = false;
      this.myForm.reset();
    },
    error: (error) => {
      const backendMessage: string = error?.error?.message || '';
      if (backendMessage.includes('email')) {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: `El email: ${this.myForm.get('email')?.value} ya se encuentra en uso`,
          life: 3000
        });
      }
      if (backendMessage.includes('username')) {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: `El nombre de usuario: ${this.myForm.get('username')?.value} ya se encuentra en uso`,
          life: 3000
        });
      }
    }
  });
}

  getRolLabel(roles: string): string {
    const map: Record<string, string> = {
      ADMIN: 'Administrador',
      USER: 'Usuario',
      APPROVER: 'Aprobador',
    };
    return map[roles] ?? roles ?? '—';
  }

  getRolColor(roles: string): { bg: string; text: string; dot: string } {
    const map: Record<string, { bg: string; text: string; dot: string }> = {
      ADMIN: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
      USER: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
      APPROVER: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
    };
    return map[roles] ?? { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' };
  }

  hasError(controlName: string): boolean {

    const control = this.myForm.get(controlName);
    return !!(
      control &&
      control.invalid &&
      control.touched
    );
  }

  getError(controlName: string): string {
    return FormValidation.getErrorMessage(
      this.myForm.get(controlName)
    );
  }

  editarUsuario(usuario: UserResponse): void {
    this.selectedUser = usuario;
    this.visibleEdit = true;
  }

  onUserUpdated(): void {
    this.usuarioService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set([...data]);
        this.totalUsuarios.set(data.length);
      }
    });
  }

  getRolSeverity(roles: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      ADMIN: 'danger', COLABORADOR: 'info', AUDITOR: 'warn', SUPERVISOR: 'success',
    };
    return map[roles] ?? 'secondary';
  }

}
