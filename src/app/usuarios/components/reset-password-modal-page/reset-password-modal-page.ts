import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { UserResponse } from '../../interfaces/users.response.interface';
import { UsuarioService } from '../../services/usuario.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'reset-password-modal-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, PasswordModule, ToastModule],
  providers:[MessageService],
  templateUrl: './reset-password-modal-page.html',
})
export class ResetPasswordModalPage {

  @Input() visible = false;
  @Input() set user(value: UserResponse) {
    if (!value) return;
    this._user    = value;
    this.password = '';
    this.confirm  = '';
    this.error    = '';
  }

  get user(): UserResponse { return this._user; }
  private _user!: UserResponse;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updated       = new EventEmitter<void>();

  password = '';
  confirm  = '';
  saving   = false;
  error    = '';

  private readonly userService = inject(UsuarioService);
  private readonly message = inject(MessageService);

  reset(): void {
    this.error = '';

    if (!this.password || this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres'; return;
    }

    if (this.password !== this.confirm) {
      this.error = 'Las contraseñas no coinciden'; return;
    }

    this.saving = true;
    this.userService.resetPassword(this._user.id, this.password).subscribe({
      next: () => {
        this.saving = false;
        this.updated.emit();
        this.message.add({severity: 'success', summary: 'Completado', detail: `Clave del usuario: ${this._user.username} cambiada`, life: 3000})
        setTimeout( () => {
          this.closeModal();
        }, 1500)
      },
      error: (err) => {
        console.error(err);
        this.error  = err?.error?.message ?? 'Error al resetear la contraseña';
        this.saving = false;
      }
    });
  }

  closeModal(): void {
    this.visible  = false;
    this.password = '';
    this.confirm  = '';
    this.error    = '';
    this.visibleChange.emit(false);
  }
}