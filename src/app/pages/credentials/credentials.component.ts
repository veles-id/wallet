
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CredentialService } from '../../core/services/credential.service';
import { StoredCredential } from '../../core/services/credential.types';

import { HeaderService } from '../../core/services/header.service';
import { CredentialCardComponent } from './credential-card/credential-card.component';

@Component({
  selector: 'app-credentials',
  standalone: true,
  imports: [
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    CredentialCardComponent
],
  templateUrl: './credentials.component.html',
  styleUrl: './credentials.component.scss',
})
export class CredentialsComponent implements OnInit {
  private _authService = inject(AuthService);
  private _credentialService = inject(CredentialService);
  private _router = inject(Router);
  private _headerService = inject(HeaderService);

  isLoading = signal(false);
  error = signal<string | null>(null);
  credentials = signal<StoredCredential[]>([]);
  currentUser = computed(() => this._authService.currentUser());
  hasCredentials = computed(() => this.credentials().length > 0);

  ngOnInit(): void {
    this._headerService.setHeader({
      title: 'Credentials',
      showBackButton: false,
    });
    this._loadCredentials();
  }

  private _loadCredentials(): void {
    try {
      const storedCredentials = this._credentialService.getStoredCredentials();
      this.credentials.set(storedCredentials);
    } catch (error) {
      console.error('Error loading credentials:', error);
      this.error.set('Failed to load credentials');
    }
  }

  createNewCredential(): void {
    this._router.navigate(['/credentials/create']);
  }

  viewCredential(credential: StoredCredential): void {
    this._router.navigate(['/credentials', credential.credential.id]);
  }

  deleteCredential(credential: StoredCredential): void {
    const { alias, credential: cred } = credential;
    const { id } = cred;

    if (confirm(`Are you sure you want to delete "${alias || 'this credential'}"?`)) {
      const success = this._credentialService.deleteCredential(id);
      if (success) {
        this._loadCredentials();
      } else {
        this.error.set('Failed to delete credential');
      }
    }
  }
}
