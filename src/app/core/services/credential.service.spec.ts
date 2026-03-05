import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BbsSignatureService } from './bbs-signature.service';
import { CredentialVerificationService } from './credential-verification.service';
import { CredentialService } from './credential.service';
import {
  CreateCredentialRequest,
  CredentialCategory,
  CredentialPrivacy,
  CredentialSource,
  VerifiableCredential,
} from './credential.types';
import { DidService } from './did.service';
import { StoredDID } from './did.types';
import { EncryptionService } from './encryption.service';
import { IpfsService } from './ipfs.service';
import { RelayService } from './relay.service';

describe('CredentialService - Core Business Logic', () => {
  let service: CredentialService;
  let mockLocalStorage: { [key: string]: string };
  let mockDidService: any;
  let mockBbsService: any;

  beforeEach(() => {
    mockLocalStorage = {};

    const localStorageMock = {
      getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: jest.fn(() => {
        mockLocalStorage = {};
      }),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    const mockDID: StoredDID = {
      did: 'did:nostr:issuer123',
      document: {},
      keySet: {},
      createdAt: '2024-01-01T00:00:00Z',
      isPublished: true,
      nostrPublicKey: '0'.repeat(64),
      nostrPrivateKey: '1'.repeat(64),
      bbsPublicKey: '2'.repeat(96),
      bbsSecretKey: '3'.repeat(64),
    };

    mockDidService = {
      getStoredDID: jest.fn((did: string) => mockDID),
      updateStoredDID: jest.fn((did: StoredDID) => true),
    };

    mockBbsService = {
      generateBbsKeyPair: jest.fn(async () => ({
        publicKey: new Uint8Array(48).fill(2),
        secretKey: new Uint8Array(32).fill(3),
      })),
      signCredential: jest.fn(async () => ({
        type: 'BbsBlsSignature2020',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:nostr:issuer123#bbs-key-1',
        proofValue: 'mockProofValue',
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        CredentialService,
        { provide: CredentialVerificationService, useValue: {} },
        { provide: DidService, useValue: mockDidService },
        { provide: BbsSignatureService, useValue: mockBbsService },
        { provide: EncryptionService, useValue: {} },
        { provide: IpfsService, useValue: {} },
        { provide: RelayService, useValue: {} },
      ],
    });

    service = TestBed.inject(CredentialService);
  });

  describe('_generateCredentialId()', () => {
    it('should generate ID in URN UUID format', () => {
      const id = (service as any)._generateCredentialId();
      expect(id).toMatch(/^urn:uuid:[0-9a-f-]+$/);
      expect(id.length).toBeGreaterThan(15);
    });

    it('should generate unique IDs', () => {
      const id1 = (service as any)._generateCredentialId();
      const id2 = (service as any)._generateCredentialId();
      const id3 = (service as any)._generateCredentialId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should always start with "urn:uuid:"', () => {
      for (let i = 0; i < 10; i++) {
        const id = (service as any)._generateCredentialId();
        expect(id.startsWith('urn:uuid:')).toBe(true);
      }
    });
  });

  describe('_hashVC()', () => {
    const sampleVC: VerifiableCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: 'urn:uuid:test-123',
      type: ['VerifiableCredential'],
      issuer: 'did:nostr:abc123',
      issuanceDate: '2024-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:nostr:holder123',
        name: 'Test User',
      },
    };

    it('should produce consistent hash for same VC', () => {
      const hash1 = (service as any)._hashVC(sampleVC);
      const hash2 = (service as any)._hashVC(sampleVC);

      expect(hash1).toBe(hash2);
    });

    it('should produce 64-character hex string (SHA-256)', () => {
      const hash = (service as any)._hashVC(sampleVC);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should produce different hashes for different VCs', () => {
      const vc2 = { ...sampleVC, id: 'urn:uuid:different-456' };

      const hash1 = (service as any)._hashVC(sampleVC);
      const hash2 = (service as any)._hashVC(vc2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash when credentialSubject changes', () => {
      const vc2 = {
        ...sampleVC,
        credentialSubject: {
          ...sampleVC.credentialSubject,
          name: 'Different Name',
        },
      };

      const hash1 = (service as any)._hashVC(sampleVC);
      const hash2 = (service as any)._hashVC(vc2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('_createVCPointerEvent()', () => {
    it('should create event with correct structure', async () => {
      const vcHash = 'a'.repeat(64);
      const ipfsCID = 'QmTest123456789';
      const holderDID = 'did:nostr:holder123';
      const issuerPubkey = 'b'.repeat(64);
      const subjectDID = 'did:nostr:subject456';

      const event = await (service as any)._createVCPointerEvent(vcHash, ipfsCID, holderDID, issuerPubkey, subjectDID);

      expect(event.kind).toBe(1);
      expect(event.pubkey).toBe(issuerPubkey);
      expect(event.content).toBe('VC Pointer');
      expect(event.created_at).toBeGreaterThan(0);
    });

    it('should include all required tags', async () => {
      const vcHash = 'a'.repeat(64);
      const ipfsCID = 'QmTest123456789';
      const holderDID = 'did:nostr:holder123';
      const issuerPubkey = 'b'.repeat(64);
      const subjectDID = 'did:nostr:subject456';

      const event = await (service as any)._createVCPointerEvent(vcHash, ipfsCID, holderDID, issuerPubkey, subjectDID);

      expect(event.tags).toEqual([
        ['p', holderDID],
        ['vc_hash', vcHash],
        ['ipfs_cid', ipfsCID],
        ['subject', subjectDID],
      ]);
    });

    it('should use current timestamp', async () => {
      const now = Math.floor(Date.now() / 1000);

      const event = await (service as any)._createVCPointerEvent('hash123', 'cid456', 'holder', 'issuer', 'subject');

      expect(event.created_at).toBeGreaterThanOrEqual(now - 1);
      expect(event.created_at).toBeLessThanOrEqual(now + 1);
    });
  });

  describe('createCredential()', () => {
    const baseRequest: CreateCredentialRequest = {
      issuerDID: 'did:nostr:issuer123',
      subjectDID: 'did:nostr:subject456',
      credentialData: {
        name: 'John Doe',
        age: 30,
      },
      name: 'Test Credential',
    };

    it('should create valid VC structure', async () => {
      const result = await service.createCredential(baseRequest);

      expect(result.credential).toBeDefined();
      expect(result.credential['@context']).toContain('https://www.w3.org/2018/credentials/v1');
      expect(result.credential.type).toContain('VerifiableCredential');
      expect(result.credential.issuer).toBe(baseRequest.issuerDID);
      expect(result.credential.name).toBe('Test Credential');
      expect(result.credential.credentialSubject.id).toBe(baseRequest.subjectDID);
      expect(result.credential.credentialSubject['name']).toBe('John Doe');
      expect(result.credential.credentialSubject['age']).toBe(30);
    });

    it('should generate unique credential ID', async () => {
      const result1 = await service.createCredential(baseRequest);
      const result2 = await service.createCredential(baseRequest);

      expect(result1.credential.id).toBeDefined();
      expect(result2.credential.id).toBeDefined();
      expect(result1.credential.id).not.toBe(result2.credential.id);
      expect(result1.credential.id).toMatch(/^urn:uuid:/);
    });

    it('should set issuanceDate to current time', async () => {
      const before = Date.now();
      const result = await service.createCredential(baseRequest);
      const after = Date.now();

      expect(result.credential.issuanceDate).toBeDefined();
      const issuanceTime = new Date(result.credential.issuanceDate).getTime();
      expect(issuanceTime).toBeGreaterThanOrEqual(before - 1000);
      expect(issuanceTime).toBeLessThanOrEqual(after + 1000);
    });

    it('should include expirationDate when provided', async () => {
      const expirationDate = '2025-12-31T23:59:59Z';
      const request = { ...baseRequest, expirationDate };

      const result = await service.createCredential(request);

      expect(result.credential.expirationDate).toBe(expirationDate);
    });

    it('should not include expirationDate when not provided', async () => {
      const result = await service.createCredential(baseRequest);

      expect(result.credential.expirationDate).toBeUndefined();
    });

    it('should set correct metadata defaults', async () => {
      const result = await service.createCredential(baseRequest);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.category).toBe(CredentialCategory.OTHER);
      expect(result.metadata!.privacy).toBe(CredentialPrivacy.PRIVATE);
      expect(result.metadata!.source).toBe(CredentialSource.SELF_ISSUED);
      expect(result.metadata!.templateId).toBeUndefined();
    });

    it('should use provided category and privacy', async () => {
      const request = {
        ...baseRequest,
        category: CredentialCategory.EDUCATION,
        privacy: CredentialPrivacy.PUBLIC,
      };

      const result = await service.createCredential(request);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.category).toBe(CredentialCategory.EDUCATION);
      expect(result.metadata!.privacy).toBe(CredentialPrivacy.PUBLIC);
    });

    it('should include tags when provided', async () => {
      const request = { ...baseRequest, tags: ['important', 'verified'] };

      const result = await service.createCredential(request);

      expect(result.tags).toEqual(['important', 'verified']);
    });

    it('should set isVerified to false initially', async () => {
      const result = await service.createCredential(baseRequest);

      expect(result.isVerified).toBe(false);
    });

    it('should set createdAt timestamp', async () => {
      const before = Date.now();
      const result = await service.createCredential(baseRequest);
      const after = Date.now();

      expect(result.createdAt).toBeDefined();
      const createdTime = new Date(result.createdAt).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before - 1000);
      expect(createdTime).toBeLessThanOrEqual(after + 1000);
    });

    it('should merge template context when templateId provided', async () => {
      const templates = [
        {
          id: 'test-template',
          name: 'Test Template',
          description: 'Test',
          category: CredentialCategory.EDUCATION,
          context: ['https://example.com/custom-context'],
          type: ['CustomCredential'],
          fields: [],
        },
      ];
      mockLocalStorage['veles_credential_templates'] = JSON.stringify(templates);

      const request = { ...baseRequest, templateId: 'test-template' };
      const result = await service.createCredential(request);

      expect(result.credential['@context']).toContain('https://example.com/custom-context');
      expect(result.credential.type).toContain('CustomCredential');
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.templateId).toBe('test-template');
    });
  });

  describe('importCredential()', () => {
    const validVC: VerifiableCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: 'urn:uuid:imported-123',
      type: ['VerifiableCredential'],
      issuer: 'did:nostr:issuer789',
      issuanceDate: '2024-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:nostr:holder789',
        name: 'Imported User',
      },
    };

    it('should import valid credential JSON', async () => {
      const credentialJson = JSON.stringify(validVC);

      const result = await service.importCredential(credentialJson);

      expect(result.credential).toEqual(validVC);
      expect(result.tags).toEqual(['imported']);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.source).toBe(CredentialSource.IMPORTED);
    });

    it('should use credential name from imported VC', async () => {
      const vcWithName = { ...validVC, name: 'Imported Credential Name' };
      const credentialJson = JSON.stringify(vcWithName);

      const result = await service.importCredential(credentialJson);

      expect(result.credential.name).toBe('Imported Credential Name');
    });

    it('should reject invalid JSON', async () => {
      const invalidJson = 'not valid json {';

      await expect(service.importCredential(invalidJson)).rejects.toThrow('Invalid credential format');
    });

    it('should reject credential without id', async () => {
      const invalidVC = { ...validVC };
      delete (invalidVC as any).id;
      const credentialJson = JSON.stringify(invalidVC);

      await expect(service.importCredential(credentialJson)).rejects.toThrow('Invalid credential format');
    });

    it('should reject credential without issuer', async () => {
      const invalidVC = { ...validVC };
      delete (invalidVC as any).issuer;
      const credentialJson = JSON.stringify(invalidVC);

      await expect(service.importCredential(credentialJson)).rejects.toThrow('Invalid credential format');
    });

    it('should reject credential without credentialSubject', async () => {
      const invalidVC = { ...validVC };
      delete (invalidVC as any).credentialSubject;
      const credentialJson = JSON.stringify(invalidVC);

      await expect(service.importCredential(credentialJson)).rejects.toThrow('Invalid credential format');
    });

    it('should set correct metadata', async () => {
      const credentialJson = JSON.stringify(validVC);

      const result = await service.importCredential(credentialJson);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.category).toBe(CredentialCategory.OTHER);
      expect(result.metadata!.privacy).toBe(CredentialPrivacy.PRIVATE);
      expect(result.metadata!.source).toBe(CredentialSource.IMPORTED);
      expect(result.isVerified).toBe(false);
    });
  });

  describe('getCredentialsByCategory()', () => {
    beforeEach(async () => {
      await service.createCredential({
        issuerDID: 'did:nostr:issuer1',
        subjectDID: 'did:nostr:subject1',
        credentialData: {},
        name: 'Education 1',
        category: CredentialCategory.EDUCATION,
      });

      await service.createCredential({
        issuerDID: 'did:nostr:issuer2',
        subjectDID: 'did:nostr:subject2',
        credentialData: {},
        name: 'Certification 1',
        category: CredentialCategory.CERTIFICATION,
      });

      await service.createCredential({
        issuerDID: 'did:nostr:issuer3',
        subjectDID: 'did:nostr:subject3',
        credentialData: {},
        name: 'Education 2',
        category: CredentialCategory.EDUCATION,
      });
    });

    it('should filter credentials by category', () => {
      const educationCreds = service.getCredentialsByCategory(CredentialCategory.EDUCATION);
      const certificationCreds = service.getCredentialsByCategory(CredentialCategory.CERTIFICATION);

      expect(educationCreds.length).toBe(2);
      expect(certificationCreds.length).toBe(1);
      expect(educationCreds.every((c) => c.metadata?.category === CredentialCategory.EDUCATION)).toBe(true);
    });

    it('should return empty array for category with no credentials', () => {
      const achievementCreds = service.getCredentialsByCategory(CredentialCategory.ACHIEVEMENT);

      expect(achievementCreds).toEqual([]);
    });
  });

  describe('getCredentialsByDID()', () => {
    const issuerDID = 'did:nostr:issuer-alice';
    const holderDID = 'did:nostr:holder-bob';
    const otherDID = 'did:nostr:other-charlie';

    beforeEach(async () => {
      await service.createCredential({
        issuerDID: issuerDID,
        subjectDID: holderDID,
        credentialData: {},
        name: 'Alice to Bob',
      });

      await service.createCredential({
        issuerDID: holderDID,
        subjectDID: otherDID,
        credentialData: {},
        name: 'Bob to Charlie',
      });

      await service.createCredential({
        issuerDID: otherDID,
        subjectDID: holderDID,
        credentialData: {},
        name: 'Charlie to Bob',
      });
    });

    it('should find credentials where DID is issuer', () => {
      const creds = service.getCredentialsByDID(issuerDID);

      expect(creds.length).toBe(1);
      expect(creds[0].credential.issuer).toBe(issuerDID);
    });

    it('should find credentials where DID is subject', () => {
      const creds = service.getCredentialsByDID(otherDID);

      expect(creds.length).toBe(2);
      expect(creds.some((c) => c.credential.credentialSubject.id === otherDID)).toBe(true);
      expect(creds.some((c) => c.credential.issuer === otherDID)).toBe(true);
    });

    it('should find credentials where DID is both issuer and subject', () => {
      const creds = service.getCredentialsByDID(holderDID);

      expect(creds.length).toBe(3);
    });

    it('should return empty array for unknown DID', () => {
      const creds = service.getCredentialsByDID('did:nostr:unknown');

      expect(creds).toEqual([]);
    });
  });
});
