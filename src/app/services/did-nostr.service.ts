import { Injectable } from "@angular/core";
import { CreateDIDResult, StoredDID } from "./did-dht.service";
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
} from "nostr-tools/pure";

export interface NostrEvent {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export interface NostrRelay {
  url: string;
  name: string;
}

export interface NostrDIDResult extends CreateDIDResult {
  nostrPublicKey: string;
  nostrPrivateKey: string;
}

@Injectable({
  providedIn: "root",
})
export class DidNostrService {
  private readonly DEFAULT_RELAYS: NostrRelay[] = [
    { url: "wss://relay.damus.io", name: "Damus" },
    { url: "wss://nos.lol", name: "nos.lol" },
    { url: "wss://relay.nostr.band", name: "Nostr Band" },
  ];

  constructor() {
    console.log("🟣 DID Nostr Service initialized");
  }

  /**
   * Creates a new DID:Nostr
   */
  async createDID(): Promise<NostrDIDResult> {
    try {
      console.log("🆕 Creating new DID:Nostr...");

      // Generate Nostr keypair
      const keyPair = await this.generateNostrKeyPair();

      // Create DID identifier from public key
      const did = `did:nostr:${keyPair.publicKey}`;

      // Create DID document
      const document = {
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
        id: did,
        verificationMethod: [
          {
            id: `${did}#key-1`,
            type: "Ed25519VerificationKey2020",
            controller: did,
            publicKeyMultibase: `z${keyPair.publicKey}`, // Multibase encoding
          },
        ],
        authentication: [`${did}#key-1`],
        assertionMethod: [`${did}#key-1`],
        service: [
          {
            id: `${did}#nostr`,
            type: "NostrRelay",
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
      console.error("❌ Failed to create DID:Nostr:", error);
      throw error;
    }
  }

  /**
   * Publishes a DID:Nostr document to Nostr relays
   */
  async publishDID(storedDID: StoredDID): Promise<boolean> {
    try {
      console.log("📡 Publishing DID:Nostr...");
      console.log("🔍 DID to publish:", storedDID.did);

      // Check if this is actually a DID:Nostr
      if (!storedDID.did.startsWith("did:nostr:")) {
        throw new Error("Can only publish DID:Nostr documents to Nostr relays");
      }

      // Extract Nostr keys from stored DID
      const nostrKeys = this.extractNostrKeys(storedDID);
      if (!nostrKeys) {
        throw new Error("Could not extract Nostr keys from DID");
      }
      console.log(
        "🔑 Extracted keys - Public:",
        nostrKeys.publicKey.substring(0, 16) + "..."
      );

      // Create Nostr event for DID document
      const event = await this.createDIDEvent(storedDID, nostrKeys);
      console.log("📝 Created event:", {
        kind: event.kind,
        pubkey: event.pubkey.substring(0, 16) + "...",
        tags: event.tags,
        contentLength: event.content.length,
      });

      // Sign the event
      const signedEvent = await this.signEvent(event, nostrKeys.privateKey);
      console.log(
        "✍️ Signed event - ID:",
        signedEvent.id?.substring(0, 16) + "..."
      );

      // Publish to relays
      const publishResults = await this.publishToRelays(signedEvent);

      // Log detailed results
      publishResults.forEach((result) => {
        if (result.success) {
          console.log(`✅ ${result.relay}: SUCCESS`);
        } else {
          console.log(
            `❌ ${result.relay}: FAILED${
              result.error ? ` - ${result.error}` : ""
            }`
          );
        }
      });

      const successCount = publishResults.filter((r) => r.success).length;
      console.log(
        `📊 Final result: ${successCount}/${publishResults.length} relays succeeded`
      );

      return successCount > 0;
    } catch (error) {
      console.error("❌ Failed to publish DID:Nostr:", error);
      throw error;
    }
  }

  /**
   * Extracts Nostr keys from a stored DID:Nostr
   */
  private extractNostrKeys(storedDID: StoredDID): {
    publicKey: string;
    privateKey: string;
  } | null {
    try {
      console.log("🔍 Extracting Nostr keys from DID:", storedDID.did);

      // For DID:Nostr, the public key is in the DID identifier
      const didParts = storedDID.did.split(":");
      if (
        didParts.length !== 3 ||
        didParts[0] !== "did" ||
        didParts[1] !== "nostr"
      ) {
        console.log("❌ Invalid DID format for Nostr");
        return null;
      }

      const publicKey = didParts[2];
      console.log(
        "📋 Public key from DID:",
        publicKey.substring(0, 16) + "..."
      );

      // Try to get private key from stored data
      let privateKey = null;

      // Check if we have Nostr-specific keys stored
      if ((storedDID as any).nostrPrivateKey) {
        privateKey = (storedDID as any).nostrPrivateKey;
        console.log("🔑 Found Nostr private key in stored data");
      }
      // Fallback: try to derive from JWK if available
      else if (storedDID.privateKeyJwk?.d) {
        const privateKeyBytes = this.base64UrlDecode(storedDID.privateKeyJwk.d);
        privateKey = this.bytesToHex(privateKeyBytes);

        // Also derive the correct public key using nostr-tools
        const correctPublicKey = getPublicKey(privateKeyBytes);
        console.log(
          "🔄 Derived keys from JWK - Public key:",
          correctPublicKey.substring(0, 16) + "..."
        );

        // Update the public key to match what nostr-tools generates
        return { publicKey: correctPublicKey, privateKey };
      }

      if (!privateKey) {
        console.log("❌ No private key found");
        return null;
      }

      console.log("✅ Successfully extracted both keys");
      return { publicKey, privateKey };
    } catch (error) {
      console.error("❌ Failed to extract Nostr keys:", error);
      return null;
    }
  }

  /**
   * Creates a Nostr event for DID document
   */
  private async createDIDEvent(
    storedDID: StoredDID,
    keyPair: { publicKey: string; privateKey: string }
  ): Promise<NostrEvent> {
    const now = Math.floor(Date.now() / 1000);

    return {
      pubkey: keyPair.publicKey,
      created_at: now,
      kind: 30000, // Parameterized replaceable event for DID documents
      tags: [
        ["d", storedDID.did], // DID identifier
        ["t", "did"], // Topic tag
        ["k", "30000"], // Kind tag
      ],
      content: JSON.stringify(storedDID.document),
    };
  }

  /**
   * Signs a Nostr event
   */
  private async signEvent(
    event: NostrEvent,
    privateKeyHex: string
  ): Promise<NostrEvent> {
    try {
      console.log("✍️ Signing Nostr event with proper tools...");

      const secretKey = this.hexToBytes(privateKeyHex);

      // Create unsigned event template
      const unsignedEvent = {
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags,
        content: event.content,
      };

      console.log("📝 Event to sign:", {
        pubkey: event.pubkey.substring(0, 16) + "...",
        created_at: event.created_at,
        kind: event.kind,
        tagsCount: event.tags.length,
        contentLength: event.content.length,
      });

      // Use nostr-tools to properly sign the event
      const signedEvent = finalizeEvent(unsignedEvent, secretKey);

      console.log("✅ Event signed with nostr-tools:", {
        id: signedEvent.id.substring(0, 16) + "...",
        sig: signedEvent.sig.substring(0, 16) + "...",
        sigLength: signedEvent.sig.length,
      });

      // Verify the signature
      const isValid = verifyEvent(signedEvent);
      console.log(
        "🔍 Signature verification:",
        isValid ? "✅ VALID" : "❌ INVALID"
      );

      return signedEvent as NostrEvent;
    } catch (error) {
      console.error("❌ Failed to sign event:", error);
      throw error;
    }
  }

  /**
   * Publishes event to multiple Nostr relays
   */
  private async publishToRelays(event: NostrEvent): Promise<
    Array<{
      relay: string;
      success: boolean;
      error?: string;
    }>
  > {
    const results = await Promise.allSettled(
      this.DEFAULT_RELAYS.map((relay) => this.publishToRelay(event, relay))
    );

    return results.map((result, index) => ({
      relay: this.DEFAULT_RELAYS[index].name,
      success: result.status === "fulfilled" && result.value,
      error: result.status === "rejected" ? result.reason?.message : undefined,
    }));
  }

  /**
   * Publishes event to a single Nostr relay
   */
  private async publishToRelay(
    event: NostrEvent,
    relay: NostrRelay
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`🔌 Connecting to ${relay.name} (${relay.url})...`);
        const ws = new WebSocket(relay.url);
        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log(`⏰ ${relay.name}: Connection timeout`);
            ws.close();
            resolve(false);
          }
        }, 10000); // 10 second timeout

