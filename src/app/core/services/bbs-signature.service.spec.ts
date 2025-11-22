import { TestBed } from '@angular/core/testing';
import { BbsSignatureService } from './bbs-signature.service';
import { VerifiableCredential } from './credential.types';

describe('BbsSignatureService', () => {
  let service: BbsSignatureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BbsSignatureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateBbsKeyPair', () => {
    it('should generate BBS+ key pair with public and secret keys', async () => {
      const keys = await service.generateBbsKeyPair();

      expect(keys.publicKey).toBeDefined();
      expect(keys.secretKey).toBeDefined();
      expect(keys.publicKey).toBeInstanceOf(Uint8Array);
      expect(keys.secretKey).toBeInstanceOf(Uint8Array);
      expect(keys.publicKey.length).toBeGreaterThan(0);
      expect(keys.secretKey.length).toBeGreaterThan(0);
    });

    it('should generate different keys on each call', async () => {
      const keys1 = await service.generateBbsKeyPair();
      const keys2 = await service.generateBbsKeyPair();

      expect(keys1.secretKey).not.toEqual(keys2.secretKey);
      expect(keys1.publicKey).not.toEqual(keys2.publicKey);
    });
  });

  describe('signCredential', () => {
    let testCredential: VerifiableCredential;
    let keyPair: { publicKey: Uint8Array; secretKey: Uint8Array };

    beforeEach(async () => {
      keyPair = await service.generateBbsKeyPair();
      testCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test-credential-123',
        type: ['VerifiableCredential', 'UniversityDegreeCredential'],
        issuer: 'did:nostr:issuer123',
        issuanceDate: '2024-01-01T00:00:00Z',
        credentialSubject: {
          id: 'did:nostr:subject456',
          degree: 'Bachelor of Science',
          university: 'Test University',
        },
      };
    });

    it('should sign credential with BBS+', async () => {
      const proof = await service.signCredential(testCredential, keyPair.secretKey, keyPair.publicKey);

      expect(proof).toBeDefined();
      expect(proof.type).toBe('BbsBlsSignature2020');
      expect(proof.proofPurpose).toBe('assertionMethod');
      expect(proof.verificationMethod).toContain('issuer123');
      expect(proof.proofValue).toBeDefined();
      expect(proof.created).toBeDefined();
    });

    it('should create valid ISO timestamp in proof', async () => {
      const proof = await service.signCredential(testCredential, keyPair.secretKey, keyPair.publicKey);
      const createdDate = new Date(proof.created);

      expect(createdDate.toISOString()).toBe(proof.created);
      expect(createdDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should not include proof in signed credential', async () => {
      const credentialWithExistingProof = {
        ...testCredential,
        proof: {
          type: 'OldProof',
          created: '2023-01-01T00:00:00Z',
          proofPurpose: 'test',
          verificationMethod: 'test',
          proofValue: 'old-value',
        },
      };

      const proof = await service.signCredential(credentialWithExistingProof, keyPair.secretKey, keyPair.publicKey);

      expect(proof.type).toBe('BbsBlsSignature2020');
      expect(proof.proofValue).not.toBe('old-value');
    });
  });

  describe('verifyBbsSignature', () => {
    let testCredential: VerifiableCredential;
    let keyPair: { publicKey: Uint8Array; secretKey: Uint8Array };

    beforeEach(async () => {
      keyPair = await service.generateBbsKeyPair();
      testCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test-credential-456',
        type: ['VerifiableCredential'],
        issuer: 'did:nostr:issuer789',
        issuanceDate: '2024-01-01T00:00:00Z',
        credentialSubject: {
          id: 'did:nostr:subject789',
          name: 'Test User',
          email: 'test@example.com',
        },
      };
    });

    it('should verify valid BBS+ signature', async () => {
      const proof = await service.signCredential(testCredential, keyPair.secretKey, keyPair.publicKey);
      const signedCredential = { ...testCredential, proof };

      const isValid = await service.verifyBbsSignature(signedCredential, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should reject credential without proof', async () => {
      const isValid = await service.verifyBbsSignature(testCredential, keyPair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject credential with wrong signature type', async () => {
      const credentialWithWrongProof = {
        ...testCredential,
        proof: {
          type: 'Ed25519Signature2020',
          created: '2024-01-01T00:00:00Z',
          proofPurpose: 'assertionMethod',
          verificationMethod: 'did:nostr:issuer789#key-1',
          proofValue: 'invalid-signature',
        },
      };

      const isValid = await service.verifyBbsSignature(credentialWithWrongProof, keyPair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject tampered credential', async () => {
      const proof = await service.signCredential(testCredential, keyPair.secretKey, keyPair.publicKey);
      const signedCredential = { ...testCredential, proof };

      signedCredential.credentialSubject['name'] = 'Tampered Name';

      const isValid = await service.verifyBbsSignature(signedCredential, keyPair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', async () => {
      const proof = await service.signCredential(testCredential, keyPair.secretKey, keyPair.publicKey);
      const signedCredential = { ...testCredential, proof };

      const wrongKeyPair = await service.generateBbsKeyPair();
      const isValid = await service.verifyBbsSignature(signedCredential, wrongKeyPair.publicKey);

      expect(isValid).toBe(false);
    });
  });

  describe('createSelectiveDisclosureProof', () => {
    let testCredential: VerifiableCredential;
    let keyPair: { publicKey: Uint8Array; secretKey: Uint8Array };
    let signedCredential: VerifiableCredential;

    beforeEach(async () => {
      keyPair = await service.generateBbsKeyPair();
      testCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test-credential-789',
        type: ['VerifiableCredential', 'UniversityDegreeCredential'],
        issuer: 'did:nostr:issuer999',
        issuanceDate: '2024-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
        credentialSubject: {
          id: 'did:nostr:subject999',
          degree: 'Bachelor of Science',
          university: 'Test University',
          gpa: 3.8,
          graduationDate: '2024-05-15',
        },
      };

      const proof = await service.signCredential(testCredential, keyPair.secretKey, keyPair.publicKey);
      signedCredential = { ...testCredential, proof };
    });

    it('should create selective disclosure proof with subset of fields', async () => {
      const fieldsToReveal = ['credentialSubject.degree', 'credentialSubject.university'];
      const nonce = 'test-nonce-123';

      const derivedCredential = await service.createSelectiveDisclosureProof(
        signedCredential,
        fieldsToReveal,
        nonce,
        keyPair.publicKey,
      );

      expect(derivedCredential).toBeDefined();
      expect(derivedCredential.id).toBe(`${testCredential.id}-derived`);
      expect(derivedCredential.credentialSubject['degree']).toBe('Bachelor of Science');
      expect(derivedCredential.credentialSubject['university']).toBe('Test University');
      expect(derivedCredential.credentialSubject['gpa']).toBeUndefined();
      expect(derivedCredential.credentialSubject['graduationDate']).toBeUndefined();
    });

    it('should include BbsBlsSignatureProof2020 in derived credential', async () => {
      const fieldsToReveal = ['credentialSubject.degree'];
      const nonce = 'test-nonce-456';

      const derivedCredential = await service.createSelectiveDisclosureProof(
        signedCredential,
        fieldsToReveal,
        nonce,
        keyPair.publicKey,
      );

      expect(derivedCredential.proof).toBeDefined();
      expect(derivedCredential.proof?.type).toBe('BbsBlsSignatureProof2020');
      expect(derivedCredential.proof?.nonce).toBe(nonce);
      expect(derivedCredential.proof?.proofValue).toBeDefined();
    });

    it('should preserve issuer and issuance date in derived credential', async () => {
      const fieldsToReveal = ['credentialSubject.degree'];
      const nonce = 'test-nonce-789';

      const derivedCredential = await service.createSelectiveDisclosureProof(
        signedCredential,
        fieldsToReveal,
        nonce,
        keyPair.publicKey,
      );

      expect(derivedCredential.issuer).toBe(testCredential.issuer);
      expect(derivedCredential.issuanceDate).toBe(testCredential.issuanceDate);
      expect(derivedCredential.expirationDate).toBe(testCredential.expirationDate);
    });

    it('should always include credentialSubject.id in derived credential', async () => {
      const fieldsToReveal = ['credentialSubject.degree'];
      const nonce = 'test-nonce-abc';

      const derivedCredential = await service.createSelectiveDisclosureProof(
        signedCredential,
        fieldsToReveal,
        nonce,
        keyPair.publicKey,
      );

      expect(derivedCredential.credentialSubject.id).toBe(testCredential.credentialSubject.id);
    });

    it('should throw error for credential without BBS+ signature', async () => {
      const credentialWithoutBbsProof = {
        ...testCredential,
        proof: {
          type: 'Ed25519Signature2020',
          created: '2024-01-01T00:00:00Z',
          proofPurpose: 'assertionMethod',
          verificationMethod: 'did:nostr:issuer999#key-1',
          proofValue: 'some-signature',
        },
      };

      await expect(
        service.createSelectiveDisclosureProof(
          credentialWithoutBbsProof,
          ['credentialSubject.degree'],
          'nonce',
          keyPair.publicKey,
        ),
      ).rejects.toThrow('Credential must have BBS+ signature for selective disclosure');
    });

    it('should handle empty fields to reveal', async () => {
      const fieldsToReveal: string[] = [];
      const nonce = 'test-nonce-empty';

      const derivedCredential = await service.createSelectiveDisclosureProof(
        signedCredential,
        fieldsToReveal,
        nonce,
        keyPair.publicKey,
      );

      expect(derivedCredential.credentialSubject.id).toBe(testCredential.credentialSubject.id);
      expect(derivedCredential.credentialSubject['degree']).toBeUndefined();
      expect(derivedCredential.credentialSubject['university']).toBeUndefined();
    });

    it('should handle non-existent fields gracefully', async () => {
      const fieldsToReveal = ['credentialSubject.nonExistent', 'credentialSubject.degree'];
      const nonce = 'test-nonce-nonexistent';

      const derivedCredential = await service.createSelectiveDisclosureProof(
        signedCredential,
        fieldsToReveal,
        nonce,
        keyPair.publicKey,
      );

      expect(derivedCredential.credentialSubject['degree']).toBe('Bachelor of Science');
      expect(derivedCredential.credentialSubject['nonExistent']).toBeUndefined();
    });
  });
});
