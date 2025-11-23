import { Injectable, inject } from '@angular/core';
import { sha256 } from '@noble/hashes/sha2';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { DidSplitterService } from './did-splitter.service';
import { DIDDocument } from './did-splitter.types';
import { NostrDIDResult, NostrEvent, NostrRelay, StoredDID } from './did.types';
import { EncodingService } from './encoding.service';
import { EncryptionService } from './encryption.service';
import { IpfsService } from './ipfs.service';
import { RelayService } from './relay.service';

@Injectable({
  providedIn: 'root',
})
export class DidNostrService {
  private _relayService = inject(RelayService);
  private _didSplitterService = inject(DidSplitterService);
  private _encodingService = inject(EncodingService);
  private _encryptionService = inject(EncryptionService);
  private _ipfsService = inject(IpfsService);

  async createDID(): Promise<NostrDIDResult> {
    try {
      console.log('Creating new DID:Nostr...');

      const keyPair = await this.generateNostrKeyPair();

      const did = `did:nostr:${keyPair.publicKey}`;

      // Create DID document
      const document = {
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/ed25519-2020/v1'],
        id: did,
        verificationMethod: [
          {
            id: `${did}#key-1`,
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyMultibase: `z${keyPair.publicKey}`, // Multibase encoding
          },
        ],
        authentication: [`${did}#key-1`],
        assertionMethod: [`${did}#key-1`],
        service: [
          {
            id: `${did}#nostr`,
            type: 'NostrRelay',
            serviceEndpoint: this._relayService.DEFAULT_RELAYS.map((r) => r.url),
          },
        ],
      };

      return {
        did,
        document,
        keySet: null, // Not applicable for Nostr DIDs
        isPublished: false,
        nostrPublicKey: keyPair.publicKey,
        nostrPrivateKey: keyPair.privateKey,
      };
    } catch (error) {
      console.error('Failed to create DID:Nostr:', error);
      throw error;
    }
  }

  async publishDID(storedDID: StoredDID): Promise<boolean> {
    try {
      console.log('Publishing DID:Nostr with hybrid encryption...');
      console.log('DID to publish:', storedDID.did);

      if (!storedDID.did.startsWith('did:nostr:')) {
        throw new Error('Can only publish DID:Nostr documents to Nostr relays');
      }

      const nostrKeys = this.extractNostrKeys(storedDID);
      if (!nostrKeys) {
        throw new Error('Could not extract Nostr keys from DID');
      }
      console.log('Extracted keys - Public:', nostrKeys.publicKey.substring(0, 16) + '...');

      const { publicDocument, extendedData } = this._didSplitterService.splitDIDDocument(
        storedDID.document as DIDDocument,
      );
      console.log('Split DID document - Extended data:', this._didSplitterService.hasExtendedData(extendedData));

      let extendedDataCID: string | undefined;
      let extendedDataHash: string | undefined;

      if (this._didSplitterService.hasExtendedData(extendedData)) {
        console.log('Processing extended data...');

        const extendedDataJson = JSON.stringify(extendedData);
        const encryptedExtended = await this._encryptionService.encryptNIP04(
          extendedDataJson,
          nostrKeys.privateKey,
          nostrKeys.publicKey,
        );

        const fileName = `did-ext-${storedDID.did.split(':')[2].substring(0, 12)}.enc`;
        const ipfsResult = await this._ipfsService.uploadEncryptedData(encryptedExtended, fileName);
        extendedDataCID = ipfsResult.cid;

        const hash = sha256(new TextEncoder().encode(extendedDataJson));
        extendedDataHash = Array.from(hash)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        console.log(`Extended data encrypted and uploaded to IPFS: ${extendedDataCID}`);
        console.log(`Extended data hash: ${extendedDataHash.substring(0, 16)}...`);

        storedDID.extendedDataCID = extendedDataCID;
        storedDID.publicDocument = publicDocument;
        storedDID.extendedDocument = extendedData;
      }

      const event = await this._createDIDEventWithEncryption(
        storedDID,
        nostrKeys,
        publicDocument,
        extendedDataCID,
        extendedDataHash,
      );

      console.log('Created event:', {
        kind: event.kind,
        pubkey: event.pubkey.substring(0, 16) + '...',
        tags: event.tags,
        contentLength: event.content.length,
      });

      const signedEvent = await this._relayService.signEvent(event, nostrKeys.privateKey);
      console.log('Signed event - ID:', signedEvent.id?.substring(0, 16) + '...');

      const publishResults = await this._relayService.publishToRelays(signedEvent);

      publishResults.forEach((result) => {
        if (result.success) {
          console.log(`${result.relay}: SUCCESS`);
        } else {
          console.log(`${result.relay}: FAILED${result.error ? ` - ${result.error}` : ''}`);
        }
      });

      const successCount = publishResults.filter((r) => r.success).length;
      console.log(`Final result: ${successCount}/${publishResults.length} relays succeeded`);

      return successCount > 0;
    } catch (error) {
      console.error('Failed to publish DID:Nostr:', error);
      throw error;
    }
  }

