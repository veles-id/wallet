<!-- c214d3ce-3cbf-41c6-aa74-243f3d7c2988 1bd92b77-2f46-4a23-b5d6-248f037efc90 -->
# Implement Verifiable Presentations with BBS+ Selective Disclosure

## Overview

Replace raw VC sharing with W3C-compliant Verifiable Presentations using BBS+ signatures for field-level selective disclosure. Store VP templates and share history in localStorage (plaintext for testing) and encrypted on IPFS. Build VPs on-demand with challenge binding and time limits.

## Phase 1: Infrastructure Setup

### 1.1 Install BBS+ Dependencies

```bash
npm install @zkp-ld/bbs-signatures
npm install opentimestamps
```

Note: Use `@zkp-ld/bbs-signatures` as it's W3C compliant and TypeScript-friendly.

### 1.2 Create VP Type Definitions

**New file:** `src/app/core/services/presentation.types.ts`

Define comprehensive types:

```typescript
export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  verifiableCredential: VerifiableCredential[];
  holder: string;
  validFrom?: string;
  validUntil?: string;
  proof: PresentationProof;
}

export interface PresentationProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  challenge?: string;
  domain?: string;
  proofValue: string;
}

export interface VPTemplate {
  id: string;
  name: string;
  description?: string;
  credentialIds: string[];
  selectiveFields: Record<string, string[]>;
  defaultValidityMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface VPShareRecord {
  id: string;
  templateId?: string;
  timestamp: string;
  recipientDID?: string;
  recipientPubkey: string;
  credentialIds: string[];
  fieldsDisclosed: Record<string, string[]>;
  purpose?: string;
  challenge?: string;
  domain?: string;
  validUntil?: string;
  nostrEventId?: string;
}

export interface VerificationRequest {
  challenge: string;
  domain?: string;
  expiresAt: string;
  requiredFields?: string[];
  purpose?: string;
}

export interface CreateVPRequest {
  templateId?: string;
  credentialIds: string[];
  selectiveFields: Record<string, string[]>;
  holderDID: string;
  challenge: string;
  domain?: string;
  validityMinutes?: number;
}
```

### 1.3 Update Credential Types for BBS+

**Update:** `src/app/core/services/credential.types.ts`

Add BBS+ proof types and OTS metadata:

```typescript
export interface CredentialProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws?: string;
  proofValue?: string;
  // BBS+ specific
  nonce?: string;
}

export interface CredentialMetadata {
  // ... existing fields
  signatureType?: 'BbsBlsSignature2020';
  otsProof?: string;
  otsTimestamp?: number;
  bbsPublicKey?: string;
}
```

## Phase 2: BBS+ VC Issuance

### 2.1 Create BBS+ Signing Service

**New file:** `src/app/core/services/bbs-signature.service.ts`

Implement BBS+ key generation and signing:

```typescript
@Injectable({ providedIn: 'root' })
export class BbsSignatureService {
  async generateBbsKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
    // Use @mattrglobal/bls12381-key-pair
   // Use @zkp-ld/bbs-signatures
  }

  async signCredential(
    credential: VerifiableCredential,
    secretKey: Uint8Array
  ): Promise<CredentialProof> {
    // Create canonical representation
    // Sign with BBS+
    // Return BbsBlsSignature2020 proof
  }

  async verifyBbsSignature(
    credential: VerifiableCredential,
    publicKey: Uint8Array
  ): Promise<boolean> {
    // Verify BBS+ signature
  }

  async createSelectiveDisclosureProof(
    credential: VerifiableCredential,
    fieldsToReveal: string[],
    nonce: string
  ): Promise<VerifiableCredential> {
    // Create derived credential with only selected fields
    // Uses BBS+ proof generation
  }
}
```

### 2.2 Update Credential Service for BBS+

**Update:** `src/app/core/services/credential.service.ts`

Modify `createCredential()` to use BBS+ signatures:

```typescript
async createCredential(request: CreateCredentialRequest): Promise<StoredCredential> {
  // 1. Create base VC structure (existing logic)
  
  // 2. Get or generate BBS+ keys for issuer DID
  const issuerDID = this._didService.getStoredDID(request.issuerDID);
  if (!issuerDID.bbsSecretKey) {
    // Generate and store BBS+ keys
    const bbsKeys = await this._bbsService.generateBbsKeyPair();
    issuerDID.bbsSecretKey = this._bytesToHex(bbsKeys.secretKey);
    issuerDID.bbsPublicKey = this._bytesToHex(bbsKeys.publicKey);
    this._didService.updateDID(issuerDID);
  }

  // 3. Sign with BBS+
  const proof = await this._bbsService.signCredential(
    credential,
    this._hexToBytes(issuerDID.bbsSecretKey)
  );
  credential.proof = proof;

  // 4. Generate OpenTimestamps proof
  const vcHash = this._hashVC(credential);
  const otsProof = await this._timestampService.createTimestamp(vcHash);

  // 5. Store with metadata
  const storedCredential: StoredCredential = {
    credential,
    // ... existing fields
    metadata: {
      // ... existing metadata
      signatureType: 'BbsBlsSignature2020',
      otsProof: otsProof,
      bbsPublicKey: issuerDID.bbsPublicKey,
    },
  };

  // 6. Store locally (plaintext) and on IPFS (encrypted)
  this._storeCredential(storedCredential);
  
  return storedCredential;
}
```

### 2.3 Create OpenTimestamps Service

**New file:** `src/app/core/services/opentimestamps.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class OpentimestampsService {
  async createTimestamp(dataHash: string): Promise<string> {
    // Submit hash to OpenTimestamps
    // Return .ots proof as base64
  }

  async verifyTimestamp(otsProof: string, dataHash: string): Promise<number | null> {
    // Verify OTS proof
    // Return Bitcoin block timestamp if valid
  }
}
```

### 2.4 Update DID Types for BBS+ Keys

**Update:** `src/app/core/services/did.types.ts`

```typescript
export interface StoredDID {
  // ... existing fields
  bbsSecretKey?: string;
  bbsPublicKey?: string;
}
```

## Phase 3: VP Templates & Building

### 3.1 Create Presentation Service

**New file:** `src/app/core/services/presentation.service.ts`

Core VP operations:

```typescript
@Injectable({ providedIn: 'root' })
export class PresentationService {
  private readonly TEMPLATES_KEY = 'veles_vp_templates';
  private readonly HISTORY_KEY = 'veles_vp_history';

  // Template Management
  createTemplate(template: Omit<VPTemplate, 'id' | 'createdAt' | 'updatedAt'>): VPTemplate {
    const newTemplate: VPTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const templates = this.getTemplates();
    templates.push(newTemplate);
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
    
    return newTemplate;
  }

  getTemplates(): VPTemplate[] {
    const stored = localStorage.getItem(this.TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  updateTemplate(id: string, updates: Partial<VPTemplate>): VPTemplate | null {
    // Update template logic
  }

  deleteTemplate(id: string): boolean {
    // Delete template logic
  }

  // VP Building
  async buildPresentation(request: CreateVPRequest): Promise<VerifiablePresentation> {
    // 1. Fetch credentials
    const credentials = request.credentialIds
      .map(id => this._credentialService.getCredentialById(id))
      .filter(c => c !== null)
      .map(stored => stored!.credential);

    // 2. Apply selective disclosure using BBS+
    const disclosedCredentials = await Promise.all(
      credentials.map(async (vc, index) => {
        const vcId = request.credentialIds[index];
        const fieldsToReveal = request.selectiveFields[vcId] || [];
        
        if (fieldsToReveal.length > 0) {
          // Create selective disclosure proof
          return await this._bbsService.createSelectiveDisclosureProof(
            vc,
            fieldsToReveal,
            request.challenge
          );
        }
        return vc;
      })
    );

    // 3. Build VP structure
    const now = new Date();
    const validUntil = new Date(now.getTime() + (request.validityMinutes || 5) * 60000);

    const vp: VerifiablePresentation = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/bbs/v1'
      ],
      type: ['VerifiablePresentation'],
      verifiableCredential: disclosedCredentials,
      holder: request.holderDID,
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
    };

    // 4. Sign VP with holder's key
    const holderDID = this._didService.getStoredDID(request.holderDID);
    const proof = await this._signPresentation(vp, holderDID, request.challenge, request.domain);
    vp.proof = proof;

    return vp;
  }

  private async _signPresentation(
    vp: VerifiablePresentation,
    holderDID: StoredDID,
    challenge?: string,
    domain?: string
  ): Promise<PresentationProof> {
    // Create canonical VP (without proof)
    const vpCopy = { ...vp };
    delete vpCopy.proof;

    // Sign with holder's Ed25519 key (for VP signature, not VC)
    const signingInput = new TextEncoder().encode(JSON.stringify(vpCopy));
    const signature = await this._signWithEd25519(signingInput, holderDID.nostrPrivateKey);

    return {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${holderDID.did}#key-1`,
      proofPurpose: 'authentication',
      challenge,
      domain,
      proofValue: this._bytesToBase64(signature),
    };
  }

  // Share History
  recordShare(record: Omit<VPShareRecord, 'id'>): VPShareRecord {
    const newRecord: VPShareRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    
    const history = this.getShareHistory();
    history.push(newRecord);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    
    return newRecord;
  }

  getShareHistory(): VPShareRecord[] {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}
