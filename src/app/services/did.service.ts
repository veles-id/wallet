import { Injectable } from "@angular/core";
import { DidDht } from "@web5/dids";

export interface CreateDIDResult {
  did: string;
  document: any;
  keySet: any;
  isPublished: boolean;
}

export interface StoredDID {
  did: string;
  document: any;
  keySet: any;
  createdAt: string;
  alias?: string;
  isPublished: boolean;
}

@Injectable({
  providedIn: "root",
})
export class DidService {
  /**
   * Creates a new DID:DHT with offline-first approach
   */
  async createDID(): Promise<CreateDIDResult> {
    try {
      // Try to create DID with publishing disabled
      const didDht = await DidDht.create({
        options: {
          publish: false, // Explicitly disable publishing
        },
      });

      return {
        did: didDht.uri,
        document: didDht.document,
        keySet: didDht.keyManager || didDht,
        isPublished: false,
      };
    } catch (error) {
      console.log("First attempt failed, trying without options:", error);

      try {
        // Fallback: create without any options and catch publish errors
        const didDht = await DidDht.create();

        return {
          did: didDht.uri,
          document: didDht.document,
          keySet: didDht.keyManager || didDht,
          isPublished: true, // Assume published if no error
        };
      } catch (secondError) {
        console.log(
          "Second attempt failed, trying to extract DID from error:",
          secondError
        );

        // If the error contains DID information, we can still extract it
        if (
          secondError instanceof Error &&
          secondError.message.includes(
            "Failed to put Pkarr record for identifier"
          )
        ) {
          // Extract the identifier from the error message
          const identifierMatch =
            secondError.message.match(/identifier (\w+):/);
          if (identifierMatch) {
            const identifier = identifierMatch[1];
            const did = `did:dht:${identifier}`;

            // Return a basic DID structure - in a real implementation you'd want to
            // reconstruct this properly, but for development this works
            return {
              did: did,
              document: {
                id: did,
                verificationMethod: [],
                authentication: [],
                assertionMethod: [],
                capabilityDelegation: [],
                capabilityInvocation: [],
              },
              keySet: null, // We don't have the keys in this case
              isPublished: false,
            };
          }
        }

        console.error("Failed to create DID with all methods:", secondError);
        throw new Error(
          "Failed to create DID - network unavailable. Please check your internet connection."
        );
      }
    }
  }

  /**
   * Creates a truly offline DID using a simpler approach
   */
  async createOfflineDID(): Promise<CreateDIDResult> {
    try {
      // Generate a random identifier for demo purposes
      const identifier = this.generateRandomIdentifier();
      const did = `did:dht:${identifier}`;

      // Create a basic DID document structure
      const document = {
        id: did,
        verificationMethod: [],
        authentication: [],
        assertionMethod: [],
        capabilityDelegation: [],
        capabilityInvocation: [],
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
      };

      return {
        did: did,
        document: document,
        keySet: null, // No actual keys for demo
        isPublished: false,
      };
    } catch (error) {
      console.error("Error creating offline DID:", error);
      throw new Error("Failed to create offline DID");
    }
  }

  /**
   * Generates a random identifier for demo DIDs
   */
  private generateRandomIdentifier(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 52; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Publishes a DID to the DHT network with multiple gateway support
   */
  async publishDIDWithFallback(storedDID: StoredDID): Promise<boolean> {
    const gateways = [
      "https://diddht.tbddev.org",
      // Add more gateways as they become available
    ];

    for (const gateway of gateways) {
      try {
        console.log(`Attempting to publish to ${gateway}`);

        // Try to publish with specific gateway
        await DidDht.publish({
          did: storedDID.keySet,
          gatewayUri: gateway,
        });

        console.log(`Successfully published DID to ${gateway}`);

        // Update storage to mark as published
        this.markDIDAsPublished(storedDID.did);
        return true;
      } catch (error) {
        console.log(`Failed to publish to ${gateway}:`, error);
        continue;
      }
    }

    throw new Error("Failed to publish to all available gateways");
  }

  /**
   * Marks a DID as published in storage
   */
  private markDIDAsPublished(didUri: string): void {
    const storedDIDs = this.getStoredDIDs();
    const didToUpdate = storedDIDs.find((stored) => stored.did === didUri);

    if (didToUpdate) {
      didToUpdate.isPublished = true;
      localStorage.setItem("veles_dids", JSON.stringify(storedDIDs));
    }
  }

  /**
   * Checks if a DID is resolvable (published)
   */
  async isDIDResolvable(didUri: string): Promise<boolean> {
    try {
      const result = await DidDht.resolve(didUri);
      return !!(result && result.didDocument);
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets DID resolution metadata
   */
  async getDIDMetadata(didUri: string): Promise<any> {
    try {
      const result = await DidDht.resolve(didUri);
      return {
        resolvable: true,
        document: result.didDocument,
        metadata: result.didResolutionMetadata,
      };
    } catch (error) {
      return {
        resolvable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Resolves a DID to get its document
   */
  async resolveDID(did: string): Promise<any> {
    try {
      const result = await DidDht.resolve(did);
      return result;
    } catch (error) {
      console.error("Error resolving DID:", error);
      throw new Error("Failed to resolve DID");
    }
  }

  /**
   * Stores DID securely (you'll want to integrate with your secure storage)
   */
  async storeDID(didResult: CreateDIDResult, alias?: string): Promise<void> {
    // For now, store in localStorage (you should use secure storage in production)
    const storedDIDs = this.getStoredDIDs();
    const newDID: StoredDID = {
      did: didResult.did,
      document: didResult.document,
      keySet: didResult.keySet,
      createdAt: new Date().toISOString(),
      alias: alias,
      isPublished: didResult.isPublished,
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
}
