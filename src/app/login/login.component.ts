import { Component, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../services/auth.service";

interface VerificationResponse {
  verified: boolean;
  user?: {
    id: string;
    name: string;
  };
}

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent {
  private readonly _API_URL = "http://localhost:4300/api";
  private _http = inject(HttpClient);
  private _router = inject(Router);
  private _authService = inject(AuthService);

  private _isRegistering = signal(false);

  isLoading = signal(false);
  error = signal<string | null>(null);

  buttonText = computed(() =>
    this._isRegistering() ? "Create passkey" : "Login with passkey"
  );

  titleText = computed(() =>
    this._isRegistering() ? "Setup your new" : "Open your"
  );

  infoText = computed(() =>
    this._isRegistering()
      ? "Passkey provides biometric protection for your digital identity"
      : null
  );

  toggleDescriptiveText = computed(() =>
    this._isRegistering() ? "Already have a passkey? " : "New user? "
  );

  toggleActionText = computed(() =>
    this._isRegistering() ? "Login" : "Create passkey"
  );

  showError = computed(() => this.error() !== null);

  async handleAuthentication(): Promise<void> {
    if (this._isRegistering()) {
      await this.registerPasskey();
    } else {
      await this.loginWithPasskey();
    }
  }

  async loginWithPasskey(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Get authentication options from backend
      const authOptions = await firstValueFrom(
        this._http.get<{ optionsJSON: any }>(`${this._API_URL}/auth/options`, {
          withCredentials: true,
        })
      );

      // Start the authentication process
      const authResult = await startAuthentication(authOptions.optionsJSON);

      // Send the authentication result to backend for verification
      const verificationResult = await firstValueFrom(
        this._http.post<VerificationResponse>(
          `${this._API_URL}/auth/verify`,
          { credential: authResult },
          { withCredentials: true }
        )
      );

      if (verificationResult.verified && verificationResult.user) {
        console.log("Authentication successful", verificationResult.user);
        // Update auth service with user info
        this._authService.setAuthenticated(verificationResult.user);
        // Navigate to boarding page
        this._router.navigate(["/boarding"]);
      } else {
        this.error.set("Authentication failed");
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      this.error.set(
        error instanceof Error ? error.message : "Authentication failed"
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async registerPasskey(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Get registration options
      const optionsResponse = await firstValueFrom(
        this._http.post<{ optionsJSON: any; userId: string }>(
          `${this._API_URL}/register/options`,
          {},
          { withCredentials: true }
        )
      );

      if (!optionsResponse || !optionsResponse.userId) {
        throw new Error("Failed to get registration options or user ID");
      }

      const { optionsJSON, userId } = optionsResponse;
      console.log("Starting registration with userId:", userId);

      // Create the credential
      const credential = await startRegistration(optionsJSON);
      console.log("Registration credential created:", credential.id);

      // Verify the registration
      const verificationResponse = await firstValueFrom(
        this._http.post<VerificationResponse>(
          `${this._API_URL}/register/verify`,
          {
            credential,
            userId,
          },
          { withCredentials: true }
        )
      );

      if (verificationResponse.verified && verificationResponse.user) {
        console.log("Registration successful:", verificationResponse.user);
        // Update auth service with user info
        this._authService.setAuthenticated(verificationResponse.user);
        // Navigate to boarding page
        this._router.navigate(["/boarding"]);
      } else {
        this.error.set("Registration failed");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      this.error.set(
        error instanceof Error ? error.message : "Registration failed"
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleMode(): void {
    this._isRegistering.update((value) => !value);
    this.error.set(null);
  }
}