```

### 3.2 Create VP Verification Service

**New file:** `src/app/core/services/presentation-verification.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class PresentationVerificationService {
  async verifyPresentation(vp: VerifiablePresentation): Promise<VerificationResult> {
    // 1. Validate VP structure
    // 2. Check validUntil (time-limited)
    // 3. Verify holder's signature on VP
    // 4. Verify each VC in the presentation (BBS+ proofs)
    // 5. Check revocation status
    // 6. Verify OTS timestamps
  }

  private _validateTimeConstraints(vp: VerifiablePresentation): boolean {
    const now = new Date();
    
    if (vp.validFrom && new Date(vp.validFrom) > now) {
      return false; // Not yet valid
    }
    
    if (vp.validUntil && new Date(vp.validUntil) < now) {
      return false; // Expired
    }
    
    return true;
  }
}
```

## Phase 4: Presentations Page UI

### 4.1 Update App Routes

**Update:** `src/app/app.routes.ts`

Replace the unused "Link" route:

```typescript
{
  path: 'presentations',
  loadComponent: () =>
    import('./pages/presentations/presentations.component').then(m => m.PresentationsComponent),
  canActivate: [authGuard],
},
{
  path: 'presentations/create-template',
  loadComponent: () =>
    import('./pages/presentations/template-create/template-create.component').then(
      m => m.TemplateCreateComponent
    ),
  canActivate: [authGuard],
},
{
  path: 'presentations/template/:id',
  loadComponent: () =>
    import('./pages/presentations/template-details/template-details.component').then(
      m => m.TemplateDetailsComponent
    ),
  canActivate: [authGuard],
},
```

### 4.2 Create Presentations Page Component

**New file:** `src/app/pages/presentations/presentations.component.ts`

Main presentations page with tabs:

```typescript
@Component({
  selector: 'app-presentations',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './presentations.component.html',
  styleUrl: './presentations.component.scss',
})
export class PresentationsComponent implements OnInit {
  private _presentationService = inject(PresentationService);
  private _router = inject(Router);
  private _headerService = inject(HeaderService);

  templates = signal<VPTemplate[]>([]);
  shareHistory = signal<VPShareRecord[]>([]);
  selectedTab = signal(0);

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

  createTemplate(): void {
    this._router.navigate(['/presentations/create-template']);
  }

  viewTemplate(template: VPTemplate): void {
    this._router.navigate(['/presentations/template', template.id]);
  }

