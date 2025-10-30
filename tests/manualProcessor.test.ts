import { ManualModeProcessor } from '../src/manualProcessor';
import { CUClient } from '../src/cuClient';
import { BalanceComparator } from '../src/comparator';
import { Config } from '../src/types';

jest.mock('../src/cuClient');
jest.mock('../src/hyperbeam');
jest.mock('../src/comparator');

describe('ManualModeProcessor', () => {
  let processor: ManualModeProcessor;
  let config: Config;
  let mockCUClient: jest.Mocked<CUClient>;
  let mockComparator: jest.Mocked<BalanceComparator>;

  beforeEach(() => {
    config = {
      cuUrl: 'https://cu.ao-testnet.xyz',
      hyperbeamBaseUrl: 'https://compute.hyperbeam.xyz',
      concurrency: 5,
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeout: 30000,
    };

    processor = new ManualModeProcessor(config);

    mockCUClient = (processor as any).cuClient;
    mockComparator = (processor as any).comparator;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndProcess', () => {
    const validProcessId = 'xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs';
    const validMessageId = 'UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc';

    it('should validate process ID format', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(false);
      mockCUClient.validateMessageId.mockReturnValue(true);

      await expect(
        processor.validateAndProcess('invalid', validMessageId, false)
      ).rejects.toThrow('Invalid process ID format');

      expect(mockCUClient.validateProcessId).toHaveBeenCalledWith('invalid');
    });

    it('should validate message ID format', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(false);

      await expect(
        processor.validateAndProcess(validProcessId, 'invalid', false)
      ).rejects.toThrow('Invalid message ID format');

      expect(mockCUClient.validateMessageId).toHaveBeenCalledWith('invalid');
    });

    it('should accept valid 43-character alphanumeric process ID', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockResolvedValue({
        'addr1': '1000',
        'addr2': '2000',
      });
      mockComparator.extractAddresses.mockReturnValue(['addr1', 'addr2']);
      mockComparator.compareBalances.mockReturnValue({
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      });

      await processor.validateAndProcess(validProcessId, validMessageId, false);

      expect(mockCUClient.validateProcessId).toHaveBeenCalledWith(validProcessId);
    });

    it('should accept valid 43-character alphanumeric message ID', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockResolvedValue({
        'addr1': '1000',
      });
      mockComparator.extractAddresses.mockReturnValue(['addr1']);
      mockComparator.compareBalances.mockReturnValue({
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      });

      await processor.validateAndProcess(validProcessId, validMessageId, false);

      expect(mockCUClient.validateMessageId).toHaveBeenCalledWith(validMessageId);
    });

    it('should fetch message result from CU', async () => {
      const balanceData = {
        'addr1': '1000',
        'addr2': '2000',
      };

      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockResolvedValue(balanceData);
      mockComparator.extractAddresses.mockReturnValue(['addr1', 'addr2']);
      mockComparator.compareBalances.mockReturnValue({
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      });

      await processor.validateAndProcess(validProcessId, validMessageId, false);

      expect(mockCUClient.getResultFromCU).toHaveBeenCalledWith(
        validMessageId,
        validProcessId,
        config.cuUrl
      );
    });

    it('should return empty array when no balances found', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockResolvedValue({});
      mockComparator.extractAddresses.mockReturnValue([]);

      const result = await processor.validateAndProcess(
        validProcessId,
        validMessageId,
        false
      );

      expect(result).toEqual([]);
    });

    it('should handle CU client errors gracefully', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockRejectedValue(
        new Error('CU connection failed')
      );

      await expect(
        processor.validateAndProcess(validProcessId, validMessageId, false)
      ).rejects.toThrow('Failed to fetch balances from message');
    });

    it('should handle invalid balance data format', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockResolvedValue(null as any);

      await expect(
        processor.validateAndProcess(validProcessId, validMessageId, false)
      ).rejects.toThrow('Invalid balance data format');
    });

    it('should process balances with progress bar disabled', async () => {
      const balanceData = {
        'addr1': '1000',
      };

      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockResolvedValue(balanceData);
      mockComparator.extractAddresses.mockReturnValue(['addr1']);
      mockComparator.compareBalances.mockReturnValue({
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      });

      const result = await processor.validateAndProcess(
        validProcessId,
        validMessageId,
        false
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        address: 'addr1',
        match: true,
      });
    });

    it('should respect maxAddresses configuration', async () => {
      const configWithMax = { ...config, maxAddresses: 2 };
      const processorWithMax = new ManualModeProcessor(configWithMax);
      const mockCUClientWithMax = (processorWithMax as any).cuClient;
      const mockComparatorWithMax = (processorWithMax as any).comparator;

      const balanceData = {
        'addr1': '1000',
        'addr2': '2000',
        'addr3': '3000',
      };

      mockCUClientWithMax.validateProcessId.mockResolvedValue(true);
      mockCUClientWithMax.validateMessageId.mockReturnValue(true);
      mockCUClientWithMax.getResultFromCU.mockResolvedValue(balanceData);
      mockComparatorWithMax.extractAddresses.mockReturnValue([
        'addr1',
        'addr2',
        'addr3',
      ]);
      mockComparatorWithMax.compareBalances.mockReturnValue({
        address: 'addr1',
        aoBalance: '1000',
        hyperbeamBalance: '1000',
        match: true,
      });

      const result = await processorWithMax.validateAndProcess(
        validProcessId,
        validMessageId,
        false
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('Message ID validation', () => {
    beforeEach(() => {
      jest.unmock('../src/cuClient');
    });

    afterEach(() => {
      jest.mock('../src/cuClient');
    });

    it('should reject empty message ID', () => {
      const validateMessageId = (messageId: string): boolean => {
        if (!messageId || messageId.trim().length === 0) {
          return false;
        }
        if (messageId.length !== 43) {
          return false;
        }
        const validChars = /^[a-zA-Z0-9_-]+$/;
        return validChars.test(messageId);
      };

      expect(validateMessageId('')).toBe(false);
    });

    it('should reject message ID with invalid length', () => {
      const validateMessageId = (messageId: string): boolean => {
        if (!messageId || messageId.trim().length === 0) {
          return false;
        }
        if (messageId.length !== 43) {
          return false;
        }
        const validChars = /^[a-zA-Z0-9_-]+$/;
        return validChars.test(messageId);
      };

      expect(validateMessageId('short')).toBe(false);
      expect(validateMessageId('a'.repeat(44))).toBe(false);
    });

    it('should reject message ID with invalid characters', () => {
      const validateMessageId = (messageId: string): boolean => {
        if (!messageId || messageId.trim().length === 0) {
          return false;
        }
        if (messageId.length !== 43) {
          return false;
        }
        const validChars = /^[a-zA-Z0-9_-]+$/;
        return validChars.test(messageId);
      };

      expect(validateMessageId('a'.repeat(42) + '!')).toBe(false);
      expect(validateMessageId('a'.repeat(42) + '@')).toBe(false);
    });

    it('should accept valid 43-character alphanumeric message ID', () => {
      const validateMessageId = (messageId: string): boolean => {
        if (!messageId || messageId.trim().length === 0) {
          return false;
        }
        if (messageId.length !== 43) {
          return false;
        }
        const validChars = /^[a-zA-Z0-9_-]+$/;
        return validChars.test(messageId);
      };

      expect(
        validateMessageId('UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc')
      ).toBe(true);
    });

    it('should accept message ID with underscores and hyphens', () => {
      const validateMessageId = (messageId: string): boolean => {
        if (!messageId || messageId.trim().length === 0) {
          return false;
        }
        if (messageId.length !== 43) {
          return false;
        }
        const validChars = /^[a-zA-Z0-9_-]+$/;
        return validChars.test(messageId);
      };

      expect(
        validateMessageId('a-b_c'.padEnd(43, 'x'))
      ).toBe(true);
    });
  });

  describe('Error handling', () => {
    const validProcessId = 'xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQB6gdJs';
    const validMessageId = 'UZ0D49e04Xdzqz_Bg4XWQlifxlTAKDtkr3Uiwm_2VMc';

    it('should provide clear error for message not found', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockRejectedValue(
        new Error('Message not found on CU')
      );

      await expect(
        processor.validateAndProcess(validProcessId, validMessageId, false)
      ).rejects.toThrow('Failed to fetch balances from message');
    });

    it('should handle malformed JSON in message data', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockResolvedValue('not an object' as any);

      await expect(
        processor.validateAndProcess(validProcessId, validMessageId, false)
      ).rejects.toThrow('Invalid balance data format');
    });

    it('should handle CU timeout', async () => {
      mockCUClient.validateProcessId.mockResolvedValue(true);
      mockCUClient.validateMessageId.mockReturnValue(true);
      mockCUClient.getResultFromCU.mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(
        processor.validateAndProcess(validProcessId, validMessageId, false)
      ).rejects.toThrow('Failed to fetch balances from message');
    });
  });
});