  async updateProfileMetadata(
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
    try {
      console.log('Updating Nostr profile metadata...');

      if (!storedDID.did.startsWith('did:nostr:')) {
        throw new Error('Can only update profile metadata for DID:Nostr');
      }

      const nostrKeys = this.extractNostrKeys(storedDID);
      if (!nostrKeys) {
        throw new Error('Could not extract Nostr keys from DID');
      }

      const filteredMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([_, value]) => value !== undefined && value !== null && value !== ''),
      );

      const event: NostrEvent = {
        pubkey: nostrKeys.publicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 0,
        tags: [],
        content: JSON.stringify(filteredMetadata),
      };

      console.log('Created profile metadata event:', {
        kind: event.kind,
        pubkey: event.pubkey.substring(0, 16) + '...',
        metadata: filteredMetadata,
      });

      const signedEvent = await this._relayService.signEvent(event, nostrKeys.privateKey);
      const publishResults = await this._relayService.publishToRelays(signedEvent);

      publishResults.forEach((result) => {
        if (result.success) {
          console.log(`Profile update to ${result.relay}: SUCCESS`);
        } else {
          console.log(`Profile update to ${result.relay}: FAILED${result.error ? ` - ${result.error}` : ''}`);
        }
      });

      const successCount = publishResults.filter((r) => r.success).length;
      console.log(`Profile metadata update result: ${successCount}/${publishResults.length} relays succeeded`);

