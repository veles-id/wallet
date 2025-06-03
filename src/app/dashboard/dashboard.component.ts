import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import * as QRCode from "qrcode";
import { AuthService, User } from "../services/auth.service";
import { DidService, StoredDID } from "../services/did.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild("qrCanvas", { static: false })
  qrCanvas!: ElementRef<HTMLCanvasElement>;

  private _authService = inject(AuthService);
  private _didService = inject(DidService);
  private _router = inject(Router);

  isLoading = signal(false);
  isPublishing = signal(false);
  error = signal<string | null>(null);
  qrCodeGenerated = signal(false);
  currentDID = signal<StoredDID | null>(null);
  pendingQRGeneration = signal(false);

  currentUser = computed(() => this._authService.currentUser());
  userName = computed(() => this.currentDID()?.alias || "Digital Identity");
  didUri = computed(() => this.currentDID()?.did || "");
  shortDID = computed(() => {
    const did = this.didUri();
    if (did.length > 30) {
      return `${did.substring(0, 20)}...${did.substring(did.length - 10)}`;
    }
    return did;
  });
  canPublish = computed(
    () => this.currentDID() && !this.currentDID()?.isPublished
  );

  ngOnInit(): void {
    this.loadUserDID();
  }

  ngAfterViewInit(): void {
    // Generate QR code after view is initialized if DID is already loaded
    if (this.currentDID() && this.pendingQRGeneration()) {
      this.generateQRCode(this.currentDID()!.did);
    }

    // Additional safety: retry QR generation after a short delay if still pending
    setTimeout(() => {
      if (this.currentDID() && this.pendingQRGeneration()) {
        console.log("Retrying QR code generation after timeout");
        this.generateQRCode(this.currentDID()!.did);
      }
    }, 100);
  }

  private async loadUserDID(): Promise<void> {
    try {
      this.isLoading.set(true);
      const storedDIDs = this._didService.getStoredDIDs();

      if (storedDIDs.length > 0) {
        // Get the most recent DID
        const latestDID = storedDIDs[storedDIDs.length - 1];
        this.currentDID.set(latestDID);
        this.pendingQRGeneration.set(true);
      } else {
        // No DID found, redirect to create DID
        this._router.navigate(["/create-did"]);
      }
    } catch (error) {
      console.error("Error loading user DID:", error);
      this.error.set("Failed to load your digital identity");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async generateQRCode(didUri: string): Promise<void> {
    try {
      console.log("Generating QR code for DID:", didUri);

      // Wait a brief moment for DOM to be ready
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!this.qrCanvas?.nativeElement) {
        console.error("Canvas element not available, retrying...");
        // Retry after a longer delay
        setTimeout(() => this.generateQRCode(didUri), 200);
        return;
      }

      await QRCode.toCanvas(this.qrCanvas.nativeElement, didUri, {
        width: 280,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      this.qrCodeGenerated.set(true);
      this.pendingQRGeneration.set(false);
      this.error.set(null); // Clear any previous errors
      console.log("QR code generated successfully");
    } catch (error) {
      console.error("Error generating QR code:", error);
      this.error.set("Failed to generate QR code");

      // Retry once after a delay
      const currentError = this.error();
      if (!currentError || !currentError.includes("retry")) {
        setTimeout(() => {
          this.error.set("Failed to generate QR code (retry)");
          this.generateQRCode(didUri);
        }, 1000);
      }
    }
  }

  async publishDID(): Promise<void> {
    const did = this.currentDID();
    if (!did || did.isPublished) {
      return;
    }

    this.isPublishing.set(true);
    this.error.set(null);

    try {
      const success = await this._didService.publishDIDWithFallback(did);
      if (success) {
        // Update the current DID state
        const updatedDID = { ...did, isPublished: true };
        this.currentDID.set(updatedDID);

        console.log("DID published successfully!");
      }
    } catch (error) {
      console.error("Error publishing DID:", error);
      this.error.set(
        "Failed to publish DID. Please check your internet connection."
      );
      console.log("Failed to publish DID");
    } finally {
      this.isPublishing.set(false);
    }
  }

  async copyDID(): Promise<void> {
    const did = this.didUri();
    if (did) {
      try {
        await navigator.clipboard.writeText(did);
        console.log("DID copied to clipboard!");
      } catch (error) {
        console.error("Error copying DID:", error);
        console.log("Failed to copy DID");
      }
    }
  }

  navigateToIdentity(): void {
    // Stay on current page or refresh
    this.loadUserDID();
  }

  navigateToCredentials(): void {
    // TODO: Implement credentials page
    console.log("Credentials feature coming soon!");
  }

  navigateToLinked(): void {
    // TODO: Implement linked accounts page
    console.log("Linked accounts feature coming soon!");
  }

  navigateToSettings(): void {
    // TODO: Implement settings page
    console.log("Settings feature coming soon!");
  }

  async logout(): Promise<void> {
    try {
      await this._authService.logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }
}
