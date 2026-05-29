import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { UserResponse } from '../../../usuarios/interfaces/users.response.interface';
import { UsuarioService } from '../../services/usuario.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
@Component({
  selector: 'edit-user-modal-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './edit-user-modal-page.html',
})
export class EditUserModalPage {

  @Input() visible = false;

  @Input() set user(value: UserResponse) {
    if (!value) return;
    this._user = { ...value };
    this.selectedRole = value.rol ?? '';
  }

  get user(): UserResponse {
    return this._user;
  }

  private _user!: UserResponse;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updated = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  saving = false;

  roles: string[] = ['ADMIN', 'USER'];
  selectedRole = '';

  private readonly userService = inject(UsuarioService);
  private readonly message = inject(MessageService);

  updateUser(): void {
    if (!this._user) return;
    this.saving = true;

    const payload = {
      fullName: this._user.fullName,
      email: this._user.email,
      username: this._user.username,
      roles: this.selectedRole ? [this.selectedRole] : [],
    };

    this.userService.updateUser(this._user.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.updated.emit();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
      }
    });
  }

  deleteUser(): void {
    if (!this._user) return;
    this.userService.deleteUser(this.user.id).subscribe({
      next: () => {
        this.delete.emit(this._user.username);
        setTimeout(() => {

          this.message.add({ severity: 'success', summary: 'Correcto', detail: 'Usuario desactivado con exito', icon: 'pi pi-check', life: 3000 })
          this.closeModal();
        }, 3000)
      },
      error: (error) => console.log(error)
    })

  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}