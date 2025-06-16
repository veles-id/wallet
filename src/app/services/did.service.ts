import { Injectable, inject } from "@angular/core";
import { DidDhtService } from "./did-dht.service";
import { DidNostrService } from "./did-nostr.service";
import { CreateDIDResult, DIDType, StoredDID } from "./did.types";

@Injectable({
  providedIn: "root",
})
export class DidService {
  private _didDhtService = inject(DidDhtService);
  private _didNostrService = inject(DidNostrService);

  async createDID(type: DIDType): Promise<CreateDIDResult> {
    switch (type) {
      case DIDType.DHT:
        const dhtResult = await this._didDhtService.createDID();
        return { ...dhtResult, didType: DIDType.DHT };
      case DIDType.NOSTR:
        const nostrResult = await this._didNostrService.createDID();
        return { ...nostrResult, didType: DIDType.NOSTR };
      default:
        throw new Error(`Unsupported DID type: ${type}`);
    }
  }

  async createOfflineDID(): Promise<CreateDIDResult> {
    const result = await this._didDhtService.createOfflineDID();
    return { ...result, didType: DIDType.DHT };
  }

  async publishDID(storedDID: StoredDID): Promise<boolean> {
    const didType = this.getDIDType(storedDID);

    switch (didType) {
      case DIDType.DHT:
        return await this._didDhtService.publishDIDWithFallback(storedDID);
      case DIDType.NOSTR:
        return await this._didNostrService.publishDID(storedDID);
      default:
        throw new Error(`Cannot publish DID of unknown type: ${didType}`);
    }
  }

  private getDIDType(storedDID: StoredDID): DIDType {
    if (storedDID.didType) {
      return storedDID.didType;
    }

    if (storedDID.did.startsWith("did:nostr:")) {
      return DIDType.NOSTR;
    } else if (storedDID.did.startsWith("did:dht:")) {
      return DIDType.DHT;
    }

    return DIDType.DHT;
  }

  canPublishDID(storedDID: StoredDID): {
    canPublish: boolean;
    reason?: string;
    isLegacyDID?: boolean;
  } {
    if (storedDID.isPublished) {
      return { canPublish: false, reason: "Already published" };
    }

    const didType = this.getDIDType(storedDID);

    switch (didType) {
      case DIDType.NOSTR:
        if ((storedDID as any).nostrPrivateKey) {
          return { canPublish: true };
        }
        return {
          canPublish: false,
          reason: "No Nostr private key available",
        };

      case DIDType.DHT:
        return this._didDhtService.canPublishDID(storedDID);

      default:
        return {
          canPublish: false,
          reason: "Unknown DID type",
        };
    }
  }

  async storeDID(didResult: CreateDIDResult, alias?: string): Promise<void> {
    const storedDIDs = this.getStoredDIDs();

    let nostrPrivateKey = null;
    let nostrPublicKey = null;
    if (
      didResult.didType === DIDType.NOSTR &&
      (didResult as any).nostrPrivateKey
    ) {
      nostrPrivateKey = (didResult as any).nostrPrivateKey;
      nostrPublicKey = (didResult as any).nostrPublicKey;
    }

    let privateKeyJwk: any = null;
    if (
      didResult.didType === DIDType.DHT &&
      didResult.keySet &&
      typeof didResult.keySet === "object"
    ) {
      try {
        if (
          "export" in didResult.keySet &&
          typeof didResult.keySet.export === "function"
        ) {
          const exported = await didResult.keySet.export();
          privateKeyJwk = exported.privateKeys?.[0] || null;
        } else if (
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
        (didResult.did.startsWith("did:nostr:") ? DIDType.NOSTR : DIDType.DHT),
      ...(nostrPrivateKey && { nostrPrivateKey }),
      ...(nostrPublicKey && { nostrPublicKey }),
    };

    storedDIDs.push(newDID);
    localStorage.setItem("veles_dids", JSON.stringify(storedDIDs));
  }

  getStoredDIDs(): StoredDID[] {
    const stored = localStorage.getItem("veles_dids");
    return stored ? JSON.parse(stored) : [];
  }

  getStoredDID(did: string): StoredDID | null {
    const storedDIDs = this.getStoredDIDs();
    return storedDIDs.find((stored) => stored.did === did) || null;
  }

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

  updateDIDPublicationStatus(did: string, isPublished: boolean): boolean {
    const storedDIDs = this.getStoredDIDs();
    const didToUpdate = storedDIDs.find((stored) => stored.did === did);

    if (didToUpdate) {
      didToUpdate.isPublished = isPublished;
      localStorage.setItem("veles_dids", JSON.stringify(storedDIDs));
      return true;
    }

    return false;
  }

  exportDID(did: string): string | null {
    const storedDID = this.getStoredDID(did);
    return storedDID ? JSON.stringify(storedDID, null, 2) : null;
  }

  getStoredDIDCount(): number {
    return this.getStoredDIDs().length;
  }

  async resolveDID(did: string): Promise<any> {
    if (did.startsWith("did:dht:")) {
      return await this._didDhtService.resolveDID(did);
    } else if (did.startsWith("did:nostr:")) {
      return await this._didNostrService.retrieveDIDInfo(did);
    } else {
      throw new Error(`Unsupported DID method: ${did}`);
    }
  }

  async isDIDResolvable(didUri: string): Promise<boolean> {
    if (didUri.startsWith("did:dht:")) {
      return await this._didDhtService.isDIDResolvable(didUri);
    } else if (didUri.startsWith("did:nostr:")) {
      return didUri.split(":").length === 3;
    } else {
      return false;
    }
  }

  async migrateDIDForPublishing(didUri: string): Promise<boolean> {
    if (didUri.startsWith("did:dht:")) {
      const storedDID = this.getStoredDID(didUri);
      if (!storedDID) {
        throw new Error(`DID not found in storage: ${didUri}`);
      }
      return await this._didDhtService.migrateDIDForPublishing(storedDID);
    }
    return true;
  }

  async createPublishableDID(): Promise<CreateDIDResult> {
    const result = await this._didDhtService.createPublishableDID();
    return { ...result, didType: DIDType.DHT };
  }

  stopServices(): void {
    this._didDhtService.stopRepublishing();
  }
}