        ws.onopen = () => {
          console.log(`🟢 ${relay.name}: Connected, sending event...`);
          const message = JSON.stringify(["EVENT", event]);
          console.log(`📤 ${relay.name}: Sending message:`, {
            type: "EVENT",
            eventId: event.id?.substring(0, 16) + "...",
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
              console.log(`📥 ${relay.name}: Received response:`, response);

              // Check if it's an OK response for our event
              if (response[0] === "OK" && response[1] === event.id) {
                const success = response[2] === true;
                console.log(
                  `${success ? "✅" : "❌"} ${relay.name}: ${
                    success ? "Accepted" : "Rejected"
                  } - ${response[3] || "No message"}`
                );
                resolve(success);
              } else {
                console.log(`❓ ${relay.name}: Unexpected response format`);
                resolve(false);
              }
            } catch (parseError) {
              console.log(
                `❌ ${relay.name}: Failed to parse response:`,
                parseError
              );
              resolve(false);
            }
          }
        };

        ws.onerror = (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log(`❌ ${relay.name}: WebSocket error:`, error);
            resolve(false);
          }
        };

        ws.onclose = (event) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log(`🔴 ${relay.name}: Connection closed:`, {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            });
            resolve(false);
          }
        };
      } catch (error) {
        console.log(`💥 ${relay.name}: Failed to create WebSocket:`, error);
        resolve(false);
      }
    });
  }

  /**
   * Generates a new Nostr keypair
   */
  private async generateNostrKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    console.log("🔑 Generating proper Nostr keypair...");
    const secretKey = generateSecretKey();
    const publicKey = getPublicKey(secretKey);

    console.log("✅ Generated Nostr keys:", {
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
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binaryString = atob(base64 + padding);
    return new Uint8Array(
      binaryString.split("").map((char) => char.charCodeAt(0))
    );
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}
