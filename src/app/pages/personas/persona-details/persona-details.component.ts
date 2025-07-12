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
import { AuthService } from "../../../core/services/auth.service";
import { DidService } from "../../../core/services/did.service";
import { StoredDID, DIDType } from "../../../core/services/did.types";
import { FooterComponent } from "../../../shared/footer/footer.component";
import { ProfileComponent } from "../../../shared/profile/profile.component";
import { AvatarSize } from "../../../shared/avatar/avatar.types";
import { HeaderComponent } from "../../../shared/header/header.component";

@Component({
  selector: "app-persona-details",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    FooterComponent,
    ProfileComponent,
    HeaderComponent,
  ],
  templateUrl: "./persona-details.component.html",
  styleUrl: "./persona-details.component.scss",
})
export class PersonaDetailsComponent implements OnInit, AfterViewInit {
  @ViewChild("qrCanvas", { static: false })
  qrCanvas!: ElementRef<HTMLCanvasElement>;

  private _authService = inject(AuthService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _route = inject(ActivatedRoute);

  AvatarSize = AvatarSize;

  isLoading = signal(false);
  error = signal<string | null>(null);
  qrCodeGenerated = signal(false);
  currentDID = signal<StoredDID | null>(null);
  pendingQRGeneration = signal(false);
  storedDIDs = signal<StoredDID[]>([]);
  nostrData = signal<any>(null);
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

      if (!did.isPublished) {
        this._router.navigate(["/personas", didId, "unpublished"]);
        return;
      }

      this.currentDID.set(did);
      this.pendingQRGeneration.set(true);

      if (did.didType === DIDType.NOSTR || did.did.startsWith("did:nostr:")) {
        console.log(
          "Published DID:Nostr detected, retrieving network information..."
        );
        this._retrieveNostrDIDInfo(did.did);
      }
    } catch (error) {
      console.error("Error loading DID from route:", error);
      this.error.set("Failed to load your digital identity");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async _retrieveNostrDIDInfo(did: string): Promise<void> {
    try {
      console.log("=== RETRIEVING DID:NOSTR INFORMATION ===");
      const didInfo = await this._didService.resolveDID(did);

      this.nostrData.set(didInfo);

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
      this.error.set("Failed to retrieve network information");
    }
  }

  private async _generateQRCode(didUri: string): Promise<void> {
    try {
      console.log("Generating QR code for DID:", didUri);

      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!this.qrCanvas?.nativeElement) {
        console.error("Canvas element not available, retrying...");
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
      this.error.set(null);
      console.log("QR code generated successfully");
    } catch (error) {
      console.error("Error generating QR code:", error);
      this.error.set("Failed to generate QR code");

      const currentError = this.error();
      if (!currentError || !currentError.includes("retry")) {
        setTimeout(() => {
          this.error.set("Failed to generate QR code (retry)");
          this._generateQRCode(didUri);
        }, 1000);
      }
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

  getPersonaInitials(did: StoredDID): string {
    if (did.alias) {
      return did.alias
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
        .substring(0, 2);
    }
    return did.didType?.charAt(0).toUpperCase() || "D";
  }

  getPublicName(): string {
    const nostrData = this.nostrData();
    if (nostrData?.profileMetadata?.metadata?.display_name) {
      return nostrData.profileMetadata.metadata.display_name;
    }
    if (nostrData?.profileMetadata?.metadata?.name) {
      return nostrData.profileMetadata.metadata.name;
    }
    return this.currentDID()?.alias || "No data";
  }

  getPublicNick(): string {
    const nostrData = this.nostrData();
    if (nostrData?.profileMetadata?.metadata?.name) {
      return nostrData.profileMetadata.metadata.name;
    }
    const alias = this.currentDID()?.alias;
    if (alias) {
      return alias.toLowerCase().replace(/\s+/g, "");
    }
    return "No data";
  }

  getPublicWebsite(): string {
    const nostrData = this.nostrData();
    if (nostrData?.profileMetadata?.metadata?.website) {
      return nostrData.profileMetadata.metadata.website;
    }
    return "No data";
  }

  getPublicAbout(): string {
    const nostrData = this.nostrData();
    if (nostrData?.profileMetadata?.metadata?.about) {
      return nostrData.profileMetadata.metadata.about;
    }
    return "No data";
  }

  getPublicLightningWallet(): string {
    const nostrData = this.nostrData();
    if (nostrData?.profileMetadata?.metadata?.lud16) {
      return nostrData.profileMetadata.metadata.lud16;
    }
    if (nostrData?.profileMetadata?.metadata?.lud06) {
      return nostrData.profileMetadata.metadata.lud06;
    }
    return "No data";
  }

  getPublicLocation(): string {
    const nostrData = this.nostrData();
    if (nostrData?.profileMetadata?.metadata?.location) {
      return nostrData.profileMetadata.metadata.location;
    }
    return "No data";
  }

  shouldShowBackButton(): boolean {
    return this.storedDIDs().length > 1;
  }

  navigateToEdit(): void {
    const currentDID = this.currentDID();
    if (currentDID) {
      this._router.navigate(["/personas", currentDID.did, "edit"]);
    }
  }
}