  deleteTemplate(template: VPTemplate): void {
    if (confirm(`Delete template "${template.name}"?`)) {
      this._presentationService.deleteTemplate(template.id);
      this._loadData();
    }
  }
}
```

**New file:** `src/app/pages/presentations/presentations.component.html`

```html
<div class="presentations">
  <mat-tab-group [(selectedIndex)]="selectedTab">
    <!-- Templates Tab -->
    <mat-tab label="Templates">
      <div class="presentations__templates">
        @if (templates().length === 0) {
          <div class="presentations__empty">
            <mat-icon>description</mat-icon>
            <p>No presentation templates yet</p>
            <button mat-raised-button color="primary" (click)="createTemplate()">
              Create Template
            </button>
          </div>
        } @else {
          <button mat-fab class="presentations__fab" (click)="createTemplate()">
            <mat-icon>add</mat-icon>
          </button>

          @for (template of templates(); track template.id) {
            <mat-card class="template-card" (click)="viewTemplate(template)">
              <mat-card-header>
                <mat-card-title>{{ template.name }}</mat-card-title>
                <mat-card-subtitle>
                  {{ template.credentialIds.length }} credential(s)
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>{{ template.description }}</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-button (click)="deleteTemplate(template); $event.stopPropagation()">
                  Delete
                </button>
              </mat-card-actions>
            </mat-card>
          }
        }
      </div>
    </mat-tab>

    <!-- Share History Tab -->
    <mat-tab label="History">
      <div class="presentations__history">
        @if (shareHistory().length === 0) {
          <div class="presentations__empty">
            <mat-icon>history</mat-icon>
            <p>No presentations shared yet</p>
          </div>
        } @else {
          @for (record of shareHistory(); track record.id) {
            <mat-card class="history-card">
              <mat-card-header>
                <mat-card-title>
                  {{ record.purpose || 'Presentation Shared' }}
                </mat-card-title>
                <mat-card-subtitle>
                  {{ record.timestamp | date:'medium' }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p><strong>To:</strong> {{ record.recipientDID || record.recipientPubkey.substring(0, 16) }}...</p>
                <p><strong>Credentials:</strong> {{ record.credentialIds.length }}</p>
                @if (record.validUntil) {
                  <p><strong>Valid until:</strong> {{ record.validUntil | date:'short' }}</p>
                }
              </mat-card-content>
            </mat-card>
          }
        }
      </div>
    </mat-tab>
  </mat-tab-group>
</div>
```

### 4.3 Create Template Creation Component

**New file:** `src/app/pages/presentations/template-create/template-create.component.ts`

Component for creating/editing VP templates:

```typescript
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
  ],
  templateUrl: './template-create.component.html',
  styleUrl: './template-create.component.scss',
})
export class TemplateCreateComponent implements OnInit {
  private _presentationService = inject(PresentationService);
  private _credentialService = inject(CredentialService);
  private _router = inject(Router);

  availableCredentials = signal<StoredCredential[]>([]);
  selectedCredentials = signal<string[]>([]);
  selectiveFields = signal<Record<string, string[]>>({});

  templateForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    defaultValidityMinutes: new FormControl(5, [Validators.required, Validators.min(1)]),
  });

  ngOnInit(): void {
    this.availableCredentials.set(this._credentialService.getStoredCredentials());
  }

  onCredentialSelected(credentialId: string, selected: boolean): void {
    const current = this.selectedCredentials();
    if (selected) {
      this.selectedCredentials.set([...current, credentialId]);
    } else {
      this.selectedCredentials.set(current.filter(id => id !== credentialId));
      const fields = { ...this.selectiveFields() };
      delete fields[credentialId];
      this.selectiveFields.set(fields);
    }
  }

  onFieldSelected(credentialId: string, field: string, selected: boolean): void {
    const fields = { ...this.selectiveFields() };
    if (!fields[credentialId]) {
      fields[credentialId] = [];
    }
    if (selected) {
      fields[credentialId] = [...fields[credentialId], field];
    } else {
      fields[credentialId] = fields[credentialId].filter(f => f !== field);
    }
    this.selectiveFields.set(fields);
  }

  createTemplate(): void {
    if (!this.templateForm.valid) return;

    const template = this._presentationService.createTemplate({
      name: this.templateForm.value.name!,
      description: this.templateForm.value.description || undefined,
      credentialIds: this.selectedCredentials(),
      selectiveFields: this.selectiveFields(),
      defaultValidityMinutes: this.templateForm.value.defaultValidityMinutes!,
    });

    this._router.navigate(['/presentations']);
  }
}
```

### 4.4 Create Template Details Component

**New file:** `src/app/pages/presentations/template-details/template-details.component.ts`

View template and share presentation:

```typescript
@Component({
  selector: 'app-template-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
  ],
  templateUrl: './template-details.component.html',
  styleUrl: './template-details.component.scss',
})
export class TemplateDetailsComponent implements OnInit {
  private _route = inject(ActivatedRoute);
  private _presentationService = inject(PresentationService);
  private _nostrMessagingService = inject(NostrMessagingService);
  private _dialog = inject(MatDialog);

