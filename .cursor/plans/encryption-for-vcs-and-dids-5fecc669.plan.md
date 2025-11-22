<!-- 5fecc669-7a57-4250-b6d1-60cc459e6d29 2f92790a-2c09-45bd-a7ca-336badea5773 -->
# Implement Encryption for VCs and DIDs with IPFS

## Overview

Add encryption layer to secure VCs and DIDs on public networks (Nostr/IPFS) while maintaining plaintext in local storage for development/debugging. Focus on MVP core flows.

## Phase 1: Infrastructure Setup

### 1.1 Install Dependencies

```bash
npm install pinata @noble/ciphers
```

### 1.2 Create Encryption Service

**New file:** `src/app/core/services/encryption.service.ts`

- Implement NIP-04 encryption/decryption using `@noble/ciphers`
- Methods: `encryptNIP04()`, `decryptNIP04()`, `generateSharedSecret()`
- Use secp256k1 ECDH + AES-256-CBC (NIP-04 spec)

### 1.3 Create IPFS Service

**New file:** `src/app/core/services/ipfs.service.ts`

- Initialize Pinata SDK with shared credentials
- Methods: `uploadEncryptedData()`, `retrieveData()`, `uploadJSON()`
- Store Pinata JWT in environment variables
- Add error handling for network failures

### 1.4 Update Type Definitions

**Update:** `src/app/core/services/credential.types.ts`

```typescript
interface StoredCredential {
  // ... existing fields
  metadata: {
    // ... existing fields
    ipfsCID?: string;
    encryptedOnIPFS?: boolean;
    nostrPointerEventId?: string;
  };
}
```

**Update:** `src/app/core/services/did.types.ts`

```typescript
interface StoredDID {
  // ... existing fields
  extendedDataCID?: string;
  publicDocument?: any;  // Minimal DID doc for public resolution
  extendedDocument?: any; // Private extended data
}
```

## Phase 2: VC Encryption (Simpler - Validate Encryption Flow)

### 2.1 Extend Credential Service

**Update:** `src/app/core/services/credential.service.ts`

Add method `createAndStoreEncryptedVC()`:

```typescript
async createAndStoreEncryptedVC(request: CreateCredentialRequest): Promise<StoredCredential> {
  // 1. Create VC (existing logic)
  // 2. Store plaintext locally (for development)
  // 3. Encrypt VC with holder's keys
  // 4. Upload encrypted VC to IPFS (Pinata)
  // 5. Store IPFS CID in metadata
  // 6. Optionally publish pointer event to Nostr
}
```

### 2.2 Add Nostr Pointer Events

**Update:** `src/app/core/services/credential.service.ts`

Add method `publishVCPointerToNostr()`:

```typescript
async publishVCPointerToNostr(vc: VerifiableCredential, ipfsCID: string, holderDID: StoredDID): Promise<string> {
  // Create kind 1 event with tags:
  // ["vc_hash", sha256(vc)]
  // ["ipfs_cid", ipfsCID]
  // ["p", holder_pubkey]
  // ["subject", subject_did]
}
```

### 2.3 VC Sharing via NIP-04 DMs

**New file:** `src/app/core/services/nostr-messaging.service.ts`

- Method: `shareVCviaDM(vcCID: string, recipientPubkey: string, senderKeys: Keys)`
- Fetch from IPFS → Decrypt with holder key → Re-encrypt for recipient → Send NIP-04 DM
- DM contains: VC data + IPFS CID + verification instructions

### 2.4 VC Verification with Encryption

**Update:** `src/app/core/services/credential-verification.service.ts`

Add method `verifyEncryptedVC()`:

```typescript
async verifyEncryptedVC(encryptedVC: string, decryptionKey: string): Promise<VerificationResult> {
  // 1. Decrypt VC
  // 2. Verify structure
  // 3. Resolve issuer DID
  // 4. Verify cryptographic proof
}
```

## Phase 3: DID Hybrid Encryption (Complex - Public + Private Split)

### 3.1 DID Document Splitter

**New file:** `src/app/core/services/did-splitter.service.ts`

Methods:

- `splitDIDDocument(fullDoc: DIDDocument): { public: PublicDIDDoc, extended: ExtendedDIDData }`
- Public: `@context`, `id`, `verificationMethod`, `authentication`, `assertionMethod`
- Extended: `service`, `alsoKnownAs`, `metadata`, custom fields

