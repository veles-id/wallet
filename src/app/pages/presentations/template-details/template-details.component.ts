import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { CredentialService } from '@core/services/credential.service';
import { StoredCredential } from '@core/services/credential.types';
import { HeaderService } from '@core/services/header.service';
import { PresentationService } from '@core/services/presentation.service';
import { VPTemplate } from '@core/services/presentation.types';

@Component({
  selector: 'app-template-details',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, MatChipsModule],
  templateUrl: './template-details.component.html',
  styleUrl: './template-details.component.scss',
})
export class TemplateDetailsComponent implements OnInit {
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _presentationService = inject(PresentationService);
  private _credentialService = inject(CredentialService);
  private _headerService = inject(HeaderService);

  template = signal<VPTemplate | null>(null);
  credentials = signal<StoredCredential[]>([]);
  hasTemplate = computed(() => this.template() !== null);

  ngOnInit(): void {
    this._loadTemplate();
    this._setupHeader();
  }

  private _setupHeader(): void {
    this._headerService.setHeader({
      title: this.template()?.name || 'Template Details',
      showBackButton: true,
      backButtonHandler: () => this.goBack(),
    });
  }

  private _loadTemplate(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    const template = this._presentationService.getTemplateById(id);
    if (template) {
      this.template.set(template);
      this._loadCredentials(template);
    }
  }

  private _loadCredentials(template: VPTemplate): void {
    const credentials = template.credentialIds
      .map((id) => this._credentialService.getCredentialById(id))
      .filter((cred): cred is StoredCredential => cred !== null);

    this.credentials.set(credentials);
  }

  getCredentialFields(credentialId: string): string[] {
    const template = this.template();
    if (!template) {
      return [];
    }
    return template.selectiveFields[credentialId] || [];
  }

  sharePresentation(): void {
    alert('VP sharing functionality will be implemented');
  }

  editTemplate(): void {
    alert('Template editing will be implemented in a future update');
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

  goBack(): void {
    this._router.navigate(['/presentations']);
  }
}
