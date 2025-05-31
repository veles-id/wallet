import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { DidService, CreateDIDResult } from "../services/did.service";

@Component({
  selector: "app-did-creation",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: "./did-creation.component.html",
  styleUrl: "./did-creation.component.scss",
})
export class DidCreationComponent {
  isCreating = false;
  createdDID: CreateDIDResult | null = null;
  didAlias = "";

  constructor(
    private didService: DidService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  async createDID(): Promise<void> {
    this.isCreating = true;

    try {
      // First try the normal DID creation
      this.createdDID = await this.didService.createDID();
      await this.didService.storeDID(
        this.createdDID,
        this.didAlias || undefined
      );

      this.snackBar.open(
        this.createdDID.isPublished
          ? "DID created and published successfully!"
          : "DID created offline successfully!",
        "Close",
        {
          duration: 3000,
          panelClass: ["success-snackbar"],
        }
      );
    } catch (error) {
      console.log("Normal DID creation failed, trying offline mode:", error);

      try {
        // Fallback to offline DID creation
        this.createdDID = await this.didService.createOfflineDID();
        await this.didService.storeDID(
          this.createdDID,
          this.didAlias || undefined
        );

        this.snackBar.open("DID created in offline mode!", "Close", {
          duration: 4000,
          panelClass: ["success-snackbar"],
        });
      } catch (offlineError) {
        console.error("Error creating DID in offline mode:", offlineError);
        this.snackBar.open("Failed to create DID. Please try again.", "Close", {
          duration: 5000,
          panelClass: ["error-snackbar"],
        });
      }
    } finally {
      this.isCreating = false;
    }
  }

  createAnother(): void {
    this.createdDID = null;
    this.didAlias = "";
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.snackBar.open("DID copied to clipboard!", "Close", {
          duration: 2000,
        });
      })
      .catch(() => {
        this.snackBar.open("Failed to copy to clipboard", "Close", {
          duration: 2000,
        });
      });
  }

  viewStoredDIDs(): void {
    // Navigate to DID management component (to be created later)
    this.router.navigate(["/did-management"]);
  }

  goBack(): void {
    this.router.navigate(["/onboarding"]);
  }
}
