import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Form } from '../interfaces/form.interface';
import { Observable } from 'rxjs';
import { AssignPermission } from '../interfaces/assign-permission.response';


@Injectable({
  providedIn: 'root',
})
export class FormService {
  protected readonly baseUrl: string = "http://localhost:3000";
  private http = inject(HttpClient);

  getToken(): string {
    const token = localStorage.getItem('token')
    if (!token) {
      return '';
    }
    return token;
  }

  getAllForms() {
    const token = this.getToken();
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.get<Form[]>(`${this.baseUrl}/forms`, headers);
  }

  getFormByCategory(category: string) {
    const token = this.getToken();
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.get<Form[]>(`${this.baseUrl}/forms/category/${category.toUpperCase()}`, headers);
  }

  getFormByCode(code: string): Observable<Form> {
    const token = this.getToken();
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.get<Form>(`${this.baseUrl}/forms/${code}`, headers)
  }

  assignPermissionToUser(formCode: string, usernames: string[]): Observable<any> {
    const token = this.getToken();
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    const body = {
      formCode, usernames
    }
    return this.http.patch<any>(`${this.baseUrl}/forms`, body, headers)
  }

  deletePermissionToUSer(formCode: string, username: string): Observable<any> {
    const token = this.getToken();
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.delete(`${this.baseUrl}/forms/${formCode}/${username}`, headers)
  }

  createForm(form: Form) {
    const token = this.getToken();
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.post(`${this.baseUrl}/forms`, form, headers);
  }

  getMyFormsAssigned():Observable<Form[]> {
    const token = this.getToken();
    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.get<Form[]>(`${this.baseUrl}/forms/myform/assigned`, headers)
  }

}
