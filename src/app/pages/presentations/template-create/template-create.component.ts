import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { CredentialService } from '@core/services/credential.service';
import { StoredCredential } from '@core/services/credential.types';
import { HeaderService } from '@core/services/header.service';
import { PresentationService } from '@core/services/presentation.service';

@Component({
  selector: 'app-template-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './template-create.component.html',
  styleUrl: './template-create.component.scss',
})
export class TemplateCreateComponent implements OnInit {
  private _presentationService = inject(PresentationService);
  private _credentialService = inject(CredentialService);
  private _router = inject(Router);
  private _formBuilder = inject(FormBuilder);
  private _headerService = inject(HeaderService);

  availableCredentials = signal<StoredCredential[]>([]);
  selectedCredentials = signal<string[]>([]);
  selectiveFields = signal<Record<string, string[]>>({});

  templateForm: FormGroup = this._formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    defaultValidityMinutes: [5, [Validators.required, Validators.min(1), Validators.max(1440)]],
  });

  ngOnInit(): void {
    this._headerService.setHeader({
      title: 'Create Template',
      showBackButton: true,
    });
    this._loadCredentials();
  }

  private _loadCredentials(): void {
    const credentials = this._credentialService.getStoredCredentials();
    this.availableCredentials.set(credentials);
  }

  isCredentialSelected(credentialId: string): boolean {
    return this.selectedCredentials().includes(credentialId);
  }

  onCredentialSelected(credentialId: string, selected: boolean): void {
    const current = this.selectedCredentials();
    if (selected) {
      this.selectedCredentials.set([...current, credentialId]);
    } else {
      this.selectedCredentials.set(current.filter((id) => id !== credentialId));
      const fields = { ...this.selectiveFields() };
      delete fields[credentialId];
      this.selectiveFields.set(fields);
    }
  }

  getCredentialFields(credential: StoredCredential): string[] {
    const fields: string[] = [];
    const subject = credential.credential.credentialSubject;

    Object.keys(subject).forEach((key) => {
      if (key !== 'id') {
        fields.push(key);
      }
    });

    return fields;
  }

  isFieldSelected(credentialId: string, field: string): boolean {
    const fields = this.selectiveFields()[credentialId];
    return fields ? fields.includes(field) : false;
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
    }
    this.selectiveFields.set(fields);
  }

  canCreateTemplate(): boolean {
    return this.templateForm.valid && this.selectedCredentials().length > 0;
  }

  createTemplate(): void {
    if (!this.canCreateTemplate()) {
      return;
    }

    const formValue = this.templateForm.value;
    this._presentationService.createTemplate({
      name: formValue.name,
      description: formValue.description || undefined,
      credentialIds: this.selectedCredentials(),
      selectiveFields: this.selectiveFields(),
      defaultValidityMinutes: formValue.defaultValidityMinutes,
    });

    this._router.navigate(['/presentations']);
  }

  cancel(): void {
    this._router.navigate(['/presentations']);
  }
}
