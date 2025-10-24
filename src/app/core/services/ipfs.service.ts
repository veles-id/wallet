import { Injectable } from '@angular/core';
import { PinataSDK } from 'pinata';
import { environment } from '../../../environments/environment.dev';
import { IPFSRetrieveResult, IPFSUploadResult } from './ipfs.types';

@Injectable({
  providedIn: 'root',
})
export class IpfsService {
  private _pinata: PinataSDK;

  constructor() {
    this._pinata = new PinataSDK({
      pinataJwt: environment.pinata.jwt,
      pinataGateway: environment.pinata.gateway,
    });
  }

  async uploadEncryptedData(encryptedData: string, fileName: string): Promise<IPFSUploadResult> {
    try {
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const file = new File([blob], fileName, { type: 'application/octet-stream' });

      const upload = await this._pinata.upload.public.file(file);

      return {
        cid: upload.cid,
        size: upload.size,
        name: upload.name || fileName,
      };
    } catch (error) {
      console.error('Failed to upload encrypted data to IPFS:', error);
      throw new Error('IPFS upload failed');
    }
  }

  async uploadJSON(data: object, fileName: string): Promise<IPFSUploadResult> {
    try {
      const upload = await this._pinata.upload.public.json(data).name(fileName);

      return {
        cid: upload.cid,
        size: upload.size,
        name: upload.name || fileName,
      };
    } catch (error) {
      console.error('Failed to upload JSON to IPFS:', error);
      throw new Error('IPFS JSON upload failed');
    }
  }

  async retrieveData(cid: string): Promise<IPFSRetrieveResult> {
    try {
      const response = await this._pinata.gateways.public.get(cid);

      let data: string;
      if (response.data instanceof Blob) {
        data = await response.data.text();
      } else if (typeof response.data === 'string') {
        data = response.data;
      } else {
        data = JSON.stringify(response.data);
      }

      return {
        data,
        contentType: response.contentType || 'application/octet-stream',
      };
    } catch (error) {
      console.error('Failed to retrieve data from IPFS:', error);
      throw new Error('IPFS retrieval failed');
    }
  }
}
