import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../services/auth.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from '@angular/forms';
import { routes } from '../../../app.routes';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-change-pass-modal',
  imports: [DialogModule, PasswordModule, CardModule, ButtonModule, ToastModule, FormsModule],
  providers:[MessageService],
  templateUrl: './change-pass-modal.html',
  styleUrl: './change-pass-modal.css',
})
export class ChangePassModal {
  private readonly authService = inject(AuthService)
  private readonly message     = inject(MessageService)
  private readonly router      = inject(Router)

  public  usuario = this.authService.currentUser();
  nombre = this.usuario?.fullName.split(" ")[0]

  public password1!: string
  public password2!: string

  changePassword(){
    
    if(this.password1 !== this.password2){
      this.message.add({severity: 'error', summary: 'Cuidado!', detail: 'Las contraseñas no coinciden'})
      return;
    }
    this.authService.changePassword(this.password1).subscribe({
      next: () => {
        this.authService.updateMustChangePassword(false);
        this.router.navigateByUrl('/inicio')
      }
    })
  }
}
