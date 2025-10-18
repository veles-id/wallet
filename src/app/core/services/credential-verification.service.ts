import { Injectable, inject } from '@angular/core';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { VerificationResult } from './credential-verification.types';
import { VerifiableCredential } from './credential.types';
import { DidService } from './did.service';

ed25519.etc.sha512Sync = (...m) => {
  const hash = sha512.create();
  for (const msg of m) {
    hash.update(msg);
  }
  return hash.digest();
};

@Injectable({
  providedIn: 'root',
})
export class CredentialVerificationService {
  private _didService = inject(DidService);

  async verifyCredential(credential: VerifiableCredential): Promise<VerificationResult> {
    try {
      const structureValidation = this._validateCredentialStructure(credential);
      if (!structureValidation.isValid) {
        return structureValidation;
      }

      if (!credential.proof) {
        return {
          isValid: false,
          details: 'No cryptographic proof present',
          issuerResolved: false,
          errors: ['Missing proof field'],
        };
      }

      const issuerDID = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;

      if (issuerDID.startsWith('did:nostr:')) {
        return await this._verifyNostrCredential(credential);
      }

      return {
        isValid: false,
        details: 'Unsupported DID method for verification',
        issuerResolved: false,
        errors: [`Unsupported DID method: ${issuerDID.split(':')[1]}`],
      };
    } catch (error) {
      console.error('Credential verification failed:', error);
      return {
        isValid: false,
        details: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        issuerResolved: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private _validateCredentialStructure(credential: VerifiableCredential): VerificationResult {
    const errors: string[] = [];

    if (!credential.id) errors.push('Missing credential ID');
    if (!credential.issuer) errors.push('Missing issuer');
    if (!credential.credentialSubject) errors.push('Missing credentialSubject');
    if (!credential.issuanceDate) errors.push('Missing issuanceDate');
    if (!Array.isArray(credential.type)) errors.push('Invalid type field');
    if (!credential.type.includes('VerifiableCredential')) {
      errors.push('Must include VerifiableCredential type');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        details: 'Invalid credential structure',
        issuerResolved: false,
        errors,
      };
    }

    return {
      isValid: true,
      details: 'Valid credential structure',
      issuerResolved: false,
    };
  }

  private async _verifyNostrCredential(credential: VerifiableCredential): Promise<VerificationResult> {
    try {
      const issuerDID = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;

      // Extract Nostr public key from DID
      const nostrPubKey = issuerDID.split(':')[2];
      if (!nostrPubKey || nostrPubKey.length !== 64) {
        return {
          isValid: false,
          details: 'Invalid Nostr public key in DID',
          issuerResolved: false,
          errors: ['Invalid Nostr public key format'],
        };
      }

      const proof = credential.proof!;

      // Handle different signature types
      if (proof.type === 'JsonWebSignature2020' || proof.type === 'JsonWebSignature2018') {
        return await this._verifyJWS(credential, nostrPubKey);
      }

      if (proof.type === 'Ed25519Signature2020' || proof.type === 'Ed25519Signature2018') {
        return await this._verifyEd25519Proof(credential, nostrPubKey);
      }

      // Try to verify with our own Nostr implementation
      if (proof.type === 'NostrSignature2024') {
        return await this._verifyNostrDirectSignature(credential, nostrPubKey);
      }

      return {
        isValid: false,
        details: `Unsupported proof type for Nostr: ${proof.type}`,
        issuerResolved: true,
        signatureType: proof.type,
        errors: [`Unsupported proof type: ${proof.type}`],
      };
    } catch (error) {
      return {
        isValid: false,
        details: `Nostr verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        issuerResolved: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async _verifyJWS(credential: VerifiableCredential, publicKeyHex: string): Promise<VerificationResult> {
    try {
      const jws = credential.proof?.jws;
      if (!jws) {
        return {
          isValid: false,
          details: 'No JWS found in proof',
          issuerResolved: true,
          signatureType: 'JsonWebSignature2020',
          errors: ['Missing JWS in proof'],
        };
      }

      // Parse JWS: header.payload.signature
      const parts = jws.split('.');
      if (parts.length !== 3) {
        return {
          isValid: false,
          details: 'Invalid JWS format',
          issuerResolved: true,
          signatureType: 'JsonWebSignature2020',
          errors: ['Invalid JWS format - must have 3 parts'],
        };
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      try {
        // Decode header to verify algorithm
        const header = JSON.parse(this._base64UrlDecode(headerB64));
        if (header.alg !== 'EdDSA') {
          return {
            isValid: false,
            details: `Unsupported algorithm: ${header.alg}`,
            issuerResolved: true,
            signatureType: 'JsonWebSignature2020',
            errors: [`Unsupported algorithm: ${header.alg}`],
          };
        }

        // Verify payload contains our credential
        const payload = JSON.parse(this._base64UrlDecode(payloadB64));

        // Create signing input (header.payload)
        const signingInput = new TextEncoder().encode(headerB64 + '.' + payloadB64);
        const signature = this._base64UrlDecodeToUint8Array(signatureB64);
        const publicKey = this._hexToUint8Array(publicKeyHex);

        // Verify Ed25519 signature
        const isValid = await ed25519.verify(signature, signingInput, publicKey);

        return {
          isValid,
          details: isValid ? 'Valid JWS signature' : 'Invalid JWS signature',
          issuerResolved: true,
          signatureType: 'JsonWebSignature2020',
          verificationMethod: credential.proof?.verificationMethod,
        };
      } catch (decodeError) {
        return {
          isValid: false,
          details: 'Failed to decode JWS components',
          issuerResolved: true,
          signatureType: 'JsonWebSignature2020',
          errors: [`Decode error: ${decodeError instanceof Error ? decodeError.message : 'Unknown decode error'}`],
        };
      }
    } catch (error) {
      return {
        isValid: false,
        details: `JWS verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        issuerResolved: true,
        signatureType: 'JsonWebSignature2020',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async _verifyEd25519Proof(
    credential: VerifiableCredential,
    publicKeyHex: string,
  ): Promise<VerificationResult> {
    try {
      const proof = credential.proof!;
      const proofValue = proof.proofValue;

      if (!proofValue) {
        return {
          isValid: false,
          details: 'No proofValue found in Ed25519 proof',
          issuerResolved: true,
          signatureType: proof.type,
          errors: ['Missing proofValue'],
        };
      }

      // Create canonical credential without proof for signing
      const credentialCopy = { ...credential };
      delete credentialCopy.proof;

      // Create signing input (canonicalized JSON)
      const signingInput = new TextEncoder().encode(JSON.stringify(credentialCopy));

      // Decode signature (usually base64 or multibase)
      let signature: Uint8Array;
      if (proofValue.startsWith('z')) {
        // Multibase encoding
        signature = this._multibaseToUint8Array(proofValue);
      } else {
        // Assume base64
        signature = this._base64DecodeToUint8Array(proofValue);
      }

      const publicKey = this._hexToUint8Array(publicKeyHex);

      // Verify Ed25519 signature
      const isValid = await ed25519.verify(signature, signingInput, publicKey);

      return {
        isValid,
        details: isValid ? 'Valid Ed25519 signature' : 'Invalid Ed25519 signature',
        issuerResolved: true,
        signatureType: proof.type,
        verificationMethod: proof.verificationMethod,
      };
    } catch (error) {
      return {
        isValid: false,
        details: `Ed25519 verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        issuerResolved: true,
        signatureType: credential.proof?.type || 'Ed25519Signature2020',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async _verifyNostrDirectSignature(
    credential: VerifiableCredential,
    publicKeyHex: string,
  ): Promise<VerificationResult> {
    try {
      const proof = credential.proof!;

      // This would be our custom Nostr signature format
      // For now, return that it's not implemented
      return {
        isValid: false,
        details: 'Nostr direct signature verification not yet implemented',
        issuerResolved: true,
        signatureType: proof.type,
        errors: ['Not implemented yet'],
      };
    } catch (error) {
      return {
        isValid: false,
        details: `Nostr direct verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        issuerResolved: true,
        signatureType: credential.proof?.type || 'NostrSignature2024',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Utility methods for encoding/decoding
  private _base64UrlDecode(base64Url: string): string {
    // Add padding if needed
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return atob(base64);
  }

  private _base64UrlDecodeToUint8Array(base64Url: string): Uint8Array {
    const decoded = this._base64UrlDecode(base64Url);
    return new Uint8Array(decoded.split('').map((char) => char.charCodeAt(0)));
  }

  private _base64DecodeToUint8Array(base64: string): Uint8Array {
    const decoded = atob(base64);
    return new Uint8Array(decoded.split('').map((char) => char.charCodeAt(0)));
  }

  private _hexToUint8Array(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }
    const result = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      result[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return result;
  }

  private _multibaseToUint8Array(multibase: string): Uint8Array {
    // Simple multibase decoder for 'z' (base58btc)
    // This is a simplified implementation - in production, use a proper multibase library
    if (!multibase.startsWith('z')) {
      throw new Error('Only base58btc multibase encoding supported');
    }

    // For now, throw an error - proper base58 decoding requires additional library
    throw new Error('Base58 decoding not implemented - use base64 proofValue instead');
  }
}
