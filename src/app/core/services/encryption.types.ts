export interface EncryptionKeys {
  privateKey: string;
  publicKey: string;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}
