import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { ReportesKpi } from '../reportes-kpi/reportes-kpi';
import { ReportesCategoria } from '../reportes-categoria/reportes-categoria';
import { ReportesTabla } from '../reportes-tabla/reportes-tabla';
import { ReporteSummary } from '../../interface/reporte-summary.interface';
import { ReportesServices } from '../../services/reportes.service';

@Component({
  selector: 'app-reportes-page',
  imports: [
    CommonModule,
    SkeletonModule,
    ReportesKpi,
    ReportesCategoria,
    ReportesTabla,
  ],
  templateUrl: './reportes-page.html',
})
export class ReportesPage {

private readonly reportesService = inject(ReportesServices);

  loading = signal(true);
  reporte = signal<ReporteSummary | null>(null);

  ngOnInit(): void {
    this.reportesService.getReporte().subscribe({
      next: (data) => {
        this.reporte.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
