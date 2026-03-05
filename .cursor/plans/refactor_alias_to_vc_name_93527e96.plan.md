---
name: Refactor Alias to VC Name
overview: Move credential display name from StoredCredential wrapper into VerifiableCredential as a portable, immutable 'name' property following W3C VC guidelines.
todos:
  - id: types
    content: Update credential.types.ts with name property
    status: completed
  - id: creation
    content: Update credential creation logic in credential.service.ts
    status: completed
    dependencies:
      - types
  - id: display
    content: Update display logic in components to read from credential.name
    status: completed
    dependencies:
      - types
  - id: forms
    content: Update creation form to use 'name' field
    status: completed
    dependencies:
      - types
  - id: tests
    content: Update all tests to use credential.name
    status: completed
    dependencies:
      - creation
      - display
      - forms
isProject: false
---

# Refactor Credential Alias to VC Name

## Overview

Move credential display name from the local `StoredCredential.alias` into the portable `VerifiableCredential.name` property. This makes names portable across wallets and follows W3C VC best practices. The name becomes an immutable part of the signed credential set by the issuer at creation time.

## Phase 1: Type Definitions

### Update `[src/app/core/services/credential.types.ts](src/app/core/services/credential.types.ts)`

Add optional `name` property to `VerifiableCredential` interface:

```typescript
export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | CredentialIssuer;
  issuanceDate: string;
  expirationDate?: string;
  name?: string;  // Add this - W3C optional property
  credentialSubject: CredentialSubject;
  proof?: CredentialProof;
  credentialStatus?: CredentialStatus;
}
```

Update `CreateCredentialRequest` to use `name` instead of `alias`:

```typescript
export interface CreateCredentialRequest {
  templateId?: string;
  issuerDID: string;
  subjectDID: string;
  credentialData: Record<string, any>;
  expirationDate?: string;
  name: string;  // Rename from 'alias'
  tags?: string[];
  category?: CredentialCategory;
  privacy?: CredentialPrivacy;
}
```

Remove `alias` from `StoredCredential` entirely:

```typescript
export interface StoredCredential {
  credential: VerifiableCredential;
  createdAt: string;
  tags?: string[];
  isVerified?: boolean;
  metadata?: CredentialMetadata;
}
```

## Phase 2: Credential Creation Logic

### Update `[src/app/core/services/credential.service.ts](src/app/core/services/credential.service.ts)`

**In `createCredential()` method (lines 41-119):**

- Set `credential.name = request.name` before signing
- Remove `alias` from `StoredCredential` wrapper

```typescript
const credential: VerifiableCredential = {
  '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/ns/credentials/examples/v1'],
  id: credentialId,
  type: ['VerifiableCredential'],
  issuer: request.issuerDID,
  issuanceDate,
  name: request.name,  // Add this
  ...(request.expirationDate && {
    expirationDate: request.expirationDate,
  }),
  credentialSubject: {
    id: request.subjectDID,
    ...request.credentialData,
  },
};
```

Update `StoredCredential` construction:

```typescript
const storedCredential: StoredCredential = {
  credential,
  createdAt: new Date().toISOString(),
  // Remove: alias: request.alias,
  tags: request.tags || [],
  isVerified: false,
  metadata: { /* ... */ },
};
```

**In `createAndStoreEncryptedVC()` method (lines 121-225):**Apply same changes - add `credential.name`, remove wrapper `alias`.**In `importCredential()` method (lines 312-341):**

- Use `credential.name` if present, otherwise prompt for name
- Remove fallback to 'Imported Credential'

```typescript
const storedCredential: StoredCredential = {
  credential,
  createdAt: new Date().toISOString(),
  // Remove: alias: alias || 'Imported Credential',
  tags: ['imported'],
  isVerified: false,
  metadata: { /* ... */ },
};
```

**Remove `updateCredentialAlias()` method (lines 289-300):**Names are immutable as part of signed credential - cannot be updated.

## Phase 3: Display Logic Updates

