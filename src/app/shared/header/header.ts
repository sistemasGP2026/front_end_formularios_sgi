import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../auth/services/auth.service';
import { User } from '../../auth/interfaces/signIn.response';
import { Router } from '@angular/router';

@Component({
  selector: 'header-component',
  imports: [CommonModule, ButtonModule, AvatarModule, MenuModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
    @Output() menuToggle = new EventEmitter<void>();

    private readonly authService = inject(AuthService)
    private readonly router = inject(Router);

    public currentUser:User | null = this.authService.currentUser()

  profileMenuItems: MenuItem[] = [
    { label: 'Mi perfil',      icon: 'pi pi-user'},
    { separator: true},
    { label: 'Cerrar sesión',  icon: 'pi pi-sign-out', command: () => {this.closeSession()}},
  ];

  menuVisible = false;

  toggleMenu(menu: any, event: Event): void {
    menu.toggle(event);
  }

  closeSession(){
    this.authService.logout();
    this.router.navigateByUrl('/auth/sign-in')
  }
}
