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

  constructor(private didService: DidService, private router: Router) {}

  async createDID(): Promise<void> {
    if (!this.didName().trim()) {
      return;
    }

    this.isCreating.set(true);

    try {
      // Create the DID
      const createdDID: CreateDIDResult = await this.didService.createDID();

      // Store it with the user-provided name
      await this.didService.storeDID(createdDID, this.didName().trim());

      // Navigate to dashboard to show the created DID
      this.router.navigate(["/dashboard"]);
    } catch (error) {
      console.log("DID creation failed, trying offline mode:", error);

      try {
        // Fallback to offline DID creation
        const offlineDID: CreateDIDResult =
          await this.didService.createOfflineDID();
        await this.didService.storeDID(offlineDID, this.didName().trim());

        this.router.navigate(["/dashboard"]);
      } catch (offlineError) {
        console.error("Error creating DID:", offlineError);
      }
    } finally {
      this.isCreating.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(["/boarding"]);
  }
}
