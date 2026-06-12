import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseInterface } from '../../responses/interfaces/response.interface';
import { CreateResponse } from '../../forms/interfaces/create-response.dto';

@Injectable({
  providedIn: 'root',
})
export class ResponseService {
  protected readonly baseUrl: string = "http://localhost:3000";
  // private readonly baseUrl = 'http://192.168.1.103:2000'
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

  submitdData(code: string, data: CreateResponse): Observable<any> {
    return this.http.post(`${this.baseUrl}/responses/${code}`, data, this.getHeaders())
  }

  getResponsesByForm(codeForm: string): Observable<ResponseInterface[]> {
    return this.http.get<ResponseInterface[]>(`${this.baseUrl}/responses/${codeForm}`, this.getHeaders());
  }

  getResponseDetail(id: string): Observable<ResponseInterface> {
    return this.http.get<ResponseInterface>(`${this.baseUrl}/responses/detail/${id}`, this.getHeaders())
  }

  getMyHistory(): Observable<ResponseInterface[]> {
    return this.http.get<ResponseInterface[]>(`${this.baseUrl}/responses/my/history`, this.getHeaders());
  }

  deleteResponse(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/responses/${id}`,this.getHeaders());
  }

  deleteResponsesByForm(formCode: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/responses/form/${formCode}`,this.getHeaders());
  }

  getPendingResponses(): Observable<ResponseInterface[]> {
    return this.http.get<ResponseInterface[]>(`${this.baseUrl}/responses/pending`,this.getHeaders());
  }

  approveResponse(id: string,status: 'APPROVED' | 'REJECTED',rejectionReason?: string): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/responses/${id}/approve`,
      { status, rejectionReason },
      this.getHeaders()
    );
  }
}