  template = signal<VPTemplate | null>(null);
  isSharing = signal(false);

  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (id) {
      const templates = this._presentationService.getTemplates();
      this.template.set(templates.find(t => t.id === id) || null);
    }
  }

  async sharePresentation(): Promise<void> {
    const dialogRef = this._dialog.open(SharePresentationDialogComponent, {
      data: { template: this.template() },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;

    this.isSharing.set(true);

    try {
      // Build VP with challenge
      const vp = await this._presentationService.buildPresentation({
        templateId: this.template()!.id,
        credentialIds: this.template()!.credentialIds,
        selectiveFields: this.template()!.selectiveFields,
        holderDID: result.holderDID,
        challenge: result.challenge,
        domain: result.domain,
        validityMinutes: this.template()!.defaultValidityMinutes,
      });

      // Share via NIP-04 DM
      const eventId = await this._nostrMessagingService.shareVP(
        vp,
        result.recipientPubkey,
        result.holderKeys
      );

      // Record share
      this._presentationService.recordShare({
        templateId: this.template()!.id,
        timestamp: new Date().toISOString(),
        recipientDID: result.recipientDID,
        recipientPubkey: result.recipientPubkey,
        credentialIds: this.template()!.credentialIds,
        fieldsDisclosed: this.template()!.selectiveFields,
        purpose: result.purpose,
        challenge: result.challenge,
        domain: result.domain,
        validUntil: vp.validUntil,
        nostrEventId: eventId || undefined,
      });

      alert('Presentation shared successfully!');
    } catch (error) {
      console.error('Failed to share presentation:', error);
      alert('Failed to share presentation');
    } finally {
      this.isSharing.set(false);
    }
  }
}
```

### 4.5 Update Nav Footer

**Update:** `src/app/shared/nav-footer/nav-footer.component.ts`

Change "Link" to "Presentations":

```typescript
links = [
  { path: '/personas', icon: 'person', label: 'Personas' },
  { path: '/credentials', icon: 'badge', label: 'Credentials' },
  { path: '/presentations', icon: 'present_to_all', label: 'Presentations' },
];
```

## Phase 5: VP Sharing Flow

### 5.1 Update Nostr Messaging Service

**Update:** `src/app/core/services/nostr-messaging.service.ts`

Add VP sharing method:

```typescript
async shareVP(
  vp: VerifiablePresentation,
  recipientPubkey: string,
  senderKeys: EncryptionKeys
): Promise<string | null> {
  try {
    console.log(`Sharing VP via NIP-04 DM to ${recipientPubkey.substring(0, 16)}...`);

    // Stringify VP
    const vpJson = JSON.stringify(vp);

    // Create DM message
    const dmMessage = this._createVPDMMessage(vpJson, vp);

    // Encrypt for recipient
    const encryptedDM = await this._encryptionService.encryptNIP04(
      dmMessage,
      senderKeys.privateKey,
      recipientPubkey
    );

    // Create and sign DM event
    const event = this._createDMEvent(encryptedDM, senderKeys.publicKey, recipientPubkey);
    const signedEvent = await this._relayService.signEvent(event, senderKeys.privateKey);

    // Publish to relays
    const results = await this._relayService.publishToRelays(signedEvent);
    const successCount = results.filter(r => r.success).length;

    console.log(`VP shared via DM to ${successCount}/${results.length} relays`);

    return signedEvent.id || null;
  } catch (error) {
    console.error('Failed to share VP via DM:', error);
    throw error;
  }
}

private _createVPDMMessage(vpJson: string, vp: VerifiablePresentation): string {
  const message = {
    type: 'verifiable-presentation',
    vpData: vpJson,
    validUntil: vp.validUntil,
    instructions: 'This is a Verifiable Presentation. Verify the holder signature, check validity period, and verify each credential.',
    sharedAt: new Date().toISOString(),
  };

  return JSON.stringify(message);
}
```

### 5.2 Remove Raw VC Sharing

**Update:** `src/app/pages/credentials/credential-details/credential-details.component.ts`

Remove or comment out the raw VC export/share functionality:

```typescript
// Remove exportCredential() method
// Add note that VCs should be shared via Presentations
```

**Update:** `src/app/pages/credentials/credential-details/credential-details.component.html`

Replace export button with "Create Presentation" button:

```html
<button
  mat-flat-button
  color="primary"
  (click)="createPresentationFromCredential()">
  <mat-icon>present_to_all</mat-icon>
  Create Presentation
</button>
```

## Phase 6: Testing

### 6.1 BBS+ Service Tests

**New file:** `src/app/core/services/bbs-signature.service.spec.ts`

```typescript
describe('BbsSignatureService', () => {
  let service: BbsSignatureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BbsSignatureService);
  });

  it('should generate BBS+ key pair', async () => {
    const keys = await service.generateBbsKeyPair();
    expect(keys.publicKey).toBeDefined();
    expect(keys.secretKey).toBeDefined();
  });

  it('should sign credential with BBS+', async () => {
    // Test VC signing
  });

  it('should verify BBS+ signature', async () => {
    // Test signature verification
  });

  it('should create selective disclosure proof', async () => {
    // Test selective disclosure with subset of fields
  });
});
```

### 6.2 Presentation Service Tests

**New file:** `src/app/core/services/presentation.service.spec.ts`

```typescript
describe('PresentationService', () => {
  let service: PresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PresentationService);
    localStorage.clear();
  });

  describe('Template Management', () => {
    it('should create VP template', () => {
      const template = service.createTemplate({
        name: 'Job Application',
        credentialIds: ['cred1', 'cred2'],
        selectiveFields: { cred1: ['degree', 'university'] },
        defaultValidityMinutes: 5,
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Job Application');
    });

    it('should retrieve templates', () => {
      service.createTemplate({
        name: 'Template 1',
        credentialIds: [],
        selectiveFields: {},
        defaultValidityMinutes: 5,
      });

      const templates = service.getTemplates();
      expect(templates.length).toBe(1);
    });

    it('should delete template', () => {
      const template = service.createTemplate({
        name: 'To Delete',
        credentialIds: [],
        selectiveFields: {},
        defaultValidityMinutes: 5,
      });

      const result = service.deleteTemplate(template.id);
      expect(result).toBe(true);
      expect(service.getTemplates().length).toBe(0);
    });
  });

  describe('VP Building', () => {
    it('should build VP with time constraints', async () => {
      // Mock credential service
      // Test VP building with validFrom/validUntil
    });

    it('should include challenge and domain in proof', async () => {
      // Test challenge binding
    });

    it('should apply selective disclosure', async () => {
      // Test that only selected fields are included
    });
  });

  describe('Share History', () => {
    it('should record share', () => {
      const record = service.recordShare({
        timestamp: new Date().toISOString(),
        recipientPubkey: 'pubkey123',
        credentialIds: ['cred1'],
        fieldsDisclosed: { cred1: ['degree'] },
      });

      expect(record.id).toBeDefined();
    });

    it('should retrieve share history', () => {
      service.recordShare({
        timestamp: new Date().toISOString(),
        recipientPubkey: 'pubkey123',
        credentialIds: [],
        fieldsDisclosed: {},
      });

      const history = service.getShareHistory();
      expect(history.length).toBe(1);
    });
  });
});
```

### 6.3 VP Verification Tests

**New file:** `src/app/core/services/presentation-verification.service.spec.ts`

```typescript
describe('PresentationVerificationService', () => {
  let service: PresentationVerificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PresentationVerificationService);
  });

  it('should verify valid VP', async () => {
    // Test successful verification
  });

  it('should reject expired VP', async () => {
    // Test validUntil enforcement
  });

  it('should reject VP with invalid holder signature', async () => {
    // Test signature verification
  });

  it('should verify challenge binding', async () => {
    // Test challenge/domain matching
  });
});
```

## Phase 7: Documentation & Cleanup

### 7.1 Update README

**Update:** `README.md`

Add section on VP usage with examples.

### 7.2 Remove Deprecated Code

Clean up any raw VC sharing code that's been replaced by VP sharing.

---

## Further Steps: Derived Credentials (Future)

After VP implementation is stable, implement derived credentials for enhanced security:

### Phase 8: Derived Credentials (Future Implementation)

**Capabilities to add:**

- Session-specific derived VCs from original VCs
- Verifier-specific derived VCs (can revoke per verifier)
- Time-limited derived VCs (auto-expire)
- Cryptographic binding to original VC (verifiable chain)

**Benefits:**

- Granular revocation (per verifier, not global)
- Enhanced privacy (unique VC per verifier prevents correlation)
- Reduced risk (compromise of one derived VC doesn't affect others)

**Implementation approach:**

- Extend BBS+ service with derivation methods
- Store derivation metadata (originalVCId, derivedForVerifier)
- Update verification to check derivation chain
- Add UI for managing derived VCs

---

## Summary

This plan implements W3C-compliant Verifiable Presentations with BBS+ signatures for selective disclosure, replacing raw VC sharing. Key features:

- BBS+ signatures on VCs for field-level selective disclosure
- VP templates for reusable presentation configurations
- On-demand VP building with challenge binding and time limits
- Share history for audit trails
- OpenTimestamps integration for VC timestamping
- Presentations page UI (templates + history)
- Secure sharing via NIP-04 encrypted DMs
- Comprehensive unit tests

Storage strategy:

- localStorage: Plaintext (testing/debugging)
- IPFS: Encrypted (production-ready validation)
- Memory: Ephemeral VPs (built, sent, discarded)

### To-dos

- [ ] Install BBS+ and OpenTimestamps dependencies
- [ ] Create presentation.types.ts with VP, template, and history types
- [ ] Update credential.types.ts for BBS+ and OTS metadata
- [ ] Create bbs-signature.service.ts for BBS+ operations
- [ ] Create opentimestamps.service.ts for Bitcoin timestamping
- [ ] Update credential.service.ts to use BBS+ signatures
- [ ] Update did.types.ts to include BBS+ keys
- [ ] Create presentation.service.ts for VP templates and building
- [ ] Create presentation-verification.service.ts
- [ ] Update app.routes.ts to add Presentations routes
- [ ] Create presentations.component with templates and history tabs
- [ ] Create template-create.component for VP template creation
- [ ] Create template-details.component for viewing and sharing
- [ ] Update nav-footer to replace Link with Presentations
- [ ] Add shareVP method to nostr-messaging.service.ts
- [ ] Remove raw VC export from credential-details component
- [ ] Write unit tests for bbs-signature.service.ts
- [ ] Write unit tests for presentation.service.ts
- [ ] Write unit tests for presentation-verification.service.ts
- [ ] Update README with VP usage documentation