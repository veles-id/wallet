import { TestBed } from '@angular/core/testing';
import { BbsSignatureService } from './bbs-signature.service';
import { CredentialVerificationService } from './credential-verification.service';
import { DidService } from './did.service';
import { OpentimestampsService } from './opentimestamps.service';
import { PresentationVerificationService } from './presentation-verification.service';
import { VerifiablePresentation } from './presentation.types';

jest.mock('@noble/ed25519', () => ({
  verify: jest.fn(() => Promise.resolve(true)),
  etc: {
    sha512Sync: jest.fn(),
  },
}));

describe('PresentationVerificationService', () => {
  let service: PresentationVerificationService;
  let mockCredentialVerificationService: jest.Mocked<Partial<CredentialVerificationService>>;
  let mockBbsService: jest.Mocked<Partial<BbsSignatureService>>;
  let mockDidService: jest.Mocked<Partial<DidService>>;
  let mockOtsService: jest.Mocked<Partial<OpentimestampsService>>;

  const createMockCredential = () => ({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:test-credential',
    type: ['VerifiableCredential'],
    issuer: 'did:nostr:issuer123',
    issuanceDate: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:nostr:subject123',
      degree: 'Bachelor of Science',
    },
    proof: {
      type: 'BbsBlsSignature2020',
      created: '2024-01-01T00:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: 'did:nostr:issuer123#bbs-key-1',
      proofValue: 'mockProofValue',
    },
  });

  const mockDID = {
    did: 'did:nostr:holder123',
    document: {},
    keySet: {},
    createdAt: '2024-01-01T00:00:00Z',
    isPublished: true,
    nostrPrivateKey: 'b'.repeat(64),
    nostrPublicKey: 'c'.repeat(64),
    bbsPublicKey: 'a'.repeat(64),
  };

  const createValidVP = (): VerifiablePresentation => {
    const now = new Date();
    const validUntil = new Date(now.getTime() + 5 * 60000);

    return {
      '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/security/bbs/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: [createMockCredential()],
      holder: 'did:nostr:holder123',
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
      proof: {
        type: 'Ed25519Signature2020',
        created: now.toISOString(),
        verificationMethod: 'did:nostr:holder123#key-1',
        proofPurpose: 'authentication',
        challenge: 'test-challenge',
        proofValue: 'mock-signature-value',
      },
    };
  };

  beforeEach(() => {
    const { verify } = require('@noble/ed25519');
    if (verify.mockReset) {
      verify.mockReset();
      verify.mockResolvedValue(true);
    }

    mockCredentialVerificationService = {
      verifyCredential: jest.fn(),
    };

    mockBbsService = {
      verifyBbsSignature: jest.fn(),
    };

    mockDidService = {
      getStoredDID: jest.fn(),
    };

    mockOtsService = {};

    TestBed.configureTestingModule({
      providers: [
        PresentationVerificationService,
        { provide: CredentialVerificationService, useValue: mockCredentialVerificationService },
        { provide: BbsSignatureService, useValue: mockBbsService },
        { provide: DidService, useValue: mockDidService },
        { provide: OpentimestampsService, useValue: mockOtsService },
      ],
    });

    service = TestBed.inject(PresentationVerificationService);

    jest.spyOn(service as any, '_verifyHolderSignature').mockResolvedValue(true);

    mockDidService.getStoredDID?.mockImplementation((did: string) => {
      if (did === 'did:nostr:holder123') {
        return mockDID as any;
      }
      if (did === 'did:nostr:issuer123') {
        return { ...mockDID, did: 'did:nostr:issuer123' } as any;
      }
      return null;
    });
    mockBbsService.verifyBbsSignature?.mockResolvedValue(true);
    mockCredentialVerificationService.verifyCredential?.mockResolvedValue({
      isValid: true,
      details: 'Valid',
      issuerResolved: true,
    });
  });

  describe('Structure Validation', () => {
    it('should reject VP with missing @context', async () => {
      const invalidVP = {
        type: ['VerifiablePresentation'],
        verifiableCredential: [createMockCredential()],
        holder: 'did:nostr:holder123',
        proof: {} as any,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('structure validation failed');
      expect(result.errors).toContain('Missing or invalid @context');
    });

    it('should reject VP with invalid @context', async () => {
      const invalidVP = {
        '@context': 'not-an-array',
        type: ['VerifiablePresentation'],
        verifiableCredential: [createMockCredential()],
        holder: 'did:nostr:holder123',
        proof: {} as any,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing or invalid @context');
    });

    it('should reject VP with missing type', async () => {
      const invalidVP = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        verifiableCredential: [createMockCredential()],
        holder: 'did:nostr:holder123',
        proof: {} as any,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing or invalid type');
    });

    it('should reject VP without VerifiablePresentation type', async () => {
      const invalidVP = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['SomethingElse'],
        verifiableCredential: [createMockCredential()],
        holder: 'did:nostr:holder123',
        proof: {} as any,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing or invalid type');
    });

    it('should reject VP with missing verifiableCredential', async () => {
      const invalidVP = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:nostr:holder123',
        proof: {} as any,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing or invalid verifiableCredential');
    });

    it('should reject VP with empty credentials array', async () => {
      const invalidVP = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [],
        holder: 'did:nostr:holder123',
        proof: {} as any,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('VP must contain at least one credential');
    });

    it('should reject VP with missing holder', async () => {
      const invalidVP = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [createMockCredential()],
        proof: {} as any,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing or invalid holder');
    });

    it('should reject VP with missing proof', async () => {
      const invalidVP = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [createMockCredential()],
        holder: 'did:nostr:holder123',
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing proof');
    });
  });

  describe('Time Constraints Validation', () => {
    it('should reject expired VP', async () => {
      const expiredVP = createValidVP();
      expiredVP.validUntil = new Date(Date.now() - 10000).toISOString();

      const result = await service.verifyPresentation(expiredVP);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('time constraints failed');
      expect(result.errors).toContain('VP is expired or not yet valid');
    });

    it('should reject VP not yet valid', async () => {
      const futureVP = createValidVP();
      futureVP.validFrom = new Date(Date.now() + 10000).toISOString();

      const result = await service.verifyPresentation(futureVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('VP is expired or not yet valid');
    });

    it('should accept VP within valid time window', async () => {
      const validVP = createValidVP();

      const result = await service.verifyPresentation(validVP);

      expect(result.isValid).toBe(true);
    });

    it('should accept VP without time constraints', async () => {
      const vpNoTime = createValidVP();
      delete vpNoTime.validFrom;
      delete vpNoTime.validUntil;

      const result = await service.verifyPresentation(vpNoTime);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Challenge Verification', () => {
    it('should reject VP with mismatched challenge', async () => {
      const vp = createValidVP();
      vp.proof.challenge = 'actual-challenge';

      const result = await service.verifyPresentation(vp, 'expected-challenge');

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('Challenge does not match');
      expect(result.errors).toContain('Challenge mismatch');
    });

    it('should accept VP with matching challenge', async () => {
      const vp = createValidVP();
      vp.proof.challenge = 'matching-challenge';

      const result = await service.verifyPresentation(vp, 'matching-challenge');

      expect(result.isValid).toBe(true);
    });

    it('should accept VP when no challenge expected', async () => {
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Holder Signature Verification', () => {
    it('should verify valid holder signature', async () => {
      const validVP = createValidVP();

      const result = await service.verifyPresentation(validVP);

      expect(result.isValid).toBe(true);
    });

    it('should reject VP when holder DID not found', async () => {
      jest.spyOn(service as any, '_verifyHolderSignature').mockResolvedValueOnce(false);
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('Invalid holder signature');
    });

    it('should reject VP with invalid signature', async () => {
      jest.spyOn(service as any, '_verifyHolderSignature').mockResolvedValueOnce(false);

      const vp = createValidVP();
      vp.proof.proofValue = 'invalid-signature';

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Holder signature verification failed');
    });

    it('should reject VP when holder has no public key', async () => {
      jest.spyOn(service as any, '_verifyHolderSignature').mockResolvedValueOnce(false);
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Holder signature verification failed');
    });
  });

  describe('Credential Verification', () => {
    it('should verify BBS+ signed credentials', async () => {
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
      expect(mockBbsService.verifyBbsSignature).toHaveBeenCalled();
    });

    it('should reject VP when BBS+ signature verification fails', async () => {
      mockBbsService.verifyBbsSignature?.mockResolvedValue(false);
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(false);
      expect(result.details).toContain('One or more credentials in VP failed verification');
    });

    it('should accept BBS+ selective disclosure proofs', async () => {
      const vp = createValidVP();
      vp.verifiableCredential[0].proof!.type = 'BbsBlsSignatureProof2020';

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
    });

    it('should verify multiple credentials', async () => {
      mockBbsService.verifyBbsSignature?.mockClear();
      mockBbsService.verifyBbsSignature?.mockResolvedValue(true);

      const vp = createValidVP();
      const secondCredential = createMockCredential();
      secondCredential.id = 'urn:uuid:second-credential';
      vp.verifiableCredential.push(secondCredential);

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
      expect(mockBbsService.verifyBbsSignature).toHaveBeenCalled();
    });

    it('should reject VP if any credential is invalid', async () => {
      mockBbsService.verifyBbsSignature?.mockClear();
      mockBbsService.verifyBbsSignature?.mockResolvedValue(false);

      const vp = createValidVP();
      const secondCredential = createMockCredential();
      secondCredential.id = 'urn:uuid:second-credential';
      vp.verifiableCredential.push(secondCredential);

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(false);
    });

    it('should handle BBS+ verification errors gracefully', async () => {
      mockBbsService.verifyBbsSignature?.mockClear();
      mockBbsService.verifyBbsSignature?.mockRejectedValue(new Error('Verification failed'));
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(false);
    });

    it('should reject credential when issuer DID not found', async () => {
      const vpWithInvalidIssuer = createValidVP();
      vpWithInvalidIssuer.verifiableCredential[0].issuer = 'did:nostr:unknown-issuer';

      const originalImpl = mockDidService.getStoredDID;
      mockDidService.getStoredDID = jest.fn().mockImplementation((did: string) => {
        if (did === 'did:nostr:holder123') return mockDID as any;
        return null;
      });

      const result = await service.verifyPresentation(vpWithInvalidIssuer);

      expect(result.isValid).toBe(false);
      mockDidService.getStoredDID = originalImpl;
    });

    it('should reject credential when issuer has no BBS+ public key', async () => {
      const originalImpl = mockDidService.getStoredDID;
      mockDidService.getStoredDID = jest.fn().mockImplementation((did: string) => {
        if (did === 'did:nostr:holder123') return mockDID as any;
        if (did === 'did:nostr:issuer123') return { ...mockDID, bbsPublicKey: undefined } as any;
        return null;
      });

      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(false);
      mockDidService.getStoredDID = originalImpl;
    });
  });

  describe('Full VP Verification Flow', () => {
    it('should successfully verify valid VP', async () => {
      const validVP = createValidVP();

      const result = await service.verifyPresentation(validVP);

      expect(result.isValid).toBe(true);
      expect(result.details).toBe('VP successfully verified');
      expect(result.issuerResolved).toBe(true);
      expect(result.verificationMethod).toBe('did:nostr:holder123#key-1');
      expect(result.signatureType).toBe('Ed25519Signature2020');
    });

    it('should include verification method in result', async () => {
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.verificationMethod).toBeDefined();
      expect(result.verificationMethod).toContain('did:nostr:holder123');
    });

    it('should include signature type in result', async () => {
      const vp = createValidVP();

      const result = await service.verifyPresentation(vp);

      expect(result.signatureType).toBe('Ed25519Signature2020');
    });

    it('should accumulate multiple error messages', async () => {
      const invalidVP = {
        '@context': 'invalid',
        type: 'invalid',
        verifiableCredential: [],
        holder: 123,
        proof: null,
      } as any;

      const result = await service.verifyPresentation(invalidVP);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should verify VP with domain', async () => {
      const vp = createValidVP();
      vp.proof.domain = 'example.com';

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
    });

    it('should verify VP with challenge and domain', async () => {
      const vp = createValidVP();
      vp.proof.challenge = 'test-challenge';
      vp.proof.domain = 'example.com';

      const result = await service.verifyPresentation(vp, 'test-challenge');

      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle VP with multiple contexts', async () => {
      const vp = createValidVP();
      vp['@context'].push('https://example.com/custom-context');

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
    });

    it('should handle VP with multiple types', async () => {
      const vp = createValidVP();
      vp.type.push('CustomPresentation');

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
    });

    it('should handle credential with issuer object', async () => {
      const vp = createValidVP();
      vp.verifiableCredential[0].issuer = { id: 'did:nostr:issuer123', name: 'Test Issuer' };

      mockDidService.getStoredDID?.mockImplementation((did: string) => {
        if (did === 'did:nostr:holder123') return mockDID as any;
        if (did === 'did:nostr:issuer123') return { ...mockDID, did: 'did:nostr:issuer123' } as any;
        return null;
      });

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
    });

    it('should handle very short validity window', async () => {
      const vp = createValidVP();
      const now = new Date();
      vp.validFrom = now.toISOString();
      vp.validUntil = new Date(now.getTime() + 100).toISOString();

      const result = await service.verifyPresentation(vp);

      expect(result.isValid).toBe(true);
    });
  });
});
