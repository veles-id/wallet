import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _API_URL = 'http://localhost:4300/api';
  private _http = inject(HttpClient);
  private _router = inject(Router);
  private _isAuthenticated = signal(false);
  private _currentUser = signal<User | null>(null);

  public readonly isAuthenticated = this._isAuthenticated.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    this.checkAuthStatus();
  }

  private async checkAuthStatus(): Promise<void> {
    try {
      // Check with backend if user has valid session
      const response = await this._http
        .get<{ user?: User }>(`${this._API_URL}/auth/status`, {
          withCredentials: true,
        })
        .toPromise();

      if (response?.user) {
        this._isAuthenticated.set(true);
        this._currentUser.set(response.user);
      } else {
        this._isAuthenticated.set(false);
        this._currentUser.set(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this._isAuthenticated.set(false);
      this._currentUser.set(null);
    }
  }

  setAuthenticated(user: User): void {
    this._isAuthenticated.set(true);
    this._currentUser.set(user);
  }

  async logout(): Promise<void> {
    try {
      await this._http
        .post(
          `${this._API_URL}/auth/logout`,
          {},
          {
            withCredentials: true,
          },
        )
        .toPromise();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this._isAuthenticated.set(false);
      this._currentUser.set(null);
      this._router.navigate(['/login']);
    }
  }

  async refreshAuthStatus(): Promise<void> {
    await this.checkAuthStatus();
  }
}
