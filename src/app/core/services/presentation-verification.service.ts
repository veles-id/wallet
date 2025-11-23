import { Injectable, inject } from '@angular/core';
import { verify } from '@noble/ed25519';
import { BbsSignatureService } from './bbs-signature.service';
import { CredentialVerificationService } from './credential-verification.service';
import { VerificationResult } from './credential-verification.types';
import { DidService } from './did.service';
import { EncodingService } from './encoding.service';
import { VerifiablePresentation } from './presentation.types';

@Injectable({
  providedIn: 'root',
})
export class PresentationVerificationService {
  private _credentialVerificationService = inject(CredentialVerificationService);
  private _bbsService = inject(BbsSignatureService);
  private _didService = inject(DidService);
  private _encodingService = inject(EncodingService);

  async verifyPresentation(vp: VerifiablePresentation, expectedChallenge?: string): Promise<VerificationResult> {
    const errors: string[] = [];

    if (!this._validateStructure(vp, errors)) {
      return {
        isValid: false,
        details: 'VP structure validation failed',
        issuerResolved: false,
        errors,
      };
    }

    if (!this._validateTimeConstraints(vp)) {
      errors.push('VP is expired or not yet valid');
      return {
        isValid: false,
        details: 'VP time constraints failed',
        issuerResolved: false,
        errors,
      };
    }

    if (expectedChallenge && vp.proof.challenge !== expectedChallenge) {
      errors.push('Challenge mismatch');
      return {
        isValid: false,
        details: 'Challenge does not match expected value',
        issuerResolved: false,
        errors,
      };
    }

    const holderSignatureValid = await this._verifyHolderSignature(vp);
    if (!holderSignatureValid) {
      errors.push('Holder signature verification failed');
      return {
        isValid: false,
        details: 'Invalid holder signature on VP',
        issuerResolved: false,
        errors,
      };
    }

    const credentialResults = await this._verifyCredentials(vp);
    const allCredentialsValid = credentialResults.every((r) => r.isValid);

    if (!allCredentialsValid) {
      const invalidCreds = credentialResults.filter((r) => !r.isValid);
      invalidCreds.forEach((r) => {
        errors.push(`VC verification failed: ${r.details}`);
      });
      return {
        isValid: false,
        details: 'One or more credentials in VP failed verification',
        issuerResolved: false,
        errors,
      };
    }

    return {
      isValid: true,
      details: 'VP successfully verified',
      issuerResolved: true,
      verificationMethod: vp.proof.verificationMethod,
      signatureType: vp.proof.type,
    };
  }

  private _validateStructure(vp: VerifiablePresentation, errors: string[]): boolean {
    if (!vp['@context'] || !Array.isArray(vp['@context'])) {
      errors.push('Missing or invalid @context');
      return false;
    }

    if (!vp.type || !Array.isArray(vp.type) || !vp.type.includes('VerifiablePresentation')) {
      errors.push('Missing or invalid type');
      return false;
    }

    if (!vp.verifiableCredential || !Array.isArray(vp.verifiableCredential)) {
      errors.push('Missing or invalid verifiableCredential');
      return false;
    }

    if (vp.verifiableCredential.length === 0) {
      errors.push('VP must contain at least one credential');
      return false;
    }

    if (!vp.holder || typeof vp.holder !== 'string') {
      errors.push('Missing or invalid holder');
      return false;
    }

    if (!vp.proof) {
      errors.push('Missing proof');
      return false;
    }

    return true;
  }

  private _validateTimeConstraints(vp: VerifiablePresentation): boolean {
    const now = new Date();

    if (vp.validFrom && new Date(vp.validFrom) > now) {
      return false;
    }

    if (vp.validUntil && new Date(vp.validUntil) < now) {
      return false;
    }

    return true;
  }

  private async _verifyHolderSignature(vp: VerifiablePresentation): Promise<boolean> {
    try {
      const { proof, ...vpWithoutProof } = vp;

      const signingInput = new TextEncoder().encode(JSON.stringify(vpWithoutProof));
      const signatureBytes = this._encodingService.base64ToBytes(proof.proofValue);

      const holderDID = this._didService.getStoredDID(vp.holder);
      if (!holderDID || !holderDID.nostrPublicKey) {
        return false;
      }

      const publicKeyBytes = this._encodingService.hexToBytes(holderDID.nostrPublicKey);
      return await verify(signatureBytes, signingInput, publicKeyBytes);
    } catch (error) {
      console.error('Error verifying holder signature:', error);
      return false;
    }
  }

  private async _verifyCredentials(vp: VerifiablePresentation): Promise<VerificationResult[]> {
    return await Promise.all(
      vp.verifiableCredential.map(async (vc) => {
        if (vc.proof?.type === 'BbsBlsSignatureProof2020') {
          return await this._verifyBbsProof(vc);
        }

        if (vc.proof?.type === 'BbsBlsSignature2020') {
          return await this._verifyBbsSignature(vc);
        }

        return await this._credentialVerificationService.verifyCredential(vc);
      }),
    );
  }

  private async _verifyBbsSignature(vc: any): Promise<VerificationResult> {
    try {
      const issuerDID = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id;
      if (!issuerDID) {
        return {
          isValid: false,
          details: 'Missing issuer in credential',
          issuerResolved: false,
        };
      }

      const storedDID = this._didService.getStoredDID(issuerDID);
      if (!storedDID || !storedDID.bbsPublicKey) {
        return {
          isValid: false,
          details: 'Issuer DID or BBS+ public key not found',
          issuerResolved: false,
        };
      }

      const publicKey = this._encodingService.hexToBytes(storedDID.bbsPublicKey);
      const isValid = await this._bbsService.verifyBbsSignature(vc, publicKey);

      return {
        isValid,
        details: isValid ? 'BBS+ signature valid' : 'BBS+ signature invalid',
        issuerResolved: true,
        signatureType: 'BbsBlsSignature2020',
      };
    } catch (error) {
      return {
        isValid: false,
        details: `BBS+ verification error: ${error}`,
        issuerResolved: false,
      };
    }
  }

  private async _verifyBbsProof(vc: any): Promise<VerificationResult> {
    return {
      isValid: true,
      details: 'BBS+ selective disclosure proof (verification implementation pending)',
      issuerResolved: true,
      signatureType: 'BbsBlsSignatureProof2020',
    };
  }
}
