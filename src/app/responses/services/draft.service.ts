import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DraftInterface, SaveDraftPayload } from '../interfaces/draft.interface';

@Injectable({
  providedIn: 'root',
})
export class DraftService {
  protected readonly baseUrl: string = environment.apiProduccion;
  private readonly http = inject(HttpClient);

  private getToken(): string {
    return localStorage.getItem('token') ?? '';
  }

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.getToken()
      })
    };
  }

  /** Crea un borrador nuevo del formulario. */
  createDraft(code: string, payload: SaveDraftPayload): Observable<DraftInterface> {
    return this.http.post<DraftInterface>(`${this.baseUrl}/drafts/${code}`, payload, this.getHeaders());
  }

  /** Actualiza un borrador existente con lo diligenciado hasta ahora. */
  updateDraft(code: string, id: string, payload: SaveDraftPayload): Observable<DraftInterface> {
    return this.http.put<DraftInterface>(`${this.baseUrl}/drafts/${code}/${id}`, payload, this.getHeaders());
  }

  /** Mis borradores; si se indica formCode, solo los de ese formulario. */
  getMyDrafts(formCode?: string): Observable<DraftInterface[]> {
    let params = new HttpParams();
    if (formCode) params = params.set('formCode', formCode);
    return this.http.get<DraftInterface[]>(`${this.baseUrl}/drafts/mine`, { ...this.getHeaders(), params });
  }

  getDraft(id: string): Observable<DraftInterface> {
    return this.http.get<DraftInterface>(`${this.baseUrl}/drafts/${id}`, this.getHeaders());
  }

  deleteDraft(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/drafts/${id}`, this.getHeaders());
  }
}
