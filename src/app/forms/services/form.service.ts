import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Form } from '../interfaces/form.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FormService {
  protected readonly baseUrl: string = "http://192.168.1.103:2000";
  private http = inject(HttpClient);

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

  getAllForms(): Observable<Form[]> {
    return this.http.get<Form[]>(`${this.baseUrl}/forms`, this.getHeaders());
  }

  getFormByCategory(category: string): Observable<Form[]> {
  return this.http.get<Form[]>(
    `${this.baseUrl}/forms/category/${encodeURIComponent(category.toUpperCase())}`,
    this.getHeaders()
  );
}

  getFormByCode(code: string): Observable<Form> {
    return this.http.get<Form>(
      `${this.baseUrl}/forms/${code}`,
      this.getHeaders()
    );
  }

  createForm(form: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/forms`,
      form,
      this.getHeaders()
    );
  }

  updateForm(code: string, dto: any): Observable<Form> {
    return this.http.put<Form>(
      `${this.baseUrl}/forms/${code}`,
      dto,
      this.getHeaders()
    );
  }

  assignPermissionToUser(formCode: string, usernames: string[]): Observable<any> {
    return this.http.patch<any>(
      `${this.baseUrl}/forms`,
      { formCode, usernames },
      this.getHeaders()
    );
  }

  deletePermissionToUSer(formCode: string, username: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/forms/${formCode}/${username}`,
      this.getHeaders()
    );
  }

  getMyFormsAssigned(): Observable<Form[]> {
    return this.http.get<Form[]>(
      `${this.baseUrl}/forms/myform/assigned`,
      this.getHeaders()
    );
  }
}