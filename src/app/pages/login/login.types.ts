export interface VerificationResponse {
  verified: boolean;
  user?: {
    id: string;
    name: string;
  };
}
