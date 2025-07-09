import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { Router, ActivatedRoute } from "@angular/router";
import { CredentialService } from "../services/credential.service";
import {
  StoredCredential,
  VerifiableCredential,
} from "../services/credential.types";
import { VerificationResult } from "../services/credential-verification.service";
import { NavFooterComponent } from "../nav-footer/nav-footer.component";
import { CredentialCardComponent } from "../credential-card/credential-card.component";
import { AvatarComponent } from "../avatar/avatar.component";

@Component({
  selector: "app-credential-details",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    NavFooterComponent,
    CredentialCardComponent,
    AvatarComponent,
  ],
  templateUrl: "./credential-details.component.html",
  styleUrl: "./credential-details.component.scss",
})
export class CredentialDetailsComponent implements OnInit {
  private _credentialService = inject(CredentialService);
  private _router = inject(Router);
  private _route = inject(ActivatedRoute);

  isLoading = signal(false);
  error = signal<string | null>(null);
  credential = signal<StoredCredential | null>(null);
  isVerifying = signal(false);
  verificationResult = signal<VerificationResult | null>(null);

  hasCredential = computed(() => this.credential() !== null);
  credentialData = computed(() => this.credential()?.credential);

  ngOnInit(): void {
    this._loadCredential();
  }

  private _loadCredential(): void {
    const id = this._route.snapshot.paramMap.get("id");
    if (!id) {
      this.error.set("No credential ID provided");
      return;
    }

    try {
      this.isLoading.set(true);
      const storedCredential = this._credentialService.getCredentialById(id);

      if (!storedCredential) {
        this.error.set("Credential not found");
        return;
      }

      this.credential.set(storedCredential);
      console.log("Credential Technical Details:", storedCredential.credential);

      this._verifyCredential(storedCredential.credential);
    } catch (error) {
      console.error("Error loading credential:", error);
      this.error.set("Failed to load credential");
    } finally {
      this.isLoading.set(false);
    }
  }

  getCredentialType(): string {
    const credentialData = this.credentialData();
    if (!credentialData) return "Credential";

    const { type } = credentialData;
    if (type.length > 1) {
      return type.find((t) => t !== "VerifiableCredential") || type[0];
    }
    const credential = this.credential();
    const { metadata } = credential || {};
    return metadata?.category || "Credential";
  }

  getCredentialDisplayTitle(): string {
    const credential = this.credential();
    if (!credential) return "Credential Details";
    const { alias } = credential;
    return alias || this.getCredentialType();
  }

  getIssuerDisplayName(): string {
    const credentialData = this.credentialData();
    if (!credentialData) return "";

    const { issuer } = credentialData;
    if (typeof issuer === "string") {
      return "Example University";
    }
    const { name } = issuer || {};
    return name || "Unknown Issuer";
  }

  getIssuerCategory(): string {
    const { metadata } = this.credential() || {};
    const category = metadata?.category?.toLowerCase();

    if (category?.includes("education") || category?.includes("alumni")) {
      return "Alumni Of";
    }
    return "Issued By";
  }

  getIssuerType(): string {
    const credentialData = this.credentialData();
    if (!credentialData) return "Unknown";

    const { issuer } = credentialData;
    if (typeof issuer === "string") {
      return "Self-issued";
    }
    const { name } = issuer || {};
    return name ? "Organization" : "Self-issued";
  }

  getSubjectInitials(): string {
    const subjectData = this.getCredentialSubjectData();
    const name = this.getSubjectName();

    if (name) {
      const parts = name.split(" ");
      return parts
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
        .substring(0, 2);
    }

    return "GP";
  }

  getSubjectName(): string {
    const subjectData = this.getCredentialSubjectData();
    const { name, firstName, lastName, email } = subjectData;

    if (name) return name;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (email) return email.split("@")[0];

    return "Gym Peterson";
  }

  getSubjectType(): string {
    const credentialData = this.credentialData();
    if (!credentialData) return "Unknown";

    const { credentialSubject } = credentialData;
    const { id } = credentialSubject || {};

    if (typeof id === "string" && id.includes("nostr:")) {
      return "Nostr";
    }
    if (typeof id === "string" && id.includes("did:")) {
      return "DID";
    }

    return "Nostr";
  }

  getCredentialSubjectData(): Record<string, any> {
    const cred = this.credentialData();
    if (!cred?.credentialSubject) return {};

    const { id, ...subjectData } = cred.credentialSubject;
    return subjectData;
  }

  getCredentialAge(): string {
    const credential = this.credential();
    if (!credential) return "";

    const { createdAt } = credential;
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  isExpired(): boolean {
    const { expirationDate } = this.credentialData() || {};
    if (!expirationDate) return false;

    return new Date(expirationDate) < new Date();
  }

  getDaysUntilExpiry(): number | null {
    const credentialData = this.credentialData();
    const { expirationDate } = credentialData || {};
    if (!expirationDate) return null;

    const expiryDate = new Date(expirationDate);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return "Not specified";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (
      typeof value === "string" &&
      value.includes("T") &&
      value.includes("Z")
    ) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }
    return String(value);
  }

  formatKey(key: string): string {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  exportCredential(): void {
    const credential = this.credential();
    if (!credential) return;

    const { credential: credentialData, alias } = credential;
    const { id } = credentialData;

    const credentialJson = this._credentialService.exportCredential(id);
    if (!credentialJson) return;

    const blob = new Blob([credentialJson], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `credential-${alias || "export"}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log("Credential exported successfully");
  }

  deleteCredential(): void {
    const credential = this.credential();
    if (!credential) return;

    const { credential: credentialData, alias } = credential;
    const { id } = credentialData;

    const confirmed = confirm(
      `Are you sure you want to delete "${
        alias || "this credential"
      }"? This action cannot be undone.`
    );

    if (confirmed) {
      const success = this._credentialService.deleteCredential(id);
      if (success) {
        console.log("Credential deleted successfully");
        this._router.navigate(["/credentials"]);
      } else {
        console.error("Failed to delete credential");
      }
    }
  }

  editCredential(): void {
    console.log("Credential editing coming soon");
  }

  goBack(): void {
    this._router.navigate(["/credentials"]);
  }

  private async _verifyCredential(
    credential: VerifiableCredential
  ): Promise<void> {
    try {
      this.isVerifying.set(true);
      const result = await this._credentialService.verifyCredential(credential);
      this.verificationResult.set(result);
    } catch (error) {
      console.error("Verification failed:", error);
      this.verificationResult.set({
        isValid: false,
        details: "Verification failed",
        issuerResolved: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    } finally {
      this.isVerifying.set(false);
    }
  }
}
