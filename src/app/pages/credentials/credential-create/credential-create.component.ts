import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatStepperModule } from "@angular/material/stepper";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from "@angular/forms";
import { Router } from "@angular/router";
import { CredentialService } from "../../../core/services/credential.service";
import { DidService } from "../../../core/services/did.service";
import { AuthService } from "../../../core/services/auth.service";
import {
  CredentialTemplate,
  CredentialCategory,
  CredentialPrivacy,
  FieldType,
  CreateCredentialRequest,
} from "../../../core/services/credential.types";
import { StoredDID } from "../../../core/services/did.types";
import { FooterComponent } from "../../../shared/footer/footer.component";
import { HeaderService } from "../../../core/services/header.service";

@Component({
  selector: "app-credential-create",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatStepperModule,
    MatCardModule,
    MatChipsModule,
    ReactiveFormsModule,
    FooterComponent,
  ],
  templateUrl: "./credential-create.component.html",
  styleUrl: "./credential-create.component.scss",
})
export class CredentialCreateComponent implements OnInit {
  private _credentialService = inject(CredentialService);
  private _didService = inject(DidService);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _formBuilder = inject(FormBuilder);
  private _headerService = inject(HeaderService);

  isLoading = signal(false);
  isCreating = signal(false);
  error = signal<string | null>(null);
  availableTemplates = signal<CredentialTemplate[]>([]);
  selectedTemplate = signal<CredentialTemplate | null>(null);
  availableDIDs = signal<StoredDID[]>([]);
  currentUser = computed(() => this._authService.currentUser());
  hasTemplates = computed(() => this.availableTemplates().length > 0);

  FieldType = FieldType;
  CredentialCategory = CredentialCategory;
  CredentialPrivacy = CredentialPrivacy;
  templateForm: FormGroup = this._formBuilder.group({
    templateId: [""],
    useTemplate: [true],
  });
  issuerForm: FormGroup = this._formBuilder.group({
    issuerDID: ["", Validators.required],
    subjectDID: ["", Validators.required],
  });
  credentialForm: FormGroup = this._formBuilder.group({
    alias: ["", [Validators.required, Validators.maxLength(100)]],
    category: [CredentialCategory.OTHER, Validators.required],
    privacy: [CredentialPrivacy.PRIVATE, Validators.required],
    expirationDate: [""],
    tags: [""],
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

  getTagsArray(): string[] {
    const tagsValue = this.credentialForm.get("tags")?.value || "";
    return tagsValue
      .split(",")
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0);
  }

  async createCredential(): Promise<void> {
    if (!this._validateForms()) {
      return;
    }

    try {
      this.isCreating.set(true);
      this.error.set(null);

      const issuerValues = this.issuerForm.value;
      const credentialValues = this.credentialForm.value;
      const dynamicValues = this.dynamicForm.value;

      const request: CreateCredentialRequest = {
        templateId: this.selectedTemplate()?.id,
        issuerDID: issuerValues.issuerDID,
        subjectDID: issuerValues.subjectDID,
        credentialData: dynamicValues,
        expirationDate: credentialValues.expirationDate || undefined,
        alias: credentialValues.alias,
        tags: this.getTagsArray(),
        category: credentialValues.category,
        privacy: credentialValues.privacy,
      };

      const credential = await this._credentialService.createCredential(
        request
      );

      this._router.navigate(["/credentials"]);
    } catch (error) {
      console.error("Error creating credential:", error);
      this.error.set("Failed to create credential. Please try again.");
    } finally {
      this.isCreating.set(false);
    }
  }

  cancel(): void {
    this._router.navigate(["/credentials"]);
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

    if (
      !this.selectedTemplate() &&
      Object.keys(this.dynamicForm.controls).length === 0
    ) {
      this.error.set("Please select a template or provide credential data");
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
      .get("templateId")
      ?.valueChanges.subscribe((templateId) => {
        if (templateId) {
          const template = this.availableTemplates().find(
            (t) => t.id === templateId
          );
          this.selectedTemplate.set(template || null);
          this._buildDynamicForm(template);
        } else {
          this.selectedTemplate.set(null);
          this._clearDynamicForm();
        }
      });

    this.templateForm
      .get("useTemplate")
      ?.valueChanges.subscribe((useTemplate) => {
        if (!useTemplate) {
          this.selectedTemplate.set(null);
          this._clearDynamicForm();
          this.templateForm.patchValue({ templateId: "" });
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
      console.error("Error loading initial data:", error);
      this.error.set("Failed to load required data");
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

      group[field.key] = new FormControl("", validators);
    });

    this.dynamicForm = this._formBuilder.group(group);
  }

  private _setupHeader(): void {
    this._headerService.setHeader({
      title: "Create Credential",
      showBackButton: true,
      backButtonHandler: () => this.cancel(),
    });
  }
}
