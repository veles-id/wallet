import { Injectable, inject } from "@angular/core";
import { DidDhtService } from "./did-dht.service";
import { DidNostrService } from "./did-nostr.service";

export interface CreateDIDResult {
  did: string;
  document: any;
  keySet: any;
  isPublished: boolean;
  didType?: "dht" | "nostr";
}

export interface StoredDID {
  did: string;
  document: any;
  keySet: any;
  privateKeyJwk?: any; // Store the private key JWK separately for publishing
  createdAt: string;
  alias?: string;
  isPublished: boolean;
  didType?: "dht" | "nostr"; // Track the type of DID
  nostrPrivateKey?: string; // For Nostr DIDs
  nostrPublicKey?: string; // For Nostr DIDs
}

export type DIDType = "dht" | "nostr";

@Injectable({
  providedIn: "root",
})
export class DidService {
  private _didDhtService = inject(DidDhtService);
  private _didNostrService = inject(DidNostrService);

  constructor() {
    console.log("🌐 DID Gateway Service initialized");
  }

  /**
   * Creates a new DID of the specified type
   */
  async createDID(type: DIDType): Promise<CreateDIDResult> {
    switch (type) {
      case "dht":
        const dhtResult = await this._didDhtService.createDID();
        return { ...dhtResult, didType: "dht" };
      case "nostr":
        const nostrResult = await this._didNostrService.createDID();
        return { ...nostrResult, didType: "nostr" };
      default:
        throw new Error(`Unsupported DID type: ${type}`);
    }
  }

  /**
   * Creates an offline DID (currently only supported for DHT)
   */
  async createOfflineDID(): Promise<CreateDIDResult> {
    const result = await this._didDhtService.createOfflineDID();
    return { ...result, didType: "dht" };
  }

  /**
   * Publishes a DID based on its type
   */
  async publishDID(storedDID: StoredDID): Promise<boolean> {
    const didType = this.getDIDType(storedDID);

    switch (didType) {
      case "dht":
        return await this._didDhtService.publishDIDWithFallback(storedDID);
      case "nostr":
        return await this._didNostrService.publishDID(storedDID);
      default:
        throw new Error(`Cannot publish DID of unknown type: ${didType}`);
    }
  }

  /**
   * Determines the DID type from a stored DID
   */
  private getDIDType(storedDID: StoredDID): DIDType {
    // First check the explicit didType field
    if (storedDID.didType) {
      return storedDID.didType;
    }

    // Fallback to inferring from DID string
    if (storedDID.did.startsWith("did:nostr:")) {
      return "nostr";
    } else if (storedDID.did.startsWith("did:dht:")) {
      return "dht";
    }

    // Default to DHT for legacy DIDs
    return "dht";
  }

  /**
   * Checks if a stored DID can be published
   */
  canPublishDID(storedDID: StoredDID): {
    canPublish: boolean;
    reason?: string;
    isLegacyDID?: boolean;
  } {
    // Check if already published
    if (storedDID.isPublished) {
      return { canPublish: false, reason: "Already published" };
    }

    const didType = this.getDIDType(storedDID);

    switch (didType) {
      case "nostr":
        // For Nostr DIDs, check if we have the Nostr private key
        if ((storedDID as any).nostrPrivateKey) {
          return { canPublish: true };
        }
        return {
          canPublish: false,
          reason: "No Nostr private key available",
        };

      case "dht":
        // Delegate to DHT service for DHT-specific logic
        return this._didDhtService.canPublishDID(storedDID);

      default:
        return {
          canPublish: false,
          reason: "Unknown DID type",
        };
    }
  }

