import { CdkAccordionModule } from '@angular/cdk/accordion';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { CredentialService } from '@core/services/credential.service';
import { StoredCredential } from '@core/services/credential.types';
import { DidService } from '@core/services/did.service';
import { StoredDID } from '@core/services/did.types';
import { HeaderService } from '@core/services/header.service';
import { PresentationService } from '@core/services/presentation.service';
import { TemplateDisplayData, VPShareRecord, VPTemplate } from '@core/services/presentation.types';
import { AvatarComponent } from '@shared/avatar/avatar.component';
import { AvatarSize } from '@shared/avatar/avatar.types';
import { CredentialTypePipe } from '@shared/pipes/credential-type.pipe';

@Component({
  selector: 'app-presentations',
  standalone: true,
  imports: [
    CdkAccordionModule,
    CredentialTypePipe,
    DatePipe,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    AvatarComponent,
  ],
  templateUrl: './presentations.component.html',
  styleUrl: './presentations.component.scss',
})
export class PresentationsComponent implements OnInit {
  private _presentationService = inject(PresentationService);
  private _credentialService = inject(CredentialService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _headerService = inject(HeaderService);

  AvatarSize = AvatarSize;

  templates = signal<VPTemplate[]>([]);
  shareHistory = signal<VPShareRecord[]>([]);
  selectedTab = signal(0);

  templateDisplayData = computed<TemplateDisplayData[]>(() => {
    const history = this.shareHistory();
    return this.templates().map((template) => {
      const credentials = template.credentialIds
        .map((id) => this._credentialService.getCredentialById(id))
        .filter((c): c is StoredCredential => c !== null);

      const subjectDID = credentials[0]?.credential.credentialSubject.id;
      const persona = subjectDID ? this._didService.getStoredDID(subjectDID) : null;

      const latestShare =
        history
          .filter((r) => r.templateId === template.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;

      return { template, credentials, persona, latestShare };
    });
  });

  ngOnInit(): void {
    this._headerService.setHeader({
      title: 'Presentations',
      showBackButton: false,
    });
    this._loadData();
  }

  private _loadData(): void {
    this.templates.set(this._presentationService.getTemplates());
    this.shareHistory.set(this._presentationService.getShareHistory());
  }

  getPersonaInitials(persona: StoredDID | null): string {
    if (!persona?.alias) {
      return '?';
    }
    return persona.alias
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getCredentialType(credential: StoredCredential): string {
    const { type } = credential.credential;
    return type.find((t) => t !== 'VerifiableCredential') || type[0];
  }

  getFieldValue(credential: StoredCredential, fieldKey: string): string {
    const value = credential.credential.credentialSubject[fieldKey];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  formatExpiration(dateString: string): string {
    const expires = new Date(dateString);
    const today = new Date();
    const isToday =
      expires.getDate() === today.getDate() &&
      expires.getMonth() === today.getMonth() &&
      expires.getFullYear() === today.getFullYear();

    const time = expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return isToday ? `Today at ${time}` : expires.toLocaleString();
  }

  getShareValidity(share: VPShareRecord): string {
    if (!share.validUntil) {
      return '-';
    }
    const start = new Date(share.timestamp).getTime();
    const end = new Date(share.validUntil).getTime();
    const minutes = Math.round((end - start) / 60_000);
    return `${minutes} minutes`;
  }

  createTemplate(): void {
    this._router.navigate(['/presentations/create-template']);
  }

  viewTemplate(template: VPTemplate): void {
    this._router.navigate(['/presentations/template', template.id]);
  }

  deleteTemplate(template: VPTemplate, event: Event): void {
    event.stopPropagation();
    if (confirm(`Delete template "${template.name}"?`)) {
      this._presentationService.deleteTemplate(template.id);
      this._loadData();
    }
  }
}