      return successCount > 0;
    } catch (error) {
      console.error('Failed to update profile metadata:', error);
      throw error;
    }
  }

  async retrieveDIDInfo(did: string, decryptionKey?: string): Promise<any> {
    try {
      console.log('Retrieving DID:Nostr information from network:', did);
      console.log('Decryption key provided:', !!decryptionKey);

      if (!did.startsWith('did:nostr:')) {
        throw new Error('Not a valid DID:Nostr identifier');
      }

      const publicKey = did.split(':')[2];
      if (!publicKey || publicKey.length !== 64) {
        throw new Error('Invalid public key in DID:Nostr');
      }

      console.log('Extracted public key:', publicKey.substring(0, 16) + '...');

      const results = await Promise.allSettled([
        this.retrieveDIDDocument(publicKey, decryptionKey),
        this.retrieveProfileMetadata(publicKey),
        this.retrieveRelayList(publicKey),
        this.retrieveContactList(publicKey),
      ]);

      const didDocument = results[0].status === 'fulfilled' ? results[0].value : null;
      const profileMetadata = results[1].status === 'fulfilled' ? results[1].value : null;
      const relayList = results[2].status === 'fulfilled' ? results[2].value : null;
      const contactList = results[3].status === 'fulfilled' ? results[3].value : null;

      return {
        did,
        publicKey,
        didDocument,
        profileMetadata,
        relayList,
        contactList,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to retrieve DID:Nostr information:', error);
      throw error;
    }
  }

  /**
   * Retrieves DID document from Nostr relays with optional decryption of extended data.
   * Extended data is always encrypted when stored, but decryption during retrieval
   * requires providing the holder's private key.
   */
  private async retrieveDIDDocument(publicKey: string, decryptionKey?: string): Promise<any> {
    const filter = {
      kinds: [30000],
      authors: [publicKey],
      '#d': [`did:nostr:${publicKey}`],
      limit: 1,
    };

    const events = await this.queryRelays(filter);

    if (events.length > 0) {
      const event = events[0];
      try {
        const publicDocument = JSON.parse(event.content);
        const ipfsCIDTag = event.tags.find((tag: string[]) => tag[0] === 'ipfs_cid');
        const extHashTag = event.tags.find((tag: string[]) => tag[0] === 'ext_hash');

        const result: any = {
          event,
          document: publicDocument,
          publishedAt: new Date(event.created_at * 1000).toISOString(),
          hasExtendedData: !!ipfsCIDTag,
        };

        if (ipfsCIDTag && decryptionKey) {
          console.log('Extended data found, attempting to retrieve and decrypt...');
          const ipfsCID = ipfsCIDTag[1];
          const expectedHash = extHashTag ? extHashTag[1] : undefined;

          try {
            const ipfsData = await this._ipfsService.retrieveData(ipfsCID);
            console.log('Retrieved encrypted extended data from IPFS');

            const decryptedExtendedJson = await this._encryptionService.decryptNIP04(
              ipfsData.data,
              decryptionKey,
              publicKey,
            );
            console.log('Successfully decrypted extended data');

            if (expectedHash) {
              const hash = sha256(new TextEncoder().encode(decryptedExtendedJson));
              const actualHash = Array.from(hash)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

              if (actualHash !== expectedHash) {
                console.warn('Extended data hash mismatch!');
                result.hashVerificationFailed = true;
              } else {
                console.log('Extended data hash verified successfully');
              }
            }

            const extendedData = JSON.parse(decryptedExtendedJson);
            const completeDocument = this._didSplitterService.mergeDIDDocuments(publicDocument, extendedData);

            result.document = completeDocument;
            result.extendedData = extendedData;
            result.extendedDataDecrypted = true;
          } catch (error) {
            console.error('Failed to retrieve or decrypt extended data:', error);
            result.extendedDataError = error instanceof Error ? error.message : String(error);
          }
        } else if (ipfsCIDTag && !decryptionKey) {
          console.log('Extended data available but no decryption key provided');
          result.ipfsCID = ipfsCIDTag[1];
          result.extendedDataAvailable = true;
        }

        return result;
      } catch (error) {
        console.warn('Failed to parse DID document:', error);
        return {
          event,
          document: null,
          parseError: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return null;
  }

  /**
   * Retrieves profile metadata (kind 0) from Nostr relays
   */
  private async retrieveProfileMetadata(publicKey: string): Promise<any> {
    const filter = {
      kinds: [0],
      authors: [publicKey],
      limit: 1,
    };

    const events = await this.queryRelays(filter);

    if (events.length > 0) {
      const event = events[0];
      try {
        return {
          event,
          metadata: JSON.parse(event.content),
          updatedAt: new Date(event.created_at * 1000).toISOString(),
        };
      } catch (error) {
        console.warn('Failed to parse profile metadata:', error);
        return {
          event,
          metadata: null,
          parseError: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return null;
  }

  /**
   * Retrieves relay list (kind 10002) from Nostr relays
   */
  private async retrieveRelayList(publicKey: string): Promise<any> {
    const filter = {
      kinds: [10002],
      authors: [publicKey],
      limit: 1,
    };

    const events = await this.queryRelays(filter);

    if (events.length > 0) {
      const event = events[0];
      const relays = event.tags
        .filter((tag: string[]) => tag[0] === 'r')
        .map((tag: string[]) => ({
          url: tag[1],
          type: tag[2] || 'read+write',
        }));

      return {
        event,
        relays,
        updatedAt: new Date(event.created_at * 1000).toISOString(),
      };
    }

    return null;
  }

  /**
   * Retrieves contact list (kind 3) from Nostr relays
   */
  private async retrieveContactList(publicKey: string): Promise<any> {
    const filter = {
      kinds: [3],
      authors: [publicKey],
      limit: 1,
    };

    const events = await this.queryRelays(filter);

    if (events.length > 0) {
      const event = events[0];
      const contacts = event.tags
        .filter((tag: string[]) => tag[0] === 'p')
        .map((tag: string[]) => ({
          pubkey: tag[1],
          relay: tag[2],
          petname: tag[3],
        }));

      return {
        event,
        contacts,
        contactCount: contacts.length,
        updatedAt: new Date(event.created_at * 1000).toISOString(),
      };
    }

    return null;
  }

  /**
   * Queries multiple Nostr relays for events
   */
  private async queryRelays(filter: any): Promise<any[]> {
    const allEvents: any[] = [];

    const results = await Promise.allSettled(
      this._relayService.DEFAULT_RELAYS.map((relay) => this.queryRelay(relay, filter)),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`Retrieved ${result.value.length} events from ${this._relayService.DEFAULT_RELAYS[index].name}`);
        allEvents.push(...result.value);
      } else if (result.status === 'rejected') {
        console.warn(`Failed to query ${this._relayService.DEFAULT_RELAYS[index].name}:`, result.reason);
      }
    });

    // Remove duplicates based on event id
    const uniqueEvents = allEvents.filter((event, index, self) => index === self.findIndex((e) => e.id === event.id));

    // Sort by created_at descending (newest first)
    uniqueEvents.sort((a, b) => b.created_at - a.created_at);

    console.log(`Retrieved ${uniqueEvents.length} unique events total`);
    return uniqueEvents;
  }

  /**
   * Queries a single Nostr relay for events
   */
  private async queryRelay(relay: NostrRelay, filter: any): Promise<any[]> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(relay.url);
        const events: any[] = [];
        let resolved = false;
        const subscriptionId = Math.random().toString(36).substring(7);

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            ws.close();
            resolve(events);
          }
        }, 5000);

        ws.onopen = () => {
          const request = ['REQ', subscriptionId, filter];
          ws.send(JSON.stringify(request));
        };

        ws.onmessage = (msg) => {
          try {
            const response = JSON.parse(msg.data);

            if (response[0] === 'EVENT' && response[1] === subscriptionId) {
              events.push(response[2]);
            } else if (response[0] === 'EOSE' && response[1] === subscriptionId) {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                ws.send(JSON.stringify(['CLOSE', subscriptionId]));
                ws.close();
                resolve(events);
              }
            }
          } catch (error) {
            console.warn(`Failed to parse message from ${relay.name}:`, error);
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve([]);
          }
        };

        ws.onclose = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(events);
          }
        };
      } catch (error) {
        resolve([]);
      }
    });
  }

  private extractNostrKeys(storedDID: StoredDID): {
    publicKey: string;
    privateKey: string;
  } | null {
    try {
      console.log('Extracting Nostr keys from DID:', storedDID.did);

      // For DID:Nostr, the public key is in the DID identifier
      const didParts = storedDID.did.split(':');
      if (didParts.length !== 3 || didParts[0] !== 'did' || didParts[1] !== 'nostr') {
        console.log('Invalid DID format for Nostr');
        return null;
      }

      let publicKey = didParts[2];

      if (publicKey.length === 66) {
        console.log('Converting 33-byte compressed key to 32-byte x-only format');
        publicKey = publicKey.substring(2);
      }

      console.log('Public key from DID:', publicKey.substring(0, 16) + '... (length:', publicKey.length, ')');

      // Try to get private key from stored data
      let privateKey = null;

      // Check if we have Nostr-specific keys stored
      if ((storedDID as any).nostrPrivateKey) {
        privateKey = (storedDID as any).nostrPrivateKey;
        console.log('Found Nostr private key in stored data');
      }
      // Fallback: try to derive from JWK if available
      else if (storedDID.privateKeyJwk?.d) {
        const privateKeyBytes = this._encodingService.base64UrlDecodeToBytes(storedDID.privateKeyJwk.d);
        privateKey = this._encodingService.bytesToHex(privateKeyBytes);

        // Also derive the correct public key using nostr-tools
        let correctPublicKey = getPublicKey(privateKeyBytes);

        if (correctPublicKey.length === 66) {
          correctPublicKey = correctPublicKey.substring(2);
        }

        console.log(
          'Derived keys from JWK - Public key:',
          correctPublicKey.substring(0, 16) + '... (length:',
          correctPublicKey.length,
          ')',
        );

        // Update the public key to match what nostr-tools generates
        return { publicKey: correctPublicKey, privateKey };
      }

      if (!privateKey) {
        console.log('No private key found');
        return null;
      }

      console.log('Successfully extracted both keys');
      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to extract Nostr keys:', error);
      return null;
    }
  }

  /**
   * Creates a Nostr event for DID document with encryption support
   */
  private async _createDIDEventWithEncryption(
    storedDID: StoredDID,
    keyPair: { publicKey: string; privateKey: string },
    publicDocument: any,
    extendedDataCID?: string,
    extendedDataHash?: string,
  ): Promise<NostrEvent> {
    const now = Math.floor(Date.now() / 1000);

    const tags: string[][] = [
      ['d', storedDID.did],
      ['t', 'did'],
      ['k', '30000'],
    ];

    if (extendedDataCID) {
      tags.push(['ipfs_cid', extendedDataCID]);
    }

    if (extendedDataHash) {
      tags.push(['ext_hash', extendedDataHash]);
    }

    if (extendedDataCID) {
      tags.push(['encryption', 'nip04']);
    }

    return {
      pubkey: keyPair.publicKey,
      created_at: now,
      kind: 30000,
      tags,
      content: JSON.stringify(publicDocument),
    };
  }

  private async generateNostrKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    console.log('Generating proper Nostr keypair...');
    const secretKey = generateSecretKey();
    let publicKey = getPublicKey(secretKey);

    if (publicKey.length === 66) {
      publicKey = publicKey.substring(2);
    }

    if (publicKey.length !== 64) {
      throw new Error(`Invalid Nostr public key length: ${publicKey.length} (expected 64 hex chars / 32 bytes)`);
    }

    console.log('Generated Nostr keys:', {
      publicKeyLength: publicKey.length,
      secretKeyLength: this._encodingService.bytesToHex(secretKey).length,
    });

    return {
      privateKey: this._encodingService.bytesToHex(secretKey),
      publicKey: publicKey,
    };
  }
}