  /**
   * Stores a DID in localStorage
   */
  async storeDID(didResult: CreateDIDResult, alias?: string): Promise<void> {
    const storedDIDs = this.getStoredDIDs();

    // For Nostr DIDs, store the Nostr-specific keys
    let nostrPrivateKey = null;
    let nostrPublicKey = null;
    if (didResult.didType === "nostr" && (didResult as any).nostrPrivateKey) {
      nostrPrivateKey = (didResult as any).nostrPrivateKey;
      nostrPublicKey = (didResult as any).nostrPublicKey;
    }

    // Try to extract private key JWK for DHT DIDs
    let privateKeyJwk: any = null;
    if (
      didResult.didType === "dht" &&
      didResult.keySet &&
      typeof didResult.keySet === "object"
    ) {
      try {
        // Try to export the private key if the keySet supports it
        if (
          "export" in didResult.keySet &&
          typeof didResult.keySet.export === "function"
        ) {
          const exported = await didResult.keySet.export();
          privateKeyJwk = exported.privateKeys?.[0] || null;
        }
        // Alternative: try to access the private key directly from the keySet structure
        else if (
          didResult.keySet.keyManager &&
          "export" in didResult.keySet.keyManager
        ) {
          const exported = await didResult.keySet.keyManager.export();
          privateKeyJwk = exported.privateKeys?.[0] || null;
        }
      } catch (error) {
        console.warn(
          "Could not extract private key for future publishing:",
          error
        );
      }
    }

    const newDID: StoredDID = {
      did: didResult.did,
      document: didResult.document,
      keySet: didResult.keySet,
      privateKeyJwk: privateKeyJwk,
      createdAt: new Date().toISOString(),
      alias: alias,
      isPublished: didResult.isPublished,
      didType:
        didResult.didType ||
        (didResult.did.startsWith("did:nostr:") ? "nostr" : "dht"),
      ...(nostrPrivateKey && { nostrPrivateKey }),
      ...(nostrPublicKey && { nostrPublicKey }),
    };

    storedDIDs.push(newDID);
    localStorage.setItem("veles_dids", JSON.stringify(storedDIDs));
  }

  /**
   * Gets all stored DIDs
   */
  getStoredDIDs(): StoredDID[] {
    const stored = localStorage.getItem("veles_dids");
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Gets a specific DID by its identifier
   */
  getStoredDID(did: string): StoredDID | null {
    const storedDIDs = this.getStoredDIDs();
    return storedDIDs.find((stored) => stored.did === did) || null;
  }

  /**
   * Deletes a stored DID
   */
  deleteDID(did: string): boolean {
    const storedDIDs = this.getStoredDIDs();
    const index = storedDIDs.findIndex((stored) => stored.did === did);

    if (index !== -1) {
      storedDIDs.splice(index, 1);
      localStorage.setItem("veles_dids", JSON.stringify(storedDIDs));
      return true;
    }

    return false;
  }

  /**
   * Updates the alias of a stored DID
   */
  updateDIDAlias(did: string, alias: string): boolean {
    const storedDIDs = this.getStoredDIDs();
    const didToUpdate = storedDIDs.find((stored) => stored.did === did);

    if (didToUpdate) {
      didToUpdate.alias = alias;
      localStorage.setItem("veles_dids", JSON.stringify(storedDIDs));
      return true;
    }

    return false;
  }

  /**
   * Exports a DID as JSON
   */
  exportDID(did: string): string | null {
    const storedDID = this.getStoredDID(did);
    return storedDID ? JSON.stringify(storedDID, null, 2) : null;
  }

  /**
   * Gets the count of stored DIDs
   */
  getStoredDIDCount(): number {
    return this.getStoredDIDs().length;
  }

  /**
   * Resolves a DID (delegates to appropriate service)
   */
  async resolveDID(did: string): Promise<any> {
    if (did.startsWith("did:dht:")) {
      return await this._didDhtService.resolveDID(did);
    } else if (did.startsWith("did:nostr:")) {
      // TODO: Implement Nostr DID resolution if needed
      throw new Error("Nostr DID resolution not yet implemented");
    } else {
      throw new Error(`Unsupported DID method: ${did}`);
    }
  }

  /**
   * Checks if a DID is resolvable (delegates to appropriate service)
   */
  async isDIDResolvable(didUri: string): Promise<boolean> {
    if (didUri.startsWith("did:dht:")) {
      return await this._didDhtService.isDIDResolvable(didUri);
    } else if (didUri.startsWith("did:nostr:")) {
      // For now, assume Nostr DIDs are always resolvable if they have the right format
      return didUri.split(":").length === 3;
    } else {
      return false;
    }
  }

  /**
   * Migrates a DID for publishing (currently only for DHT)
   */
  async migrateDIDForPublishing(didUri: string): Promise<boolean> {
    if (didUri.startsWith("did:dht:")) {
      return await this._didDhtService.migrateDIDForPublishing(didUri);
    }
    // Nostr DIDs don't need migration
    return true;
  }

  /**
   * Creates a new publishable DID (currently only for DHT)
   */
  async createPublishableDID(): Promise<CreateDIDResult> {
    const result = await this._didDhtService.createPublishableDID();
    return { ...result, didType: "dht" };
  }

  /**
   * Stops any background services
   */
  stopServices(): void {
    this._didDhtService.stopRepublishing();
  }
}
