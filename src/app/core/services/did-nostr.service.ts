import { Injectable } from '@angular/core';
import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from 'nostr-tools/pure';
import { NostrDIDResult, NostrEvent, NostrRelay, StoredDID } from './did.types';

@Injectable({
  providedIn: 'root',
})
export class DidNostrService {
  /**
   * Recommended 5-10 reliable, diverse relays for production use
   * For development, 3 stable relays are enough
   * In decentralized systems, redundancy is resilience, not waste.
   */
  private readonly DEFAULT_RELAYS: NostrRelay[] = [
    // Tier 1: Major stable
    { url: 'wss://relay.damus.io', name: 'Damus' },
    { url: 'wss://nos.lol', name: 'nos.lol' },
    { url: 'wss://relay.nostr.band', name: 'Nostr Band' },
    // Tier 2: Regional
    // { url: "wss://nostr.wine", name: "Nostr.wine Europe" },
    // { url: "wss://relay.current.fyi", name: "Current Asia" },
    // Tier 3: Specialized / Bitcoin-focused
    // { url: "wss://bitcoiner.guide", name: "Bitcoiner" },
    // { url: "wss://nostr.bitcoiner.guide", name: "Nostr.bitcoiner.guide" },
    // { url: "wss://nostr.zebedee.io", name: "Nostr.zebedee.io" },
  ];

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
            serviceEndpoint: this.DEFAULT_RELAYS.map((r) => r.url),
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
      console.log('Publishing DID:Nostr...');
      console.log('DID to publish:', storedDID.did);

      if (!storedDID.did.startsWith('did:nostr:')) {
        throw new Error('Can only publish DID:Nostr documents to Nostr relays');
      }

      const nostrKeys = this.extractNostrKeys(storedDID);
      if (!nostrKeys) {
        throw new Error('Could not extract Nostr keys from DID');
      }
      console.log('Extracted keys - Public:', nostrKeys.publicKey.substring(0, 16) + '...');

      const event = await this.createDIDEvent(storedDID, nostrKeys);
      console.log('Created event:', {
        kind: event.kind,
        pubkey: event.pubkey.substring(0, 16) + '...',
        tags: event.tags,
        contentLength: event.content.length,
      });

      const signedEvent = await this.signEvent(event, nostrKeys.privateKey);
      console.log('Signed event - ID:', signedEvent.id?.substring(0, 16) + '...');

      const publishResults = await this.publishToRelays(signedEvent);

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

      const signedEvent = await this.signEvent(event, nostrKeys.privateKey);
      const publishResults = await this.publishToRelays(signedEvent);

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

