// DID

export enum DIDType {
  DHT = "dht",
  NOSTR = "nostr",
}

export interface CreateDIDResult {
  did: string;
  document: any;
  keySet: any;
  isPublished: boolean;
  didType?: DIDType;
}

export interface StoredDID {
  did: string;
  document: any;
  keySet: any;
  privateKeyJwk?: any;
  createdAt: string;
  alias?: string;
  isPublished: boolean;
  didType?: DIDType;
  nostrPrivateKey?: string;
  nostrPublicKey?: string;
}

// NOSTR

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

//DHT
