import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserResponse } from '../interfaces/users.response.interface';
import { Observable } from 'rxjs';
import { CreateUser } from '../interfaces/create-user.interface';
import { User } from '../../auth/interfaces/signIn.response';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  protected  baseUrl: string = environment.apiProduccion;

  private readonly http = inject(HttpClient);

  private getToken(): string {
    const token = localStorage.getItem('token')
    if (!token) {
      return '';
    }
    return token;
  }

  getAllUsers(): Observable<UserResponse[]> {
    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.get<UserResponse[]>(`${this.baseUrl}/users`, headers);
  }

  getUserById(id: string): Observable<User> {
    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.get<User>(`${this.baseUrl}/users/${id}`, headers);
  }

  createUser(user: CreateUser): Observable<UserResponse> {
    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.post<UserResponse>(`${this.baseUrl}/users`, user, headers)
  }

  getUserByUsername(email: string): Observable<User> {
    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.get<User>(`${this.baseUrl}/users/username/${email}`, headers)
  }

  updateUser(email: string, user: any) {
    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.patch<any>(`${this.baseUrl}/users/${email}`, user, headers)
  }

  deleteUser(id: string) {
    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.delete(`${this.baseUrl}/users/${id}`, headers)
  }

  activateUser(id:string){
    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }

    return this.http.patch(`${this.baseUrl}/users/activate/${id}`, headers)
  }

  resetPassword(id: string, newPassword: string): Observable<any> {

    const token = this.getToken();

    const headers = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      })
    }
    return this.http.patch(
      `${this.baseUrl}/users/${id}/reset-password`,
      { newPassword }, headers
    );
  }

}
