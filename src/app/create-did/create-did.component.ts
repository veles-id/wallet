import { Component, signal, inject } from "@angular/core";
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
  private _didService = inject(DidService);
  private _router = inject(Router);

  isCreating = signal(false);
  didName = signal("");

  async createDID(): Promise<void> {
    if (!this.didName().trim()) {
      return;
    }

    this.isCreating.set(true);

    try {
      const createdDID: CreateDIDResult = await this._didService.createDID();

      await this._didService.storeDID(createdDID, this.didName().trim());

      this._router.navigate(["/dashboard"]);
    } catch (error) {
      console.log("DID creation failed, trying offline mode:", error);

      try {
        const offlineDID: CreateDIDResult =
          await this._didService.createOfflineDID();
        await this._didService.storeDID(offlineDID, this.didName().trim());

        this._router.navigate(["/dashboard"]);
      } catch (offlineError) {
        console.error("Error creating DID:", offlineError);
      }
    } finally {
      this.isCreating.set(false);
    }
  }

  goBack(): void {
    this._router.navigate(["/boarding"]);
  }
}
