import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DidSplitterService } from './did-splitter.service';
import { DIDDocument } from './did-splitter.types';

describe('DidSplitterService - Core Business Logic', () => {
  let service: DidSplitterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DidSplitterService],
    });
    service = TestBed.inject(DidSplitterService);
  });

  describe('splitDIDDocument()', () => {
    it('should split minimal DID document correctly', () => {
      const minimalDoc: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:abc123',
        verificationMethod: [
          {
            id: 'did:nostr:abc123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:abc123',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:abc123#key-1'],
        assertionMethod: ['did:nostr:abc123#key-1'],
      };

      const result = service.splitDIDDocument(minimalDoc);

      expect(result.publicDocument).toBeDefined();
      expect(result.extendedData).toBeDefined();
      expect(result.publicDocument.id).toBe('did:nostr:abc123');
      expect(result.publicDocument['@context']).toEqual(['https://www.w3.org/ns/did/v1']);
      expect(result.publicDocument.verificationMethod).toEqual(minimalDoc.verificationMethod);
      expect(result.publicDocument.authentication).toEqual(minimalDoc.authentication);
      expect(result.publicDocument.assertionMethod).toEqual(minimalDoc.assertionMethod);
    });

    it('should separate service endpoints to extended data', () => {
      const docWithService: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:xyz789',
        verificationMethod: [
          {
            id: 'did:nostr:xyz789#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:xyz789',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:xyz789#key-1'],
        service: [
          {
            id: 'did:nostr:xyz789#nostr',
            type: 'NostrRelay',
            serviceEndpoint: ['wss://relay.example.com', 'wss://relay2.example.com'],
          },
        ],
      };

      const result = service.splitDIDDocument(docWithService);

      expect((result.publicDocument as any)['service']).toBeUndefined();
      expect(result.extendedData.service).toBeDefined();
      expect(result.extendedData.service).toEqual(docWithService.service);
    });

    it('should separate alsoKnownAs to extended data', () => {
      const docWithAlsoKnownAs: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:test123',
        verificationMethod: [
          {
            id: 'did:nostr:test123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:test123',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:test123#key-1'],
        alsoKnownAs: ['did:example:alternative', 'https://example.com/profile'],
      };

      const result = service.splitDIDDocument(docWithAlsoKnownAs);

      expect((result.publicDocument as any)['alsoKnownAs']).toBeUndefined();
      expect(result.extendedData.alsoKnownAs).toBeDefined();
      expect(result.extendedData.alsoKnownAs).toEqual(docWithAlsoKnownAs.alsoKnownAs);
    });

    it('should separate custom metadata to extended data', () => {
      const docWithMetadata: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:meta456',
        verificationMethod: [
          {
            id: 'did:nostr:meta456#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:meta456',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:meta456#key-1'],
        metadata: {
          profile: {
            name: 'Alice',
            bio: 'Developer',
          },
          preferences: {
            theme: 'dark',
          },
        },
        customField: 'custom value',
      };

      const result = service.splitDIDDocument(docWithMetadata);

      expect((result.publicDocument as any)['metadata']).toBeUndefined();
      expect((result.publicDocument as any)['customField']).toBeUndefined();
      expect(result.extendedData['metadata']).toBeDefined();
      expect(result.extendedData['customField']).toBe('custom value');
    });

    it('should handle all verification relationship fields', () => {
      const fullDoc: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:full999',
        verificationMethod: [
          {
            id: 'did:nostr:full999#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:full999',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:full999#key-1'],
        assertionMethod: ['did:nostr:full999#key-1'],
        keyAgreement: ['did:nostr:full999#key-2'],
        capabilityInvocation: ['did:nostr:full999#key-1'],
        capabilityDelegation: ['did:nostr:full999#key-3'],
      };

      const result = service.splitDIDDocument(fullDoc);

      expect(result.publicDocument.authentication).toEqual(fullDoc.authentication);
      expect(result.publicDocument.assertionMethod).toEqual(fullDoc.assertionMethod);
      expect(result.publicDocument.keyAgreement).toEqual(fullDoc.keyAgreement);
      expect(result.publicDocument.capabilityInvocation).toEqual(fullDoc.capabilityInvocation);
      expect(result.publicDocument.capabilityDelegation).toEqual(fullDoc.capabilityDelegation);
      expect(Object.keys(result.extendedData).length).toBe(0);
    });

    it('should handle complex document with both public and extended fields', () => {
      const complexDoc: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/ed25519-2020/v1'],
        id: 'did:nostr:complex123',
        verificationMethod: [
          {
            id: 'did:nostr:complex123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:complex123',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:complex123#key-1'],
        assertionMethod: ['did:nostr:complex123#key-1'],
        service: [
          {
            id: 'did:nostr:complex123#nostr',
            type: 'NostrRelay',
            serviceEndpoint: ['wss://relay.example.com'],
          },
        ],
        alsoKnownAs: ['did:example:123'],
        metadata: { created: '2024-01-01' },
      };

      const result = service.splitDIDDocument(complexDoc);

      expect(result.publicDocument.id).toBe('did:nostr:complex123');
      expect(result.publicDocument.verificationMethod).toEqual(complexDoc.verificationMethod);
      expect(result.publicDocument.authentication).toEqual(complexDoc.authentication);
      expect((result.publicDocument as any)['service']).toBeUndefined();
      expect(result.extendedData.service).toEqual(complexDoc.service);
      expect(result.extendedData.alsoKnownAs).toEqual(complexDoc.alsoKnownAs);
      expect(result.extendedData['metadata']).toEqual(complexDoc['metadata']);
    });

    it('should return empty extended data for minimal public-only document', () => {
      const publicOnlyDoc: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:public123',
        verificationMethod: [
          {
            id: 'did:nostr:public123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:public123',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
      };

      const result = service.splitDIDDocument(publicOnlyDoc);

      expect(Object.keys(result.extendedData).length).toBe(0);
    });
  });

  describe('mergeDIDDocuments()', () => {
    it('should merge public and extended data back into full document', () => {
      const publicDoc = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:merge123',
        verificationMethod: [
          {
            id: 'did:nostr:merge123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:merge123',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:merge123#key-1'],
      };

      const extendedData = {
        service: [
          {
            id: 'did:nostr:merge123#nostr',
            type: 'NostrRelay',
            serviceEndpoint: ['wss://relay.example.com'],
          },
        ],
        metadata: { test: 'value' },
      };

      const merged = service.mergeDIDDocuments(publicDoc, extendedData);

      expect(merged['@context']).toEqual(publicDoc['@context']);
      expect(merged.id).toBe(publicDoc.id);
      expect(merged.verificationMethod).toEqual(publicDoc.verificationMethod);
      expect(merged.authentication).toEqual(publicDoc.authentication);
      expect(merged.service).toEqual(extendedData.service);
      expect(merged['metadata']).toEqual(extendedData['metadata']);
    });

    it('should merge correctly when extended data is empty', () => {
      const publicDoc = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:empty123',
        verificationMethod: [
          {
            id: 'did:nostr:empty123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:empty123',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
      };

      const extendedData = {};

      const merged = service.mergeDIDDocuments(publicDoc, extendedData);

      expect(merged).toEqual(publicDoc);
    });

    it('should correctly round-trip split and merge', () => {
      const originalDoc: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:nostr:roundtrip123',
        verificationMethod: [
          {
            id: 'did:nostr:roundtrip123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:nostr:roundtrip123',
            publicKeyMultibase: 'z6Mk...',
          },
        ],
        authentication: ['did:nostr:roundtrip123#key-1'],
        service: [
          {
            id: 'did:nostr:roundtrip123#nostr',
            type: 'NostrRelay',
            serviceEndpoint: 'wss://relay.example.com',
          },
        ],
        alsoKnownAs: ['did:example:alt'],
      };

      const { publicDocument, extendedData } = service.splitDIDDocument(originalDoc);
      const merged = service.mergeDIDDocuments(publicDocument, extendedData);

      expect(merged).toEqual(originalDoc);
    });
  });

  describe('hasExtendedData()', () => {
    it('should return true when extended data has properties', () => {
      const extendedData = {
        service: [
          {
            id: 'test',
            type: 'Test',
            serviceEndpoint: 'https://example.com',
          },
        ],
      };

      expect(service.hasExtendedData(extendedData)).toBe(true);
    });

    it('should return false when extended data is empty', () => {
      const extendedData = {};

      expect(service.hasExtendedData(extendedData)).toBe(false);
    });

    it('should return true for multiple extended fields', () => {
      const extendedData = {
        service: [],
        alsoKnownAs: ['test'],
        metadata: { key: 'value' },
      };

      expect(service.hasExtendedData(extendedData)).toBe(true);
    });
  });
});
