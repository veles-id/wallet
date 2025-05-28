import { Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { HttpClient } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { firstValueFrom } from "rxjs";

interface VerificationResponse {
  verified: boolean;
  user?: {
    id: string;
    name: string;
  };
}

@Component({
  selector: "app-onboarding",
  imports: [MatButtonModule, CommonModule, MatProgressSpinnerModule],
  templateUrl: "./onboarding.component.html",
  styleUrl: "./onboarding.component.scss",
  standalone: true,
})
export class OnboardingComponent {
  isLoading = false;
  error: string | null = null;
  isRegistering = false;
  private readonly API_URL = "http://localhost:4300/api";

  constructor(private http: HttpClient) {}

  async loginWithPasskey() {
    this.isLoading = true;
    this.error = null;

    try {
      // Get authentication options from your backend
      const authOptions = await firstValueFrom(
        this.http.get<{ optionsJSON: any }>(`${this.API_URL}/auth/options`, {
          withCredentials: true,
        })
      );

      // Start the authentication process
      const authResult = await startAuthentication(authOptions.optionsJSON);

      // Send the authentication result to your backend for verification
      const verificationResult = await firstValueFrom(
        this.http.post<VerificationResponse>(
          `${this.API_URL}/auth/verify`,
          { credential: authResult },
          { withCredentials: true }
        )
      );

      if (verificationResult.verified) {
        console.log("Authentication successful", verificationResult.user);
        // TODO: Handle successful authentication (e.g., store user info, redirect)
      } else {
        this.error = "Authentication failed";
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      this.error =
        error instanceof Error ? error.message : "Authentication failed";
    } finally {
      this.isLoading = false;
    }
  }

  async registerPasskey() {
    this.isLoading = true;
    this.error = null;

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
            userId, // Make sure we're passing the userId
          },
          { withCredentials: true }
        )
      );

      if (verificationResponse.verified) {
        console.log("Registration successful:", verificationResponse.user);
        // TODO: Handle successful registration (e.g., store user info, redirect)
      } else {
        this.error = "Registration failed";
      }
    } catch (error) {
      console.error("Error during registration:", error);
      this.error =
        error instanceof Error ? error.message : "Registration failed";
    } finally {
      this.isLoading = false;
    }
  }

  toggleMode() {
    this.isRegistering = !this.isRegistering;
    this.error = null;
  }
}
