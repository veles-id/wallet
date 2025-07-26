import { Component, signal, computed, inject, DestroyRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DidService } from "../../core/services/did.service";
import { StoredDID } from "../../core/services/did.types";
import { FooterService } from "../../core/services/footer.service";

@Component({
  selector: "app-footer",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.scss",
})
export class FooterComponent {
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _destroyRef = inject(DestroyRef);
  private _footerService = inject(FooterService);

  isLoading = signal(false);
  error = signal<string | null>(null);
  storedDIDs = signal<StoredDID[]>([]);
  currentRoute = signal<string>("");
  showFooter = computed(() => this._footerService.showFooter());

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

  navigateToIdentity(): void {
    this._navigateToIdentity();
  }

  navigateToCredentials(): void {
    this._router.navigate(["/credentials"]);
  }

  navigateToLinked(): void {
    // @todo: Implement linked accounts page
    console.log("Linked accounts feature coming soon!");
  }

  navigateToSettings(): void {
    // @todo: Implement settings page
    console.log("Settings feature coming soon!");
  }

  private async _navigateToIdentity(): Promise<void> {
    try {
      this.isLoading.set(true);
      const storedDIDs = this._didService.getStoredDIDs();
      this.storedDIDs.set(storedDIDs);

      if (storedDIDs.length === 0) {
        this._router.navigate(["/create-did"]);
      } else {
        const somePublishedDID = storedDIDs.some((did) => did.isPublished);

        if (somePublishedDID) {
          this._router.navigate(["/personas"]);
        } else {
          const firstDID = storedDIDs[0];
          this._router.navigate(["/personas", firstDID.did, "unpublished"]);
        }
      }
    } catch (error) {
      console.error("Error loading user DIDs:", error);
      this.error.set("Failed to load your digital identities");
    } finally {
      this.isLoading.set(false);
    }
  }
}
