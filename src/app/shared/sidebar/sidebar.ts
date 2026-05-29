import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { RouterLinkActive, RouterModule } from '@angular/router';
import { UsuarioService } from '../../usuarios/services/usuario.service';
import { AuthService } from '../../auth/services/auth.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'sidebar-component',
  imports: [CommonModule, RouterModule, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class SidebarComponent implements OnInit{
  @Input() collapsed = false;

  private readonly authService = inject(AuthService)
  navItems:NavItem[] = []
  ngOnInit(): void {

    if(this.authService.currentUser()?.roles[0] === 'ADMIN'){
      this.navItems = [
        { label: 'Inicio', icon: 'pi pi-home', route: '/inicio' },
        { label: 'Gestión de Formularios', icon: 'pi pi-file', route: '/formularios' },
        { label: 'Gestión de Usuarios', icon: 'pi pi-users', route: '/usuarios' },
        { label: 'Reportes y Analítica', icon: 'pi pi-chart-line', route: '/reportes' },
        { label: 'Respuestas', icon: 'pi pi-comments', route: '/respuestas' },
        { label: 'Historial', icon: 'pi pi-history', route: '/historial' },
      ];
    }else{
      this.navItems = [
        { label: 'Inicio', icon: 'pi pi-home', route: '/inicio' },
        { label: 'Gestión de Formularios', icon: 'pi pi-file', route: '/formularios' },
        { label: 'Historial', icon: 'pi pi-history', route: '/historial' },
      ]
    }

  }

}
