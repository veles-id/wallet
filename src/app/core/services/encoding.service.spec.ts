import { TestBed } from '@angular/core/testing';
import { EncodingService } from './encoding.service';

describe('EncodingService', () => {
  let service: EncodingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EncodingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('hexToBytes', () => {
    it('should convert hex string to Uint8Array', () => {
      const hex = '48656c6c6f';
      const bytes = service.hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle empty string', () => {
      const bytes = service.hexToBytes('');
      expect(bytes).toEqual(new Uint8Array(0));
    });

    it('should handle SHA256 hash', () => {
      const sha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const bytes = service.hexToBytes(sha256Hash);
      expect(bytes.length).toBe(32);
      expect(bytes[0]).toBe(0xe3);
      expect(bytes[31]).toBe(0x55);
    });

    it('should handle mixed case hex', () => {
      const hex = 'AbCdEf';
      const bytes = service.hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
    });

    it('should throw error for odd length hex string', () => {
      expect(() => service.hexToBytes('abc')).toThrow('Hex string must have an even number of characters');
    });

    it('should handle hex with leading zeros', () => {
      const hex = '000102';
      const bytes = service.hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0, 1, 2]));
    });
  });

  describe('bytesToHex', () => {
    it('should convert Uint8Array to hex string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const hex = service.bytesToHex(bytes);
      expect(hex).toBe('48656c6c6f');
    });

    it('should handle empty array', () => {
      const hex = service.bytesToHex(new Uint8Array(0));
      expect(hex).toBe('');
    });

    it('should handle single byte', () => {
      const hex = service.bytesToHex(new Uint8Array([255]));
      expect(hex).toBe('ff');
    });

    it('should preserve leading zeros', () => {
      const hex = service.bytesToHex(new Uint8Array([0, 1, 2]));
      expect(hex).toBe('000102');
    });
  });

  describe('bytesToBase64', () => {
    it('should convert Uint8Array to base64 string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const base64 = service.bytesToBase64(bytes);
      expect(base64).toBe('SGVsbG8=');
    });

    it('should handle empty array', () => {
      const base64 = service.bytesToBase64(new Uint8Array(0));
      expect(base64).toBe('');
    });

    it('should handle binary data', () => {
      const bytes = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
      const base64 = service.bytesToBase64(bytes);
      expect(base64).toBeTruthy();
      expect(base64.length).toBeGreaterThan(0);
    });

    it('should handle SHA256 hash', () => {
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = i;
      }
      const base64 = service.bytesToBase64(bytes);
      expect(base64).toBeTruthy();
    });
  });

  describe('base64ToBytes', () => {
    it('should convert base64 string to Uint8Array', () => {
      const base64 = 'SGVsbG8=';
      const bytes = service.base64ToBytes(base64);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle base64 without padding', () => {
      const base64 = 'SGVsbG8';
      const bytes = service.base64ToBytes(base64);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should handle binary data', () => {
      const base64 = 'AAECAw==';
      const bytes = service.base64ToBytes(base64);
      expect(bytes[0]).toBe(0);
      expect(bytes[1]).toBe(1);
      expect(bytes[2]).toBe(2);
      expect(bytes[3]).toBe(3);
    });

    it('should handle empty string', () => {
      const bytes = service.base64ToBytes('');
      expect(bytes).toEqual(new Uint8Array(0));
    });
  });

  describe('base64UrlDecodeToString', () => {
    it('should decode base64url to string', () => {
      const base64Url = 'SGVsbG8';
      const decoded = service.base64UrlDecodeToString(base64Url);
      expect(decoded).toBe('Hello');
    });

    it('should handle URL-safe characters', () => {
      const base64Url = 'eyJ0eXAiOiJKV1QifQ';
      const decoded = service.base64UrlDecodeToString(base64Url);
      expect(decoded).toBe('{"typ":"JWT"}');
    });

    it('should add padding if needed', () => {
      const base64Url = 'SGVsbG8';
      const decoded = service.base64UrlDecodeToString(base64Url);
      expect(decoded).toBeTruthy();
    });
  });

  describe('base64UrlDecodeToBytes', () => {
    it('should decode base64url to Uint8Array', () => {
      const base64Url = 'SGVsbG8';
      const bytes = service.base64UrlDecodeToBytes(base64Url);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle URL-safe characters with dashes and underscores', () => {
      const base64Url = 'eyJ0eXAiOiJKV1QifQ';
      const bytes = service.base64UrlDecodeToBytes(base64Url);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should handle binary data', () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 254]);
      const base64 = service.bytesToBase64(original);
      const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const decoded = service.base64UrlDecodeToBytes(base64Url);
      expect(decoded).toEqual(original);
    });
  });

  describe('multibaseToBytes', () => {
    it('should throw error for unsupported encoding', () => {
      expect(() => service.multibaseToBytes('uABCDEF')).toThrow('Only base58btc multibase encoding supported');
    });

    it('should throw error for base58btc', () => {
      expect(() => service.multibaseToBytes('z123')).toThrow('Base58 decoding not implemented');
    });
  });

  describe('round-trip conversions', () => {
    it('should convert hex -> bytes -> hex', () => {
      const originalHex = '48656c6c6f576f726c64';
      const bytes = service.hexToBytes(originalHex);
      const resultHex = service.bytesToHex(bytes);
      expect(resultHex).toBe(originalHex);
    });

    it('should convert bytes -> base64 -> bytes', () => {
      const originalBytes = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]);
      const base64 = service.bytesToBase64(originalBytes);
      const recoveredBytes = service.base64ToBytes(base64);
      expect(recoveredBytes).toEqual(originalBytes);
    });

    it('should convert hex -> bytes -> base64 -> bytes', () => {
      const sha256Hex = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const bytes1 = service.hexToBytes(sha256Hex);
      const base64 = service.bytesToBase64(bytes1);
      const bytes2 = service.base64ToBytes(base64);
      expect(bytes2).toEqual(bytes1);
    });

    it('should handle various byte patterns', () => {
      for (let size = 0; size < 100; size++) {
        const pattern = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
          pattern[i] = i % 256;
        }
        const base64 = service.bytesToBase64(pattern);
        const recovered = service.base64ToBytes(base64);
        expect(recovered).toEqual(pattern);
      }
    });

    it('should convert hex with mixed case', () => {
      const mixedCaseHex = 'DeAdBeEf';
      const bytes = service.hexToBytes(mixedCaseHex);
      const lowerHex = service.bytesToHex(bytes);
      expect(lowerHex).toBe('deadbeef');
    });
  });
});
