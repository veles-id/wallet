import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { CredentialService } from '@core/services/credential.service';
import { StoredCredential } from '@core/services/credential.types';
import { DidService } from '@core/services/did.service';
import { StoredDID } from '@core/services/did.types';
import { HeaderService } from '@core/services/header.service';
import { PresentationService } from '@core/services/presentation.service';
import { VPTemplate } from '@core/services/presentation.types';
import { CredentialTypePipe } from '@shared/pipes/credential-type.pipe';
import { PresentationCardComponent } from '@shared/presentation-card/presentation-card.component';

@Component({
  selector: 'app-template-details',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, CredentialTypePipe, PresentationCardComponent],
  templateUrl: './template-details.component.html',
  styleUrl: './template-details.component.scss',
})
export class TemplateDetailsComponent implements OnInit {
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _presentationService = inject(PresentationService);
  private _credentialService = inject(CredentialService);
  private _didService = inject(DidService);
  private _headerService = inject(HeaderService);

  template = signal<VPTemplate | null>(null);
  credentials = signal<StoredCredential[]>([]);
  persona = signal<StoredDID | null>(null);

  ngOnInit(): void {
    this._loadTemplate();
    this._setupHeader();
  }

  private _setupHeader(): void {
    this._headerService.setHeader({
      title: 'Presentation',
      showBackButton: true,
      backButtonHandler: () => this._goBack(),
    });
  }

  private _loadTemplate(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (!id) {
      this._router.navigate(['/presentations']);
      return;
    }

    const template = this._presentationService.getTemplateById(id);
    if (!template) {
      this._router.navigate(['/presentations']);
      return;
    }

    this.template.set(template);
    this._loadCredentials(template);
  }

  private _loadCredentials(template: VPTemplate): void {
    const credentials = template.credentialIds
      .map((id) => this._credentialService.getCredentialById(id))
      .filter((cred): cred is StoredCredential => cred !== null);

    this.credentials.set(credentials);

    const subjectDID = credentials[0]?.credential.credentialSubject.id;
    const persona = subjectDID ? this._didService.getStoredDID(subjectDID) : null;
    this.persona.set(persona);
  }

  private _goBack(): void {
    this._router.navigate(['/presentations']);
  }

  getCredentialType(credential: StoredCredential): string {
    const { type } = credential.credential;
    return type.find((t) => t !== 'VerifiableCredential') || type[0];
  }

  getSelectiveFields(credentialId: string): string[] {
    return this.template()?.selectiveFields[credentialId] || [];
  }

  sharePresentation(): void {
    alert('VP sharing functionality will be implemented');
  }

  deleteTemplate(): void {
    const template = this.template();
    if (!template) {
      return;
    }

    if (confirm(`Delete template "${template.name}"?`)) {
      this._presentationService.deleteTemplate(template.id);
      this._router.navigate(['/presentations']);
    }
  }
}
