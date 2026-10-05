import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { CredentialService } from '@core/services/credential.service';
import {
  CreateCredentialRequest,
  CredentialTemplate,
  FieldType,
} from '@core/services/credential.types';
import { DidService } from '@core/services/did.service';
import { StoredDID } from '@core/services/did.types';
import { HeaderService } from '@core/services/header.service';

const BASIC_TEMPLATE_ID = 'basic';

@Component({
  selector: 'app-credential-create',
  standalone: true,
  imports: [
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    ReactiveFormsModule,
  ],
  templateUrl: './credential-create.component.html',
  styleUrl: './credential-create.component.scss',
})
export class CredentialCreateComponent implements OnInit {
  private _credentialService = inject(CredentialService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _formBuilder = inject(FormBuilder);
  private _headerService = inject(HeaderService);
  private _destroyRef = inject(DestroyRef);

  isLoading = signal(false);
  isCreating = signal(false);
  error = signal<string | null>(null);
  availableTemplates = signal<CredentialTemplate[]>([]);
  selectedTemplate = signal<CredentialTemplate | null>(null);
  availableDIDs = signal<StoredDID[]>([]);

  FieldType = FieldType;

  templateForm: FormGroup = this._formBuilder.group({
    templateId: [BASIC_TEMPLATE_ID],
  });
  issuerForm: FormGroup = this._formBuilder.group({
    issuerDID: ['', Validators.required],
    subjectDID: ['', Validators.required],
  });
  credentialForm: FormGroup = this._formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    expirationDate: [''],
  });

  dynamicForm: FormGroup = this._formBuilder.group({});

  ngOnInit(): void {
    this._loadInitialData();
    this._setupFormWatchers();
    this._setupHeader();
  }

  getDIDAlias(did: string): string {
    const storedDID = this.availableDIDs().find((d) => d.did === did);
    return storedDID?.alias || this._shortenDID(did);
  }

  async createCredential(): Promise<void> {
    if (!this._validateForms()) {
      return;
    }

    try {
      this.isCreating.set(true);
      this.error.set(null);

      const { issuerDID, subjectDID } = this.issuerForm.value;
      const { name, expirationDate } = this.credentialForm.value;
      const dynamicValues = this.dynamicForm.value;

      const request: CreateCredentialRequest = {
        templateId: this.selectedTemplate()?.id,
        issuerDID,
        subjectDID,
        credentialData: dynamicValues,
        expirationDate: expirationDate || undefined,
        name,
      };

      await this._credentialService.createCredential(request);
      this._router.navigate(['/credentials']);
    } catch (error) {
      console.error('Error creating credential:', error);
      this.error.set('Failed to create credential. Please try again.');
    } finally {
      this.isCreating.set(false);
    }
  }

  cancel(): void {
    this._router.navigate(['/credentials']);
  }

  getFormControl(formGroup: FormGroup, controlName: string): FormControl {
    return formGroup.get(controlName) as FormControl;
  }

  private _clearDynamicForm(): void {
    this.dynamicForm = this._formBuilder.group({});
  }

  private _validateForms(): boolean {
    let isValid = true;

    if (this.issuerForm.invalid) {
      this.issuerForm.markAllAsTouched();
      isValid = false;
    }

    if (this.credentialForm.invalid) {
      this.credentialForm.markAllAsTouched();
      isValid = false;
    }

    if (this.selectedTemplate() && this.dynamicForm.invalid) {
      this.dynamicForm.markAllAsTouched();
      isValid = false;
    }

    return isValid;
  }

  private _shortenDID(did: string): string {
    if (did.length > 30) {
      return `${did.substring(0, 20)}...${did.substring(did.length - 10)}`;
    }
    return did;
  }

  private _setupFormWatchers(): void {
    this.templateForm
      .get('templateId')
      ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((templateId) => {
        if (templateId && templateId !== BASIC_TEMPLATE_ID) {
          const template = this.availableTemplates().find((t) => t.id === templateId);
          this.selectedTemplate.set(template || null);
          this._buildDynamicForm(template);
        } else {
          this.selectedTemplate.set(null);
          this._clearDynamicForm();
        }
      });
  }

  private async _loadInitialData(): Promise<void> {
    try {
      this.isLoading.set(true);

      const templates = this._credentialService.getAvailableTemplates();
      this.availableTemplates.set(templates);

      const dids = this._didService.getStoredDIDs();
      this.availableDIDs.set(dids);

      if (dids.length > 0) {
        this.issuerForm.patchValue({
          issuerDID: dids[0].did,
          subjectDID: dids[0].did,
        });
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.error.set('Failed to load required data');
    } finally {
      this.isLoading.set(false);
    }
  }

  private _buildDynamicForm(template: CredentialTemplate | undefined): void {
    if (!template) return;

    const group: Record<string, FormControl> = {};

    template.fields.forEach((field) => {
      const validators = [];

      if (field.required) {
        validators.push(Validators.required);
      }

      if (field.validation?.minLength) {
        validators.push(Validators.minLength(field.validation.minLength));
      }

      if (field.validation?.maxLength) {
        validators.push(Validators.maxLength(field.validation.maxLength));
      }

      if (field.validation?.pattern) {
        validators.push(Validators.pattern(field.validation.pattern));
      }

      if (field.type === FieldType.EMAIL) {
        validators.push(Validators.email);
      }

      if (field.type === FieldType.URL) {
        validators.push(Validators.pattern(/^https?:\/\/.+/));
      }

      group[field.key] = new FormControl('', validators);
    });

    this.dynamicForm = this._formBuilder.group(group);
  }

  private _setupHeader(): void {
    this._headerService.setHeader({
      title: 'New credential',
      showBackButton: true,
      backButtonHandler: () => this.cancel(),
    });
  }
}
