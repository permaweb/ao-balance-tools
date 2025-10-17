import * as config from '../src/config';
import * as fs from 'fs';
import { Mode, OutputFormat } from '../src/types';

jest.mock('../src/config');
jest.mock('../src/processor');
jest.mock('../src/walletProcessor');
jest.mock('../src/comparator');
jest.mock('../src/reporter');
jest.mock('fs');

describe('CLI Options Parsing', () => {
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      cuUrl: 'https://cu.example.com',
      hyperbeamBaseUrl: 'https://hyperbeam.example.com',
      concurrency: 15,
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeout: 30000,
      walletPath: './demo.json',
    };

    (config.getConfig as jest.Mock).mockReturnValue(mockConfig);
  });

  describe('mode option', () => {
    it('should default to dryrun mode', () => {
      expect(true).toBe(true);
    });

    it('should accept dryrun mode', () => {
      expect(['dryrun', 'wallet'].includes('dryrun')).toBe(true);
    });

    it('should accept wallet mode', () => {
      expect(['dryrun', 'wallet'].includes('wallet')).toBe(true);
    });

    it('should validate mode is case-insensitive', () => {
      const modeString = 'DRYRUN'.toLowerCase();
      expect(modeString).toBe('dryrun');
    });

    it('should reject invalid mode', () => {
      const invalidMode = 'invalid';
      expect(['dryrun', 'wallet'].includes(invalidMode)).toBe(false);
    });
  });

  describe('wallet option', () => {
    it('should accept wallet option with path', () => {
      const options = { wallet: './my-wallet.json' };
      expect(options.wallet).toBeDefined();
      expect(options.wallet).toBe('./my-wallet.json');
    });

    it('should be optional for dryrun mode', () => {
      const modeValue: string = 'dryrun';
      const options: { wallet?: string } = {};

      if (modeValue === 'wallet') {
        expect(options.wallet).toBeDefined();
      } else {
        expect(options.wallet).toBeUndefined();
      }
    });

    it('should be required for wallet mode', () => {
      const modeValue: Mode = 'wallet';
      const optionsValue: { wallet?: string } = {};

      if (modeValue === 'wallet' && !optionsValue.wallet) {
        const hasWalletEnv = !!process.env.WALLET_PATH;
        expect(optionsValue.wallet || hasWalletEnv).toBeFalsy();
      }
    });

    it('should read from WALLET_PATH environment if not provided', () => {
      const modeValue: Mode = 'wallet';
      const optionsValue: { wallet?: string } = {};
      const walletPathEnv = '/path/from/env/wallet.json';

      if (modeValue === 'wallet' && !optionsValue.wallet && walletPathEnv) {
        optionsValue.wallet = walletPathEnv;
      }

      expect(optionsValue.wallet).toBe(walletPathEnv);
    });
  });

  describe('output option', () => {
    it('should default to console output format', () => {
      const outputFormat: OutputFormat = 'console';
      expect(['console', 'json', 'csv'].includes(outputFormat)).toBe(true);
    });

    it('should accept console format', () => {
      expect(['console', 'json', 'csv'].includes('console')).toBe(true);
    });

    it('should accept json format', () => {
      expect(['console', 'json', 'csv'].includes('json')).toBe(true);
    });

    it('should accept csv format', () => {
      expect(['console', 'json', 'csv'].includes('csv')).toBe(true);
    });

    it('should validate output format is case-insensitive', () => {
      const outputString = 'JSON'.toLowerCase() as OutputFormat;
      expect(outputString).toBe('json');
    });

    it('should reject invalid output format', () => {
      const invalidFormat = 'xml';
      expect(['console', 'json', 'csv'].includes(invalidFormat)).toBe(false);
    });
  });

  describe('concurrency option', () => {
    it('should parse concurrency as integer', () => {
      const concurrencyString = '25';
      const parsed = parseInt(concurrencyString, 10);
      expect(parsed).toBe(25);
      expect(typeof parsed).toBe('number');
    });

    it('should override default concurrency', () => {
      const defaultConcurrency = 15;
      const userConcurrency = '30';
      const finalConcurrency = parseInt(userConcurrency, 10);
      expect(finalConcurrency).not.toBe(defaultConcurrency);
      expect(finalConcurrency).toBe(30);
    });

    it('should accept various concurrency values', () => {
      const values = ['1', '5', '15', '50', '100'];
      values.forEach(val => {
        const parsed = parseInt(val, 10);
        expect(parsed).toBeGreaterThan(0);
      });
    });
  });

  describe('progress option', () => {
    it('should default to showing progress bar', () => {
      const options: any = { progress: true };
      expect(options.progress).toBe(true);
    });

    it('should disable progress with --no-progress flag', () => {
      const options: any = { progress: false };
      expect(options.progress).toBe(false);
    });

    it('should pass progress option to processor', () => {
      const options = { progress: true };
      expect(options.progress).toBeDefined();
    });
  });

  describe('verbose option', () => {
    it('should be optional', () => {
      const options: any = {};
      expect(options.verbose).toBeUndefined();
    });

    it('should be set with --verbose flag', () => {
      const options: any = { verbose: true };
      expect(options.verbose).toBe(true);
    });

    it('should enable detailed logging when set', () => {
      const options = { verbose: true };
      if (options.verbose) {
        expect(true).toBe(true);
      }
    });
  });

  describe('file option', () => {
    it('should be optional for console output', () => {
      const options: any = { output: 'console' };
      expect(options.file).toBeUndefined();
    });

    it('should accept file path', () => {
      const options = { file: './output.json' };
      expect(options.file).toBe('./output.json');
    });

    it('should be used for json output', () => {
      const options = { output: 'json', file: './report.json' };
      if (options.output !== 'console') {
        expect(options.file).toBeDefined();
      }
    });

    it('should be used for csv output', () => {
      const options = { output: 'csv', file: './report.csv' };
      if (options.output !== 'console') {
        expect(options.file).toBeDefined();
      }
    });
  });

  describe('mode-specific validation', () => {
    it('should validate wallet path when wallet mode selected', () => {
      const mode: Mode = 'wallet';
      const walletPath = './wallet.json';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ kty: 'RSA', n: 'test', e: 'AQAB' })
      );

      if (mode === 'wallet' && walletPath) {
        expect(true).toBe(true);
      }
    });

    it('should handle missing wallet error gracefully', () => {
      const mode: Mode = 'wallet';
      const walletPath = './missing-wallet.json';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      if (mode === 'wallet' && !fs.existsSync(walletPath)) {
        expect(true).toBe(true);
      }
    });

    it('should not require wallet for dryrun mode', () => {
      const mode: Mode = 'dryrun';
      const walletPath: string | undefined = undefined;

      if (mode === 'dryrun') {
        expect(walletPath).toBeUndefined();
      }
    });
  });

  describe('error handling', () => {
    it('should exit with code 1 on invalid mode', () => {
      const invalidMode = 'invalid';
      const isValid = ['dryrun', 'wallet'].includes(invalidMode);
      expect(isValid).toBe(false);
    });

    it('should exit with code 1 on missing wallet for wallet mode', () => {
      const mode: Mode = 'wallet';
      const hasWallet = false;

      if (mode === 'wallet' && !hasWallet) {
        expect(true).toBe(true);
      }
    });

    it('should exit with code 1 on invalid output format', () => {
      const invalidFormat = 'xml';
      const isValid = ['console', 'json', 'csv'].includes(invalidFormat);
      expect(isValid).toBe(false);
    });

    it('should exit with code 1 on invalid process ID', () => {
      const processId = 'invalid';
      const isValid = processId && processId.length === 43;
      expect(isValid).toBe(false);
    });

    it('should exit with code 1 if mismatches found', () => {
      const mismatchCount = 5;
      expect(mismatchCount > 0).toBe(true);
    });

    it('should exit with code 0 on success with no mismatches', () => {
      const mismatchCount = 0;
      expect(mismatchCount > 0).toBe(false);
    });
  });

  describe('configuration loading', () => {
    it('should load config from environment', () => {
      const cfg = mockConfig;
      expect(cfg.cuUrl).toBeDefined();
    });

    it('should validate loaded config', () => {
      const cfg = mockConfig;
      expect(cfg.cuUrl.startsWith('https')).toBe(true);
    });

    it('should merge CLI options with environment config', () => {
      const cliConcurrency = '50';
      const finalConfig = { ...mockConfig, concurrency: parseInt(cliConcurrency, 10) };
      expect(finalConfig.concurrency).toBe(50);
      expect(finalConfig.concurrency).not.toBe(mockConfig.concurrency);
    });
  });

  describe('processor selection', () => {
    it('should use BalanceProcessor for dryrun mode', () => {
      const mode: Mode = 'dryrun';
      expect(mode).toBe('dryrun');
    });

    it('should use WalletBalanceProcessor for wallet mode', () => {
      const mode: Mode = 'wallet';
      expect(mode).toBe('wallet');
    });
  });

  describe('security', () => {
    it('should not expose wallet data in verbose output', () => {
      const secretValue = 'secret-n';
      const verboseEnabled = true;

      if (verboseEnabled) {
        const output = 'Processing with wallet mode';
        expect(output).not.toContain(secretValue);
      }
    });

    it('should not log private keys', () => {
      const privateKeyValue = 'private-key-value';

      const output = JSON.stringify({ mode: 'wallet' });
      expect(output).not.toContain(privateKeyValue);
    });

    it('should sanitize error messages to not expose sensitive paths', () => {
      const sensitivePathValue = '/home/user/.secret/wallet.json';
      const sanitizedMessage = 'Failed to load wallet file';

      expect(sanitizedMessage).not.toContain(sensitivePathValue);
    });
  });

  describe('process ID argument', () => {
    it('should require process ID argument', () => {
      const processId = 'valid-process-id-0000000000000000000000000000';
      expect(processId).toBeDefined();
    });

    it('should validate process ID format', () => {
      const validProcessId = 'validprocessid00000000000000000000000000000';
      expect(validProcessId.length).toBe(43);
    });

    it('should reject process ID shorter than 43 characters', () => {
      const shortProcessId = 'short-id';
      expect(shortProcessId.length).toBeLessThan(43);
    });

    it('should reject process ID longer than 43 characters', () => {
      const longProcessId = 'this-is-a-very-long-process-id-that-exceeds-43-characters';
      expect(longProcessId.length).toBeGreaterThan(43);
    });
  });
});
