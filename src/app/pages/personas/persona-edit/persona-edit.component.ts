import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  viewChild,
  TemplateRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { DidService } from "../../../core/services/did.service";
import { StoredDID, DIDType } from "../../../core/services/did.types";
import { FooterComponent } from "../../../shared/footer/footer.component";
import { ProfileComponent } from "../../../shared/profile/profile.component";
import { AvatarSize } from "../../../shared/avatar/avatar.types";
import { HeaderService } from "../../../core/services/header.service";

interface PersonaFormData {
  alias: string;
  name: string;
  nick: string;
  website: string;
  about: string;
  lightningWallet: string;
  location: string;
}

@Component({
  selector: "app-persona-edit",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    FooterComponent,
    ProfileComponent,
  ],
  templateUrl: "./persona-edit.component.html",
  styleUrl: "./persona-edit.component.scss",
})
export class PersonaEditComponent implements OnInit {
  private _authService = inject(AuthService);
  private _didService = inject(DidService);
  private _router = inject(Router);
  private _route = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private _headerService = inject(HeaderService);
  AvatarSize = AvatarSize;
  isLoading = signal(false);
  isSaving = signal(false);
  error = signal<string | null>(null);
  currentDID = signal<StoredDID | null>(null);
  nostrData = signal<any>(null);
  currentUser = computed(() => this._authService.currentUser());
  profileTemplate = viewChild<TemplateRef<any>>("profileTemplate");
  personaForm: FormGroup = this._formBuilder.group({
    alias: ["", [Validators.maxLength(50)]],
    name: ["", [Validators.maxLength(100)]],
    nick: ["", [Validators.maxLength(50)]],
    website: ["", [Validators.pattern(/^https?:\/\/.*$/)]],
    about: ["", [Validators.maxLength(500)]],
    lightningWallet: ["", [Validators.maxLength(100)]],
    location: ["", [Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    this._loadDIDFromRoute();
    this._setupHeader();
  }

  getFormControl(controlName: string) {
    return this.personaForm.get(controlName);
  }

  private async _loadDIDFromRoute(): Promise<void> {
    try {
      this.isLoading.set(true);
      const didId = this._route.snapshot.paramMap.get("id");

      if (!didId) {
        this._router.navigate(["/personas"]);
        return;
      }

      const storedDIDs = this._didService.getStoredDIDs();
      const did = storedDIDs.find((d) => d.did === didId);

      if (!did) {
        this._router.navigate(["/personas"]);
        return;
      }

      this.currentDID.set(did);

      if (did.didType === DIDType.NOSTR || did.did.startsWith("did:nostr:")) {
        await this._loadNostrData(did.did);
      }

      this._populateFormData(did);
    } catch (error) {
      console.error("Error loading DID from route:", error);
      this.error.set("Failed to load your digital identity");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async _loadNostrData(did: string): Promise<void> {
    try {
      const didInfo = await this._didService.resolveDID(did);
      this.nostrData.set(didInfo);
    } catch (error) {
      console.error("Error loading NOSTR data:", error);
    }
  }

  private _populateFormData(did: StoredDID): void {
    const nostr = this.nostrData();
    const metadata = nostr?.profileMetadata?.metadata;

    this.personaForm.patchValue({
      alias: did.alias || "",
      name: metadata?.name || metadata?.display_name || did.alias || "",
      nick: metadata?.display_name || "",
      website: metadata?.website || "",
      about: metadata?.about || "",
      lightningWallet: metadata?.lud16 || metadata?.lud06 || "",
      location: metadata?.location || "",
    });
  }

  shortDID = computed(() => {
    const did = this.currentDID()?.did || "";
    if (did.length > 30) {
      return `${did.substring(0, 20)}...${did.substring(did.length - 10)}`;
    }
    return did;
  });

  async copyDID(): Promise<void> {
    const did = this.currentDID()?.did;
    if (did) {
      try {
        await navigator.clipboard.writeText(did);
      } catch (error) {
        console.error("Failed to copy DID:", error);
      }
    }
  }

  async save(): Promise<void> {
    if (this.personaForm.invalid) {
      this.personaForm.markAllAsTouched();
      return;
    }

    try {
      this.isSaving.set(true);
      this.error.set(null);

      const currentDID = this.currentDID();
      const formValues = this.personaForm.value as PersonaFormData;

      if (!currentDID) {
        throw new Error("No DID selected");
      }

      if (formValues.alias !== currentDID.alias) {
        this._didService.updateDIDAlias(currentDID.did, formValues.alias);
      }

      if (
        currentDID.didType === DIDType.NOSTR ||
        currentDID.did.startsWith("did:nostr:")
      ) {
        const success = await this._didService.updateNostrProfile(currentDID, {
          name: formValues.name,
          display_name: formValues.nick,
          website: formValues.website,
          about: formValues.about,
          lud16: formValues.lightningWallet,
          location: formValues.location,
        });

        if (!success) {
          throw new Error("Failed to update profile on Nostr relays");
        }
      }

      this._router.navigate(["/personas", currentDID.did]);
    } catch (error) {
      console.error("Error saving persona:", error);
      this.error.set("Failed to save changes");
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    const currentDID = this.currentDID();
    if (currentDID) {
      this._router.navigate(["/personas", currentDID.did]);
    } else {
      this._router.navigate(["/personas"]);
    }
  }

  getPersonaInitials(did: StoredDID): string {
    if (did.alias) {
      return did.alias
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
        .substring(0, 2);
    }
    return did.didType?.charAt(0).toUpperCase() || "D";
  }

  getPersonaName(): string {
    const currentDID = this.currentDID();
    if (currentDID?.alias) {
      return currentDID.alias;
    }
    return "Edit Persona";
  }

  private _setupHeader(): void {
    const template = this.profileTemplate();
    if (template) {
      this._headerService.setHeader({
        showBackButton: true,
        backButtonHandler: () => this.cancel(),
        contentTemplate: template,
        contentContext: { $implicit: this.currentDID() },
      });
    }
  }
}