### 3.2 Update DID Nostr Service

**Update:** `src/app/core/services/did-nostr.service.ts`

Modify `publishDID()`:

```typescript
async publishDID(storedDID: StoredDID): Promise<boolean> {
  // 1. Split DID into public/extended
  // 2. Encrypt extended data with holder's key
  // 3. Upload encrypted extended to IPFS
  // 4. Create kind 30000 event with:
  //    - content: public DID document (JSON string)
  //    - tags: ["ipfs_cid", cid], ["ext_hash", sha256], ["encryption", "nip04"]
  // 5. Sign and publish to relays
}
```

### 3.3 DID Resolution with Extended Data

**Update:** `src/app/core/services/did-nostr.service.ts`

Modify `retrieveDIDInfo()`:

```typescript
async retrieveDIDInfo(did: string, decryptionKey?: string): Promise<CompleteDIDResolution> {
  // 1. Query Nostr for kind 30000 event
  // 2. Parse public DID doc from event.content
  // 3. Extract IPFS CID from tags
  // 4. If decryptionKey provided: fetch from IPFS, verify hash, decrypt extended data
  // 5. Return combined resolution
}
```

### 3.4 Share Extended DID Data

**Update:** `src/app/core/services/nostr-messaging.service.ts`

Add method `shareExtendedDIDData()`:

```typescript
async shareExtendedDIDData(did: string, verifierPubkey: string, holderKeys: Keys): Promise<void> {
  // 1. Fetch encrypted extended data from IPFS
  // 2. Decrypt with holder key
  // 3. Re-encrypt for verifier
  // 4. Send via NIP-04 DM
}
```

## Phase 4: Environment & Testing

### 4.1 Environment Variables

```
environment: {
    pinata: {
        jwt: your_jwt_here, 
        gateway: your-gateway.mypinata.cloud
        }
    }
```

Update `src/app/core/services/ipfs.service.ts` to read from environment.

### 4.2 Manual Testing Flows

Test these workflows in the app:

**VC Flow:**

1. Create VC → Verify plaintext in localStorage → Verify encrypted on IPFS
2. Check Nostr pointer event published
3. Share VC via DM → Verify recipient can decrypt

**DID Flow:**

1. Create DID → Publish → Verify public doc on Nostr
2. Verify extended data CID in event tags
3. Resolve DID without key (public only) → with key (full resolution)
4. Share extended data via DM

## Key Implementation Notes

- **Local Storage:** Keep plaintext for development (no encryption yet)
- **Error Handling:** Basic try-catch, log errors, show user-friendly messages
- **Edge Cases:** Defer to later (network failures, IPFS unavailability, DM delivery failures)
- **Nostr Event Kinds:** 
  - Kind 30000 for DIDs (parameterized replaceable)
  - Kind 1 for VC pointers (regular event)
  - Kind 4 for NIP-04 encrypted DMs
- **Hash Function:** Use SHA-256 for integrity checks in tags
- **Backward Compatibility:** Not needed, breaking change accepted

### To-dos

- [x] Install Pinata SDK and encryption libraries (pinata, @noble/ciphers)
- [x] Create encryption.service.ts with NIP-04 encrypt/decrypt methods
- [x] Write comprehensive Jest unit tests for encryption.service.ts
- [x] Create ipfs.service.ts with Pinata SDK integration for upload/retrieve
- [x] Update credential.types.ts and did.types.ts with IPFS CID fields
- [x] Implement createAndStoreEncryptedVC in credential.service.ts
- [x] Add publishVCPointerToNostr method to credential.service.ts
- [x] Create RelayService for shared Nostr relay operations
- [x] Create nostr-messaging.service.ts for NIP-04 DM sharing of VCs
- [x] Update credential-verification.service.ts to handle encrypted VCs
- [x] Write Jest unit tests for credential.service.ts core business logic
- [x] Create did-splitter.service.ts to split DID into public/extended parts
- [x] Modify publishDID in did-nostr.service.ts for hybrid encryption approach
- [x] Modify retrieveDIDInfo in did-nostr.service.ts to handle extended data from IPFS
- [x] Add shareExtendedDIDData method to nostr-messaging.service.ts
- [x] Setup environment variables for Pinata credentials
- [x] Test complete VC and DID encryption flows manually