export interface Config {
  cuUrl: string;
  hyperbeamBaseUrl: string;
  concurrency: number;
  retryAttempts: number;
  retryDelayMs: number;
  timeout: number;
  maxAddresses?: number;
  cuUrlA?: string;
  cuUrlB?: string;
  walletPath?: string;
}

export interface AddressBalance {
  address: string;
  balance: string;
}

export interface AOBalanceResponse {
  [address: string]: string;
}

export interface HyperbeamBalanceResponse {
  balance: string;
}

export interface BalanceComparison {
  address: string;
  aoBalance: string;
  hyperbeamBalance: string;
  match: boolean;
  difference?: string;
}

export interface ComparisonReport {
  totalAddresses: number;
  matchingCount: number;
  mismatchCount: number;
  accuracyPercentage: number;
  totalDiscrepancy: string;
  mismatches: BalanceComparison[];
  matches: BalanceComparison[];
  timestamp: string;
  processId: string;
}

export interface BalanceFetchResult {
  address: string;
  success: boolean;
  aoBalance?: string;
  hyperbeamBalance?: string;
  error?: string;
}

export type OutputFormat = 'console' | 'json' | 'csv';

export interface CLIOptions {
  processId: string;
  output?: OutputFormat;
  outputFile?: string;
  concurrency?: number;
  verbose?: boolean;
}

export interface CUComparisonResult {
  address: string;
  cuABalance?: string;
  cuBBalance?: string;
  match: boolean;
  onlyInA: boolean;
  onlyInB: boolean;
  difference?: string;
}

export interface CUComparisonReport {
  processId: string;
  messageId: string;
  cuAUrl: string;
  cuBUrl: string;
  totalAddressesA: number;
  totalAddressesB: number;
  commonAddresses: number;
  onlyInA: number;
  onlyInB: number;
  matchingCount: number;
  mismatchCount: number;
  accuracyPercentage: number;
  totalDiscrepancy: string;
  mismatches: CUComparisonResult[];
  matches: CUComparisonResult[];
  uniqueToA: CUComparisonResult[];
  uniqueToB: CUComparisonResult[];
  timestamp: string;
}

export interface CUBalanceResponse {
  [address: string]: string;
}

export interface JWK {
  kty: string;
  n: string;
  e: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
}
