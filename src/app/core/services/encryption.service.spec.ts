import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { getPublicKey as getSecp256k1PublicKey, utils } from '@noble/secp256k1';
import { EncodingService } from './encoding.service';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let encodingService: EncodingService;
  let alicePrivateKey: string;
  let alicePublicKey: string;
  let bobPrivateKey: string;
  let bobPublicKey: string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EncryptionService);
    encodingService = TestBed.inject(EncodingService);

    const aliceSecretKey = utils.randomPrivateKey();
    alicePrivateKey = encodingService.bytesToHex(aliceSecretKey);
    alicePublicKey = encodingService.bytesToHex(getSecp256k1PublicKey(aliceSecretKey, true));

    const bobSecretKey = utils.randomPrivateKey();
    bobPrivateKey = encodingService.bytesToHex(bobSecretKey);
    bobPublicKey = encodingService.bytesToHex(getSecp256k1PublicKey(bobSecretKey, true));
  });

  describe('Round-trip encryption and decryption', () => {
    it('should encrypt and decrypt plaintext correctly (Alice to Bob)', async () => {
      const plaintext = 'Hello, Bob! This is a secret message.';

      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKey, alicePublicKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt plaintext correctly (Bob to Alice)', async () => {
      const plaintext = 'Hello, Alice! This is my response.';

      const encrypted = await service.encryptNIP04(plaintext, bobPrivateKey, alicePublicKey);
      const decrypted = await service.decryptNIP04(encrypted, alicePrivateKey, bobPublicKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle self-encryption (encrypt to own public key)', async () => {
      const plaintext = 'This is my private note.';

      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, alicePublicKey);
      const decrypted = await service.decryptNIP04(encrypted, alicePrivateKey, alicePublicKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', async () => {
      const plaintext = '';

      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKey, alicePublicKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle Unicode characters', async () => {
      const plaintext = 'Hello 世界! 🔐 Encrypted message with émojis and spëcial chars.';

      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKey, alicePublicKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings', async () => {
      const jsonData = JSON.stringify({
        id: 'did:nostr:abc123',
        type: 'VerifiableCredential',
        data: { name: 'Test', age: 30 },
      });

      const encrypted = await service.encryptNIP04(jsonData, alicePrivateKey, bobPublicKey);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKey, alicePublicKey);

      expect(decrypted).toBe(jsonData);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData));
    });

    it('should handle large text', async () => {
      const plaintext = 'A'.repeat(10000);

      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKey, alicePublicKey);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Encrypted content format', () => {
    it('should produce encrypted content in expected format (ciphertext?iv=base64)', async () => {
      const plaintext = 'Test message';

      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);

      expect(encrypted).toContain('?iv=');
      const parts = encrypted.split('?iv=');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBeTruthy();
      expect(parts[1]).toBeTruthy();
    });

    it('should produce different ciphertexts for same plaintext (due to random IV)', async () => {
      const plaintext = 'Same message';

      const encrypted1 = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);
      const encrypted2 = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = await service.decryptNIP04(encrypted1, bobPrivateKey, alicePublicKey);
      const decrypted2 = await service.decryptNIP04(encrypted2, bobPrivateKey, alicePublicKey);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });
  });

  describe('Shared secret generation', () => {
    it('should generate same shared secret from both key pairs', async () => {
      const sharedSecretAliceBob = await service.generateSharedSecret(alicePrivateKey, bobPublicKey);
      const sharedSecretBobAlice = await service.generateSharedSecret(bobPrivateKey, alicePublicKey);

      expect(sharedSecretAliceBob).toEqual(sharedSecretBobAlice);
    });

    it('should generate different shared secrets for different key pairs', async () => {
      const charlieSecretKey = utils.randomPrivateKey();
      const charliePrivateKey = encodingService.bytesToHex(charlieSecretKey);
      const charliePublicKey = encodingService.bytesToHex(getSecp256k1PublicKey(charlieSecretKey, true));

      const sharedSecretAliceBob = await service.generateSharedSecret(alicePrivateKey, bobPublicKey);
      const sharedSecretAliceCharlie = await service.generateSharedSecret(alicePrivateKey, charliePublicKey);

      expect(sharedSecretAliceBob).not.toEqual(sharedSecretAliceCharlie);
    });

    it('should generate consistent shared secret (deterministic)', async () => {
      const sharedSecret1 = await service.generateSharedSecret(alicePrivateKey, bobPublicKey);
      const sharedSecret2 = await service.generateSharedSecret(alicePrivateKey, bobPublicKey);

      expect(sharedSecret1).toEqual(sharedSecret2);
    });
  });

  describe('X-only public key handling', () => {
    it('should handle x-only public keys (32 bytes)', async () => {
      const secretKey = utils.randomPrivateKey();
      const privateKeyHex = encodingService.bytesToHex(secretKey);
      const compressedPublicKey = getSecp256k1PublicKey(secretKey, true);
      const xOnlyPublicKeyHex = encodingService.bytesToHex(compressedPublicKey.slice(1));

      expect(xOnlyPublicKeyHex.length).toBe(64);

      const sharedSecret = await service.generateSharedSecret(privateKeyHex, xOnlyPublicKeyHex);

      expect(sharedSecret).toBeDefined();
      expect(sharedSecret.length).toBe(32);
    });

    it('should produce same shared secret for x-only and compressed formats', async () => {
      const secretKey = utils.randomPrivateKey();
      const privateKeyHex = encodingService.bytesToHex(secretKey);
      const compressedPublicKey = getSecp256k1PublicKey(secretKey, true);
      const compressedPublicKeyHex = encodingService.bytesToHex(compressedPublicKey);
      const xOnlyPublicKeyHex = encodingService.bytesToHex(compressedPublicKey.slice(1));

      const sharedSecretCompressed = await service.generateSharedSecret(alicePrivateKey, compressedPublicKeyHex);
      const sharedSecretXOnly = await service.generateSharedSecret(alicePrivateKey, xOnlyPublicKeyHex);

      expect(sharedSecretCompressed).toEqual(sharedSecretXOnly);
    });

    it('should encrypt and decrypt with x-only public keys (Nostr format)', async () => {
      const aliceSecretKey = utils.randomPrivateKey();
      const alicePrivateKeyHex = encodingService.bytesToHex(aliceSecretKey);
      const aliceCompressedPubKey = getSecp256k1PublicKey(aliceSecretKey, true);
      const aliceXOnlyPubKeyHex = encodingService.bytesToHex(aliceCompressedPubKey.slice(1));

      const bobSecretKey = utils.randomPrivateKey();
      const bobPrivateKeyHex = encodingService.bytesToHex(bobSecretKey);
      const bobCompressedPubKey = getSecp256k1PublicKey(bobSecretKey, true);
      const bobXOnlyPubKeyHex = encodingService.bytesToHex(bobCompressedPubKey.slice(1));

      const plaintext = 'Message encrypted with x-only Nostr public keys';

      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKeyHex, bobXOnlyPubKeyHex);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKeyHex, aliceXOnlyPubKeyHex);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle mixed key formats in encryption/decryption', async () => {
      const compressedBobPubKey = bobPublicKey;
      const xOnlyBobPubKey = compressedBobPubKey.substring(2);

      const plaintext = 'Testing mixed key formats';

      const encryptedWithCompressed = await service.encryptNIP04(plaintext, alicePrivateKey, compressedBobPubKey);
      const encryptedWithXOnly = await service.encryptNIP04(plaintext, alicePrivateKey, xOnlyBobPubKey);

      const decryptedFromCompressed = await service.decryptNIP04(
        encryptedWithCompressed,
        bobPrivateKey,
        alicePublicKey,
      );
      const decryptedFromXOnly = await service.decryptNIP04(encryptedWithXOnly, bobPrivateKey, alicePublicKey);

      expect(decryptedFromCompressed).toBe(plaintext);
      expect(decryptedFromXOnly).toBe(plaintext);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid encrypted content format (missing iv)', async () => {
      const invalidEncrypted = 'invalidciphertext';

      await expect(service.decryptNIP04(invalidEncrypted, bobPrivateKey, alicePublicKey)).rejects.toThrow();
    });

    it('should throw error for invalid encrypted content format (too many parts)', async () => {
      const invalidEncrypted = 'part1?iv=part2?iv=part3';

      await expect(service.decryptNIP04(invalidEncrypted, bobPrivateKey, alicePublicKey)).rejects.toThrow(
        'Invalid encrypted content format',
      );
    });

    it('should throw error when decrypting with wrong private key', async () => {
      const plaintext = 'Secret message';
      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);

      const wrongSecretKey = utils.randomPrivateKey();
      const wrongPrivateKey = encodingService.bytesToHex(wrongSecretKey);

      await expect(service.decryptNIP04(encrypted, wrongPrivateKey, alicePublicKey)).rejects.toThrow();
    });

    it('should throw error for invalid base64 in ciphertext', async () => {
      const invalidEncrypted = 'not-valid-base64!!!?iv=YWJjZGVm';

      await expect(service.decryptNIP04(invalidEncrypted, bobPrivateKey, alicePublicKey)).rejects.toThrow();
    });
  });

  describe('NIP-04 compliance', () => {
    it('should use 16-byte IV', async () => {
      const plaintext = 'Test';
      const encrypted = await service.encryptNIP04(plaintext, alicePrivateKey, bobPublicKey);

      const [, ivBase64] = encrypted.split('?iv=');
      const ivBytes = encodingService.base64ToBytes(ivBase64);

      expect(ivBytes.length).toBe(16);
    });

    it('should encrypt DID documents correctly', async () => {
      const didDocument = JSON.stringify({
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
      });

      const encrypted = await service.encryptNIP04(didDocument, alicePrivateKey, bobPublicKey);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKey, alicePublicKey);

      expect(JSON.parse(decrypted)).toEqual(JSON.parse(didDocument));
    });

    it('should encrypt verifiable credentials correctly', async () => {
      const credential = JSON.stringify({
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:123',
        type: ['VerifiableCredential'],
        issuer: 'did:nostr:issuer123',
        issuanceDate: '2025-01-01T00:00:00Z',
        credentialSubject: {
          id: 'did:nostr:subject456',
          degree: 'Bachelor of Science',
        },
      });

      const encrypted = await service.encryptNIP04(credential, alicePrivateKey, bobPublicKey);
      const decrypted = await service.decryptNIP04(encrypted, bobPrivateKey, alicePublicKey);

      expect(JSON.parse(decrypted)).toEqual(JSON.parse(credential));
    });
  });
});
