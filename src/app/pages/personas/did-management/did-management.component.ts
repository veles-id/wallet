import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DidService } from '../../../core/services/did.service';
import { StoredDID } from '../../../core/services/did.types';

@Component({
  selector: 'app-did-management',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatSnackBarModule],
  templateUrl: './did-management.component.html',
  styleUrl: './did-management.component.scss',
})
export class DidManagementComponent implements OnInit {
  private _didService = inject(DidService);
  private _snackBar = inject(MatSnackBar);
  private _router = inject(Router);

  storedDIDs: StoredDID[] = [];

  ngOnInit(): void {
    this.loadStoredDIDs();
  }

  loadStoredDIDs(): void {
    this.storedDIDs = this._didService.getStoredDIDs();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this._snackBar.open('DID copied to clipboard!', 'Close', {
          duration: 2000,
        });
      })
      .catch(() => {
        this._snackBar.open('Failed to copy to clipboard', 'Close', {
          duration: 2000,
        });
      });
  }

  exportDID(did: string): void {
    const exportedData = this._didService.exportDID(did);
    if (exportedData) {
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `did-${did.split(':').pop()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      this._snackBar.open('DID exported successfully!', 'Close', {
        duration: 2000,
      });
    }
  }

  deleteDID(did: string): void {
    if (confirm('Are you sure you want to delete this DID? This action cannot be undone.')) {
      const success = this._didService.deleteDID(did);
      if (success) {
        this.loadStoredDIDs();
        this._snackBar.open('DID deleted successfully!', 'Close', {
          duration: 2000,
        });
      } else {
        this._snackBar.open('Failed to delete DID', 'Close', {
          duration: 2000,
        });
      }
    }
  }

  createNewDID(): void {
    this._router.navigate(['/create-did']);
  }

  goBack(): void {
    this._router.navigate(['/onboarding']);
  }
}
