import { Injectable, inject } from '@angular/core';
import { NostrEvent, StoredDID } from './did.types';
import { EncryptionService } from './encryption.service';
import { EncryptionKeys } from './encryption.types';
import { IpfsService } from './ipfs.service';
import { VerifiablePresentation } from './presentation.types';
import { RelayService } from './relay.service';

@Injectable({
  providedIn: 'root',
})
export class NostrMessagingService {
  private _encryptionService = inject(EncryptionService);
  private _ipfsService = inject(IpfsService);
  private _relayService = inject(RelayService);

  async shareVCviaDM(vcCID: string, recipientPubkey: string, senderKeys: EncryptionKeys): Promise<string | null> {
    try {
      console.log(`Sharing VC via NIP-04 DM to ${recipientPubkey.substring(0, 16)}...`);

      const encryptedVC = await this._fetchEncryptedVCFromIPFS(vcCID);
      const decryptedVC = await this._encryptionService.decryptNIP04(
        encryptedVC,
        senderKeys.privateKey,
        senderKeys.publicKey,
      );

      const dmMessage = this._createVCDMMessage(decryptedVC, vcCID);
      const encryptedDM = await this._encryptionService.encryptNIP04(dmMessage, senderKeys.privateKey, recipientPubkey);
      const event = this._createDMEvent(encryptedDM, senderKeys.publicKey, recipientPubkey);
      const signedEvent = await this._relayService.signEvent(event, senderKeys.privateKey);
      const results = await this._relayService.publishToRelays(signedEvent);
      const successCount = results.filter((r) => r.success).length;

      console.log(`VC shared via DM to ${successCount}/${results.length} relays`);

      return signedEvent.id || null;
    } catch (error) {
      console.error('Failed to share VC via DM:', error);
      throw error;
    }
  }

  async shareVP(
    vp: VerifiablePresentation,
    recipientPubkey: string,
    senderKeys: EncryptionKeys,
  ): Promise<string | null> {
    try {
      console.log(`Sharing VP via NIP-04 DM to ${recipientPubkey.substring(0, 16)}...`);

      const vpJson = JSON.stringify(vp);
      const dmMessage = this._createVPDMMessage(vpJson, vp);
      const encryptedDM = await this._encryptionService.encryptNIP04(dmMessage, senderKeys.privateKey, recipientPubkey);
      const event = this._createDMEvent(encryptedDM, senderKeys.publicKey, recipientPubkey);
      const signedEvent = await this._relayService.signEvent(event, senderKeys.privateKey);
      const results = await this._relayService.publishToRelays(signedEvent);
      const successCount = results.filter((r) => r.success).length;

      console.log(`VP shared via DM to ${successCount}/${results.length} relays`);

      return signedEvent.id || null;
    } catch (error) {
      console.error('Failed to share VP via DM:', error);
      throw error;
    }
  }

  async shareExtendedDIDData(
    storedDID: StoredDID,
    recipientPubkey: string,
    holderKeys: EncryptionKeys,
  ): Promise<string | null> {
    try {
      console.log(`Sharing extended DID data via NIP-04 DM to ${recipientPubkey.substring(0, 16)}...`);

      if (!storedDID.extendedDataCID) {
        throw new Error('No extended data CID available for this DID');
      }

      const encryptedExtendedData = await this._fetchEncryptedDataFromIPFS(storedDID.extendedDataCID);
      const decryptedExtendedData = await this._encryptionService.decryptNIP04(
        encryptedExtendedData,
        holderKeys.privateKey,
        holderKeys.publicKey,
      );

      const dmMessage = this._createExtendedDIDDataDMMessage(decryptedExtendedData, storedDID);
      const encryptedDM = await this._encryptionService.encryptNIP04(dmMessage, holderKeys.privateKey, recipientPubkey);
      const event = this._createDMEvent(encryptedDM, holderKeys.publicKey, recipientPubkey);
      const signedEvent = await this._relayService.signEvent(event, holderKeys.privateKey);
      const results = await this._relayService.publishToRelays(signedEvent);
      const successCount = results.filter((r) => r.success).length;

      console.log(`Extended DID data shared via DM to ${successCount}/${results.length} relays`);

      return signedEvent.id || null;
    } catch (error) {
      console.error('Failed to share extended DID data via DM:', error);
      throw error;
    }
  }

  private async _fetchEncryptedVCFromIPFS(cid: string): Promise<string> {
    try {
      const result = await this._ipfsService.retrieveData(cid);
      return result.data;
    } catch (error) {
      console.error('Failed to fetch VC from IPFS:', error);
      throw new Error('Could not retrieve VC from IPFS');
    }
  }

  private async _fetchEncryptedDataFromIPFS(cid: string): Promise<string> {
    try {
      const result = await this._ipfsService.retrieveData(cid);
      return result.data;
    } catch (error) {
      console.error('Failed to fetch data from IPFS:', error);
      throw new Error('Could not retrieve data from IPFS');
    }
  }

  private _createVCDMMessage(vcData: string, ipfsCID: string): string {
    const message = {
      type: 'verifiable-credential',
      vcData,
      ipfsCID,
      instructions:
        'This is a Verifiable Credential shared with you. Verify the issuer DID and check the credential signature before trusting the contents.',
      sharedAt: new Date().toISOString(),
    };

    return JSON.stringify(message);
  }

  private _createVPDMMessage(vpJson: string, vp: VerifiablePresentation): string {
    const message = {
      type: 'verifiable-presentation',
      vpData: vpJson,
      validUntil: vp.validUntil,
      instructions:
        'This is a Verifiable Presentation. Verify the holder signature, check validity period, and verify each credential.',
      sharedAt: new Date().toISOString(),
    };

    return JSON.stringify(message);
  }

  private _createExtendedDIDDataDMMessage(extendedData: string, storedDID: StoredDID): string {
    const message = {
      type: 'did-extended-data',
      did: storedDID.did,
      extendedData,
      ipfsCID: storedDID.extendedDataCID,
      instructions:
        "This is extended DID data (service endpoints, metadata) shared with you. This data is privacy-sensitive and should be handled according to the holder's access control preferences.",
      sharedAt: new Date().toISOString(),
    };

    return JSON.stringify(message);
  }

  private _createDMEvent(encryptedContent: string, senderPubkey: string, recipientPubkey: string): NostrEvent {
    const now = Math.floor(Date.now() / 1000);

    return {
      pubkey: senderPubkey,
      created_at: now,
      kind: 4,
      tags: [['p', recipientPubkey]],
      content: encryptedContent,
    };
  }
}
