import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { UserResponse } from '../../../usuarios/interfaces/users.response.interface';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'assign-user-permission-page',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule
  ],
  templateUrl: './assign-user-permission-page.html',
})
export class AssignUserPermissionPage {
  @Input() visible = false;
  @Input() usuarios: UserResponse[] = []
  @Output() userAssigned = new EventEmitter<UserResponse>();
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() assign = new EventEmitter<UserResponse[]>();
    selectedUsers: string[] = [];

  assignPermissions(): void {

  const selected = this.usuarios.filter(
    u => this.selectedUsers.includes(u.username)
  );

  this.assign.emit(selected);

  this.selectedUsers = [];

  this.visible = false;

  this.visibleChange.emit(false);
}
}