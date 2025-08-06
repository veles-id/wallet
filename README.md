# Veles ID Wallet

Veles Id Wallet is an open-source project. In the current phase it is an Angular PWA, than you can add as a shortcut to your desktop both on iOS and Android.

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
1. **Encrypt DIDs/VCs for Confidentiality**  
   Encrypt VCs and DIDs using **AES-256** or **NIP-04** (Nostr’s ECIES-based encryption) with the holder’s public key before storage or sharing. This ensures only authorized parties (with the private key) can access the data, mitigating privacy risks on untrusted systems like IPFS nodes or Nostr relays.

2. **Store Encrypted DIDs/VCs on IPFS for Persistence**  
   Store encrypted DIDs/VCs on **IPFS**, a decentralized file system, to ensure persistent availability. Pin files on a self-hosted IPFS node (free, ~$5-$10/month for hardware) or use low-cost pinning services (~$0.10-$0.15/GB/month, free tiers for small datasets). The resulting content identifier (CID) guarantees data integrity via SHA-256 hashing.

3. **Publish Minimal Events on Nostr for Discoverability**  
   Instead of publishing full DIDs/VCs, issuers create **NIP-01** Nostr events containing:
   - The VC’s SHA-256 hash.
   - The IPFS CID (linking to the encrypted file).
   - The holder’s public key (via a `p` tag).
   - A signature (ECDSA/Schnorr) for authenticity.  
   Example:
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
   This minimizes data exposure on public relays (e.g., `relay.damus.io`) while enabling verifiability.

4. **Use NIP-04 DMs for Secure Sharing**  
   Holders share encrypted DIDs/VCs with verifiers via **NIP-04** encrypted direct messages, ensuring confidentiality. Only the intended verifier, with the shared secret, can decrypt the data, maintaining holder control over access.

5. **Leverage ZKPs for Selective Disclosure**  
   Use **Zero-Knowledge Proofs** (e.g., BBS+ signatures) to create verifiable presentations (VPs) that prove specific VC attributes (e.g., “over 18”) without revealing the full credential. This enhances privacy and ensures verifiers only see necessary data, with proofs verifiable against the issuer’s public key.

6. **Revocation via Nostr Events**  
   Issuers publish signed revocation events on Nostr to invalidate VCs, including the VC’s hash and a “revoked” status. Verifiers check these events to confirm validity, ensuring issuer control over the VC lifecycle, even if encrypted files persist on IPFS.

7. **Resolve Identities with NIP-05 or Bitcoin-Anchored DIDs**  
   Use **NIP-05** (`nostr.json` hosted on a domain, ~$1-$10/month) for lightweight, cost-efficient public key resolution, or anchor DID hashes to the **Bitcoin Timechain** using OpenTimestamps (free) for immutable verification. This avoids Ethereum’s high costs and partial centralization.

8. **Ensure Availability with Redundancy**  
   Pin encrypted DIDs/VCs on multiple IPFS nodes or services for resilience. Publish Nostr events to multiple relays to prevent data loss from pruning. Holders store VCs in secure wallets (e.g., encrypted mobile apps) with backups on IPFS or local devices, ensuring access without single points of failure.

### Why It Works
- **Security**: Encryption (AES-256, NIP-04) and ZKPs (BBS+) ensure confidentiality and privacy. Signatures and hashes guarantee integrity and authenticity.
- **Control**: Issuers/holders manage access (via NIP-04 DMs), storage (IPFS pinning), and revocation (Nostr events), aligning with self-sovereign identity.
- **Verifiability**: Minimal Nostr events and ZKP-based VPs enable universal verification without exposing sensitive data.
- **Resilience**: IPFS’s distributed storage and Nostr’s relay network ensure availability, with Bitcoin timestamps adding immutability.
- **Cost-Efficiency**: Self-hosted IPFS nodes and Nostr relays are free or low-cost (~$5-$10/month for IPFS, ~$0.10/GB for pinning, free for Nostr events), far cheaper than blockchain alternatives like Ethereum.

### Flow diagram

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

### Conclusion
Combining **IPFS** for persistent, encrypted storage with **Nostr** for secure event publishing and communication creates a decentralized, cost-efficient, and user-controlled system for VCs. Encryption and ZKPs protect privacy, while NIP-05 and **Bitcoin** anchoring ensure robust identity resolution. This approach empowers issuers and holders to manage VCs securely.