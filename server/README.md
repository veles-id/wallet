# Veles ID Authentication Server

This is a demo authentication server that allows biometric login with modern devices. This server is not meant for production purposes, yet. Currently it serves as a PoC and provides passwordless authentication with passkeys as specified in the official [W3C WebAuthn 2 Recommendation](https://www.w3.org/TR/webauthn-2/).

The server exclusively handles WebAuthn/passkey authentication for Veles ID Wallet.

## Avilable endpoints

All endpoints are auth-related:
- `/api/auth/options` - Generate authentication options
- `/api/auth/verify` - Verify authentication
- `/api/register/options` - Generate registration options
- `/api/register/verify` - Verify registration

## Key features

Key WebAuthn 2 features covered in this implementation:
- [x] Passwordless authentication via passkeys
- [x] Platform authenticators (`authenticatorAttachment: 'platform'`)
- [x] User verification (`userVerification: 'preferred'`)
- [x] Attestation (`attestationType: 'none'`)
- [x] Resident keys (discoverable credentials via `requireResidentKey: false`)

## Running the Authentication Server

### Install packages

Once the source is cloned, you'll need to install the packages:

```
npm install
```

### Authentication server

For an auth server run:

```
npm start
```
