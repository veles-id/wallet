import { Injectable } from '@angular/core';

const OpenTimestamps = require('opentimestamps');

@Injectable({
  providedIn: 'root',
})
export class OpentimestampsService {
  async createTimestamp(dataHash: string): Promise<string> {
    try {
      const hashBytes = this._hexToBytes(dataHash);

      const detached = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hashBytes);

      await OpenTimestamps.stamp(detached);

      const otsBytes = detached.serializeToBytes();
      return this._bytesToBase64(otsBytes);
    } catch (error) {
      console.error('Failed to create OpenTimestamps proof:', error);
      throw new Error('Failed to create timestamp');
    }
  }

  async verifyTimestamp(otsProof: string, dataHash: string): Promise<number | null> {
    try {
      const otsBytes = this._base64ToBytes(otsProof);
      const hashBytes = this._hexToBytes(dataHash);

      const ctx = new OpenTimestamps.Context.StreamDeserialization(otsBytes);
      const detachedStamped = OpenTimestamps.DetachedTimestampFile.deserialize(ctx);

      const detachedOriginal = OpenTimestamps.DetachedTimestampFile.fromHash(
        new OpenTimestamps.Ops.OpSHA256(),
        hashBytes,
      );

      await OpenTimestamps.upgrade(detachedStamped);

      const result = await OpenTimestamps.verify(detachedStamped, detachedOriginal);

      if (result && typeof result === 'number') {
        return result;
      }

      return null;
    } catch (error) {
      console.error('Failed to verify OpenTimestamps proof:', error);
      return null;
    }
  }

  async upgradeTimestamp(otsProof: string): Promise<string | null> {
    try {
      const otsBytes = this._base64ToBytes(otsProof);

      const ctx = new OpenTimestamps.Context.StreamDeserialization(otsBytes);
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(ctx);

      const upgraded = await OpenTimestamps.upgrade(detached);

      if (upgraded) {
        const upgradedBytes = detached.serializeToBytes();
        return this._bytesToBase64(upgradedBytes);
      }

      return null;
    } catch (error) {
      console.error('Failed to upgrade OpenTimestamps proof:', error);
      return null;
    }
  }

  private _hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  private _bytesToBase64(bytes: Uint8Array): string {
    const binary = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('');
    return btoa(binary);
  }

  private _base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
