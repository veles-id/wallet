import { StoredCredential, VerifiableCredential } from './credential.types';
import { StoredDID } from './did.types';

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  verifiableCredential: VerifiableCredential[];
  holder: string;
  validFrom?: string;
  validUntil?: string;
  proof: PresentationProof;
}

export interface PresentationProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  challenge?: string;
  domain?: string;
  proofValue: string;
}

export interface VPTemplate {
  id: string;
  name: string;
  description?: string;
  credentialIds: string[];
  selectiveFields: Record<string, string[]>;
  defaultValidityMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface VPShareRecord {
  id: string;
  templateId?: string;
  timestamp: string;
  recipientDID?: string;
  recipientPubkey: string;
  credentialIds: string[];
  fieldsDisclosed: Record<string, string[]>;
  purpose?: string;
  challenge?: string;
  domain?: string;
  validUntil?: string;
  nostrEventId?: string;
}

export interface VerificationRequest {
  challenge: string;
  domain?: string;
  expiresAt: string;
  requiredFields?: string[];
  purpose?: string;
}

export interface TemplateDisplayData {
  template: VPTemplate;
  credentials: StoredCredential[];
  persona: StoredDID | null;
  latestShare: VPShareRecord | null;
}

export interface CreateVPRequest {
  templateId?: string;
  credentialIds: string[];
  selectiveFields: Record<string, string[]>;
  holderDID: string;
  challenge: string;
  domain?: string;
  validityMinutes?: number;
}
