import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { SignInResponse, User } from '../interfaces/signIn.response';
import { AuthStatus } from '../interfaces/auth-status.enum';
import { CheckTokenResponse } from '../interfaces/check-token.response';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  protected baseUrl: string = environment.apiProduccion;

  private http = inject(HttpClient);

  private _currentUser = signal<User | null>(null);
  private _authStatus = signal<AuthStatus>(AuthStatus.checking);

  public currentUser = computed(() => this._currentUser());
  public authStatus = computed(() => this._authStatus());

  constructor() {
    this.checkAuthStatus().subscribe()
  }

  private setAuthentication(user: User, token: string): boolean {

    this._currentUser.set(user);
    this._authStatus.set(AuthStatus.authenticated);
    localStorage.setItem('token', token);

    return true;
  }

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

  public signin(username: string, password: string) {

    const url = `${this.baseUrl}/auth/sign-in`
    const body = { username, password }

    return this.http.post<SignInResponse>(url, body)
      .pipe(
        map(({ user, token }) => {
          this.setAuthentication(user, token)
          return user;
        }),
        catchError(error => throwError(() => error.error.message))
      );

  }

  checkAuthStatus(): Observable<boolean> {
    const url = `${this.baseUrl}/auth/check-token`;
    const token = localStorage.getItem('token');

    if (!token) {
      this.logout();
      return of(false);
    }

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`);

    return this.http.get<CheckTokenResponse>(url, { headers })
      .pipe(
        map(({ user, token }) => this.setAuthentication(user, token)),
        catchError(() => {
          this.logout();
          return of(false);
        })
      );
  }

  changePassword(newPassword: string) {
    const url = `${this.baseUrl}/auth/change-first-password`;
    return this.http.post(url, { newPassword }, this.getHeaders())
  }

  isApprover(): boolean {
    return this.currentUser()?.roles?.includes('APPROVER') ?? false;
  }

  updateMustChangePassword(value: boolean): void {
    const user = this.currentUser();
    if (user) {
      this._currentUser.set({ ...user, mustChangePassword: value });
    }
  }

  isAdmin(): boolean {
    return this.currentUser()?.roles?.includes('ADMIN') ?? false;
  }
  logout() {
    localStorage.removeItem('token');
    this._currentUser.set(null);
    this._authStatus.set(AuthStatus.notAuthenticated);
  }

}
