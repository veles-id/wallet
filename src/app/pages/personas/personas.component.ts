
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DidService } from '../../core/services/did.service';
import { StoredDID } from '../../core/services/did.types';

import { HeaderService } from '../../core/services/header.service';

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './personas.component.html',
  styleUrl: './personas.component.scss',
})
export class PersonasComponent implements OnInit {
  private _authService = inject(AuthService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _headerService = inject(HeaderService);

  isLoading = signal(false);
  error = signal<string | null>(null);
  storedDIDs = signal<StoredDID[]>([]);
  currentUser = computed(() => this._authService.currentUser());

  ngOnInit(): void {
    this._loadUserDIDs();
    this._setupHeader();
  }

  private _setupHeader(): void {
    this._headerService.setHeader({
      title: 'Personas',
      showBackButton: false,
    });
  }

  private async _loadUserDIDs(): Promise<void> {
    try {
      this.isLoading.set(true);
      const storedDIDs = this._didService.getStoredDIDs();
      this.storedDIDs.set(storedDIDs);

      if (storedDIDs.length === 0) {
        this._router.navigate(['/create-did']);
      } else if (storedDIDs.length === 1) {
        const singleDID = storedDIDs[0];
        if (singleDID.isPublished) {
          this._router.navigate(['/personas', singleDID.did]);
        } else {
          this._router.navigate(['/personas', singleDID.did, 'unpublished']);
        }
      }
    } catch (error) {
      console.error('Error loading user DIDs:', error);
      this.error.set('Failed to load your digital identities');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectDID(did: StoredDID): void {
    if (did.isPublished) {
      this._router.navigate(['/personas', did.did]);
    } else {
      this._router.navigate(['/personas', did.did, 'unpublished']);
    }
  }

  getPersonaInitials(did: StoredDID): string {
    if (did.alias) {
      return did.alias
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    }
    return did.didType?.charAt(0).toUpperCase() || 'D';
  }

  navigateToCreateDID(): void {
    this._router.navigate(['/create-did']);
  }
}
