import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseInterface } from '../../responses/interfaces/response.interface';
import { CreateResponse } from '../../forms/interfaces/create-response.dto';

@Injectable({
  providedIn: 'root',
})
export class ResponseService {
  private readonly baseUrl = 'http://localhost:3000'
  private readonly http = inject(HttpClient);

  private getToken() {
    const token = localStorage.getItem('token')
    if (!token) {
      return '';
    }
    return token;
  }

  submitdData(code: string, data: CreateResponse): Observable<any> {
    const token = this.getToken()
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.post(`${this.baseUrl}/responses/${code}`, data, headers)
  }

  getResponsesByForm(codeForm: string): Observable<ResponseInterface[]> {
    const token = this.getToken()
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.get<ResponseInterface[]>(`${this.baseUrl}/responses/${codeForm}`, headers);
  }

  getResponseDetail(id: string): Observable<ResponseInterface> {
    const token = this.getToken()
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.get<ResponseInterface>(`${this.baseUrl}/responses/detail/${id}`, headers)
  }

  getMyHistory(): Observable<ResponseInterface[]> {
    const token = this.getToken()
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.get<ResponseInterface[]>(`${this.baseUrl}/responses/my/history`, headers);
  }

  deleteResponse(id: string): Observable<any> {
     const token = this.getToken()
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.delete(
      `${this.baseUrl}/responses/${id}`,
      headers
    );
  }

  deleteResponsesByForm(formCode: string): Observable<any> {
     const token = this.getToken()
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.delete(
      `${this.baseUrl}/responses/form/${formCode}`,
      headers
    );
  }
}
