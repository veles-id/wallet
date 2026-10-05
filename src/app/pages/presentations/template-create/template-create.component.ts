import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { CredentialService } from '@core/services/credential.service';
import { StoredCredential } from '@core/services/credential.types';
import { DidService } from '@core/services/did.service';
import { StoredDID } from '@core/services/did.types';
import { HeaderService } from '@core/services/header.service';
import { PresentationService } from '@core/services/presentation.service';
import { CredentialTypePipe } from '@shared/pipes/credential-type.pipe';
import { PresentationCardComponent } from '@shared/presentation-card/presentation-card.component';

@Component({
  selector: 'app-template-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    CredentialTypePipe,
    PresentationCardComponent,
  ],
  templateUrl: './template-create.component.html',
  styleUrl: './template-create.component.scss',
})
export class TemplateCreateComponent implements OnInit {
  private _presentationService = inject(PresentationService);
  private _credentialService = inject(CredentialService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _formBuilder = inject(FormBuilder);
  private _headerService = inject(HeaderService);

  availableCredentials = signal<StoredCredential[]>([]);
  expandedCredentials = signal<string[]>([]);
  selectiveFields = signal<Record<string, string[]>>({});

  templateForm: FormGroup = this._formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    defaultValidityMinutes: [5, [Validators.required, Validators.min(1), Validators.max(1440)]],
  });

  previewCredential = computed<StoredCredential | null>(() => {
    const fields = this.selectiveFields();
    const selectedId = Object.keys(fields).find((id) => (fields[id]?.length ?? 0) > 0);
    if (!selectedId) {
      return null;
    }
    return this.availableCredentials().find((c) => c.credential.id === selectedId) ?? null;
  });

  previewPersona = computed<StoredDID | null>(() => {
    const credential = this.previewCredential();
    if (!credential) {
      return null;
    }
    const subjectDID = credential.credential.credentialSubject.id;
    return subjectDID ? this._didService.getStoredDID(subjectDID) : null;
  });

  ngOnInit(): void {
    this._headerService.setHeader({
      title: 'New presentation',
      showBackButton: true,
    });
    this.availableCredentials.set(this._credentialService.getStoredCredentials());
  }

  isCredentialExpanded(credentialId: string): boolean {
    return this.expandedCredentials().includes(credentialId);
  }

  isCredentialSelected(credentialId: string): boolean {
    return (this.selectiveFields()[credentialId]?.length ?? 0) > 0;
  }

  toggleCredentialExpanded(credentialId: string): void {
    const current = this.expandedCredentials();
    if (current.includes(credentialId)) {
      this.expandedCredentials.set(current.filter((id) => id !== credentialId));
    } else {
      this.expandedCredentials.set([...current, credentialId]);
    }
  }

  getCredentialFields(credential: StoredCredential): string[] {
    return Object.keys(credential.credential.credentialSubject).filter((key) => key !== 'id');
  }

  isFieldSelected(credentialId: string, field: string): boolean {
    return this.selectiveFields()[credentialId]?.includes(field) ?? false;
  }

  onFieldSelected(credentialId: string, field: string, selected: boolean): void {
    const fields = { ...this.selectiveFields() };
    if (!fields[credentialId]) {
      fields[credentialId] = [];
    }
    if (selected) {
      fields[credentialId] = [...fields[credentialId], field];
    } else {
      fields[credentialId] = fields[credentialId].filter((f) => f !== field);
      if (fields[credentialId].length === 0) {
        delete fields[credentialId];
      }
    }
    this.selectiveFields.set(fields);
  }

  getCredentialType(credential: StoredCredential): string {
    const { type } = credential.credential;
    return type.find((t) => t !== 'VerifiableCredential') || type[0];
  }

  canSavePresentation(): boolean {
    const fields = this.selectiveFields();
    const hasCredentials = Object.values(fields).some((f) => f.length > 0);
    return this.templateForm.valid && hasCredentials;
  }

  savePresentation(): void {
    if (!this.canSavePresentation()) {
      return;
    }
    const { name, description, defaultValidityMinutes } = this.templateForm.value;
    const fields = this.selectiveFields();
    const credentialIds = Object.keys(fields).filter((id) => fields[id]?.length > 0);

    this._presentationService.createTemplate({
      name,
      description: description || undefined,
      credentialIds,
      selectiveFields: fields,
      defaultValidityMinutes,
    });
    this._router.navigate(['/presentations']);
  }
}
