import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import { CUClient } from './cuClient';
import { HyperbeamClient } from './hyperbeam';
import { BalanceComparator } from './comparator';
import { Config, BalanceComparison } from './types';

export class WalletBalanceProcessor {
  private cuClient: CUClient;
  private comparator: BalanceComparator;
  private config: Config;
  private walletPath: string;

  constructor(config: Config, walletPath: string) {
    this.config = config;
    this.walletPath = walletPath;
    this.cuClient = new CUClient(config);
    this.comparator = new BalanceComparator();
  }

  async processBalances(
    processId: string,
    showProgress: boolean = true
  ): Promise<BalanceComparison[]> {
    const wallet = await this.cuClient.loadWallet(this.walletPath);
    
    const messageId = await this.cuClient.sendBalanceMessage(processId, wallet);
    
    const walletBalances = await this.cuClient.getResultFromCU(
      messageId,
      processId,
      this.config.cuUrl
    );
    
    const addresses = this.comparator.extractAddresses(walletBalances);

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
          const walletBalance = walletBalances[address];
          const hyperbeamBalance = await hyperbeamClient.getBalance(address);
          
          const comparison = this.comparator.compareBalances(
            address,
            walletBalance,
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
            walletBalances[address],
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

  async validateAndProcess(processId: string, showProgress: boolean = true) {
    const isValid = await this.cuClient.validateProcessId(processId);
    
    if (!isValid) {
      throw new Error(
        `Invalid process ID format: ${processId}. Expected 43-character alphanumeric string.`
      );
    }

    return this.processBalances(processId, showProgress);
  }
}
