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
import { DidService } from "../services/did.service";
import { StoredDID, DIDType } from "../services/did.types";

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
  canPublish = computed(() => {
    const did = this.currentDID();
    if (!did) return false;

    const publishability = this._didService.canPublishDID(did);
    return publishability.canPublish;
  });

  isLegacyDID = computed(() => {
    const did = this.currentDID();
    if (!did) return false;

    const publishability = this._didService.canPublishDID(did);
    return publishability.isLegacyDID || false;
  });

  publishabilityReason = computed(() => {
    const did = this.currentDID();
    if (!did) return null;

    const publishability = this._didService.canPublishDID(did);
    return publishability.reason || null;
  });

  didTypeBadgeText = computed(() => {
    const did = this.currentDID();
    if (!did) return "DHT";
    return (did.didType || DIDType.DHT).toUpperCase();
  });

  didTypeBadgeClass = computed(() => {
    const did = this.currentDID();
    if (!did) return "dashboard__did-type-badge--dht";
    return `dashboard__did-type-badge--${did.didType || DIDType.DHT}`;
  });

  ngOnInit(): void {
    this.loadUserDID();
  }

  ngAfterViewInit(): void {
    if (this.currentDID() && this.pendingQRGeneration()) {
      this.generateQRCode(this.currentDID()!.did);
    }

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
        const latestDID = storedDIDs[storedDIDs.length - 1];

        // Try to migrate the DID for publishing if needed
        if (
          !latestDID.privateKeyJwk &&
          !latestDID.isPublished &&
          latestDID.didType === DIDType.DHT
        ) {
          console.log("Attempting to migrate DID for publishing...");
          await this._didService.migrateDIDForPublishing(latestDID.did);
          // Reload the DID after migration attempt
          const updatedDID = this._didService.getStoredDID(latestDID.did);
          if (updatedDID) {
            this.currentDID.set(updatedDID);
          } else {
            this.currentDID.set(latestDID);
          }
        } else {
          this.currentDID.set(latestDID);
        }

        this.pendingQRGeneration.set(true);

        // If this is a published DID:Nostr, retrieve information from the network
        if (
          latestDID.isPublished &&
          (latestDID.didType === DIDType.NOSTR ||
            latestDID.did.startsWith("did:nostr:"))
        ) {
          console.log(
            "Published DID:Nostr detected, retrieving network information..."
          );
          this.retrieveNostrDIDInfo(latestDID.did);
        }
      } else {
        this._router.navigate(["/create-did"]);
      }
    } catch (error) {
      console.error("Error loading user DID:", error);
      this.error.set("Failed to load your digital identity");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async retrieveNostrDIDInfo(did: string): Promise<void> {
    try {
      console.log("=== RETRIEVING DID:NOSTR INFORMATION ===");
      const didInfo = await this._didService.resolveDID(did);

      console.log("DID:Nostr Network Information:");
      console.log("DID URI:", didInfo.did);
      console.log("Public Key:", didInfo.publicKey);
      console.log("Retrieved At:", didInfo.retrievedAt);

      if (didInfo.didDocument) {
        console.log("DID Document:");
        console.log("  Published At:", didInfo.didDocument.publishedAt);
        console.log("  Document:", didInfo.didDocument.document);
        console.log("  Event ID:", didInfo.didDocument.event?.id);
      } else {
        console.log("DID Document: Not found on network");
      }

      if (didInfo.profileMetadata) {
        console.log("Profile Metadata:");
        console.log("  Updated At:", didInfo.profileMetadata.updatedAt);
        console.log(
          "  Name:",
          didInfo.profileMetadata.metadata?.name || "Not set"
        );
        console.log(
          "  Display Name:",
          didInfo.profileMetadata.metadata?.display_name || "Not set"
        );
        console.log(
          "  About:",
          didInfo.profileMetadata.metadata?.about || "Not set"
        );
        console.log(
          "  Picture:",
          didInfo.profileMetadata.metadata?.picture || "Not set"
        );
        console.log(
          "  NIP-05:",
          didInfo.profileMetadata.metadata?.nip05 || "Not set"
        );
        console.log(
          "  Lightning Address:",
          didInfo.profileMetadata.metadata?.lud16 ||
            didInfo.profileMetadata.metadata?.lud06 ||
            "Not set"
        );
        console.log(
          "  Website:",
          didInfo.profileMetadata.metadata?.website || "Not set"
        );
        console.log(
          "  Banner:",
          didInfo.profileMetadata.metadata?.banner || "Not set"
        );
      } else {
        console.log("Profile Metadata: Not found on network");
      }

      if (didInfo.relayList) {
        console.log("Relay List:");
        console.log("  Updated At:", didInfo.relayList.updatedAt);
        console.log("  Relay Count:", didInfo.relayList.relays.length);
        didInfo.relayList.relays.forEach((relay: any, index: number) => {
          console.log(`  Relay ${index + 1}:`, relay.url, `(${relay.type})`);
        });
      } else {
        console.log("Relay List: Not found on network");
      }

      if (didInfo.contactList) {
        console.log("Contact List:");
        console.log("  Updated At:", didInfo.contactList.updatedAt);
        console.log("  Contact Count:", didInfo.contactList.contactCount);
        if (didInfo.contactList.contacts.length > 0) {
          console.log("  First 5 contacts:");
          didInfo.contactList.contacts
            .slice(0, 5)
            .forEach((contact: any, index: number) => {
              console.log(
                `    Contact ${index + 1}:`,
                contact.pubkey.substring(0, 16) + "...",
                contact.petname || "No petname",
                contact.relay || "No specific relay"
              );
            });
        }
      } else {
        console.log("Contact List: Not found on network");
      }

      console.log("=== END DID:NOSTR INFORMATION ===");
    } catch (error) {
      console.error(
        "Failed to retrieve DID:Nostr information from network:",
        error
      );
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
      // Check if this is a DID:Nostr
      if (did.didType === DIDType.NOSTR || did.did.startsWith("did:nostr:")) {
        const success = await this._didService.publishDID(did);
        if (success) {
          // Update the publication status in localStorage
          this._didService.updateDIDPublicationStatus(did.did, true);
          // Update the current DID state
          const updatedDID = { ...did, isPublished: true };
          this.currentDID.set(updatedDID);
          console.log("DID:Nostr published successfully!");
        }
      } else {
        // This is a DID:DHT, publish to DHT
        const success = await this._didService.publishDID(did);
        if (success) {
          // Update the publication status in localStorage
          this._didService.updateDIDPublicationStatus(did.did, true);
          // Update the current DID state
          const updatedDID = { ...did, isPublished: true };
          this.currentDID.set(updatedDID);
          console.log("DID:DHT published successfully!");
        }
      }
    } catch (error) {
      console.error("Error publishing DID:", error);

      let errorMessage = "Failed to publish DID. Please try again.";

      if (error instanceof Error) {
        if (did.didType === DIDType.NOSTR || did.did.startsWith("did:nostr:")) {
          // Nostr-specific error handling
          if (error.message.includes("Could not extract Nostr keys")) {
            errorMessage =
              "Cannot publish this DID - failed to extract Nostr keys.";
          }
        } else {
          // DHT-specific error handling
          if (error.message.includes("No private keys available")) {
            errorMessage =
              "Cannot publish this DID - it was created offline and has no private keys.";
          } else if (
            error.message.includes("KeySet is not a valid DidDht instance")
          ) {
            errorMessage =
              "Cannot publish this DID - the cryptographic keys are no longer valid. Try creating a new DID.";
          } else if (error.message.includes("Failed to reconstruct DID")) {
            errorMessage =
              "Cannot publish this DID - failed to reconstruct the cryptographic keys. Try creating a new DID.";
          } else if (error.message.includes("Invalid DID document structure")) {
            errorMessage =
              "Cannot publish this DID - the document structure is invalid.";
          } else if (
            error.message.includes("Failed to publish to all available")
          ) {
            errorMessage =
              "Publishing failed - all publishing methods are unavailable. Please try again later.";
          }
        }
      }

      this.error.set(errorMessage);
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

  async createNewPublishableDID(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      console.log("Creating new publishable DID to replace legacy DID...");
      const newDID = await this._didService.createPublishableDID();

      // Update the current DID to the new one
      const storedDID = this._didService.getStoredDID(newDID.did);
      if (storedDID) {
        this.currentDID.set(storedDID);
        console.log("New publishable DID created successfully!");

        // Generate QR code for the new DID
        this.pendingQRGeneration.set(true);
        this.generateQRCode(newDID.did);
      }
    } catch (error) {
      console.error("Error creating new publishable DID:", error);
      this.error.set("Failed to create new DID. Please try again.");
    } finally {
      this.isLoading.set(false);
    }
  }
}
