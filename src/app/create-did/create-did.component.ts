import { Component, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatRadioModule } from "@angular/material/radio";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { DidService } from "../services/did.service";
import { CreateDIDResult, DIDType } from "../services/did.types";

@Component({
  selector: "app-create-did",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
    MatRadioModule,
    FormsModule,
  ],
  templateUrl: "./create-did.component.html",
  styleUrl: "./create-did.component.scss",
})
export class CreateDidComponent {
  private _didService = inject(DidService);
  private _router = inject(Router);

  DIDType = DIDType;
  isCreating = signal(false);
  didName = signal("");
  selectedDIDType = signal(DIDType.NOSTR);

  async createDID(): Promise<void> {
    if (!this.didName().trim()) {
      return;
    }

    this.isCreating.set(true);

    try {
      const didType = this.selectedDIDType() as DIDType;

      // Create DID using the gateway service
      const createdDID: CreateDIDResult = await this._didService.createDID(
        didType
      );
      await this._didService.storeDID(createdDID, this.didName().trim());

      this._router.navigate(["/dashboard"]);
    } catch (error) {
      const didType = this.selectedDIDType();
      console.log(`DID:${didType} creation failed:`, error);

      // Only try DHT fallback if we were trying to create Nostr
      if (this.selectedDIDType() === DIDType.NOSTR) {
        try {
          console.log("Trying DHT fallback...");
          const offlineDID: CreateDIDResult =
            await this._didService.createOfflineDID();
          await this._didService.storeDID(offlineDID, this.didName().trim());
          this._router.navigate(["/dashboard"]);
        } catch (offlineError) {
          console.error("Error creating fallback DID:", offlineError);
        }
      } else {
        // DHT creation failed, try offline mode
        try {
          const offlineDID: CreateDIDResult =
            await this._didService.createOfflineDID();
          await this._didService.storeDID(offlineDID, this.didName().trim());
          this._router.navigate(["/dashboard"]);
        } catch (offlineError) {
          console.error("Error creating offline DID:", offlineError);
        }
      }
    } finally {
      this.isCreating.set(false);
    }
  }

  goBack(): void {
    this._router.navigate(["/onboarding"]);
  }
}
