import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { CredentialService } from "../services/credential.service";
import { StoredCredential } from "../services/credential.types";
import { NavFooterComponent } from "../nav-footer/nav-footer.component";
import { CredentialCardComponent } from "../credential-card/credential-card.component";

@Component({
  selector: "app-credentials",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    NavFooterComponent,
    CredentialCardComponent,
  ],
  templateUrl: "./credentials.component.html",
  styleUrl: "./credentials.component.scss",
})
export class CredentialsComponent implements OnInit {
  private _authService = inject(AuthService);
  private _credentialService = inject(CredentialService);
  private _router = inject(Router);

  isLoading = signal(false);
  error = signal<string | null>(null);
  credentials = signal<StoredCredential[]>([]);
  currentUser = computed(() => this._authService.currentUser());
  hasCredentials = computed(() => this.credentials().length > 0);

  ngOnInit(): void {
    this._loadCredentials();
  }

  private _loadCredentials(): void {
    try {
      const storedCredentials = this._credentialService.getStoredCredentials();
      this.credentials.set(storedCredentials);
    } catch (error) {
      console.error("Error loading credentials:", error);
      this.error.set("Failed to load credentials");
    }
  }

  createNewCredential(): void {
    this._router.navigate(["/credentials/create"]);
  }

  viewCredential(credential: StoredCredential): void {
    this._router.navigate(["/credentials", credential.credential.id]);
  }

  deleteCredential(credential: StoredCredential): void {
    const { alias, credential: cred } = credential;
    const { id } = cred;

    if (
      confirm(
        `Are you sure you want to delete "${alias || "this credential"}"?`
      )
    ) {
      const success = this._credentialService.deleteCredential(id);
      if (success) {
        this._loadCredentials();
      } else {
        this.error.set("Failed to delete credential");
      }
    }
  }
}
