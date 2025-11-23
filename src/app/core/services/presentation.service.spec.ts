import { TestBed } from '@angular/core/testing';
import { BbsSignatureService } from './bbs-signature.service';
import { CredentialService } from './credential.service';
import { DidService } from './did.service';
import { PresentationService } from './presentation.service';

describe('PresentationService', () => {
  let service: PresentationService;
  let mockCredentialService: {
    getCredentialById: jest.Mock;
    getCredentialMetadata?: jest.Mock;
  };
  let mockDidService: {
    getStoredDID: jest.Mock;
  };
  let mockBbsService: {
    createSelectiveDisclosureProof: jest.Mock;
  };

  const mockCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:test-credential',
    type: ['VerifiableCredential'],
    issuer: 'did:nostr:abc123',
    issuanceDate: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:nostr:subject123',
      degree: 'Bachelor of Science',
      university: 'Test University',
    },
    proof: {
      type: 'BbsBlsSignature2020',
      created: '2024-01-01T00:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: 'did:nostr:abc123#bbs-key-1',
      proofValue: 'mockProofValue',
    },
  };

  const mockStoredCredential = {
    credential: mockCredential,
    createdAt: '2024-01-01T00:00:00Z',
    alias: 'Test Credential',
    tags: [],
    isVerified: true,
    metadata: {
      bbsPublicKey: 'a'.repeat(64),
    },
  };

  const mockDID = {
    did: 'did:nostr:holder123',
    document: {},
    keySet: {},
    createdAt: '2024-01-01T00:00:00Z',
    isPublished: true,
    nostrPrivateKey: 'b'.repeat(64),
    nostrPublicKey: 'c'.repeat(64),
  };

  beforeEach(() => {
    mockCredentialService = {
      getCredentialById: jest.fn(),
    };

    mockDidService = {
      getStoredDID: jest.fn(),
    };

    mockBbsService = {
      createSelectiveDisclosureProof: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PresentationService,
        { provide: CredentialService, useValue: mockCredentialService },
        { provide: DidService, useValue: mockDidService },
        { provide: BbsSignatureService, useValue: mockBbsService },
      ],
    });

    service = TestBed.inject(PresentationService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Template Management', () => {
    describe('createTemplate', () => {
      it('should create VP template with all fields', () => {
        const template = service.createTemplate({
          name: 'Job Application',
          description: 'Template for job applications',
          credentialIds: ['cred1', 'cred2'],
          selectiveFields: { cred1: ['degree', 'university'] },
          defaultValidityMinutes: 5,
        });

        expect(template.id).toBeDefined();
        expect(template.name).toBe('Job Application');
        expect(template.description).toBe('Template for job applications');
        expect(template.credentialIds).toEqual(['cred1', 'cred2']);
        expect(template.selectiveFields).toEqual({ cred1: ['degree', 'university'] });
        expect(template.defaultValidityMinutes).toBe(5);
        expect(template.createdAt).toBeDefined();
        expect(template.updatedAt).toBeDefined();
      });

      it('should create template without optional description', () => {
        const template = service.createTemplate({
          name: 'Simple Template',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 10,
        });

        expect(template.description).toBeUndefined();
        expect(template.name).toBe('Simple Template');
      });

      it('should generate unique IDs for different templates', () => {
        const template1 = service.createTemplate({
          name: 'Template 1',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        const template2 = service.createTemplate({
          name: 'Template 2',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        expect(template1.id).not.toBe(template2.id);
      });

      it('should persist template to localStorage', () => {
        const template = service.createTemplate({
          name: 'Persisted Template',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        const stored = JSON.parse(localStorage.getItem('veles_vp_templates') || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe(template.id);
      });
    });

    describe('getTemplates', () => {
      it('should return empty array when no templates exist', () => {
        const templates = service.getTemplates();
        expect(templates).toEqual([]);
      });

      it('should return all created templates', () => {
        service.createTemplate({
          name: 'Template 1',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        service.createTemplate({
          name: 'Template 2',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 10,
        });

        const templates = service.getTemplates();
        expect(templates).toHaveLength(2);
        expect(templates[0].name).toBe('Template 1');
        expect(templates[1].name).toBe('Template 2');
      });
    });

    describe('getTemplateById', () => {
      it('should return template when it exists', () => {
        const created = service.createTemplate({
          name: 'Find Me',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        const found = service.getTemplateById(created.id);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(created.id);
        expect(found?.name).toBe('Find Me');
      });

      it('should return null when template does not exist', () => {
        const found = service.getTemplateById('non-existent-id');
        expect(found).toBeNull();
      });
    });

    describe('updateTemplate', () => {
      it('should update template fields', () => {
        const original = service.createTemplate({
          name: 'Original Name',
          credentialIds: ['cred1'],
          selectiveFields: { cred1: ['field1'] },
          defaultValidityMinutes: 5,
        });

        const updated = service.updateTemplate(original.id, {
          name: 'Updated Name',
          defaultValidityMinutes: 10,
        });

        expect(updated).not.toBeNull();
        expect(updated?.name).toBe('Updated Name');
        expect(updated?.defaultValidityMinutes).toBe(10);
        expect(updated?.credentialIds).toEqual(['cred1']);
        expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(original.updatedAt).getTime());
      });

      it('should return null when updating non-existent template', () => {
        const result = service.updateTemplate('non-existent', { name: 'New Name' });
        expect(result).toBeNull();
      });

      it('should preserve id and createdAt timestamp', () => {
        const original = service.createTemplate({
          name: 'Test',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        const updated = service.updateTemplate(original.id, { name: 'Updated' });

        expect(updated?.id).toBe(original.id);
        expect(updated?.createdAt).toBe(original.createdAt);
      });
    });

    describe('deleteTemplate', () => {
      it('should delete existing template', () => {
        const template = service.createTemplate({
          name: 'To Delete',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        const result = service.deleteTemplate(template.id);
        expect(result).toBe(true);
        expect(service.getTemplates()).toHaveLength(0);
      });

      it('should return false when deleting non-existent template', () => {
        const result = service.deleteTemplate('non-existent-id');
        expect(result).toBe(false);
      });

      it('should not affect other templates', () => {
        const template1 = service.createTemplate({
          name: 'Template 1',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        const template2 = service.createTemplate({
          name: 'Template 2',
          credentialIds: [],
          selectiveFields: {},
          defaultValidityMinutes: 5,
        });

        service.deleteTemplate(template1.id);

        const remaining = service.getTemplates();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe(template2.id);
      });
    });
  });

  describe('VP Building', () => {
    beforeEach(() => {
      mockCredentialService.getCredentialById.mockReturnValue(mockStoredCredential as any);
      mockDidService.getStoredDID.mockReturnValue(mockDID as any);
      mockBbsService.createSelectiveDisclosureProof.mockResolvedValue({
        ...mockCredential,
        credentialSubject: {
          id: mockCredential.credentialSubject.id,
          degree: mockCredential.credentialSubject.degree,
        },
      } as any);
    });

    describe('buildPresentation', () => {
      it('should build VP with time constraints', async () => {
        const beforeBuild = new Date();

        const vp = await service.buildPresentation({
          credentialIds: ['cred1'],
          selectiveFields: {},
          holderDID: 'did:nostr:holder123',
          challenge: 'test-challenge',
          validityMinutes: 10,
        });

        const afterBuild = new Date();

        expect(vp).toBeDefined();
        expect(vp.validFrom).toBeDefined();
        expect(vp.validUntil).toBeDefined();

        const validFrom = new Date(vp.validFrom!);
        const validUntil = new Date(vp.validUntil!);

        expect(validFrom.getTime()).toBeGreaterThanOrEqual(beforeBuild.getTime());
        expect(validFrom.getTime()).toBeLessThanOrEqual(afterBuild.getTime());
        expect(validUntil.getTime()).toBe(validFrom.getTime() + 10 * 60 * 1000);
      });

      it('should include challenge and domain in proof', async () => {
        const vp = await service.buildPresentation({
          credentialIds: ['cred1'],
          selectiveFields: {},
          holderDID: 'did:nostr:holder123',
          challenge: 'unique-challenge-123',
          domain: 'example.com',
        });

        expect(vp.proof.challenge).toBe('unique-challenge-123');
        expect(vp.proof.domain).toBe('example.com');
      });

      it('should use default validity of 5 minutes when not specified', async () => {
        const vp = await service.buildPresentation({
          credentialIds: ['cred1'],
          selectiveFields: {},
          holderDID: 'did:nostr:holder123',
          challenge: 'test-challenge',
        });

        const validFrom = new Date(vp.validFrom!);
        const validUntil = new Date(vp.validUntil!);
        const diffMinutes = (validUntil.getTime() - validFrom.getTime()) / (60 * 1000);

        expect(diffMinutes).toBe(5);
      });

      it('should include holder DID', async () => {
        const vp = await service.buildPresentation({
          credentialIds: ['cred1'],
          selectiveFields: {},
          holderDID: 'did:nostr:holder123',
          challenge: 'test-challenge',
        });

        expect(vp.holder).toBe('did:nostr:holder123');
      });

      it('should include correct contexts and types', async () => {
        const vp = await service.buildPresentation({
          credentialIds: ['cred1'],
          selectiveFields: {},
          holderDID: 'did:nostr:holder123',
          challenge: 'test-challenge',
        });

        expect(vp['@context']).toContain('https://www.w3.org/2018/credentials/v1');
        expect(vp['@context']).toContain('https://w3id.org/security/bbs/v1');
        expect(vp.type).toContain('VerifiablePresentation');
      });

      it('should throw error when no valid credentials found', async () => {
        mockCredentialService.getCredentialById.mockReturnValue(null);

        await expect(
          service.buildPresentation({
            credentialIds: ['non-existent'],
            selectiveFields: {},
            holderDID: 'did:nostr:holder123',
            challenge: 'test-challenge',
          }),
        ).rejects.toThrow('No valid credentials found for presentation');
      });

      it('should throw error when holder DID not found', async () => {
        mockDidService.getStoredDID.mockReturnValue(null);

        await expect(
          service.buildPresentation({
            credentialIds: ['cred1'],
            selectiveFields: {},
            holderDID: 'did:nostr:non-existent',
            challenge: 'test-challenge',
          }),
        ).rejects.toThrow('Holder DID did:nostr:non-existent not found');
      });

      it('should apply selective disclosure for BBS+ credentials', async () => {
        await service.buildPresentation({
          credentialIds: ['cred1'],
          selectiveFields: { cred1: ['degree'] },
          holderDID: 'did:nostr:holder123',
          challenge: 'test-challenge',
        });

        expect(mockBbsService.createSelectiveDisclosureProof).toHaveBeenCalledWith(
          mockCredential,
          ['degree'],
          'test-challenge',
          expect.any(Uint8Array),
        );
      });

      it('should not apply selective disclosure when no fields specified', async () => {
        const vp = await service.buildPresentation({
          credentialIds: ['cred1'],
          selectiveFields: {},
          holderDID: 'did:nostr:holder123',
          challenge: 'test-challenge',
        });

        expect(mockBbsService.createSelectiveDisclosureProof).not.toHaveBeenCalled();
        expect(vp.verifiableCredential[0]).toEqual(mockCredential);
      });

      it('should include multiple credentials', async () => {
        mockCredentialService.getCredentialById.mockImplementation((id: string) => {
          if (id === 'cred1' || id === 'cred2') {
            return { ...mockStoredCredential, credential: { ...mockCredential, id } } as any;
          }
          return null;
        });

        const vp = await service.buildPresentation({
          credentialIds: ['cred1', 'cred2'],
          selectiveFields: {},
          holderDID: 'did:nostr:holder123',
          challenge: 'test-challenge',
        });

        expect(vp.verifiableCredential).toHaveLength(2);
      });
    });
  });

  describe('Share History', () => {
    describe('recordShare', () => {
      it('should record share with all fields', () => {
        const record = service.recordShare({
          timestamp: '2024-01-01T00:00:00Z',
          recipientPubkey: 'pubkey123',
          credentialIds: ['cred1'],
          fieldsDisclosed: { cred1: ['degree'] },
          purpose: 'Job Application',
          challenge: 'challenge123',
          domain: 'example.com',
          validUntil: '2024-01-01T01:00:00Z',
        });

        expect(record.id).toBeDefined();
        expect(record.timestamp).toBe('2024-01-01T00:00:00Z');
        expect(record.recipientPubkey).toBe('pubkey123');
        expect(record.credentialIds).toEqual(['cred1']);
        expect(record.purpose).toBe('Job Application');
      });

      it('should persist share to localStorage', () => {
        const record = service.recordShare({
          timestamp: '2024-01-01T00:00:00Z',
          recipientPubkey: 'pubkey123',
          credentialIds: [],
          fieldsDisclosed: {},
        });

        const stored = JSON.parse(localStorage.getItem('veles_vp_history') || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe(record.id);
      });

      it('should generate unique IDs for different shares', () => {
        const record1 = service.recordShare({
          timestamp: '2024-01-01T00:00:00Z',
          recipientPubkey: 'pubkey1',
          credentialIds: [],
          fieldsDisclosed: {},
        });

        const record2 = service.recordShare({
          timestamp: '2024-01-01T00:00:00Z',
          recipientPubkey: 'pubkey2',
          credentialIds: [],
          fieldsDisclosed: {},
        });

        expect(record1.id).not.toBe(record2.id);
      });
    });

    describe('getShareHistory', () => {
      it('should return empty array when no shares exist', () => {
        const history = service.getShareHistory();
        expect(history).toEqual([]);
      });

      it('should return all recorded shares', () => {
        service.recordShare({
          timestamp: '2024-01-01T00:00:00Z',
          recipientPubkey: 'pubkey1',
          credentialIds: [],
          fieldsDisclosed: {},
        });

        service.recordShare({
          timestamp: '2024-01-01T01:00:00Z',
          recipientPubkey: 'pubkey2',
          credentialIds: [],
          fieldsDisclosed: {},
        });

        const history = service.getShareHistory();
        expect(history).toHaveLength(2);
      });

      it('should return shares in order they were added', () => {
        const record1 = service.recordShare({
          timestamp: '2024-01-01T00:00:00Z',
          recipientPubkey: 'pubkey1',
          credentialIds: [],
          fieldsDisclosed: {},
        });

        const record2 = service.recordShare({
          timestamp: '2024-01-01T01:00:00Z',
          recipientPubkey: 'pubkey2',
          credentialIds: [],
          fieldsDisclosed: {},
        });

        const history = service.getShareHistory();
        expect(history[0].id).toBe(record1.id);
        expect(history[1].id).toBe(record2.id);
      });
    });
  });
});
