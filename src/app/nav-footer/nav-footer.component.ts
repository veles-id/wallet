import { Component, signal, computed, inject, DestroyRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AuthService } from "../services/auth.service";
import { DidService } from "../services/did.service";
import { StoredDID } from "../services/did.types";

@Component({
  selector: "app-nav-footer",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: "./nav-footer.component.html",
  styleUrl: "./nav-footer.component.scss",
})
export class NavFooterComponent {
  private _authService = inject(AuthService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _destroyRef = inject(DestroyRef);

  isLoading = signal(false);
  error = signal<string | null>(null);
  storedDIDs = signal<StoredDID[]>([]);
  currentRoute = signal<string>("");

  constructor() {
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });

    this.currentRoute.set(this._router.url);
  }

  isRouteActive(route: string): boolean {
    const currentUrl = this.currentRoute();
    if (route === "/personas") {
      return currentUrl.startsWith("/personas") || currentUrl === "/create-did";
    }
    return currentUrl.startsWith(route);
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

  navigateToCreateDID(): void {
    this._router.navigate(["/create-did"]);
  }

  navigateToIdentity(): void {
    this._loadUserDIDs();
  }

  navigateToCredentials(): void {
    this._router.navigate(["/credentials"]);
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
