import { Injectable, inject } from '@angular/core';
import { sha256 } from '@noble/hashes/sha2';
import { BbsSignatureService } from './bbs-signature.service';
import { CredentialVerificationService } from './credential-verification.service';
import { VerificationResult } from './credential-verification.types';
import {
  CreateCredentialRequest,
  CredentialCategory,
  CredentialPrivacy,
  CredentialSource,
  CredentialTemplate,
  FieldType,
  StoredCredential,
  VerifiableCredential,
} from './credential.types';
import { DidService } from './did.service';
import { NostrEvent, StoredDID } from './did.types';
import { EncodingService } from './encoding.service';
import { EncryptionService } from './encryption.service';
import { IpfsService } from './ipfs.service';
import { RelayService } from './relay.service';

@Injectable({
  providedIn: 'root',
})
export class CredentialService {
  private _didService = inject(DidService);
  private _bbsService = inject(BbsSignatureService);
  private _verificationService = inject(CredentialVerificationService);
  private _encodingService = inject(EncodingService);
  private _encryptionService = inject(EncryptionService);
  private _ipfsService = inject(IpfsService);
  private _relayService = inject(RelayService);
  private readonly STORAGE_KEY = 'veles_credentials';
  private readonly TEMPLATES_KEY = 'veles_credential_templates';

  constructor() {
    this._initializeDefaultTemplates();
  }

