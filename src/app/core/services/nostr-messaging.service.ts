import { Injectable, inject } from '@angular/core';
import { NostrEvent } from './did.types';
import { EncryptionService } from './encryption.service';
import { EncryptionKeys } from './encryption.types';
import { IpfsService } from './ipfs.service';
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

      const dmMessage = this._createDMMessage(decryptedVC, vcCID);

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

  private async _fetchEncryptedVCFromIPFS(cid: string): Promise<string> {
    try {
      const result = await this._ipfsService.retrieveData(cid);
      return result.data;
    } catch (error) {
      console.error('Failed to fetch VC from IPFS:', error);
      throw new Error('Could not retrieve VC from IPFS');
    }
  }

  private _createDMMessage(vcData: string, ipfsCID: string): string {
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
