import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EncodingService {
  hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Hex string must have an even number of characters');
    }
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

  bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  base64UrlDecodeToString(base64Url: string): string {
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return atob(base64);
  }

  base64UrlDecodeToBytes(base64Url: string): Uint8Array {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binaryString = atob(base64 + padding);
    return new Uint8Array(binaryString.split('').map((char) => char.charCodeAt(0)));
  }

  multibaseToBytes(multibase: string): Uint8Array {
    if (!multibase.startsWith('z')) {
      throw new Error('Only base58btc multibase encoding supported');
    }
    throw new Error('Base58 decoding not implemented - use base64 proofValue instead');
  }
}
