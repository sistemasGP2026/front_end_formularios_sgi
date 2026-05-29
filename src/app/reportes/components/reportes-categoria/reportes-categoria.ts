import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormStats } from '../../interface/form-stats.interface';

export interface CatStat {
  cat: string;
  count: number;
  pct: number;
}

@Component({
  selector: 'reportes-categorias',
  imports: [CommonModule],
  templateUrl: './reportes-categoria.html'
})
export class ReportesCategoria {
  @Input() set stats(value: FormStats[]) {
    this._catStats = this.buildCatStats(value);
  }

  catStats: CatStat[] = [];
  private _catStats: CatStat[] = [];

  get catStatsComputed():CatStat[]{
    return this._catStats;
  }

  getCatColor(cat: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      SST:     { bg: '#E6F1FB', text: '#0C447C' },
      CALIDAD: { bg: '#E1F5EE', text: '#085041' },
      RRHH:    { bg: '#EEEDFE', text: '#3C3489' },
    };
    return map[cat?.toUpperCase()] ?? { bg: '#F1EFE8', text: '#444441' };
  }

  private buildCatStats(stats: FormStats[]): CatStat[] {
    const total = stats.reduce((a, s) => a + s.respuestas, 0);
    const map: Record<string, number> = {};

    stats.forEach(s => {
      const cat = s.form.category?.toUpperCase() ?? 'OTROS';
      map[cat] = (map[cat] ?? 0) + s.respuestas;
    });

    return Object.entries(map)
      .map(([cat, count]) => ({
        cat,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
