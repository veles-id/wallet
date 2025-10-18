export interface VerificationResult {
  isValid: boolean;
  details: string;
  issuerResolved: boolean;
  verificationMethod?: string;
  signatureType?: string;
  errors?: string[];
}