### Update `[src/app/pages/credentials/credential-card/credential-card.component.ts](src/app/pages/credentials/credential-card/credential-card.component.ts)`

Modify `getCredentialDisplayName()` method (lines 102-105):

```typescript
getCredentialDisplayName(): string {
  return this.credential().credential.name || this.getCredentialType();
}
```

### Update `[src/app/pages/credentials/credentials.component.ts](src/app/pages/credentials/credentials.component.ts)`

Update delete confirmation (line 72):

```typescript
const displayName = credential.credential.name || 'this credential';
if (confirm(`Are you sure you want to delete "${displayName}"?`)) {
  // ...
}
```

### Update Credential Details Component

Review `[src/app/pages/credentials/credential-details/credential-details.component.ts](src/app/pages/credentials/credential-details/credential-details.component.ts)` and update any display methods that reference `alias` to use `credential.name` directly.

## Phase 4: Form Updates

### Update `[src/app/pages/credentials/credential-create/credential-create.component.ts](src/app/pages/credentials/credential-create/credential-create.component.ts)`

**Update form definition (line 79):**

```typescript
credentialForm: FormGroup = this._formBuilder.group({
  name: ['', [Validators.required, Validators.maxLength(100)]],  // Rename from 'alias'
  category: [CredentialCategory.OTHER, Validators.required],
  privacy: [CredentialPrivacy.PRIVATE, Validators.required],
  expirationDate: [''],
  tags: [''],
});
```

**Update request construction (lines 120-130):**

```typescript
const request: CreateCredentialRequest = {
  templateId: this.selectedTemplate()?.id,
  issuerDID: issuerValues.issuerDID,
  subjectDID: issuerValues.subjectDID,
  credentialData: dynamicValues,
  expirationDate: credentialValues.expirationDate || undefined,
  name: credentialValues.name,  // Rename from 'alias'
  tags: this.getTagsArray(),
  category: credentialValues.category,
  privacy: credentialValues.privacy,
};
```

### Update `[src/app/pages/credentials/credential-create/credential-create.component.html](src/app/pages/credentials/credential-create/credential-create.component.html)`

Update form field (lines 245-255):

```html
<mat-form-field class="credential-create__field">
  <mat-label>Credential Name</mat-label>
  <input
    matInput
    formControlName="name"
    placeholder="Bachelor of Science in Computer Science" />
  <mat-hint>This name will be part of the signed credential (immutable)</mat-hint>
  @if (credentialForm.get('name')?.hasError('required')) {
    <mat-error>Credential name is required</mat-error>
  }
</mat-form-field>
```

## Phase 5: Test Updates

### Update `[src/app/core/services/credential.service.spec.ts](src/app/core/services/credential.service.spec.ts)`

1. Update test credential construction to include `name` in VC
2. Update `CreateCredentialRequest` test objects to use `name` instead of `alias`
3. Remove tests for `updateCredentialAlias()` method
4. Update assertions checking for display names to read from `credential.name`

Example changes around lines 213-300:

```typescript
const baseRequest: CreateCredentialRequest = {
  issuerDID: 'did:example:issuer',
  subjectDID: 'did:example:subject',
  credentialData: { degree: 'Bachelor' },
  name: 'My Test Credential',  // Rename from alias
};
```

Update assertions:

```typescript
expect(result.credential.name).toBe('My Test Credential');
// Remove: expect(result.alias).toBe('...');
```

### Update Component Tests

Search for `alias` references in component test files and update to use `credential.name` directly.

## Phase 6: Documentation

### Update `[README.md](README.md)`

Add note about credential naming in the portability section explaining that names are part of the signed credential and portable across wallets.

## Summary of Changes

- Type definitions: Add `name` to `VerifiableCredential`, rename in `CreateCredentialRequest`, remove `alias` from `StoredCredential`
- Credential service: Set `name` in VC during creation, remove wrapper `alias` entirely
- Import logic: Use `credential.name` from imported VCs directly

