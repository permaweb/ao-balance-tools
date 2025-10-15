import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config } from './types';

export class HyperbeamClient {
  private config: Config;
  private axiosInstance: AxiosInstance;
  private processId: string;

  constructor(config: Config, processId: string) {
    this.config = config;
    this.processId = processId;
    this.axiosInstance = axios.create({
      baseURL: config.hyperbeamBaseUrl,
      timeout: config.timeout,
    });
  }

  async getBalance(address: string): Promise<string> {
    return this.retryOperation(async () => {
      try {
        const url = `/${this.processId}~process@1.0/compute/balances/${address}`;
        const response = await this.axiosInstance.get(url, {
          responseType: 'text',
        });

        if (!response.data) {
          console.error(`No data for ${address}, URL: ${this.config.hyperbeamBaseUrl}${url}`);
          throw new Error(`No data in response for address ${address}`);
        }

        const balance = response.data.toString().trim();
        if (process.env.DEBUG) {
          console.log(`Address: ${address}, Balance: ${balance}`);
        }
        return balance;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          if (axiosError.response?.status === 404) {
            if (process.env.DEBUG) {
              console.log(`404 for ${address}, returning 0`);
            }
            return '0';
          }
          
          if (axiosError.response?.status === 429) {
            throw new Error('Rate limit exceeded');
          }

          console.error(`Error for ${address}: ${axiosError.response?.status} - ${axiosError.message}`);
          throw new Error(
            `HTTP ${axiosError.response?.status || 'error'}: ${axiosError.message}`
          );
        }
        
        console.error(`Unknown error for ${address}:`, error);
        throw error;
      }
    });
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt >= this.config.retryAttempts;
      
      if (isLastAttempt) {
        throw error;
      }

      const shouldRetry = this.shouldRetry(error);
      
      if (!shouldRetry) {
        throw error;
      }

      const delay = this.calculateDelay(attempt);
      await this.sleep(delay);

      return this.retryOperation(operation, attempt + 1);
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status === 404) {
        return false;
      }

      if (status && status >= 400 && status < 500 && status !== 429) {
        return false;
      }

      return true;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout') || message.includes('network')) {
        return true;
      }
    }

    return false;
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
