import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ResponseService } from '../responses/services/response.service';
import { ResponseInterface } from '../responses/interfaces/response.interface';

@Component({
  selector: 'app-historial-component',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './historial-component.html',
})
export class HistorialComponent implements OnInit {

  private readonly responseService = inject(ResponseService);

  loading   = signal(true);
  responses = signal<ResponseInterface[]>([]);

  ngOnInit(): void {
    this.responseService.getMyHistory().subscribe({
      next: (data) => {
        this.responses.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }
}