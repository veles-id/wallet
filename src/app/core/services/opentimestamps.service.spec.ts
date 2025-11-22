import { TestBed } from '@angular/core/testing';
import { OpentimestampsService } from './opentimestamps.service';

describe('OpentimestampsService', () => {
  let service: OpentimestampsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpentimestampsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Business Logic - Data Conversion Helpers', () => {
    describe('_hexToBytes', () => {
      it('should convert hex string to Uint8Array', () => {
        const hex = 'deadbeef';
        const bytes = (service as any)._hexToBytes(hex);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(4);
        expect(bytes[0]).toBe(0xde);
        expect(bytes[1]).toBe(0xad);
        expect(bytes[2]).toBe(0xbe);
        expect(bytes[3]).toBe(0xef);
      });

      it('should handle full SHA-256 hash (64 hex chars)', () => {
        const sha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        const bytes = (service as any)._hexToBytes(sha256Hash);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(32);
        expect(bytes[0]).toBe(0xe3);
        expect(bytes[31]).toBe(0x55);
      });

      it('should handle lowercase hex', () => {
        const hex = 'abcdef';
        const bytes = (service as any)._hexToBytes(hex);

        expect(bytes[0]).toBe(0xab);
        expect(bytes[1]).toBe(0xcd);
        expect(bytes[2]).toBe(0xef);
      });

      it('should handle uppercase hex', () => {
        const hex = 'ABCDEF';
        const bytes = (service as any)._hexToBytes(hex);

        expect(bytes[0]).toBe(0xab);
        expect(bytes[1]).toBe(0xcd);
        expect(bytes[2]).toBe(0xef);
      });

      it('should handle empty string', () => {
        const bytes = (service as any)._hexToBytes('');

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(0);
      });

      it('should handle zero-padded bytes', () => {
        const hex = '000102';
        const bytes = (service as any)._hexToBytes(hex);

        expect(bytes[0]).toBe(0);
        expect(bytes[1]).toBe(1);
        expect(bytes[2]).toBe(2);
      });
    });

    describe('_bytesToBase64', () => {
      it('should convert Uint8Array to base64 string', () => {
        const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
        const base64 = (service as any)._bytesToBase64(bytes);

        expect(typeof base64).toBe('string');
        expect(base64).toBe('3q2+7w==');
      });

      it('should handle empty array', () => {
        const bytes = new Uint8Array([]);
        const base64 = (service as any)._bytesToBase64(bytes);

        expect(base64).toBe('');
      });

      it('should handle single byte', () => {
        const bytes = new Uint8Array([0x42]);
        const base64 = (service as any)._bytesToBase64(bytes);

        expect(base64).toBe('Qg==');
      });

      it('should produce valid base64', () => {
        const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const base64 = (service as any)._bytesToBase64(bytes);

        expect(() => atob(base64)).not.toThrow();
      });
    });

    describe('_base64ToBytes', () => {
      it('should convert base64 string to Uint8Array', () => {
        const base64 = '3q2+7w==';
        const bytes = (service as any)._base64ToBytes(base64);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(4);
        expect(bytes[0]).toBe(0xde);
        expect(bytes[1]).toBe(0xad);
        expect(bytes[2]).toBe(0xbe);
        expect(bytes[3]).toBe(0xef);
      });

      it('should handle empty string', () => {
        const base64 = '';
        const bytes = (service as any)._base64ToBytes(base64);

        expect(bytes.length).toBe(0);
      });

      it('should handle single byte base64', () => {
        const base64 = 'Qg==';
        const bytes = (service as any)._base64ToBytes(base64);

        expect(bytes.length).toBe(1);
        expect(bytes[0]).toBe(0x42);
      });

      it('should decode standard base64 correctly', () => {
        const base64 = 'SGVsbG8=';
        const bytes = (service as any)._base64ToBytes(base64);

        const decoded = new TextDecoder().decode(bytes);
        expect(decoded).toBe('Hello');
      });
    });

    describe('Encoding Round-Trips', () => {
      it('should round-trip hex to bytes to base64 to bytes', () => {
        const originalHex = 'cafebabe';
        const bytes1 = (service as any)._hexToBytes(originalHex);
        const base64 = (service as any)._bytesToBase64(bytes1);
        const bytes2 = (service as any)._base64ToBytes(base64);

        expect(bytes2).toEqual(bytes1);
      });

      it('should round-trip bytes to base64 to bytes', () => {
        const originalBytes = new Uint8Array([1, 2, 3, 4, 5]);
        const base64 = (service as any)._bytesToBase64(originalBytes);
        const recoveredBytes = (service as any)._base64ToBytes(base64);

        expect(recoveredBytes).toEqual(originalBytes);
      });

      it('should handle full SHA-256 hash round-trip', () => {
        const sha256Hex = 'a'.repeat(64);
        const bytes1 = (service as any)._hexToBytes(sha256Hex);
        const base64 = (service as any)._bytesToBase64(bytes1);
        const bytes2 = (service as any)._base64ToBytes(base64);

        expect(bytes1.length).toBe(32);
        expect(bytes2).toEqual(bytes1);
      });

      it('should handle various data patterns', () => {
        const testPatterns = [
          new Uint8Array([0, 0, 0, 0]),
          new Uint8Array([255, 255, 255, 255]),
          new Uint8Array([0, 128, 255]),
          new Uint8Array(Array.from({ length: 100 }, (_, i) => i % 256)),
        ];

        for (const pattern of testPatterns) {
          const base64 = (service as any)._bytesToBase64(pattern);
          const recovered = (service as any)._base64ToBytes(base64);
          expect(recovered).toEqual(pattern);
        }
      });

      it('should handle mixed case hex strings', () => {
        const mixedCaseHex = 'DeAdBeEf';
        const bytes = (service as any)._hexToBytes(mixedCaseHex);

        expect(bytes.length).toBe(4);
        expect(bytes[0]).toBe(0xde);
        expect(bytes[1]).toBe(0xad);
      });
    });
  });
});
