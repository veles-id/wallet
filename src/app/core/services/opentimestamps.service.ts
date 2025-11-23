import { Injectable, inject } from '@angular/core';
import { EncodingService } from './encoding.service';

const OpenTimestamps = require('opentimestamps');

@Injectable({
  providedIn: 'root',
})
export class OpentimestampsService {
  private _encodingService = inject(EncodingService);
  async createTimestamp(dataHash: string): Promise<string> {
    try {
      const hashBytes = this._encodingService.hexToBytes(dataHash);

      const detached = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hashBytes);

      await OpenTimestamps.stamp(detached);

      const otsBytes = detached.serializeToBytes();
      return this._encodingService.bytesToBase64(otsBytes);
    } catch (error) {
      console.error('Failed to create OpenTimestamps proof:', error);
      throw new Error('Failed to create timestamp');
    }
  }

  async verifyTimestamp(otsProof: string, dataHash: string): Promise<number | null> {
    try {
      const otsBytes = this._encodingService.base64ToBytes(otsProof);
      const hashBytes = this._encodingService.hexToBytes(dataHash);

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
      const otsBytes = this._encodingService.base64ToBytes(otsProof);

      const ctx = new OpenTimestamps.Context.StreamDeserialization(otsBytes);
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(ctx);

      const upgraded = await OpenTimestamps.upgrade(detached);

      if (upgraded) {
        const upgradedBytes = detached.serializeToBytes();
        return this._encodingService.bytesToBase64(upgradedBytes);
      }

      return null;
    } catch (error) {
      console.error('Failed to upgrade OpenTimestamps proof:', error);
      return null;
    }
  }
}
