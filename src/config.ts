import { config as loadEnv } from 'dotenv';
import { Config } from './types';
import * as fs from 'fs';

loadEnv();

export function getConfig(): Config {
  const cuUrl = process.env.CU_URL;
  
  if (!cuUrl) {
    throw new Error('CU_URL environment variable is required');
  }

  const maxAddresses = process.env.MAX_ADDRESSES ? parseInt(process.env.MAX_ADDRESSES, 10) : undefined;

  return {
    cuUrl,
    hyperbeamBaseUrl: process.env.HYPERBEAM_BASE_URL || 'https://compute.hyperbeam.xyz',
    concurrency: parseInt(process.env.CONCURRENCY || '15', 10),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
    timeout: parseInt(process.env.TIMEOUT || '30000', 10),
    maxAddresses,
    cuUrlA: process.env.CU_URL_A || 'https://cu.ardrive.io',
    cuUrlB: process.env.CU_URL_B || 'https://cu.ao-testnet.xyz',
    walletPath: process.env.WALLET_PATH || './demo.json',
  };
}

export function validateWalletPath(walletPath: string): void {
  if (!walletPath || walletPath.trim().length === 0) {
    throw new Error('Wallet path cannot be empty');
  }

  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet file not found: ${walletPath}`);
  }

  try {
    const walletData = fs.readFileSync(walletPath, 'utf-8');
    const wallet = JSON.parse(walletData);
    
    if (!wallet.kty || !wallet.n || !wallet.e) {
      throw new Error('Invalid JWK format: missing required fields (kty, n, e)');
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid JWK')) {
        throw error;
      }
      throw new Error(`Invalid wallet file format: ${error.message}`);
    }
    throw new Error('Invalid wallet file format: Unknown error');
  }
}

export function validateConfig(config: Config): void {
  if (!config.cuUrl || !config.cuUrl.startsWith('http')) {
    throw new Error('Invalid CU_URL: must be a valid HTTP/HTTPS URL');
  }

  if (config.concurrency < 1 || config.concurrency > 100) {
    throw new Error('Concurrency must be between 1 and 100');
  }

  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    throw new Error('Retry attempts must be between 0 and 10');
  }

  if (config.timeout < 1000) {
    throw new Error('Timeout must be at least 1000ms');
  }
}
