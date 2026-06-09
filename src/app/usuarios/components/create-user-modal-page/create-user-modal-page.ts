import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormValidation } from '../../../helpers/form-validation.helper';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../services/usuario.service';
import { UserResponse } from '../../interfaces/users.response.interface';
import { PasswordModule } from 'primeng/password';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
@Component({
  selector: 'create-user-modal-page',
  imports: [
    CommonModule,
    DialogModule,
    ReactiveFormsModule,
    PasswordModule,
    AutoCompleteModule,
    InputTextModule,
    IconFieldModule
  ],
  templateUrl: './create-user-modal-page.html',
  styleUrl: './create-user-modal-page.css',
})
export class CreateUserModalPage {

  roles = [
    'ADMIN',
    'USER'
  ]

  filteredRoles = signal<string[]>([]);

  @Input() visible = false;

  @Output() visibleChange = new EventEmitter<boolean>();

  @Output() userCreated = new EventEmitter<UserResponse>();

  private fb = inject(FormBuilder)
  private message = inject(MessageService)
  private usuarioService = inject(UsuarioService)
  FormValidation = FormValidation;

  myForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(5)]],
    password: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(64)]],
    roles: ['', Validators.required]
  })

  guardarUsuario() {

    if (this.myForm.invalid) {
      FormValidation.markFormTouched(this.myForm);
      return;
    }

    const user = this.myForm.value;
    this.usuarioService.createUser(user).subscribe({
      next: (data) => {

        this.message.add({
          severity: 'success',
          summary: 'Completado',
          detail: 'Usuario creado con éxito',
          life: 3000
        });
        this.userCreated.emit(data);
        this.closeModal();
      },
      error: (error) => {
        const backendMessage: string = error?.error?.message || '';

        if (backendMessage.includes('email')) {
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: `El email: ${this.myForm.get('email')?.value} ya se encuentra en uso`,
            life: 3000
          })
        }

        if (backendMessage.includes('usuario')) {
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: `El nombre de usuario: ${this.myForm.get('username')?.value} ya se encuentra en uso`,
            life: 3000
          })
        }
        console.log(error);
      }
    })
  }

  searchEvent(event: AutoCompleteCompleteEvent) {
    if (event.query) {
      const queryLower = event.query.toLowerCase();
      this.filteredRoles.set(
        this.roles.filter(rol => rol.toLowerCase().includes(queryLower))
      );
    } else {
      this.filteredRoles.set([...this.roles]);
    }
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.myForm.reset();
    this.myForm.markAsPristine();
    this.myForm.markAsUntouched();
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
}
