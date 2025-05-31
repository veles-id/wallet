import { Component, signal, computed } from "@angular/core";
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
  private readonly API_URL = "http://localhost:4300/api";

  isLoading = signal(false);
  error = signal<string | null>(null);
  isRegistering = signal(false);

  buttonText = computed(() =>
    this.isRegistering() ? "Create passkey" : "Login with passkey"
  );

  // Split toggle text into descriptive and action parts
  toggleDescriptiveText = computed(() =>
    this.isRegistering() ? "Already have a passkey? " : "New user? "
  );

  toggleActionText = computed(() =>
    this.isRegistering() ? "Login" : "Create passkey"
  );

  showError = computed(() => this.error() !== null);

  constructor(private http: HttpClient, private router: Router) {}

  async handleAuthentication(): Promise<void> {
    if (this.isRegistering()) {
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
        this.http.get<{ optionsJSON: any }>(`${this.API_URL}/auth/options`, {
          withCredentials: true,
        })
      );

      // Start the authentication process
      const authResult = await startAuthentication(authOptions.optionsJSON);

      // Send the authentication result to backend for verification
      const verificationResult = await firstValueFrom(
        this.http.post<VerificationResponse>(
          `${this.API_URL}/auth/verify`,
          { credential: authResult },
          { withCredentials: true }
        )
      );

      if (verificationResult.verified) {
        console.log("Authentication successful", verificationResult.user);
        // Navigate to main dashboard/onboarding
        this.router.navigate(["/onboarding"]);
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
        this.http.post<{ optionsJSON: any; userId: string }>(
          `${this.API_URL}/register/options`,
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
        this.http.post<VerificationResponse>(
          `${this.API_URL}/register/verify`,
          {
            credential,
            userId,
          },
          { withCredentials: true }
        )
      );

      if (verificationResponse.verified) {
        console.log("Registration successful:", verificationResponse.user);
        this.router.navigate(["/onboarding"]);
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
    this.isRegistering.update((value) => !value);
    this.error.set(null);
  }
}
