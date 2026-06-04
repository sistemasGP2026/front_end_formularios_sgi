import { HttpClient } from '@angular/common/http';
import { inject, Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  private readonly baseUrl = 'http://192.168.1.103:2000/sedes';

  findAll(): Observable<Sede[]> {
    return this.http.get<Sede[]>(this.baseUrl);
  }
}
