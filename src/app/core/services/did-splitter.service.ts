import { Injectable } from '@angular/core';
import { DIDDocument, ExtendedDIDData, PublicDIDDocument, SplitDIDResult } from './did-splitter.types';

@Injectable({
  providedIn: 'root',
})
export class DidSplitterService {
  private readonly PUBLIC_FIELDS = [
    '@context',
    'id',
    'verificationMethod',
    'authentication',
    'assertionMethod',
    'keyAgreement',
    'capabilityInvocation',
    'capabilityDelegation',
  ];

  splitDIDDocument(fullDocument: DIDDocument): SplitDIDResult {
    const publicDocument: PublicDIDDocument = {
      '@context': fullDocument['@context'],
      id: fullDocument.id,
    };

    const extendedData: ExtendedDIDData = {};

    for (const [key, value] of Object.entries(fullDocument)) {
      if (this.PUBLIC_FIELDS.includes(key)) {
        if (key !== '@context' && key !== 'id' && value !== undefined) {
          (publicDocument as any)[key] = value;
        }
      } else {
        extendedData[key] = value;
      }
    }

    return {
      publicDocument,
      extendedData,
    };
  }

  mergeDIDDocuments(publicDocument: PublicDIDDocument, extendedData: ExtendedDIDData): DIDDocument {
    return {
      ...publicDocument,
      ...extendedData,
    };
  }

  hasExtendedData(extendedData: ExtendedDIDData): boolean {
    return Object.keys(extendedData).length > 0;
  }
}
