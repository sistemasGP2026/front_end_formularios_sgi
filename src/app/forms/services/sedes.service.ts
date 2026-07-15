import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { environment as desarrollo } from '../../../environments/environment.development';

export interface Sede {
  _id: string;
  name: string;
  code: string;
}

@Injectable({
  providedIn: 'root',
})
export class SedesService {
  private http = inject(HttpClient)
    protected readonly baseUrl: string = desarrollo.apiProduccion;

  findAll(): Observable<Sede[]> {
    return this.http.get<Sede[]>(`${this.baseUrl}/sedes`);
  }
}
