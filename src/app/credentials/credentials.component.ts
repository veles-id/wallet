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
import {
  StoredCredential,
  CredentialCategory,
  CredentialColorClass,
  CredentialIconType,
} from "../services/credential.types";
import { NavFooterComponent } from "../nav-footer/nav-footer.component";

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
    if (
      confirm(
        `Are you sure you want to delete "${
          credential.alias || "this credential"
        }"?`
      )
    ) {
      const success = this._credentialService.deleteCredential(
        credential.credential.id
      );
      if (success) {
        this._loadCredentials();
      } else {
        this.error.set("Failed to delete credential");
      }
    }
  }

  private _getCategoryFromString(input: string): CredentialCategory | null {
    const lowerInput = input.toLowerCase();

    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } =
      CredentialCategory;

    if (lowerInput.includes("email")) return EMAIL;
    if (lowerInput.includes("education") || lowerInput.includes("alumni"))
      return EDUCATION;
    if (lowerInput.includes("device") || lowerInput.includes("phone"))
      return DEVICE;
    if (lowerInput.includes("identity")) return IDENTITY;
    if (lowerInput.includes("professional")) return PROFESSIONAL;

    return null;
  }

  getCredentialType(credential: StoredCredential): string {
    const { credential: cred, metadata } = credential;
    const { type } = cred;

    if (type.length > 1) {
      return type.find((t) => t !== "VerifiableCredential") || type[0];
    }
    return metadata?.category || "Credential";
  }

  getCredentialIcon(credential: StoredCredential): string {
    const { metadata } = credential;
    const category = metadata?.category?.toLowerCase();
    const type = this.getCredentialType(credential).toLowerCase();

    const detectedCategory =
      this._getCategoryFromString(category || "") ||
      this._getCategoryFromString(type || "");

    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } =
      CredentialCategory;
    const {
      EMAIL_OUTLINED,
      SCHOOL_OUTLINED,
      PHONE_IPHONE_OUTLINED,
      BADGE_OUTLINED,
      WORK_OUTLINE,
    } = CredentialIconType;

    switch (detectedCategory) {
      case EMAIL:
        return EMAIL_OUTLINED;
      case EDUCATION:
        return SCHOOL_OUTLINED;
      case DEVICE:
        return PHONE_IPHONE_OUTLINED;
      case IDENTITY:
        return BADGE_OUTLINED;
      case PROFESSIONAL:
        return WORK_OUTLINE;
      default:
        return BADGE_OUTLINED;
    }
  }

  getCredentialColorClass(credential: StoredCredential): string {
    const { metadata } = credential;
    const category = metadata?.category?.toLowerCase();
    const type = this.getCredentialType(credential).toLowerCase();

    const detectedCategory =
      this._getCategoryFromString(category || "") ||
      this._getCategoryFromString(type || "");

    const { BROWN, DARK, BLACK, BLUE, GREEN } = CredentialColorClass;
    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } =
      CredentialCategory;

    switch (detectedCategory) {
      case EMAIL:
        return GREEN;
      case EDUCATION:
        return DARK;
      case DEVICE:
        return BLACK;
      case IDENTITY:
        return BLUE;
      case PROFESSIONAL:
        return BROWN;
      default:
        const colors = [BROWN, DARK, BLACK, BLUE, GREEN];
        const { credential: cred } = credential;
        const { id } = cred;
        const index = Math.abs(id.length) % colors.length;
        return colors[index];
    }
  }

  getCredentialDisplayName(credential: StoredCredential): string {
    const { alias } = credential;
    return alias || this.getCredentialType(credential);
  }

  getCredentialCategory(credential: StoredCredential): string {
    const { metadata } = credential;
    return metadata?.category || this.getCredentialType(credential);
  }

  getIssuerName(credential: StoredCredential): string {
    const { credential: cred } = credential;
    const { issuer } = cred;

    if (typeof issuer === "string") {
      return this._shortenDID(issuer);
    }
    const { name, id } = issuer || {};
    return name || this._shortenDID(id);
  }

  private _shortenDID(did: string): string {
    if (did.length > 30) {
      return `${did.substring(0, 20)}...${did.substring(did.length - 10)}`;
    }
    return did;
  }
}
