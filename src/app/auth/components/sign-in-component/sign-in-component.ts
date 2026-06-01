import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'sign-in-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    InputIconModule,
    IconFieldModule,
    ReactiveFormsModule,
    ToastModule,
    RouterOutlet
  ],
  providers: [MessageService],
  templateUrl: './sign-in-component.html',
  styleUrl: './sign-in-component.css',
})
export class SignInComponent {

  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private messageService = inject(MessageService);

  public myForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(4)]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  })

  public signIn() {

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.myForm.value;

    this.authService.signin(username, password).subscribe({
      next: () => {
        this.router.navigateByUrl('/inicio');
      },
      error: (error) => {
        console.error(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error || 'Credenciales inválidas'
        });
      }
    });
  }
}
