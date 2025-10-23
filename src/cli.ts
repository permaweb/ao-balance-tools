#!/usr/bin/env node

import { Command } from 'commander';
import { getConfig, validateConfig, validateWalletPath } from './config';
import { BalanceProcessor } from './processor';
import { WalletBalanceProcessor } from './walletProcessor';
import { ManualModeProcessor } from './manualProcessor';
import { BalanceComparator } from './comparator';
import { Reporter } from './reporter';
import { OutputFormat, Mode } from './types';

const program = new Command();

program
  .name('balance-checker')
  .description('CLI tool to validate AO process balances against Hyperbeam API')
  .version('1.0.0')
  .argument('<process-id>', 'AO process ID to check balances for')
  .option('-m, --mode <type>', 'Balance fetch mode: dryrun, wallet, or manual', 'dryrun')
  .option('-w, --wallet <path>', 'Path to wallet file (required for wallet mode)')
  .option('--message-id <id>', 'Message ID to fetch balances from (required for manual mode)')
  .option('-o, --output <format>', 'Output format: console, json, or csv', 'console')
  .option('-f, --file <path>', 'Output file path (for json/csv formats)')
  .option('-c, --concurrency <number>', 'Number of concurrent requests', '15')
  .option('--no-progress', 'Disable progress bar')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (processId: string, options) => {
    const reporter = new Reporter();

    try {
      if (options.verbose) {
        reporter.printInfo('Loading configuration...');
      }

      const config = getConfig();
      
      if (options.concurrency) {
        config.concurrency = parseInt(options.concurrency, 10);
      }

      validateConfig(config);

      const mode = (options.mode || 'dryrun').toLowerCase() as Mode;
      
      if (!['dryrun', 'wallet', 'manual'].includes(mode)) {
        reporter.printError(
          new Error(`Invalid mode: ${options.mode}. Must be 'dryrun', 'wallet', or 'manual'.`)
        );
        process.exit(1);
      }

      if (mode === 'wallet' && !options.wallet) {
        if (!process.env.WALLET_PATH) {
          reporter.printError(
            new Error('--wallet option required for wallet mode (or set WALLET_PATH environment variable)')
          );
          process.exit(1);
        }
        options.wallet = process.env.WALLET_PATH;
      }

      if (mode === 'wallet' && options.wallet) {
        if (options.verbose) {
          reporter.printInfo(`Validating wallet file: ${options.wallet}`);
        }
        validateWalletPath(options.wallet);
      }

      if (mode === 'manual' && !options.messageId) {
        reporter.printError(
          new Error('--message-id option required for manual mode')
        );
        process.exit(1);
      }

      if (options.verbose) {
        reporter.printInfo(`Using CU_URL: ${config.cuUrl}`);
        reporter.printInfo(`Using Hyperbeam: ${config.hyperbeamBaseUrl}`);
        reporter.printInfo(`Mode: ${mode}`);
        if (mode === 'manual' && options.messageId) {
          reporter.printInfo(`Message ID: ${options.messageId}`);
        }
        reporter.printInfo(`Concurrency: ${config.concurrency}`);
      }

      const outputFormat = options.output.toLowerCase() as OutputFormat;
      
      if (!['console', 'json', 'csv'].includes(outputFormat)) {
        reporter.printError(
          new Error(`Invalid output format: ${options.output}. Must be console, json, or csv.`)
        );
        process.exit(1);
      }

      if (outputFormat !== 'console' && !options.file) {
        reporter.printWarning('No output file specified. Using default filename.');
      }

      if (options.verbose) {
        reporter.printInfo(`Processing balances for process: ${processId}`);
      }

      let comparisons;
      
      if (mode === 'manual') {
        const processor = new ManualModeProcessor(config);
        comparisons = await processor.validateAndProcess(
          processId,
          options.messageId,
          options.progress
        );
      } else if (mode === 'wallet') {
        const processor = new WalletBalanceProcessor(config, options.wallet);
        comparisons = await processor.validateAndProcess(
          processId,
          options.progress
        );
      } else {
        const processor = new BalanceProcessor(config);
        comparisons = await processor.validateAndProcess(
          processId,
          options.progress
        );
      }

      if (comparisons.length === 0) {
        reporter.printWarning('No balances found for this process.');
        process.exit(0);
      }

      const comparator = new BalanceComparator();
      const report = comparator.generateReport(comparisons, processId);

      await reporter.generateReport(report, outputFormat, options.file);

      if (report.mismatchCount > 0) {
        process.exit(1);
      } else {
        if (outputFormat === 'console') {
          reporter.printSuccess('Balance check completed successfully!');
        }
        process.exit(0);
      }
    } catch (error) {
      if (error instanceof Error) {
        reporter.printError(error);
        
        if (options.verbose && error.stack) {
          console.error(error.stack);
        }
      } else {
        reporter.printError(new Error('An unknown error occurred'));
      }
      
      process.exit(1);
    }
  });

program.parse();
