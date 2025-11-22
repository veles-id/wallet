declare module '@mattrglobal/bbs-signatures' {
  export function generateBls12381G2KeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }>;

  export function blsSign(request: {
    keyPair: { secretKey: Uint8Array; publicKey: Uint8Array };
    messages: Uint8Array[];
  }): Promise<Uint8Array>;

  export function blsVerify(request: {
    publicKey: Uint8Array;
    messages: Uint8Array[];
    signature: Uint8Array;
  }): Promise<boolean>;

  export function blsCreateProof(request: {
    signature: Uint8Array;
    publicKey: Uint8Array;
    messages: Uint8Array[];
    nonce: Uint8Array;
    revealed: number[];
  }): Promise<Uint8Array>;

  export function blsVerifyProof(request: {
    proof: Uint8Array;
    publicKey: Uint8Array;
    messages: Uint8Array[];
    nonce: Uint8Array;
  }): Promise<boolean>;

  export const bls12381: {
    generateKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }>;
  };
}
