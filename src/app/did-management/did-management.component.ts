import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { DidService, StoredDID } from "../services/did.service";

@Component({
  selector: "app-did-management",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: "./did-management.component.html",
  styleUrl: "./did-management.component.scss",
})
export class DidManagementComponent implements OnInit {
  storedDIDs: StoredDID[] = [];

  constructor(
    private didService: DidService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStoredDIDs();
  }

  loadStoredDIDs(): void {
    this.storedDIDs = this.didService.getStoredDIDs();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
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

  exportDID(did: string): void {
    const exportedData = this.didService.exportDID(did);
    if (exportedData) {
      const blob = new Blob([exportedData], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `did-${did.split(":").pop()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.snackBar.open("DID exported successfully!", "Close", {
        duration: 2000,
      });
    }
  }

  deleteDID(did: string): void {
    if (
      confirm(
        "Are you sure you want to delete this DID? This action cannot be undone."
      )
    ) {
      const success = this.didService.deleteDID(did);
      if (success) {
        this.loadStoredDIDs();
        this.snackBar.open("DID deleted successfully!", "Close", {
          duration: 2000,
        });
      } else {
        this.snackBar.open("Failed to delete DID", "Close", {
          duration: 2000,
        });
      }
    }
  }

  createNewDID(): void {
    this.router.navigate(["/create-did"]);
  }

  goBack(): void {
    this.router.navigate(["/onboarding"]);
  }
}
