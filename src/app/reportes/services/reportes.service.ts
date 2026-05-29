import { inject, Injectable } from '@angular/core';
import { FormService } from '../../forms/services/form.service';
import { ResponseService } from '../../responses/services/response.service';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { ReporteSummary } from '../interface/reporte-summary.interface';
import { FormStats } from '../interface/form-stats.interface';


@Injectable({
  providedIn: 'root',
})
export class ReportesServices {

  private readonly formService = inject(FormService);
  private readonly responseService = inject(ResponseService);

  getReporte(): Observable<ReporteSummary> {
    return this.formService.getAllForms().pipe(
      switchMap((forms) => {
        if (!forms.length) return of(this.emptyReporte());

        const requests = forms.map(f =>
          this.responseService.getResponsesByForm(f.code)
        );

        return forkJoin(requests).pipe(
          map((allResponses) => {
            const stats: FormStats[] = forms.map((form, i) => {
              const responses  = allResponses[i];
              const asignados  = form.permissions?.users?.length ?? 0;
              const respuestas = responses.length;

              const respondedIds = new Set(
                responses.map(r => r.filledBy.userId).filter(Boolean)
              );

              const pendientes = (form.permissions?.users ?? [])
                .filter(u => !respondedIds.has(u.userId))
                .map(u => ({
                  name:     u.name,
                  username: u.username,
                  email:    u.email ?? '',
                }));

              const pct = asignados > 0
                ? Math.round((respuestas / asignados) * 100)
                : 0;

              return { form, asignados, respuestas, pendientes, pct };
            });

            const totalRespuestas  = stats.reduce((a, s) => a + s.respuestas, 0);
            const totalAsignados   = stats.reduce((a, s) => a + s.asignados, 0);
            const totalFormularios = stats.length;
            const tasaGlobal       = totalAsignados > 0
              ? Math.round((totalRespuestas / totalAsignados) * 100)
              : 0;

            return { totalRespuestas, totalAsignados, totalFormularios, tasaGlobal, stats };
          })
        );
      })
    );
  }
  
  private emptyReporte(): ReporteSummary {
    return { totalRespuestas: 0, totalAsignados: 0, totalFormularios: 0, tasaGlobal: 0, stats: [] };
  }
}
