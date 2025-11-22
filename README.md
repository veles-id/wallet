# Veles ID Wallet

Veles ID Wallet is an open-source project. In the current phase it is an Angular PWA, that you can add as a shortcut to your desktop both on iOS and Android. The choice of PWA is due to higher degree of censorship-resistance in case of Web applications, as opposed to Native iOS and Android applications, where app stores are the bottlenecks.

Veles ID leverages decentralized technologies:
- [Nostr](https://github.com/nostr-protocol/nostr) for communication
- Bitcoin for [timestamping](https://opentimestamps.org/)
- [IPFS](https://docs.ipfs.tech/) for data storage

## Design System

Available on [Figma](https://www.figma.com/file/g5Kcj73JnT0ImuVBlvqOnp).

## White Paper

Available on [GitHub](https://github.com/veles-id/wallet/blob/master/WHITEPAPER.md). 

## Securely Publishing Verifiable Credentials on Nostr with IPFS: A Decentralized Approach

Self-sovereign identity requires a balance of privacy, control, and accessibility. Combining **Nostr**, a decentralized event protocol, with **IPFS**, a content-addressable storage system, offers a powerful solution for managing VCs with maximum security and user sovereignty. Here’s a high-level strategy, grounded in cryptographic principles and decentralization.

### Core Principles
- **Privacy**: Protect sensitive VC/DID data from unauthorized access.
- **Control**: Empower issuers and holders to manage access and lifecycle (issuance, sharing, revocation).
- **Verifiability**: Enable third parties to verify credentials without compromising security.
- **Resilience**: Ensure availability despite untrusted relays or nodes.
- **Cost-Efficiency**: Minimize costs while maintaining decentralization.

### Approach

1. **Encrypt VCs and DID Extended Data for Confidentiality**  
   Encrypt VCs fully and DID extended data (service endpoints, metadata) using **AES-256** or **NIP-04** (Nostr's ECIES-based encryption) with the holder's public key before storage or sharing. DIDs maintain a minimal public document (verification keys only) for universal resolution while protecting privacy-sensitive data. This ensures only authorized parties can access sensitive information, mitigating privacy risks on untrusted systems like IPFS nodes or Nostr relays.

2. **Store Encrypted Data on IPFS for Persistence**  
   Store encrypted VCs and DID extended data on **IPFS**, a decentralized file system, to ensure persistent availability. Pin files on a self-hosted IPFS node or use low-cost pinning services. The resulting content identifier (CID) guarantees data integrity via SHA-256 hashing. Minimal DID documents are published to Nostr relays for public resolution.

3. **Publish Minimal Events on Nostr for Discoverability**  
   Instead of publishing full data, create minimal **NIP-01** Nostr events:
   
   **For VCs** - Issuers create pointer events containing:
   - The VC's SHA-256 hash.
   - The IPFS CID (linking to the encrypted file).
   - The holder's public key (via a `p` tag).
   - A signature (ECDSA/Schnorr) for authenticity.  
   
   Example (kind 1):
   ```json
   {
     "kind": 1,
     "pubkey": "<issuer-pubkey>",
     "created_at": 1758451200,
     "tags": [["p", "<holder-pubkey>"], ["vc_hash", "<sha256-hash>"], ["ipfs_cid", "<cid>"]],
     "content": "VC Pointer",
     "sig": "<signature>"
   }
   ```
   
   **For DIDs** - Holders publish minimal DID documents containing only verification keys, with tags linking to encrypted extended data on IPFS (kind 30000):
   ```json
   {
     "kind": 30000,
     "pubkey": "<holder-pubkey>",
     "tags": [["d", "did:nostr:..."], ["ipfs_cid", "<cid>"], ["ext_hash", "<sha256>"]],
     "content": "{minimal DID document with verification methods}",
     "sig": "<signature>"
   }
   ```
   
   This minimizes data exposure on public relays while enabling verifiability and discovery.

4. **Use NIP-04 DMs for Secure Sharing**  
   Holders share encrypted DIDs/VCs with verifiers via **NIP-04** encrypted direct messages, ensuring confidentiality. Only the intended verifier, with the shared secret, can decrypt the data, maintaining holder control over access.

5. **Revocation via Nostr Events**  
   Issuers publish signed revocation events on Nostr to invalidate VCs, including the VC’s hash and a “revoked” status. Verifiers check these events to confirm validity, ensuring issuer control over the VC lifecycle, even if encrypted files persist on IPFS.

6. **Resolve Identities with NIP-05 or Bitcoin-Anchored DIDs**  
   Use **NIP-05** (`nostr.json` hosted on a domain, ~$1-$10/month) for lightweight, cost-efficient public key resolution, or anchor DID hashes to the **Bitcoin Timechain** using OpenTimestamps (free) for immutable verification. This avoids Ethereum’s high costs and partial centralization.

7. **Ensure Availability with Redundancy**  
   Pin encrypted VCs and DID extended data on multiple IPFS nodes or services for resilience. Publish Nostr events (VC pointers and minimal DID documents) to multiple relays to prevent data loss from pruning. Holders store VCs and DIDs in secure identity wallets with backups on IPFS or local devices, ensuring access without single points of failure.

8. **DID Document Architecture: Minimal Public + Extended Private**  
   DIDs require a hybrid approach due to their dual role as public identifiers and privacy-sensitive identity containers. Each DID is split into two parts:
   
   **Minimal DID Document (Public)** - Published to Nostr relays in plaintext for universal verification:
   ```json
   {
     "@context": ["https://www.w3.org/ns/did/v1"],
     "id": "did:nostr:abc123...",
     "verificationMethod": [{
       "id": "did:nostr:abc123...#key-1",
       "type": "Ed25519VerificationKey2020",
       "controller": "did:nostr:abc123...",
       "publicKeyMultibase": "z6Mk..."
     }],
     "authentication": ["did:nostr:abc123...#key-1"],
     "assertionMethod": ["did:nostr:abc123...#key-1"]
   }
   ```
   
   **Extended DID Data (Private)** - Encrypted and stored on IPFS:
   ```json
   {
     "service": [{"id": "...", "type": "NostrRelay", "serviceEndpoint": [...]}],
     "metadata": {"profile": {...}, "preferences": {...}},
     "alsoKnownAs": [...]
   }
   ```
   
   The Nostr event (kind 30000) contains the minimal document in `content` and links to encrypted extended data via tags: `["ipfs_cid", "<cid>"]`, `["ext_hash", "<sha256>"]`. This approach ensures public verifiability (anyone can resolve verification keys) while protecting privacy-sensitive data (service endpoints revealing communication patterns). Holders share decryption keys for extended data selectively via **NIP-04 encrypted DMs**, maintaining full control over who accesses metadata and service information.

9. Timestamping with Bitcoin using OpenTimestamps

10. **Verifiable Presentations with BBS+ for Selective Disclosure**  
   All credentials are shared via **Verifiable Presentations (VPs)** following W3C VC Data Model. VPs are built on-demand with **BBS+ signatures** (W3C Community Group spec) enabling field-level selective disclosure. Holders can prove specific attributes (e.g., "has university degree") without revealing unnecessary data (e.g., GPA, graduation date). Each VP includes:
   - Challenge-response binding (prevents replay attacks)
   - Time constraints (validFrom/validUntil for ephemeral sessions)
   - Holder's signature (proves credential ownership)
   - Selective disclosure proofs (cryptographically verifiable subset of claims)

### Why It Works
- **Security**: Encryption (AES-256, NIP-04) and BBS+ selective disclosure ensure confidentiality and privacy. Signatures and hashes guarantee integrity and authenticity. Challenge-response binding prevents replay attacks.
- **Control**: Issuers/holders manage access (via NIP-04 DMs), storage (IPFS pinning), and revocation (Nostr events), aligning with self-sovereign identity. VP templates enable granular control over data sharing.
- **Verifiability**: Minimal Nostr events and BBS+-based VPs enable universal verification without exposing sensitive data. OpenTimestamps provides Bitcoin-anchored proof of issuance time.
- **Privacy**: Field-level selective disclosure via BBS+ signatures allows proving specific claims without revealing full credentials. On-demand VP building ensures no stored presentations.
- **Resilience**: IPFS's distributed storage and Nostr's relay network ensure availability, with Bitcoin timestamps adding immutability.
- **Cost-Efficiency**: Self-hosted IPFS nodes and Nostr relays are free or low-cost (~$5-$10/month for IPFS, ~$0.10/GB for pinning, free for Nostr events), far cheaper than blockchain alternatives.

### Flow diagram

The following diagram illustrates the complete credential lifecycle from issuance through verification:

```mermaid
graph TD
    A[**Issuer**] -->|Creates DID| K[Generate DID]
    K -->|Signs VC with Private Key| B[Encrypts DID & VC: AES-256/NIP-04]
    B -->|Stores on IPFS, Generates CIDs| C[(IPFS Storage: Encrypted DID & VC)]
    B -->|Sends via NIP-04 DM| D[**Holder**]
    A -->|Publishes Minimal Event: VC Hash, DID CID, Holder Pubkey| E[(Nostr Relays)]
    E -->|Timestamped: Bitcoin Timechain via NIP-03/OpenTimestamps| F[(Bitcoin Timechain)]
    D -->|Stores in Secure Wallet| G[(Holder's Wallet)]
    G -->|Creates ZKP-based VP: BBS+ Signatures, Selective Disclosure| H[Verifiable Presentation]
    H -->|Signs VP with Private Key| I[**Verifier**]
    I -->|Verifies: VP Signature, VC Hash, Issuer DID via NIP-05/Bitcoin, Revocation Status, Timestamp| J[Outcome: Valid or Invalid VC]

    %% Styling definitions
    classDef issuer fill:#b3e5fc,stroke:#0277bd,stroke-width:2px,font-weight:bold;
    classDef holder fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px,font-weight:bold;
    classDef verifier fill:#ffe0b2,stroke:#f57c00,stroke-width:2px,font-weight:bold;
    classDef storage fill:#ffffff,stroke:#000000,stroke-width:1px;

    class A issuer;
    class D holder;
    class I verifier;
    class C,E,F,G storage;
  ```


## Key Features

- **Decentralized Identity (DIDs)**: did:nostr method with W3C-compatible document structure
- **W3C Verifiable Credentials**: Full support for standard VC data models
- **Verifiable Presentations**: W3C-compliant VPs with challenge-response binding
- **Encrypted Storage**: IPFS-based encrypted credential storage
- **Share History**: Complete audit trail of credential sharing
- **VP Template System**: Reusable presentation configurations for common scenarios
- **Privacy-First Architecture**: On-demand VP building, no stored presentations
- **BBS+ Selective Disclosure**: Share only necessary credential fields using Zero-Knowledge Proofs
- **OpenTimestamps Integration**: Bitcoin-anchored proof of credential issuance time


## Conclusion

Combining **IPFS** for persistent, encrypted storage with **Nostr** for secure event publishing and communication creates a decentralized, cost-efficient, and user-controlled system for VCs. Encryption and ZKPs protect privacy, while NIP-05 and **Bitcoin** anchoring ensure robust identity resolution. This approach empowers issuers and holders to manage VCs securely.

## Running the client application

### Install packages

Once the source is cloned, you'll need to install the packages:

```
npm install
```

### Angular development server

For a development server run:

```
npm start
```

Navigate to `http://localhost:4210/`. The app will automatically reload if you change any of the source files.