import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { AuthService, User } from "../services/auth.service";
import { DidService } from "../services/did.service";
import { StoredDID, DIDType } from "../services/did.types";

@Component({
  selector: "app-personas-list",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: "./personas-list.component.html",
  styleUrl: "./personas-list.component.scss",
})
export class PersonasListComponent implements OnInit {
  private _authService = inject(AuthService);
  private _didService = inject(DidService);
  private _router = inject(Router);

  isLoading = signal(false);
  error = signal<string | null>(null);
  storedDIDs = signal<StoredDID[]>([]);
  currentUser = computed(() => this._authService.currentUser());

  ngOnInit(): void {
    this._loadUserDIDs();
  }

  private async _loadUserDIDs(): Promise<void> {
    try {
      this.isLoading.set(true);
      const storedDIDs = this._didService.getStoredDIDs();
      this.storedDIDs.set(storedDIDs);

      if (storedDIDs.length === 0) {
        this._router.navigate(["/create-did"]);
      } else if (storedDIDs.length === 1) {
        const singleDID = storedDIDs[0];
        if (singleDID.isPublished) {
          this._router.navigate(["/personas", singleDID.did]);
        } else {
          this._router.navigate(["/personas", singleDID.did, "unpublished"]);
        }
      }
    } catch (error) {
      console.error("Error loading user DIDs:", error);
      this.error.set("Failed to load your digital identities");
    } finally {
      this.isLoading.set(false);
    }
  }

  selectDID(did: StoredDID): void {
    if (did.isPublished) {
      this._router.navigate(["/personas", did.did]);
    } else {
      this._router.navigate(["/personas", did.did, "unpublished"]);
    }
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

  navigateToCreateDID(): void {
    this._router.navigate(["/create-did"]);
  }

  navigateToIdentity(): void {
    this._loadUserDIDs();
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
