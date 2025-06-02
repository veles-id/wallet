import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, BehaviorSubject } from "rxjs";

export interface User {
  id: string;
  name: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly API_URL = "http://localhost:4300/api";

  // Use signals for reactive state management
  private _isAuthenticated = signal(false);
  private _currentUser = signal<User | null>(null);

  // Public readonly signals
  public readonly isAuthenticated = this._isAuthenticated.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    this.checkAuthStatus();
  }

  /**
   * Check if user is currently authenticated
   */
  private async checkAuthStatus(): Promise<void> {
    try {
      // Check with backend if user has valid session
      const response = await this.http
        .get<{ user?: User }>(`${this.API_URL}/auth/status`, {
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
      console.error("Error checking auth status:", error);
      this._isAuthenticated.set(false);
      this._currentUser.set(null);
    }
  }

  /**
   * Set authentication state after successful login
   */
  setAuthenticated(user: User): void {
    this._isAuthenticated.set(true);
    this._currentUser.set(user);
  }

  /**
   * Clear authentication state and logout
   */
  async logout(): Promise<void> {
    try {
      await this.http
        .post(
          `${this.API_URL}/auth/logout`,
          {},
          {
            withCredentials: true,
          }
        )
        .toPromise();
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      this._isAuthenticated.set(false);
      this._currentUser.set(null);
      this.router.navigate(["/login"]);
    }
  }

  /**
   * Refresh authentication status
   */
  async refreshAuthStatus(): Promise<void> {
    await this.checkAuthStatus();
  }
}
