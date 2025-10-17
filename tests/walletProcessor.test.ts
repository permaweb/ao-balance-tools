import { WalletBalanceProcessor } from '../src/walletProcessor';
import { CUClient } from '../src/cuClient';
import { HyperbeamClient } from '../src/hyperbeam';
import { BalanceComparator } from '../src/comparator';
import { Config, BalanceComparison } from '../src/types';

jest.mock('../src/cuClient');
jest.mock('../src/hyperbeam');
jest.mock('../src/comparator');

describe('WalletBalanceProcessor', () => {
  let mockConfig: Config;
  let processor: WalletBalanceProcessor;

  beforeEach(() => {
    mockConfig = {
      cuUrl: 'https://cu.example.com',
      hyperbeamBaseUrl: 'https://hyperbeam.example.com',
      concurrency: 15,
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeout: 30000,
      maxAddresses: 100,
    };

    jest.clearAllMocks();
    processor = new WalletBalanceProcessor(mockConfig, './test-wallet.json');
  });

  describe('constructor', () => {
    it('should initialize with config and wallet path', () => {
      expect(processor).toBeDefined();
    });

    it('should create CUClient with provided config', () => {
      new WalletBalanceProcessor(mockConfig, './wallet.json');
      expect(CUClient).toHaveBeenCalledWith(mockConfig);
    });

    it('should create BalanceComparator instance', () => {
      new WalletBalanceProcessor(mockConfig, './wallet.json');
      expect(BalanceComparator).toHaveBeenCalled();
    });
  });

  describe('processBalances', () => {
    it('should return empty array when no addresses found', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };
      const messageId = 'test-message-id';
      const walletBalances = {};

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue(messageId);
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue(walletBalances);
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue([]);

      const results = await processor.processBalances('process-id');

      expect(results).toEqual([]);
      expect(CUClient.prototype.loadWallet).toHaveBeenCalledWith('./test-wallet.json');
    });

    it('should process balances with progress bar', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };
      const messageId = 'test-message-id';
      const walletBalances = {
        'addr1': '1000',
        'addr2': '2000',
      };

      const mockComparison1: BalanceComparison = {
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      };

      const mockComparison2: BalanceComparison = {
        address: 'addr2',
        aoBalance: '2000',
        hyperbeamBalance: '2000',
        match: true,
      };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue(messageId);
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue(walletBalances);
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue(['addr1', 'addr2']);
      (BalanceComparator.prototype.compareBalances as jest.Mock)
        .mockReturnValueOnce(mockComparison1)
        .mockReturnValueOnce(mockComparison2);
      (HyperbeamClient.prototype.getBalance as jest.Mock)
        .mockResolvedValueOnce('1000')
        .mockResolvedValueOnce('2000');

      const results = await processor.processBalances('process-id', true);

      expect(results).toHaveLength(2);
      expect(results[0].match).toBe(true);
      expect(results[1].match).toBe(true);
    });

    it('should process balances without progress bar when disabled', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };
      const messageId = 'test-message-id';
      const walletBalances = { 'addr1': '1000' };
      const mockComparison: BalanceComparison = {
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue(messageId);
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue(walletBalances);
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue(['addr1']);
      (BalanceComparator.prototype.compareBalances as jest.Mock).mockReturnValue(mockComparison);
      (HyperbeamClient.prototype.getBalance as jest.Mock).mockResolvedValue('1000');

      const results = await processor.processBalances('process-id', false);

      expect(results).toHaveLength(1);
    });

    it('should respect maxAddresses limit', async () => {
      mockConfig.maxAddresses = 1;
      processor = new WalletBalanceProcessor(mockConfig, './test-wallet.json');

      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };
      const messageId = 'test-message-id';
      const walletBalances = {
        'addr1': '1000',
        'addr2': '2000',
      };

      const mockComparison: BalanceComparison = {
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue(messageId);
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue(walletBalances);
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue(['addr1', 'addr2']);
      (BalanceComparator.prototype.compareBalances as jest.Mock).mockReturnValue(mockComparison);
      (HyperbeamClient.prototype.getBalance as jest.Mock).mockResolvedValue('1000');

      const results = await processor.processBalances('process-id');

      expect(results).toHaveLength(1);
      expect(BalanceComparator.prototype.compareBalances).toHaveBeenCalledTimes(1);
    });

    it('should handle Hyperbeam fetch errors gracefully', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };
      const messageId = 'test-message-id';
      const walletBalances = {
        'addr1': '1000',
        'addr2': '2000',
      };

      const mockComparison: BalanceComparison = {
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '0',
        match: false,
        difference: '1000',
      };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue(messageId);
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue(walletBalances);
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue(['addr1', 'addr2']);
      (HyperbeamClient.prototype.getBalance as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('2000');
      (BalanceComparator.prototype.compareBalances as jest.Mock)
        .mockReturnValueOnce(mockComparison)
        .mockReturnValueOnce({
          address: 'addr2',
          aoBalance: '2000',
          hyperbeamBalance: '2000',
          match: true,
        });

      const results = await processor.processBalances('process-id');

      expect(results).toHaveLength(2);
    });

    it('should load wallet before processing', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({});
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue([]);

      await processor.processBalances('process-id');

      expect(CUClient.prototype.loadWallet).toHaveBeenCalledWith('./test-wallet.json');
    });

    it('should send balance message with loaded wallet', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({});
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue([]);

      await processor.processBalances('process-id');

      expect(CUClient.prototype.sendBalanceMessage).toHaveBeenCalledWith('process-id', mockWallet);
    });

    it('should get result from CU with correct parameters', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };
      const messageId = 'test-msg-id';

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue(messageId);
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({});
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue([]);

      await processor.processBalances('process-id');

      expect(CUClient.prototype.getResultFromCU).toHaveBeenCalledWith(
        messageId,
        'process-id',
        mockConfig.cuUrl
      );
    });

    it('should create HyperbeamClient with correct parameters', async () => {
      const mockWallet = { kty: 'RSA', n: 'test', e: 'AQAB' };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({
        'addr1': '100',
      });
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue(['addr1']);
      (BalanceComparator.prototype.compareBalances as jest.Mock).mockReturnValue({
        address: 'addr1',
        aoBalance: '100',
        hyperbeamBalance: '100',
        match: true,
      });
      (HyperbeamClient.prototype.getBalance as jest.Mock).mockResolvedValue('100');

      const processId = 'test-process-id';
      await processor.processBalances(processId);

      expect(HyperbeamClient).toHaveBeenCalledWith(mockConfig, processId);
    });
  });

  describe('validateAndProcess', () => {
    it('should validate process ID before processing', async () => {
      (CUClient.prototype.validateProcessId as jest.Mock).mockResolvedValue(true);
      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue({
        kty: 'RSA',
        n: 'test',
        e: 'AQAB',
      });
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({});
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue([]);

      await processor.validateAndProcess('valid-process-id-0000000000000000000000000000');

      expect(CUClient.prototype.validateProcessId).toHaveBeenCalledWith(
        'valid-process-id-0000000000000000000000000000'
      );
    });

    it('should throw error for invalid process ID', async () => {
      (CUClient.prototype.validateProcessId as jest.Mock).mockResolvedValue(false);

      await expect(processor.validateAndProcess('invalid-id')).rejects.toThrow(
        /Invalid process ID format/
      );
    });

    it('should return comparison results when validation passes', async () => {
      const mockComparisons: BalanceComparison[] = [
        {
          address: 'addr1',
          aoBalance: '1000',
          hyperbeamBalance: '1000',
          match: true,
        },
      ];

      (CUClient.prototype.validateProcessId as jest.Mock).mockResolvedValue(true);
      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue({
        kty: 'RSA',
        n: 'test',
        e: 'AQAB',
      });
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({ 'addr1': '1000' });
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue(['addr1']);
      (BalanceComparator.prototype.compareBalances as jest.Mock).mockReturnValue(mockComparisons[0]);
      (HyperbeamClient.prototype.getBalance as jest.Mock).mockResolvedValue('1000');

      const results = await processor.validateAndProcess(
        'valid-process-id-0000000000000000000000000000'
      );

      expect(results).toEqual(mockComparisons);
    });

    it('should pass showProgress parameter to processBalances', async () => {
      const processBalancesSpy = jest.spyOn(processor, 'processBalances');

      (CUClient.prototype.validateProcessId as jest.Mock).mockResolvedValue(true);
      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue({
        kty: 'RSA',
        n: 'test',
        e: 'AQAB',
      });
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({});
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue([]);
      processBalancesSpy.mockResolvedValue([]);

      await processor.validateAndProcess('valid-process-id-0000000000000000000000000000', false);

      expect(processBalancesSpy).toHaveBeenCalledWith('valid-process-id-0000000000000000000000000000', false);

      processBalancesSpy.mockRestore();
    });
  });

  describe('security', () => {
    it('should not log wallet data', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockWallet = { kty: 'RSA', n: 'test-secret-n', e: 'AQAB' };

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue(mockWallet);
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue({});
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue([]);

      await processor.processBalances('process-id');

      const allLogs = consoleLogSpy.mock.calls.join(' ');
      expect(allLogs).not.toContain('test-secret-n');
      expect(allLogs).not.toContain('kty');

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should not expose wallet path in error messages', async () => {
      (CUClient.prototype.loadWallet as jest.Mock).mockRejectedValue(
        new Error('Wallet load failed')
      );

      try {
        await processor.processBalances('process-id');
      } catch (error) {
        expect((error as Error).message).not.toContain('./test-wallet.json');
      }
    });
  });

  describe('concurrency handling', () => {
    it('should respect concurrency limit from config', async () => {
      mockConfig.concurrency = 5;
      processor = new WalletBalanceProcessor(mockConfig, './test-wallet.json');

      const addresses = Array.from({ length: 10 }, (_, i) => `addr${i}`);
      const walletBalances = Object.fromEntries(
        addresses.map(addr => [addr, '1000'])
      );

      (CUClient.prototype.loadWallet as jest.Mock).mockResolvedValue({
        kty: 'RSA',
        n: 'test',
        e: 'AQAB',
      });
      (CUClient.prototype.sendBalanceMessage as jest.Mock).mockResolvedValue('msg-id');
      (CUClient.prototype.getResultFromCU as jest.Mock).mockResolvedValue(walletBalances);
      (BalanceComparator.prototype.extractAddresses as jest.Mock).mockReturnValue(addresses);
      (HyperbeamClient.prototype.getBalance as jest.Mock).mockResolvedValue('1000');
      (BalanceComparator.prototype.compareBalances as jest.Mock).mockReturnValue({
        address: 'addr0',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      });

      const results = await processor.processBalances('process-id');

      expect(results).toHaveLength(10);
    });
  });
});
