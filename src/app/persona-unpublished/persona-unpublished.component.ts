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
import { Router, ActivatedRoute } from "@angular/router";
import * as QRCode from "qrcode";
import { AuthService, User } from "../services/auth.service";
import { DidService } from "../services/did.service";
import { StoredDID, DIDType } from "../services/did.types";
import { NavFooterComponent } from "../nav-footer/nav-footer.component";

@Component({
  selector: "app-persona-unpublished",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    NavFooterComponent,
  ],
  templateUrl: "./persona-unpublished.component.html",
  styleUrl: "./persona-unpublished.component.scss",
})
export class PersonaUnpublishedComponent implements OnInit, AfterViewInit {
  @ViewChild("qrCanvas", { static: false })
  qrCanvas!: ElementRef<HTMLCanvasElement>;

  private _authService = inject(AuthService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _route = inject(ActivatedRoute);

  isLoading = signal(false);
  isPublishing = signal(false);
  error = signal<string | null>(null);
  qrCodeGenerated = signal(false);
  currentDID = signal<StoredDID | null>(null);
  pendingQRGeneration = signal(false);
  storedDIDs = signal<StoredDID[]>([]);
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
    if (!did) return "personas-type-badge--dht";
    return `personas-type-badge--${did.didType || DIDType.DHT}`;
  });

  ngOnInit(): void {
    this._loadDIDFromRoute();
  }

  ngAfterViewInit(): void {
    if (this.currentDID() && this.pendingQRGeneration()) {
      this._generateQRCode(this.currentDID()!.did);
    }

    setTimeout(() => {
      if (this.currentDID() && this.pendingQRGeneration()) {
        console.log("Retrying QR code generation after timeout");
        this._generateQRCode(this.currentDID()!.did);
      }
    }, 100);
  }

  private async _loadDIDFromRoute(): Promise<void> {
    try {
      this.isLoading.set(true);
      const didId = this._route.snapshot.paramMap.get("id");

      if (!didId) {
        this._router.navigate(["/personas"]);
        return;
      }

      const storedDIDs = this._didService.getStoredDIDs();
      this.storedDIDs.set(storedDIDs);

      const did = storedDIDs.find((d) => d.did === didId);

      if (!did) {
        this._router.navigate(["/personas"]);
        return;
      }

      if (did.isPublished) {
        this._router.navigate(["/personas", didId]);
        return;
      }

      this.currentDID.set(did);
      this.pendingQRGeneration.set(true);

      if (
        !did.privateKeyJwk &&
        !did.isPublished &&
        did.didType === DIDType.DHT
      ) {
        console.log("Attempting to migrate DID for publishing...");
        await this._didService.migrateDIDForPublishing(did.did);
        const updatedDID = this._didService.getStoredDID(did.did);
        if (updatedDID) {
          this.currentDID.set(updatedDID);
        }
      }
    } catch (error) {
      console.error("Error loading DID from route:", error);
      this.error.set("Failed to load your digital identity");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async _generateQRCode(didUri: string): Promise<void> {
    try {
      console.log("Generating QR code for DID:", didUri);

      // Wait a brief moment for DOM to be ready
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!this.qrCanvas?.nativeElement) {
        console.error("Canvas element not available, retrying...");
        // Retry after a longer delay
        setTimeout(() => this._generateQRCode(didUri), 200);
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
          this._generateQRCode(didUri);
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
      if (did.didType === DIDType.NOSTR || did.did.startsWith("did:nostr:")) {
        const success = await this._didService.publishDID(did);
        if (success) {
          this._didService.updateDIDPublicationStatus(did.did, true);
          console.log("DID:Nostr published successfully!");
          this._router.navigate(["/personas", did.did]);
        }
      } else {
        const success = await this._didService.publishDID(did);
        if (success) {
          this._didService.updateDIDPublicationStatus(did.did, true);
          console.log("DID:DHT published successfully!");
          this._router.navigate(["/personas", did.did]);
        }
      }
    } catch (error) {
      console.error("Error publishing DID:", error);

      let errorMessage = "Failed to publish DID. Please try again.";

      if (error instanceof Error) {
        if (did.didType === DIDType.NOSTR || did.did.startsWith("did:nostr:")) {
          if (error.message.includes("Could not extract Nostr keys")) {
            errorMessage =
              "Cannot publish this DID - failed to extract Nostr keys.";
          }
        } else {
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

  backToList(): void {
    this._router.navigate(["/personas"]);
  }

  async createNewPublishableDID(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      console.log("Creating new publishable DID to replace legacy DID...");
      const newDID = await this._didService.createPublishableDID();

      this._router.navigate(["/personas", newDID.did, "unpublished"]);
    } catch (error) {
      console.error("Error creating new publishable DID:", error);
      this.error.set("Failed to create new DID. Please try again.");
    } finally {
      this.isLoading.set(false);
    }
  }

  shouldShowBackButton(): boolean {
    return this.storedDIDs().length > 1;
  }
}
