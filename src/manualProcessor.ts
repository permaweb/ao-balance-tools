import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import * as fs from 'fs';
import { CUClient } from './cuClient';
import { HyperbeamClient } from './hyperbeam';
import { BalanceComparator } from './comparator';
import { Config, BalanceComparison, AOBalanceResponse } from './types';

export class ManualModeProcessor {
  private cuClient: CUClient;
  private comparator: BalanceComparator;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.cuClient = new CUClient(config);
    this.comparator = new BalanceComparator();
  }

  async validateAndProcess(
    processId: string,
    messageId: string,
    showProgress: boolean = true
  ): Promise<BalanceComparison[]> {
    const isValidProcessId = await this.cuClient.validateProcessId(processId);
    
    if (!isValidProcessId) {
      throw new Error(
        `Invalid process ID format: ${processId}. Expected 43-character alphanumeric string.`
      );
    }

    const isValidMessageId = this.cuClient.validateMessageId(messageId);
    
    if (!isValidMessageId) {
      throw new Error(
        `Invalid message ID format: ${messageId}. Expected 43-character alphanumeric string.`
      );
    }

    return this.processBalances(processId, messageId, showProgress);
  }

  async validateAndProcessFromFile(
    processId: string,
    balancesFilePath: string,
    showProgress: boolean = true
  ): Promise<BalanceComparison[]> {
    const isValidProcessId = await this.cuClient.validateProcessId(processId);
    
    if (!isValidProcessId) {
      throw new Error(
        `Invalid process ID format: ${processId}. Expected 43-character alphanumeric string.`
      );
    }

    if (!fs.existsSync(balancesFilePath)) {
      throw new Error(`Balances file not found: ${balancesFilePath}`);
    }

    return this.processBalancesFromFile(processId, balancesFilePath, showProgress);
  }

  private async processBalancesFromFile(
    processId: string,
    balancesFilePath: string,
    showProgress: boolean = true
  ): Promise<BalanceComparison[]> {
    const aoBalances = await this.fetchBalancesFromFile(balancesFilePath);
    const addresses = this.comparator.extractAddresses(aoBalances);

    if (addresses.length === 0) {
      return [];
    }

    const maxAddresses = this.config.maxAddresses || addresses.length;
    const limitedAddresses = addresses.slice(0, maxAddresses);

    console.log(`Processing ${limitedAddresses.length} of ${addresses.length} total addresses`);

    const hyperbeamClient = new HyperbeamClient(this.config, processId);

    const progressBar = showProgress
      ? new cliProgress.SingleBar(
          {
            format: 'Progress |{bar}| {percentage}% | {value}/{total} addresses',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
          },
          cliProgress.Presets.shades_classic
        )
      : null;

    if (progressBar) {
      progressBar.start(limitedAddresses.length, 0);
    }

    const limit = pLimit(this.config.concurrency);
    let completed = 0;

    const tasks = limitedAddresses.map(address =>
      limit(async () => {
        try {
          const aoBalance = aoBalances[address];
          const hyperbeamBalance = await hyperbeamClient.getBalance(address);
          
          const comparison = this.comparator.compareBalances(
            address,
            aoBalance,
            hyperbeamBalance
          );

          completed++;
          if (progressBar) {
            progressBar.update(completed);
          }

          return comparison;
        } catch (error) {
          completed++;
          if (progressBar) {
            progressBar.update(completed);
          }

          return this.comparator.compareBalances(
            address,
            aoBalances[address],
            '0'
          );
        }
      })
    );

    const results = await Promise.all(tasks);
    
    if (progressBar) {
      progressBar.stop();
    }

    return results;
  }

  private async processBalances(
    processId: string,
    messageId: string,
    showProgress: boolean = true
  ): Promise<BalanceComparison[]> {
    const aoBalances = await this.fetchBalancesFromMessage(processId, messageId);
    const addresses = this.comparator.extractAddresses(aoBalances);

    if (addresses.length === 0) {
      return [];
    }

    const maxAddresses = this.config.maxAddresses || addresses.length;
    const limitedAddresses = addresses.slice(0, maxAddresses);

    console.log(`Processing ${limitedAddresses.length} of ${addresses.length} total addresses`);

    const hyperbeamClient = new HyperbeamClient(this.config, processId);

    const progressBar = showProgress
      ? new cliProgress.SingleBar(
          {
            format: 'Progress |{bar}| {percentage}% | {value}/{total} addresses',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
          },
          cliProgress.Presets.shades_classic
        )
      : null;

    if (progressBar) {
      progressBar.start(limitedAddresses.length, 0);
    }

    const limit = pLimit(this.config.concurrency);
    let completed = 0;

    const tasks = limitedAddresses.map(address =>
      limit(async () => {
        try {
          const aoBalance = aoBalances[address];
          const hyperbeamBalance = await hyperbeamClient.getBalance(address);
          
          const comparison = this.comparator.compareBalances(
            address,
            aoBalance,
            hyperbeamBalance
          );

          completed++;
          if (progressBar) {
            progressBar.update(completed);
          }

          return comparison;
        } catch (error) {
          completed++;
          if (progressBar) {
            progressBar.update(completed);
          }

          return this.comparator.compareBalances(
            address,
            aoBalances[address],
            '0'
          );
        }
      })
    );

    const results = await Promise.all(tasks);
    
    if (progressBar) {
      progressBar.stop();
    }

    return results;
  }

  private async fetchBalancesFromFile(
    balancesFilePath: string
  ): Promise<AOBalanceResponse> {
    try {
      const fileContent = fs.readFileSync(balancesFilePath, 'utf-8');
      const balanceData = JSON.parse(fileContent);

      if (typeof balanceData !== 'object' || balanceData === null) {
        throw new Error(
          `Invalid balance data format in file ${balancesFilePath}: expected object`
        );
      }

      return balanceData as AOBalanceResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch balances from file ${balancesFilePath}: ${error.message}`
        );
      }
      throw new Error(`Failed to fetch balances from file ${balancesFilePath}: Unknown error`);
    }
  }

  private async fetchBalancesFromMessage(
    processId: string,
    messageId: string
  ): Promise<AOBalanceResponse> {
    try {
      const balanceData = await this.cuClient.getResultFromCU(
        messageId,
        processId,
        this.config.cuUrl
      );

      if (typeof balanceData !== 'object' || balanceData === null) {
        throw new Error(
          `Invalid balance data format in message ${messageId}: expected object`
        );
      }

      return balanceData as AOBalanceResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch balances from message ${messageId}: ${error.message}`
        );
      }
      throw new Error(`Failed to fetch balances from message ${messageId}: Unknown error`);
    }
  }
}