  async retrieveDIDInfo(did: string): Promise<any> {
    try {
      console.log('Retrieving DID:Nostr information from network:', did);

      if (!did.startsWith('did:nostr:')) {
        throw new Error('Not a valid DID:Nostr identifier');
      }

      const publicKey = did.split(':')[2];
      if (!publicKey || publicKey.length !== 64) {
        throw new Error('Invalid public key in DID:Nostr');
      }

      console.log('Extracted public key:', publicKey.substring(0, 16) + '...');

      const results = await Promise.allSettled([
        this.retrieveDIDDocument(publicKey),
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
   * Retrieves DID document from Nostr relays
   */
  private async retrieveDIDDocument(publicKey: string): Promise<any> {
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
        return {
          event,
          document: JSON.parse(event.content),
          publishedAt: new Date(event.created_at * 1000).toISOString(),
        };
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

    const results = await Promise.allSettled(this.DEFAULT_RELAYS.map((relay) => this.queryRelay(relay, filter)));

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`Retrieved ${result.value.length} events from ${this.DEFAULT_RELAYS[index].name}`);
        allEvents.push(...result.value);
      } else if (result.status === 'rejected') {
        console.warn(`Failed to query ${this.DEFAULT_RELAYS[index].name}:`, result.reason);
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

      const publicKey = didParts[2];
      console.log('Public key from DID:', publicKey.substring(0, 16) + '...');

      // Try to get private key from stored data
      let privateKey = null;

      // Check if we have Nostr-specific keys stored
      if ((storedDID as any).nostrPrivateKey) {
        privateKey = (storedDID as any).nostrPrivateKey;
        console.log('Found Nostr private key in stored data');
      }
      // Fallback: try to derive from JWK if available
      else if (storedDID.privateKeyJwk?.d) {
        const privateKeyBytes = this.base64UrlDecode(storedDID.privateKeyJwk.d);
        privateKey = this.bytesToHex(privateKeyBytes);

        // Also derive the correct public key using nostr-tools
        const correctPublicKey = getPublicKey(privateKeyBytes);
        console.log('Derived keys from JWK - Public key:', correctPublicKey.substring(0, 16) + '...');

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
   * Creates a Nostr event for DID document
   */
  private async createDIDEvent(
    storedDID: StoredDID,
    keyPair: { publicKey: string; privateKey: string },
  ): Promise<NostrEvent> {
    const now = Math.floor(Date.now() / 1000);

    return {
      pubkey: keyPair.publicKey,
      created_at: now,
      kind: 30000, // Parameterized replaceable event for DID documents
      tags: [
        ['d', storedDID.did], // DID identifier
        ['t', 'did'], // Topic tag
        ['k', '30000'], // Kind tag
      ],
      content: JSON.stringify(storedDID.document),
    };
  }

  private async signEvent(event: NostrEvent, privateKeyHex: string): Promise<NostrEvent> {
    try {
      console.log('Signing Nostr event with proper tools...');

      const secretKey = this.hexToBytes(privateKeyHex);

      // Create unsigned event template
      const unsignedEvent = {
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags,
        content: event.content,
      };

      console.log('Event to sign:', {
        pubkey: event.pubkey.substring(0, 16) + '...',
        created_at: event.created_at,
        kind: event.kind,
        tagsCount: event.tags.length,
        contentLength: event.content.length,
      });

      const signedEvent = finalizeEvent(unsignedEvent, secretKey);

      console.log('Event signed with nostr-tools:', {
        id: signedEvent.id.substring(0, 16) + '...',
        sig: signedEvent.sig.substring(0, 16) + '...',
        sigLength: signedEvent.sig.length,
      });

      // Verify the signature
      const isValid = verifyEvent(signedEvent);
      console.log('Signature verification:', isValid ? 'VALID' : 'INVALID');

      return signedEvent as NostrEvent;
    } catch (error) {
      console.error('Failed to sign event:', error);
      throw error;
    }
  }

  private async publishToRelays(event: NostrEvent): Promise<
    Array<{
      relay: string;
      success: boolean;
      error?: string;
    }>
  > {
    const results = await Promise.allSettled(this.DEFAULT_RELAYS.map((relay) => this.publishToRelay(event, relay)));

    return results.map((result, index) => ({
      relay: this.DEFAULT_RELAYS[index].name,
      success: result.status === 'fulfilled' && result.value,
      error: result.status === 'rejected' ? result.reason?.message : undefined,
    }));
  }

  private async publishToRelay(event: NostrEvent, relay: NostrRelay): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`Connecting to ${relay.name} (${relay.url})...`);
        const ws = new WebSocket(relay.url);
        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log(`${relay.name}: Connection timeout`);
            ws.close();
            resolve(false);
          }
        }, 10000); // 10 second timeout

        ws.onopen = () => {
          console.log(`${relay.name}: Connected, sending event...`);
          const message = JSON.stringify(['EVENT', event]);
          console.log(`${relay.name}: Sending message:`, {
            type: 'EVENT',
            eventId: event.id?.substring(0, 16) + '...',
            messageLength: message.length,
          });
          ws.send(message);
        };

        ws.onmessage = (msg) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();

            try {
              const response = JSON.parse(msg.data);
              console.log(`${relay.name}: Received response:`, response);

              // Check if it's an OK response for our event
              if (response[0] === 'OK' && response[1] === event.id) {
                const success = response[2] === true;
                console.log(`${relay.name}: ${success ? 'Accepted' : 'Rejected'} - ${response[3] || 'No message'}`);
                resolve(success);
              } else {
                console.log(`${relay.name}: Unexpected response format`);
                resolve(false);
              }
            } catch (parseError) {
              console.log(`${relay.name}: Failed to parse response:`, parseError);
              resolve(false);
            }
          }
        };

        ws.onerror = (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log(`${relay.name}: WebSocket error:`, error);
            resolve(false);
          }
        };

        ws.onclose = (event) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log(`${relay.name}: Connection closed:`, {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            });
            resolve(false);
          }
        };
      } catch (error) {
        console.log(`${relay.name}: Failed to create WebSocket:`, error);
        resolve(false);
      }
    });
  }

  private async generateNostrKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    console.log('Generating proper Nostr keypair...');
    const secretKey = generateSecretKey();
    const publicKey = getPublicKey(secretKey);

    console.log('Generated Nostr keys:', {
      publicKeyLength: publicKey.length,
      secretKeyLength: this.bytesToHex(secretKey).length,
    });

    return {
      privateKey: this.bytesToHex(secretKey),
      publicKey: publicKey,
    };
  }

  /**
   * Utility functions
   */
  private base64UrlDecode(base64Url: string): Uint8Array {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binaryString = atob(base64 + padding);
    return new Uint8Array(binaryString.split('').map((char) => char.charCodeAt(0)));
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}
