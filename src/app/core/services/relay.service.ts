import { Injectable } from '@angular/core';
import { finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import { NostrEvent, NostrRelay } from './did.types';

@Injectable({
  providedIn: 'root',
})
export class RelayService {
  /**
   * Recommended 5-10 reliable, diverse relays for production use
   * For development, 3 stable relays are enough
   * In decentralized systems, redundancy is resilience, not waste.
   */
  readonly DEFAULT_RELAYS: NostrRelay[] = [
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

  async signEvent(event: NostrEvent, privateKeyHex: string): Promise<NostrEvent> {
    try {
      const secretKey = this.hexToBytes(privateKeyHex);

      const unsignedEvent = {
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags,
        content: event.content,
      };

      const signedEvent = finalizeEvent(unsignedEvent, secretKey);

      const isValid = verifyEvent(signedEvent);
      if (!isValid) {
        throw new Error('Event signature verification failed');
      }

      console.log(`Event signed: ${signedEvent.id?.substring(0, 16)}...`);
      return signedEvent as NostrEvent;
    } catch (error) {
      console.error('Failed to sign event:', error);
      throw error;
    }
  }

  async publishToRelays(event: NostrEvent): Promise<
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

  async publishToRelay(event: NostrEvent, relay: NostrRelay): Promise<boolean> {
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
        }, 10000);

        ws.onopen = () => {
          console.log(`${relay.name}: Connected, sending event...`);
          const message = JSON.stringify(['EVENT', event]);
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

              if (response[0] === 'OK' && response[1] === event.id) {
                const success = response[2] === true;
                console.log(`${relay.name}: ${success ? 'Accepted' : 'Rejected'} - ${response[3] || 'No message'}`);
                resolve(success);
              } else if (response[0] === 'NOTICE') {
                console.log(`${relay.name}: ${response[1]}`);
                resolve(false);
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
            ws.close();
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

  hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
