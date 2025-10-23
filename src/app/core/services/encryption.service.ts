import { Injectable } from '@angular/core';
import { cbc } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { sha256 } from '@noble/hashes/sha2';
import { getSharedSecret } from '@noble/secp256k1';
import { EncryptedData } from './encryption.types';

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  async encryptNIP04(plaintext: string, senderPrivateKey: string, recipientPublicKey: string): Promise<string> {
    const sharedSecret = await this.generateSharedSecret(senderPrivateKey, recipientPublicKey);
    const key = sha256(sharedSecret);
    const iv = randomBytes(16);

    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    const cipher = cbc(key, iv);
    const ciphertext = cipher.encrypt(plaintextBytes);

    const encryptedData: EncryptedData = {
      ciphertext: this.bytesToBase64(ciphertext),
      iv: this.bytesToBase64(iv),
    };

    return `${encryptedData.ciphertext}?iv=${encryptedData.iv}`;
  }

  async decryptNIP04(encryptedContent: string, recipientPrivateKey: string, senderPublicKey: string): Promise<string> {
    const [ciphertextB64, ivB64] = this.parseEncryptedContent(encryptedContent);

    const sharedSecret = await this.generateSharedSecret(recipientPrivateKey, senderPublicKey);
    const key = sha256(sharedSecret);

    const ciphertext = this.base64ToBytes(ciphertextB64);
    const iv = this.base64ToBytes(ivB64);

    const cipher = cbc(key, iv);
    const plaintextBytes = cipher.decrypt(ciphertext);

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  }

  async generateSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> {
    const privateKeyBytes = this.hexToBytes(privateKey);
    const publicKeyBytes = this.hexToBytes(publicKey);

    const sharedPoint = getSharedSecret(privateKeyBytes, publicKeyBytes);

    return sharedPoint.slice(1, 33);
  }

  private parseEncryptedContent(encryptedContent: string): [string, string] {
    const parts = encryptedContent.split('?iv=');

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted content format');
    }

    return [parts[0], parts[1]];
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }
}
