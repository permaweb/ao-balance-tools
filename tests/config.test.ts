import * as fs from 'fs';
import { validateWalletPath, validateConfig, getConfig } from '../src/config';
import { Config } from '../src/types';

jest.mock('fs');

describe('Config Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWalletPath', () => {
    it('should throw error for empty wallet path', () => {
      expect(() => {
        validateWalletPath('');
      }).toThrow('Wallet path cannot be empty');
    });

    it('should throw error for whitespace-only wallet path', () => {
      expect(() => {
        validateWalletPath('   ');
      }).toThrow('Wallet path cannot be empty');
    });

    it('should throw error when wallet file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => {
        validateWalletPath('./non-existent-wallet.json');
      }).toThrow('Wallet file not found: ./non-existent-wallet.json');
    });

    it('should throw error for invalid JSON in wallet file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('{ invalid json }');

      expect(() => {
        validateWalletPath('./wallet.json');
      }).toThrow('Invalid wallet file format');
    });

    it('should throw error when wallet is missing kty field', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ n: 'test', e: 'AQAB' })
      );

      expect(() => {
        validateWalletPath('./wallet.json');
      }).toThrow('Invalid JWK format: missing required fields (kty, n, e)');
    });

    it('should throw error when wallet is missing n field', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ kty: 'RSA', e: 'AQAB' })
      );

      expect(() => {
        validateWalletPath('./wallet.json');
      }).toThrow('Invalid JWK format: missing required fields (kty, n, e)');
    });

    it('should throw error when wallet is missing e field', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ kty: 'RSA', n: 'test' })
      );

      expect(() => {
        validateWalletPath('./wallet.json');
      }).toThrow('Invalid JWK format: missing required fields (kty, n, e)');
    });

    it('should succeed with valid JWK format', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ kty: 'RSA', n: 'test-n', e: 'AQAB' })
      );

      expect(() => {
        validateWalletPath('./wallet.json');
      }).not.toThrow();
    });

    it('should succeed with valid JWK including optional fields', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          kty: 'RSA',
          n: 'test-n',
          e: 'AQAB',
          d: 'test-d',
          p: 'test-p',
          q: 'test-q',
        })
      );

      expect(() => {
        validateWalletPath('./wallet.json');
      }).not.toThrow();
    });

    it('should read wallet file as UTF-8', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ kty: 'RSA', n: 'test', e: 'AQAB' })
      );

      validateWalletPath('./wallet.json');

      expect(fs.readFileSync).toHaveBeenCalledWith('./wallet.json', 'utf-8');
    });

    it('should not expose wallet data in error messages', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ n: 'secret-n-value', e: 'AQAB' })
      );

      expect(() => {
        validateWalletPath('./wallet.json');
      }).toThrow('Invalid JWK format: missing required fields (kty, n, e)');

      try {
        validateWalletPath('./wallet.json');
      } catch (error) {
        expect((error as Error).message).not.toContain('secret-n-value');
      }
    });
  });

  describe('validateConfig', () => {
    let validConfig: Config;

    beforeEach(() => {
      validConfig = {
        cuUrl: 'https://cu.example.com',
        hyperbeamBaseUrl: 'https://hyperbeam.example.com',
        concurrency: 15,
        retryAttempts: 3,
        retryDelayMs: 1000,
        timeout: 30000,
      };
    });

    it('should throw error for missing cuUrl', () => {
      const config = { ...validConfig, cuUrl: '' };

      expect(() => {
        validateConfig(config);
      }).toThrow('Invalid CU_URL: must be a valid HTTP/HTTPS URL');
    });

    it('should throw error for non-HTTP cuUrl', () => {
      const config = { ...validConfig, cuUrl: 'ftp://cu.example.com' };

      expect(() => {
        validateConfig(config);
      }).toThrow('Invalid CU_URL: must be a valid HTTP/HTTPS URL');
    });

    it('should accept HTTP URLs', () => {
      const config = { ...validConfig, cuUrl: 'http://cu.example.com' };

      expect(() => {
        validateConfig(config);
      }).not.toThrow();
    });

    it('should accept HTTPS URLs', () => {
      const config = { ...validConfig, cuUrl: 'https://cu.example.com' };

      expect(() => {
        validateConfig(config);
      }).not.toThrow();
    });

    it('should throw error for concurrency below 1', () => {
      const config = { ...validConfig, concurrency: 0 };

      expect(() => {
        validateConfig(config);
      }).toThrow('Concurrency must be between 1 and 100');
    });

    it('should throw error for concurrency above 100', () => {
      const config = { ...validConfig, concurrency: 101 };

      expect(() => {
        validateConfig(config);
      }).toThrow('Concurrency must be between 1 and 100');
    });

    it('should accept valid concurrency values', () => {
      const config = { ...validConfig, concurrency: 1 };
      expect(() => validateConfig(config)).not.toThrow();

      const config2 = { ...validConfig, concurrency: 50 };
      expect(() => validateConfig(config2)).not.toThrow();

      const config3 = { ...validConfig, concurrency: 100 };
      expect(() => validateConfig(config3)).not.toThrow();
    });

    it('should throw error for negative retry attempts', () => {
      const config = { ...validConfig, retryAttempts: -1 };

      expect(() => {
        validateConfig(config);
      }).toThrow('Retry attempts must be between 0 and 10');
    });

    it('should throw error for retry attempts above 10', () => {
      const config = { ...validConfig, retryAttempts: 11 };

      expect(() => {
        validateConfig(config);
      }).toThrow('Retry attempts must be between 0 and 10');
    });

    it('should accept valid retry attempts', () => {
      const config = { ...validConfig, retryAttempts: 0 };
      expect(() => validateConfig(config)).not.toThrow();

      const config2 = { ...validConfig, retryAttempts: 5 };
      expect(() => validateConfig(config2)).not.toThrow();

      const config3 = { ...validConfig, retryAttempts: 10 };
      expect(() => validateConfig(config3)).not.toThrow();
    });

    it('should throw error for timeout below 1000ms', () => {
      const config = { ...validConfig, timeout: 999 };

      expect(() => {
        validateConfig(config);
      }).toThrow('Timeout must be at least 1000ms');
    });

    it('should accept valid timeout values', () => {
      const config = { ...validConfig, timeout: 1000 };
      expect(() => validateConfig(config)).not.toThrow();

      const config2 = { ...validConfig, timeout: 30000 };
      expect(() => validateConfig(config2)).not.toThrow();
    });

    it('should validate complete valid config', () => {
      expect(() => {
        validateConfig(validConfig);
      }).not.toThrow();
    });
  });

  describe('getConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should throw error when CU_URL is not set', () => {
      delete process.env.CU_URL;

      expect(() => {
        getConfig();
      }).toThrow('CU_URL environment variable is required');
    });

    it('should use default values for optional environment variables', () => {
      process.env.CU_URL = 'https://cu.example.com';
      delete process.env.HYPERBEAM_BASE_URL;
      delete process.env.CONCURRENCY;
      delete process.env.RETRY_ATTEMPTS;
      delete process.env.RETRY_DELAY_MS;
      delete process.env.TIMEOUT;
      delete process.env.MAX_ADDRESSES;

      const config = getConfig();

      expect(config.hyperbeamBaseUrl).toBe('https://compute.hyperbeam.xyz');
      expect(config.concurrency).toBe(15);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelayMs).toBe(1000);
      expect(config.timeout).toBe(30000);
      expect(config.maxAddresses).toBeUndefined();
    });

    it('should use custom environment variable values', () => {
      process.env.CU_URL = 'https://cu.custom.com';
      process.env.HYPERBEAM_BASE_URL = 'https://hyperbeam.custom.com';
      process.env.CONCURRENCY = '25';
      process.env.RETRY_ATTEMPTS = '5';
      process.env.RETRY_DELAY_MS = '2000';
      process.env.TIMEOUT = '60000';
      process.env.MAX_ADDRESSES = '500';

      const config = getConfig();

      expect(config.cuUrl).toBe('https://cu.custom.com');
      expect(config.hyperbeamBaseUrl).toBe('https://hyperbeam.custom.com');
      expect(config.concurrency).toBe(25);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelayMs).toBe(2000);
      expect(config.timeout).toBe(60000);
      expect(config.maxAddresses).toBe(500);
    });

    it('should include CU URLs from environment', () => {
      process.env.CU_URL = 'https://cu.example.com';
      process.env.CU_URL_A = 'https://cu-a.example.com';
      process.env.CU_URL_B = 'https://cu-b.example.com';

      const config = getConfig();

      expect(config.cuUrlA).toBe('https://cu-a.example.com');
      expect(config.cuUrlB).toBe('https://cu-b.example.com');
    });

    it('should include wallet path from environment', () => {
      process.env.CU_URL = 'https://cu.example.com';
      process.env.WALLET_PATH = '/path/to/wallet.json';

      const config = getConfig();

      expect(config.walletPath).toBe('/path/to/wallet.json');
    });

    it('should use default wallet path when not specified', () => {
      process.env.CU_URL = 'https://cu.example.com';
      delete process.env.WALLET_PATH;

      const config = getConfig();

      expect(config.walletPath).toBe('./demo.json');
    });
  });
});
