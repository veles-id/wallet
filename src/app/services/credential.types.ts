export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string | CredentialIssuer;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  proof?: CredentialProof;
  credentialStatus?: CredentialStatus;
}

export interface CredentialIssuer {
  id: string;
  name?: string;
  description?: string;
  image?: string;
}

export interface CredentialSubject {
  id: string;
  [key: string]: any;
}

export interface CredentialProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws?: string;
  proofValue?: string;
}

export interface CredentialStatus {
  id: string;
  type: string;
}

export interface StoredCredential {
  credential: VerifiableCredential;
  createdAt: string;
  alias?: string;
  tags?: string[];
  isVerified?: boolean;
  metadata?: CredentialMetadata;
}

export interface CredentialMetadata {
  templateId?: string;
  category?: CredentialCategory;
  privacy?: CredentialPrivacy;
  source?: CredentialSource;
}

export enum CredentialCategory {
  EDUCATION = "education",
  PROFESSIONAL = "professional",
  PERSONAL = "personal",
  ACHIEVEMENT = "achievement",
  CERTIFICATION = "certification",
  MEMBERSHIP = "membership",
  EMAIL = "email",
  DEVICE = "device",
  IDENTITY = "identity",
  ALUMNI = "alumni",
  OTHER = "other",
}

export enum CredentialPrivacy {
  PUBLIC = "public",
  PRIVATE = "private",
  SELECTIVE = "selective",
}

export enum CredentialSource {
  SELF_ISSUED = "self-issued",
  THIRD_PARTY = "third-party",
  IMPORTED = "imported",
}

export interface CredentialTemplate {
  id: string;
  name: string;
  description: string;
  category: CredentialCategory;
  fields: CredentialField[];
  context: string[];
  type: string[];
}

export interface CredentialField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: FieldValidation;
}

export enum FieldType {
  TEXT = "text",
  EMAIL = "email",
  URL = "url",
  DATE = "date",
  NUMBER = "number",
  SELECT = "select",
  TEXTAREA = "textarea",
  BOOLEAN = "boolean",
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface CreateCredentialRequest {
  templateId?: string;
  issuerDID: string;
  subjectDID: string;
  credentialData: Record<string, any>;
  expirationDate?: string;
  alias?: string;
  tags?: string[];
  category?: CredentialCategory;
  privacy?: CredentialPrivacy;
}

export enum VerificationStatus {
  VALID = "valid",
  INVALID = "invalid",
  EXPIRED = "expired",
  VERIFYING = "verifying",
  UNKNOWN = "unknown",
}

export enum CredentialColorClass {
  BROWN = "brown",
  DARK = "dark",
  BLACK = "black",
  BLUE = "blue",
  GREEN = "green",
}

export enum CredentialIconType {
  EMAIL_OUTLINED = "email_outlined",
  SCHOOL_OUTLINED = "school_outlined",
  PHONE_IPHONE_OUTLINED = "phone_iphone_outlined",
  BADGE_OUTLINED = "badge_outlined",
  WORK_OUTLINE = "work_outline",
}
