import { Injectable } from '@angular/core';
import { blsCreateProof, blsSign, blsVerify, generateBls12381G2KeyPair } from '@mattrglobal/bbs-signatures';
import { CredentialProof, VerifiableCredential } from './credential.types';

type BlsVerifyResult = boolean | { verified: boolean };

@Injectable({
  providedIn: 'root',
})
export class BbsSignatureService {
  async generateBbsKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
    const keyPair = await generateBls12381G2KeyPair();
    return {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
    };
  }

  async signCredential(
    credential: VerifiableCredential,
    secretKey: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<CredentialProof> {
    const credentialWithoutProof = { ...credential };
    delete credentialWithoutProof.proof;

    const messages = this.extractMessagesFromCredential(credentialWithoutProof);
    const messageBytes = messages.map((msg) => new TextEncoder().encode(msg));

    const signature = await blsSign({
      keyPair: { secretKey, publicKey },
      messages: messageBytes,
    });

    return {
      type: 'BbsBlsSignature2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${credential.issuer}#bbs-key-1`,
      proofValue: this.uint8ArrayToBase64(signature),
    };
  }

  async verifyBbsSignature(credential: VerifiableCredential, publicKey: Uint8Array): Promise<boolean> {
    if (!credential.proof || credential.proof.type !== 'BbsBlsSignature2020') {
      return false;
    }

    const credentialWithoutProof = { ...credential };
    delete credentialWithoutProof.proof;

    const messages = this.extractMessagesFromCredential(credentialWithoutProof);
    const messageBytes = messages.map((msg) => new TextEncoder().encode(msg));

    const signature = this.base64ToUint8Array(credential.proof.proofValue || '');

    const result = (await blsVerify({
      publicKey,
      messages: messageBytes,
      signature,
    })) as BlsVerifyResult;

    if (typeof result === 'boolean') {
      return result;
    }
    return (result as { verified: boolean }).verified;
  }

  async createSelectiveDisclosureProof(
    credential: VerifiableCredential,
    fieldsToReveal: string[],
    nonce: string,
    publicKey: Uint8Array,
  ): Promise<VerifiableCredential> {
    if (!credential.proof || credential.proof.type !== 'BbsBlsSignature2020') {
      throw new Error('Credential must have BBS+ signature for selective disclosure');
    }

    const credentialWithoutProof = { ...credential };
    delete credentialWithoutProof.proof;

    const allMessages = this.extractMessagesFromCredential(credentialWithoutProof);
    const allFields = this.extractFieldNames(credentialWithoutProof);

    const revealedIndices = fieldsToReveal.map((field) => allFields.indexOf(field)).filter((index) => index !== -1);

    const messageBytes = allMessages.map((msg) => new TextEncoder().encode(msg));
    const signature = this.base64ToUint8Array(credential.proof.proofValue || '');
    const nonceBytes = new TextEncoder().encode(nonce);

    const proofBytes = await blsCreateProof({
      signature,
      publicKey,
      messages: messageBytes,
      nonce: nonceBytes,
      revealed: revealedIndices,
    });

    const derivedCredential: VerifiableCredential = {
      '@context': credential['@context'],
      id: `${credential.id}-derived`,
      type: credential.type,
      issuer: credential.issuer,
      issuanceDate: credential.issuanceDate,
      credentialSubject: this.filterCredentialSubject(credential.credentialSubject, fieldsToReveal),
    };

    if (credential.expirationDate) {
      derivedCredential.expirationDate = credential.expirationDate;
    }

    derivedCredential.proof = {
      type: 'BbsBlsSignatureProof2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: credential.proof.verificationMethod,
      proofValue: this.uint8ArrayToBase64(proofBytes),
      nonce,
    };

    return derivedCredential;
  }

  private extractMessagesFromCredential(credential: Partial<VerifiableCredential>): string[] {
    const messages: string[] = [];

    messages.push(credential.id || '');
    messages.push(JSON.stringify(credential.type || []));
    messages.push(typeof credential.issuer === 'string' ? credential.issuer : credential.issuer?.id || '');
    messages.push(credential.issuanceDate || '');

    if (credential.expirationDate) {
      messages.push(credential.expirationDate);
    }

    if (credential.credentialSubject) {
      const subject = credential.credentialSubject;
      messages.push(subject.id || '');

      Object.keys(subject)
        .filter((key) => key !== 'id')
        .sort()
        .forEach((key) => {
          messages.push(`${key}:${JSON.stringify(subject[key])}`);
        });
    }

    return messages;
  }

  private extractFieldNames(credential: Partial<VerifiableCredential>): string[] {
    const fields: string[] = [];

    fields.push('id');
    fields.push('type');
    fields.push('issuer');
    fields.push('issuanceDate');

    if (credential.expirationDate) {
      fields.push('expirationDate');
    }

    if (credential.credentialSubject) {
      fields.push('credentialSubject.id');

      Object.keys(credential.credentialSubject)
        .filter((key) => key !== 'id')
        .sort()
        .forEach((key) => {
          fields.push(`credentialSubject.${key}`);
        });
    }

    return fields;
  }

  private filterCredentialSubject(subject: any, fieldsToReveal: string[]): any {
    const filtered: any = {
      id: subject.id,
    };

    fieldsToReveal.forEach((field) => {
      const fieldName = field.replace('credentialSubject.', '');
      if (fieldName !== 'id' && subject[fieldName] !== undefined) {
        filtered[fieldName] = subject[fieldName];
      }
    });

    return filtered;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}
