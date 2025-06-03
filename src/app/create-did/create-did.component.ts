import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { DidService, CreateDIDResult } from "../services/did.service";

@Component({
  selector: "app-create-did",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
    FormsModule,
  ],
  templateUrl: "./create-did.component.html",
  styleUrl: "./create-did.component.scss",
})
export class CreateDidComponent {
  isCreating = signal(false);
  didName = signal("");

  constructor(
    private didService: DidService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  async createDID(): Promise<void> {
    if (!this.didName().trim()) {
      this.snackBar.open("Please enter a name for your DID", "Close", {
        duration: 3000,
        panelClass: ["error-snackbar"],
      });
      return;
    }

    this.isCreating.set(true);

    try {
      // Create the DID
      const createdDID: CreateDIDResult = await this.didService.createDID();

      // Store it with the user-provided name
      await this.didService.storeDID(createdDID, this.didName().trim());

      this.snackBar.open(
        createdDID.isPublished
          ? "DID created and published successfully!"
          : "DID created successfully!",
        "Close",
        {
          duration: 3000,
          panelClass: ["success-snackbar"],
        }
      );

      // Navigate to DID management or onboarding
      this.router.navigate(["/did-management"]);
    } catch (error) {
      console.log("DID creation failed, trying offline mode:", error);

      try {
        // Fallback to offline DID creation
        const offlineDID: CreateDIDResult =
          await this.didService.createOfflineDID();
        await this.didService.storeDID(offlineDID, this.didName().trim());

        this.snackBar.open("DID created in offline mode!", "Close", {
          duration: 4000,
          panelClass: ["success-snackbar"],
        });

        this.router.navigate(["/did-management"]);
      } catch (offlineError) {
        console.error("Error creating DID:", offlineError);
        this.snackBar.open("Failed to create DID. Please try again.", "Close", {
          duration: 5000,
          panelClass: ["error-snackbar"],
        });
      }
    } finally {
      this.isCreating.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(["/boarding"]);
  }
}
