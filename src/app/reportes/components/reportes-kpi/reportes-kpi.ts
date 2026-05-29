import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'reportes-kpis',
  imports: [CommonModule],
  templateUrl: './reportes-kpi.html',
})
export class ReportesKpi {
  @Input() totalRespuestas  = 0;
  @Input() totalAsignados   = 0;
  @Input() totalFormularios = 0;
  @Input() tasaGlobal       = 0;
}
