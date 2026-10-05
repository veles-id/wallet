---
name: Implement Encryption for VCs and DIDs with IPFS
overview: ""
todos:
  - id: 85653261-a8a4-4ceb-9f4b-c0c76819c1ba
    content: Install Pinata SDK and encryption libraries (pinata, @noble/ciphers)
    status: completed
  - id: e2d17d1a-2049-4347-9a01-78bb63a7b79f
    content: Create encryption.service.ts with NIP-04 encrypt/decrypt methods
    status: completed
  - id: a50847ed-9ad4-4f68-9646-424bd011971b
    content: Write comprehensive Jest unit tests for encryption.service.ts
    status: completed
  - id: f7284193-528d-4fb4-933b-8ca5313b263f
    content: Create ipfs.service.ts with Pinata SDK integration for upload/retrieve
    status: completed
  - id: 8ac1a758-1507-489d-9e9e-1405dfe0966d
    content: Update credential.types.ts and did.types.ts with IPFS CID fields
    status: completed
  - id: a8e12e18-c82a-4d28-9c71-bc3df51ee0ee
    content: Implement createAndStoreEncryptedVC in credential.service.ts
    status: completed
  - id: 5981efa9-e42b-41e3-8e28-c5783ca1b9b7
    content: Add publishVCPointerToNostr method to credential.service.ts
    status: completed
  - id: 57d37212-f840-44a1-a97e-b0c38180577d
    content: Create RelayService for shared Nostr relay operations
    status: completed
  - id: 642829e3-27b2-4390-93a1-ae17c55cb510
    content: Create nostr-messaging.service.ts for NIP-04 DM sharing of VCs
    status: completed
  - id: 886ea319-9a2a-4241-9025-1041cdbd0dfd
    content: Update credential-verification.service.ts to handle encrypted VCs
    status: completed
  - id: 7beee49e-0c02-4f6f-90b7-611670a2b3c4
    content: Write Jest unit tests for credential.service.ts core business logic
    status: completed
  - id: 44a03f52-aa09-4ecd-b939-16a2cc1aefd7
    content: Create did-splitter.service.ts to split DID into public/extended parts
    status: completed
  - id: fac32541-b06c-470f-af66-c43a93a5976d
    content: Modify publishDID in did-nostr.service.ts for hybrid encryption approach
    status: completed
  - id: 85c13ba6-bd31-43e9-8b48-be87f4b05924
    content: Modify retrieveDIDInfo in did-nostr.service.ts to handle extended data from IPFS
    status: completed
  - id: a559d2b8-921f-477a-86a9-29069a42a2c2
    content: Add shareExtendedDIDData method to nostr-messaging.service.ts
    status: completed
  - id: 6ee4f91f-09f2-4798-abbb-e78464847752
    content: Setup environment variables for Pinata credentials
    status: completed
  - id: 47b418a3-61df-4962-a6e0-5c0dde6e48c0
    content: Test complete VC and DID encryption flows manually
    status: completed
---

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

**Update:** `src/app/core/services/credential.service.ts`Add method `createAndStoreEncryptedVC()`:

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

**Update:** `src/app/core/services/credential.service.ts`Add method `publishVCPointerToNostr()`:

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

**Update:** `src/app/core/services/credential-verification.service.ts`Add method `verifyEncryptedVC()`:

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

**New file:** `src/app/core/services/did-splitter.service.ts`Methods:

- `splitDIDDocument(fullDoc: DIDDocument): { public: PublicDIDDoc, extended: ExtendedDIDData }`
- Public: `@context`, `id`, `verificationMethod`, `authentication`, `assertionMethod`
- Extended: `service`, `alsoKnownAs`, `metadata`, custom fields

### 3.2 Update DID Nostr Service

**Update:** `src/app/core/services/did-nostr.service.ts`Modify `publishDID()`:

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

**Update:** `src/app/core/services/did-nostr.service.ts`Modify `retrieveDIDInfo()`:

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

**Update:** `src/app/core/services/nostr-messaging.service.ts`Add method `shareExtendedDIDData()`:

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

```javascript
environment: {
    pinata: {
        jwt: your_jwt_here, 
        gateway: your-gateway.mypinata.cloud
        }
    }
```

Update `src/app/core/services/ipfs.service.ts` to read from environment.

### 4.2 Manual Testing Flows

Test these workflows in the app:**VC Flow:**

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