  async createCredential(request: CreateCredentialRequest): Promise<StoredCredential> {
    try {
      const credentialId = this._generateCredentialId();
      const issuanceDate = new Date().toISOString();

      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/ns/credentials/examples/v1'],
        id: credentialId,
        type: ['VerifiableCredential'],
        issuer: request.issuerDID,
        issuanceDate,
        ...(request.expirationDate && {
          expirationDate: request.expirationDate,
        }),
        credentialSubject: {
          id: request.subjectDID,
          ...request.credentialData,
        },
      };

      if (request.templateId) {
        const template = this.getTemplate(request.templateId);
        if (template) {
          credential['@context'] = [...credential['@context'], ...template.context];
          credential.type = [...credential.type, ...template.type];
        }
      }

      const issuerDID = this._didService.getStoredDID(request.issuerDID);
      if (!issuerDID) {
        throw new Error('Issuer DID not found');
      }

      let bbsPublicKeyHex: string;
      let bbsSecretKeyHex: string;

      if (!issuerDID.bbsSecretKey || !issuerDID.bbsPublicKey) {
        const bbsKeys = await this._bbsService.generateBbsKeyPair();
        bbsSecretKeyHex = this._encodingService.bytesToHex(bbsKeys.secretKey);
        bbsPublicKeyHex = this._encodingService.bytesToHex(bbsKeys.publicKey);

        issuerDID.bbsSecretKey = bbsSecretKeyHex;
        issuerDID.bbsPublicKey = bbsPublicKeyHex;
        this._didService.updateStoredDID(issuerDID);
      } else {
        bbsSecretKeyHex = issuerDID.bbsSecretKey;
        bbsPublicKeyHex = issuerDID.bbsPublicKey;
      }

      const proof = await this._bbsService.signCredential(
        credential,
        this._encodingService.hexToBytes(bbsSecretKeyHex),
        this._encodingService.hexToBytes(bbsPublicKeyHex),
      );
      credential.proof = proof;

      const storedCredential: StoredCredential = {
        credential,
        createdAt: new Date().toISOString(),
        alias: request.alias,
        tags: request.tags || [],
        isVerified: false,
        metadata: {
          templateId: request.templateId,
          category: request.category || CredentialCategory.OTHER,
          privacy: request.privacy || CredentialPrivacy.PRIVATE,
          source: CredentialSource.SELF_ISSUED,
          signatureType: 'BbsBlsSignature2020',
          bbsPublicKey: bbsPublicKeyHex,
        },
      };

      this._storeCredential(storedCredential);
      return storedCredential;
    } catch (error) {
      console.error('Failed to create credential:', error);
      throw error;
    }
  }

  async createAndStoreEncryptedVC(request: CreateCredentialRequest): Promise<StoredCredential> {
    try {
      const credentialId = this._generateCredentialId();
      const issuanceDate = new Date().toISOString();

      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/ns/credentials/examples/v1'],
        id: credentialId,
        type: ['VerifiableCredential'],
        issuer: request.issuerDID,
        issuanceDate,
        ...(request.expirationDate && {
          expirationDate: request.expirationDate,
        }),
        credentialSubject: {
          id: request.subjectDID,
          ...request.credentialData,
        },
      };

      if (request.templateId) {
        const template = this.getTemplate(request.templateId);
        if (template) {
          credential['@context'] = [...credential['@context'], ...template.context];
          credential.type = [...credential.type, ...template.type];
        }
      }

      const issuerDID = this._didService.getStoredDID(request.issuerDID);
      if (!issuerDID) {
        throw new Error('Issuer DID not found');
      }

      let bbsPublicKeyHex: string;
      let bbsSecretKeyHex: string;

      if (!issuerDID.bbsSecretKey || !issuerDID.bbsPublicKey) {
        const bbsKeys = await this._bbsService.generateBbsKeyPair();
        bbsSecretKeyHex = this._encodingService.bytesToHex(bbsKeys.secretKey);
        bbsPublicKeyHex = this._encodingService.bytesToHex(bbsKeys.publicKey);

        issuerDID.bbsSecretKey = bbsSecretKeyHex;
        issuerDID.bbsPublicKey = bbsPublicKeyHex;
        this._didService.updateStoredDID(issuerDID);
      } else {
        bbsSecretKeyHex = issuerDID.bbsSecretKey;
        bbsPublicKeyHex = issuerDID.bbsPublicKey;
      }

      const proof = await this._bbsService.signCredential(
        credential,
        this._encodingService.hexToBytes(bbsSecretKeyHex),
        this._encodingService.hexToBytes(bbsPublicKeyHex),
      );
      credential.proof = proof;

      const storedCredential: StoredCredential = {
        credential,
        createdAt: new Date().toISOString(),
        alias: request.alias,
        tags: request.tags || [],
        isVerified: false,
        metadata: {
          templateId: request.templateId,
          category: request.category || CredentialCategory.OTHER,
          privacy: request.privacy || CredentialPrivacy.PRIVATE,
          source: CredentialSource.SELF_ISSUED,
          signatureType: 'BbsBlsSignature2020',
          bbsPublicKey: bbsPublicKeyHex,
        },
      };

      this._storeCredential(storedCredential);

      const holderDID = this._didService.getStoredDID(request.subjectDID);
      if (!holderDID || !holderDID.nostrPrivateKey || !holderDID.nostrPublicKey) {
        console.warn('No Nostr keys found for holder DID, skipping encryption');
        return storedCredential;
      }

      const credentialJson = JSON.stringify(credential);
      const encryptedVC = await this._encryptionService.encryptNIP04(
        credentialJson,
        holderDID.nostrPrivateKey,
        holderDID.nostrPublicKey,
      );

      const fileName = `vc-${credentialId.substring(credentialId.length - 12)}.enc`;
      const ipfsResult = await this._ipfsService.uploadEncryptedData(encryptedVC, fileName);

      storedCredential.metadata = {
        ...storedCredential.metadata,
        ipfsCID: ipfsResult.cid,
        encryptedOnIPFS: true,
      };

      this._updateCredentialInStorage(storedCredential);

      console.log(`VC encrypted and stored on IPFS: ${ipfsResult.cid}`);
      return storedCredential;
    } catch (error) {
      console.error('Failed to create and encrypt credential:', error);
      throw error;
    }
  }

  async publishVCPointerToNostr(
    vc: VerifiableCredential,
    ipfsCID: string,
    issuerDID: StoredDID,
  ): Promise<string | null> {
    try {
      if (!issuerDID.nostrPrivateKey || !issuerDID.nostrPublicKey) {
        console.error('Issuer DID missing Nostr keys');
        return null;
      }

      const vcHash = this._hashVC(vc);
      const holderDID = typeof vc.credentialSubject.id === 'string' ? vc.credentialSubject.id : '';

      const event = await this._createVCPointerEvent(
        vcHash,
        ipfsCID,
        holderDID,
        issuerDID.nostrPublicKey,
        issuerDID.did,
      );

      const signedEvent = await this._relayService.signEvent(event, issuerDID.nostrPrivateKey);

      const results = await this._relayService.publishToRelays(signedEvent);
      const successCount = results.filter((r) => r.success).length;

      console.log(`Published VC pointer to ${successCount}/${results.length} relays`);

      return signedEvent.id || null;
    } catch (error) {
      console.error('Failed to publish VC pointer to Nostr:', error);
      throw error;
    }
  }

  getStoredCredentials(): StoredCredential[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const credentials = stored ? JSON.parse(stored) : [];
    return credentials.sort(
      (a: StoredCredential, b: StoredCredential) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getCredentialById(id: string): StoredCredential | null {
    const credentials = this.getStoredCredentials();
    return credentials.find((cred) => cred.credential.id === id) || null;
  }

  deleteCredential(id: string): boolean {
    const credentials = this.getStoredCredentials();
    const index = credentials.findIndex((cred) => cred.credential.id === id);

    if (index !== -1) {
      credentials.splice(index, 1);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
      return true;
    }

    return false;
  }

  updateCredentialAlias(id: string, alias: string): boolean {
    const credentials = this.getStoredCredentials();
    const credential = credentials.find((cred) => cred.credential.id === id);

    if (credential) {
      credential.alias = alias;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
      return true;
    }

    return false;
  }

  getCredentialsByCategory(category: CredentialCategory): StoredCredential[] {
    return this.getStoredCredentials().filter((cred) => cred.metadata?.category === category);
  }

  getCredentialsByDID(did: string): StoredCredential[] {
    return this.getStoredCredentials().filter(
      (cred) => cred.credential.credentialSubject.id === did || cred.credential.issuer === did,
    );
  }

  async importCredential(credentialJson: string, alias?: string): Promise<StoredCredential> {
    try {
      const credential: VerifiableCredential = JSON.parse(credentialJson);

      // Basic validation
      if (!credential.id || !credential.issuer || !credential.credentialSubject) {
        throw new Error('Invalid credential format');
      }

      const storedCredential: StoredCredential = {
        credential,
        createdAt: new Date().toISOString(),
        alias: alias || 'Imported Credential',
        tags: ['imported'],
        isVerified: false,
        metadata: {
          category: CredentialCategory.OTHER,
          privacy: CredentialPrivacy.PRIVATE,
          source: CredentialSource.IMPORTED,
        },
      };

      this._storeCredential(storedCredential);
      return storedCredential;
    } catch (error) {
      console.error('Failed to import credential:', error);
      throw new Error('Invalid credential format');
    }
  }

  getAvailableTemplates(): CredentialTemplate[] {
    const stored = localStorage.getItem(this.TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getTemplate(id: string): CredentialTemplate | null {
    const templates = this.getAvailableTemplates();
    return templates.find((template) => template.id === id) || null;
  }

  async verifyCredential(credential: VerifiableCredential): Promise<VerificationResult> {
    return await this._verificationService.verifyCredential(credential);
  }

  private _storeCredential(credential: StoredCredential): void {
    const credentials = this.getStoredCredentials();
    credentials.push(credential);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
  }

  private _updateCredentialInStorage(updatedCredential: StoredCredential): void {
    const credentials = this.getStoredCredentials();
    const index = credentials.findIndex((cred) => cred.credential.id === updatedCredential.credential.id);

    if (index !== -1) {
      credentials[index] = updatedCredential;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
    }
  }

  private _generateCredentialId(): string {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  private _hashVC(vc: VerifiableCredential): string {
    const vcJson = JSON.stringify(vc);
    const hash = sha256(new TextEncoder().encode(vcJson));
    return Array.from(hash)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async _createVCPointerEvent(
    vcHash: string,
    ipfsCID: string,
    holderDID: string,
    issuerPubkey: string,
    subjectDID: string,
  ): Promise<NostrEvent> {
    const now = Math.floor(Date.now() / 1000);

    return {
      pubkey: issuerPubkey,
      created_at: now,
      kind: 1,
      tags: [
        ['p', holderDID],
        ['vc_hash', vcHash],
        ['ipfs_cid', ipfsCID],
        ['subject', subjectDID],
      ],
      content: 'VC Pointer',
    };
  }

  private _initializeDefaultTemplates(): void {
    const existingTemplates = localStorage.getItem(this.TEMPLATES_KEY);
    if (!existingTemplates) {
      const defaultTemplates: CredentialTemplate[] = [
        {
          id: 'education-degree',
          name: 'Educational Degree',
          description: 'University or college degree credential',
          category: CredentialCategory.EDUCATION,
          context: ['https://www.w3.org/ns/credentials/examples/v1'],
          type: ['UniversityDegreeCredential'],
          fields: [
            {
              key: 'degree',
              label: 'Degree',
              type: FieldType.TEXT,
              required: true,
              placeholder: 'Bachelor of Science',
            },
            {
              key: 'degreeType',
              label: 'Degree Type',
              type: FieldType.SELECT,
              required: true,
              options: ['Bachelor', 'Master', 'Doctorate', 'Associate', 'Certificate'],
            },
            {
              key: 'university',
              label: 'Institution',
              type: FieldType.TEXT,
              required: true,
              placeholder: 'University Name',
            },
            {
              key: 'graduationDate',
              label: 'Graduation Date',
              type: FieldType.DATE,
              required: true,
            },
            {
              key: 'gpa',
              label: 'GPA',
              type: FieldType.NUMBER,
              required: false,
              placeholder: '3.75',
            },
          ],
        },
        {
          id: 'professional-certification',
          name: 'Professional Certification',
          description: 'Industry or professional certification',
          category: CredentialCategory.CERTIFICATION,
          context: ['https://www.w3.org/ns/credentials/examples/v1'],
          type: ['ProfessionalCertificationCredential'],
          fields: [
            {
              key: 'certificationName',
              label: 'Certification Name',
              type: FieldType.TEXT,
              required: true,
              placeholder: 'AWS Solutions Architect',
            },
            {
              key: 'issuingOrganization',
              label: 'Issuing Organization',
              type: FieldType.TEXT,
              required: true,
              placeholder: 'Amazon Web Services',
            },
            {
              key: 'certificationId',
              label: 'Certification ID',
              type: FieldType.TEXT,
              required: false,
              placeholder: 'AWS-123456',
            },
            {
              key: 'issueDate',
              label: 'Issue Date',
              type: FieldType.DATE,
              required: true,
            },
            {
              key: 'validUntil',
              label: 'Valid Until',
              type: FieldType.DATE,
              required: false,
            },
          ],
        },
        {
          id: 'achievement-badge',
          name: 'Achievement Badge',
          description: 'Personal or professional achievement',
          category: CredentialCategory.ACHIEVEMENT,
          context: ['https://www.w3.org/ns/credentials/examples/v1'],
          type: ['AchievementCredential'],
          fields: [
            {
              key: 'achievementName',
              label: 'Achievement Name',
              type: FieldType.TEXT,
              required: true,
              placeholder: 'Hackathon Winner',
            },
            {
              key: 'description',
              label: 'Description',
              type: FieldType.TEXTAREA,
              required: true,
              placeholder: 'First place in blockchain hackathon',
            },
            {
              key: 'awardedBy',
              label: 'Awarded By',
              type: FieldType.TEXT,
              required: true,
              placeholder: 'Tech Conference 2024',
            },
            {
              key: 'achievementDate',
              label: 'Achievement Date',
              type: FieldType.DATE,
              required: true,
            },
          ],
        },
      ];

      localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(defaultTemplates));
    }
  }
}
