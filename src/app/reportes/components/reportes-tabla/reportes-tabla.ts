import { Component, Input } from '@angular/core';
import { FormStats } from '../../interface/form-stats.interface';

@Component({
  selector: 'reportes-tabla',
  imports: [],
  templateUrl: './reportes-tabla.html',
})
export class ReportesTabla {
  @Input() stats: FormStats[] = [];

  tooltipIdx: number | null = null;

  showTooltip(idx: number): void  { this.tooltipIdx = idx; }
  hideTooltip(): void             { this.tooltipIdx = null; }

  getCatColor(cat: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      SST:     { bg: '#E6F1FB', text: '#0C447C' },
      CALIDAD: { bg: '#E1F5EE', text: '#085041' },
      RRHH:    { bg: '#EEEDFE', text: '#3C3489' },
    };
    return map[cat?.toUpperCase()] ?? { bg: '#F1EFE8', text: '#444441' };
  }

  getBarColor(pct: number): string {
    if (pct === 100) return '#1D9E75';
    if (pct >= 60)   return '#BA7517';
    return '#E24B4A';
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

}
