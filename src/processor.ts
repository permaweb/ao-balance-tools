import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import { AOClient } from './aoClient';
import { HyperbeamClient } from './hyperbeam';
import { BalanceComparator } from './comparator';
import { Config, BalanceComparison } from './types';

export class BalanceProcessor {
  private aoClient: AOClient;
  private comparator: BalanceComparator;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.aoClient = new AOClient(config);
    this.comparator = new BalanceComparator();
  }

  async processBalances(
    processId: string,
    showProgress: boolean = true
  ): Promise<BalanceComparison[]> {
    const aoBalances = await this.aoClient.getBalances(processId);
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

  async validateAndProcess(processId: string, showProgress: boolean = true) {
    const isValid = await this.aoClient.validateProcessId(processId);
    
    if (!isValid) {
      throw new Error(
        `Invalid process ID format: ${processId}. Expected 43-character alphanumeric string.`
      );
    }

    return this.processBalances(processId, showProgress);
  }
}
