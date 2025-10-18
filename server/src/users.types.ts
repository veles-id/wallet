// Minimal AuthenticatorDevice type for demo purposes
export interface AuthenticatorDevice {
  credentialID: Buffer | string;
  credentialPublicKey: Buffer;
  counter: number;
  transports?: string[];
}

export interface User {
  id: string;
  username: string;
  currentChallenge: string | null;
  devices: AuthenticatorDevice[];
}
