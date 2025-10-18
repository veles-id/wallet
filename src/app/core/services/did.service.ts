import { Injectable, inject } from '@angular/core';
import { DidNostrService } from './did-nostr.service';
import { CreateDIDResult, DIDType, StoredDID } from './did.types';

@Injectable({
  providedIn: 'root',
})
export class DidService {
  private _didNostrService = inject(DidNostrService);

  async createDID(type: DIDType): Promise<CreateDIDResult> {
    switch (type) {
      case DIDType.NOSTR:
        const nostrResult = await this._didNostrService.createDID();
        return { ...nostrResult, didType: DIDType.NOSTR };
      default:
        throw new Error(`Unsupported DID type: ${type}`);
    }
  }

  async publishDID(storedDID: StoredDID): Promise<boolean> {
    const didType = this.getDIDType(storedDID);

    switch (didType) {
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

    if (storedDID.did.startsWith('did:nostr:')) {
      return DIDType.NOSTR;
    }

    throw new Error('Unsupported DID type');
  }

  canPublishDID(storedDID: StoredDID): {
    canPublish: boolean;
    reason?: string;
    isLegacyDID?: boolean;
  } {
    if (storedDID.isPublished) {
      return { canPublish: false, reason: 'Already published' };
    }

    const didType = this.getDIDType(storedDID);

    switch (didType) {
      case DIDType.NOSTR:
        if ((storedDID as any).nostrPrivateKey) {
          return { canPublish: true };
        }
        return {
          canPublish: false,
          reason: 'No Nostr private key available',
        };

      default:
        return {
          canPublish: false,
          reason: 'Unknown DID type',
        };
    }
  }

  async storeDID(didResult: CreateDIDResult, alias?: string): Promise<void> {
    const storedDIDs = this.getStoredDIDs();

    let nostrPrivateKey = null;
    let nostrPublicKey = null;
    if (didResult.didType === DIDType.NOSTR && (didResult as any).nostrPrivateKey) {
      nostrPrivateKey = (didResult as any).nostrPrivateKey;
      nostrPublicKey = (didResult as any).nostrPublicKey;
    }

    const newDID: StoredDID = {
      did: didResult.did,
      document: didResult.document,
      keySet: didResult.keySet,
      privateKeyJwk: null,
      createdAt: new Date().toISOString(),
      alias: alias,
      isPublished: didResult.isPublished,
      didType: didResult.didType || DIDType.NOSTR,
      ...(nostrPrivateKey && { nostrPrivateKey }),
      ...(nostrPublicKey && { nostrPublicKey }),
    };

    storedDIDs.push(newDID);
    localStorage.setItem('veles_dids', JSON.stringify(storedDIDs));
  }

  getStoredDIDs(): StoredDID[] {
    const stored = localStorage.getItem('veles_dids');
    const dids = stored ? JSON.parse(stored) : [];
    return dids.sort((a: StoredDID, b: StoredDID) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      localStorage.setItem('veles_dids', JSON.stringify(storedDIDs));
      return true;
    }

    return false;
  }

  updateDIDAlias(did: string, alias: string): boolean {
    const storedDIDs = this.getStoredDIDs();
    const didToUpdate = storedDIDs.find((stored) => stored.did === did);

    if (didToUpdate) {
      didToUpdate.alias = alias;
      localStorage.setItem('veles_dids', JSON.stringify(storedDIDs));
      return true;
    }

    return false;
  }

  updateDIDPublicationStatus(did: string, isPublished: boolean): boolean {
    const storedDIDs = this.getStoredDIDs();
    const didToUpdate = storedDIDs.find((stored) => stored.did === did);

    if (didToUpdate) {
      didToUpdate.isPublished = isPublished;
      localStorage.setItem('veles_dids', JSON.stringify(storedDIDs));
      return true;
    }

    return false;
  }

  async updateNostrProfile(
    storedDID: StoredDID,
    metadata: {
      name?: string;
      display_name?: string;
      website?: string;
      about?: string;
      lud16?: string;
      location?: string;
    },
  ): Promise<boolean> {
    const didType = this.getDIDType(storedDID);

    if (didType !== DIDType.NOSTR) {
      throw new Error('Profile updates are only supported for Nostr DIDs');
    }

    return await this._didNostrService.updateProfileMetadata(storedDID, metadata);
  }

  exportDID(did: string): string | null {
    const storedDID = this.getStoredDID(did);
    return storedDID ? JSON.stringify(storedDID, null, 2) : null;
  }

  getStoredDIDCount(): number {
    return this.getStoredDIDs().length;
  }

  async resolveDID(did: string): Promise<any> {
    if (did.startsWith('did:nostr:')) {
      return await this._didNostrService.retrieveDIDInfo(did);
    } else {
      throw new Error(`Unsupported DID method: ${did}`);
    }
  }

  async isDIDResolvable(didUri: string): Promise<boolean> {
    if (didUri.startsWith('did:nostr:')) {
      return didUri.split(':').length === 3;
    } else {
      return false;
    }
  }
}
