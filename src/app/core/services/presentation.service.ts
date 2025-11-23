import { inject, Injectable } from '@angular/core';
import { sign } from '@noble/ed25519';
import { BbsSignatureService } from './bbs-signature.service';
import { CredentialService } from './credential.service';
import { DidService } from './did.service';
import { StoredDID } from './did.types';
import {
  CreateVPRequest,
  PresentationProof,
  VerifiablePresentation,
  VPShareRecord,
  VPTemplate,
} from './presentation.types';

@Injectable({
  providedIn: 'root',
})
export class PresentationService {
  private _credentialService = inject(CredentialService);
  private _didService = inject(DidService);
  private _bbsService = inject(BbsSignatureService);

  private readonly TEMPLATES_KEY = 'veles_vp_templates';
  private readonly HISTORY_KEY = 'veles_vp_history';

  createTemplate(template: Omit<VPTemplate, 'id' | 'createdAt' | 'updatedAt'>): VPTemplate {
    const newTemplate: VPTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const templates = this.getTemplates();
    templates.push(newTemplate);
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));

    return newTemplate;
  }

  getTemplates(): VPTemplate[] {
    const stored = localStorage.getItem(this.TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getTemplateById(id: string): VPTemplate | null {
    const templates = this.getTemplates();
    return templates.find((t) => t.id === id) || null;
  }

  updateTemplate(id: string, updates: Partial<VPTemplate>): VPTemplate | null {
    const templates = this.getTemplates();
    const index = templates.findIndex((t) => t.id === id);

    if (index === -1) {
      return null;
    }

    templates[index] = {
      ...templates[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
    return templates[index];
  }

  deleteTemplate(id: string): boolean {
    const templates = this.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);

    if (filtered.length === templates.length) {
      return false;
    }

    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(filtered));
    return true;
  }

  async buildPresentation(request: CreateVPRequest): Promise<VerifiablePresentation> {
    const credentials = request.credentialIds
      .map((id) => this._credentialService.getCredentialById(id))
      .filter((c) => c !== null)
      .map((stored) => stored!.credential);

    if (credentials.length === 0) {
      throw new Error('No valid credentials found for presentation');
    }

    const disclosedCredentials = await Promise.all(
      credentials.map(async (vc, index) => {
        const vcId = request.credentialIds[index];
        const fieldsToReveal = request.selectiveFields[vcId] || [];

        if (fieldsToReveal.length > 0 && vc.proof?.type === 'BbsBlsSignature2020') {
          const metadata = this._credentialService.getCredentialById(vcId)?.metadata;
          if (!metadata?.bbsPublicKey) {
            throw new Error(`BBS+ public key not found for credential ${vcId}`);
          }

          const publicKey = this._hexToBytes(metadata.bbsPublicKey);
          return await this._bbsService.createSelectiveDisclosureProof(
            vc,
            fieldsToReveal,
            request.challenge,
            publicKey,
          );
        }

        return vc;
      }),
    );

    const now = new Date();
    const validUntil = new Date(now.getTime() + (request.validityMinutes || 5) * 60000);

    const vp: Omit<VerifiablePresentation, 'proof'> = {
      '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/security/bbs/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: disclosedCredentials,
      holder: request.holderDID,
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
    };

    const holderDID = this._didService.getStoredDID(request.holderDID);
    if (!holderDID) {
      throw new Error(`Holder DID ${request.holderDID} not found`);
    }

    const proof = await this._signPresentation(vp, holderDID, request.challenge, request.domain);

    return {
      ...vp,
      proof,
    };
  }

  private async _signPresentation(
    vp: Omit<VerifiablePresentation, 'proof'>,
    holderDID: StoredDID,
    challenge?: string,
    domain?: string,
  ): Promise<PresentationProof> {
    const signingInput = new TextEncoder().encode(JSON.stringify(vp));

    if (!holderDID.nostrPrivateKey) {
      throw new Error('Holder DID does not have a Nostr private key');
    }

    const privateKeyHex = holderDID.nostrPrivateKey;
    const signature = await sign(signingInput, privateKeyHex);

    return {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${holderDID.did}#key-1`,
      proofPurpose: 'authentication',
      challenge,
      domain,
      proofValue: this._bytesToBase64(signature),
    };
  }

  recordShare(record: Omit<VPShareRecord, 'id'>): VPShareRecord {
    const newRecord: VPShareRecord = {
      ...record,
      id: crypto.randomUUID(),
    };

    const history = this.getShareHistory();
    history.push(newRecord);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));

    return newRecord;
  }

  getShareHistory(): VPShareRecord[] {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private _hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Hex string must have an even number of characters');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  private _bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }
}
