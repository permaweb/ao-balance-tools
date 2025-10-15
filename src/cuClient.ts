import { message, result, createDataItemSigner } from '@permaweb/aoconnect';
import * as fs from 'fs';
import { Config, JWK, CUBalanceResponse } from './types';

export class CUClient {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async loadWallet(walletPath: string): Promise<JWK> {
    try {
      const walletData = fs.readFileSync(walletPath, 'utf-8');
      const wallet = JSON.parse(walletData);
      
      if (!wallet.kty || !wallet.n || !wallet.e) {
        throw new Error('Invalid JWK format: missing required fields (kty, n, e)');
      }
      
      return wallet as JWK;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Wallet file not found: ${walletPath}`);
        }
        if (error.message.includes('Invalid JWK')) {
          throw error;
        }
        throw new Error(`Failed to load wallet: ${error.message}`);
      }
      throw new Error('Failed to load wallet: Unknown error');
    }
  }

  async sendBalanceMessage(processId: string, wallet: JWK): Promise<string> {
    try {
      const messageId = await message({
        process: processId,
        tags: [
          { name: 'Action', value: 'Balances' }
        ],
        signer: createDataItemSigner(wallet),
        data: '',
      });

      if (!messageId) {
        throw new Error('No message ID returned from message() call');
      }

      return messageId;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send balance message: ${error.message}`);
      }
      throw new Error('Failed to send balance message: Unknown error');
    }
  }

  async getResultFromCU(
    messageId: string,
    processId: string,
    cuUrl: string,
    retryCount: number = 0
  ): Promise<CUBalanceResponse> {
    try {
      const cuResult = await result({
        message: messageId,
        process: processId,
      });

      if (!cuResult || !cuResult.Messages || cuResult.Messages.length === 0) {
        throw new Error(`No messages in result from CU ${cuUrl}`);
      }

      const message = cuResult.Messages[0];
      
      if (!message.Data) {
        throw new Error(`No data in message from CU ${cuUrl}`);
      }

      let balanceData: CUBalanceResponse;
      
      try {
        balanceData = JSON.parse(message.Data);
      } catch (parseError) {
        throw new Error(
          `Failed to parse balance data from CU ${cuUrl}: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`
        );
      }

      if (typeof balanceData !== 'object' || balanceData === null) {
        throw new Error(`Invalid balance data format from CU ${cuUrl}: expected object`);
      }

      return balanceData;
    } catch (error) {
      if (retryCount < this.config.retryAttempts) {
        const delay = this.calculateDelay(retryCount);
        await this.sleep(delay);
        return this.getResultFromCU(messageId, processId, cuUrl, retryCount + 1);
      }

      if (error instanceof Error) {
        throw new Error(`Failed to get result from CU ${cuUrl}: ${error.message}`);
      }
      throw new Error(`Failed to get result from CU ${cuUrl}: Unknown error`);
    }
  }

  async validateProcessId(processId: string): Promise<boolean> {
    if (!processId || processId.trim().length === 0) {
      return false;
    }

    if (processId.length !== 43) {
      return false;
    }

    const validChars = /^[a-zA-Z0-9_-]+$/;
    return validChars.test(processId);
  }

  private calculateDelay(attempt: number): number {
    const baseDelay = this.config.retryDelayMs;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
