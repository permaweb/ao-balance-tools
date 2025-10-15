#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, validateConfig } from './config';
import { CUClient } from './cuClient';
import { CUComparator } from './cuComparator';
import { Reporter } from './reporter';
import { OutputFormat } from './types';

const program = new Command();

program
  .name('cu-compare')
  .description('Compare AO process balances between two CUs')
  .version('1.0.0')
  .argument('<process-id>', 'AO process ID to compare')
  .option('-a, --cu-a <url>', 'First CU URL')
  .option('-b, --cu-b <url>', 'Second CU URL')
  .option('-w, --wallet <path>', 'Path to wallet JWK file')
  .option('-o, --output <format>', 'Output format: console, json, or csv', 'console')
  .option('-f, --file <path>', 'Output file path (for json/csv formats)')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (processId: string, options) => {
    const reporter = new Reporter();

    try {
      if (options.verbose) {
        reporter.printInfo('Loading configuration...');
      }

      const config = getConfig();
      validateConfig(config);

      const cuUrlA = options.cuA || config.cuUrlA || 'https://cu.ardrive.io';
      const cuUrlB = options.cuB || config.cuUrlB || 'https://cu.ao-testnet.xyz';
      const walletPath = options.wallet || config.walletPath || './demo.json';

      if (options.verbose) {
        reporter.printInfo(`CU A: ${cuUrlA}`);
        reporter.printInfo(`CU B: ${cuUrlB}`);
        reporter.printInfo(`Wallet: ${walletPath}`);
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

      const cuClient = new CUClient(config);

      const isValid = await cuClient.validateProcessId(processId);
      if (!isValid) {
        reporter.printError(
          new Error(`Invalid process ID format: ${processId}. Expected 43-character alphanumeric string.`)
        );
        process.exit(1);
      }

      if (options.verbose) {
        reporter.printInfo('Loading wallet...');
      }

      const wallet = await cuClient.loadWallet(walletPath);

      if (options.verbose) {
        reporter.printInfo('Sending balance message...');
      }

      const messageId = await cuClient.sendBalanceMessage(processId, wallet);

      if (options.verbose) {
        reporter.printInfo(`Message ID: ${messageId}`);
        reporter.printInfo('Fetching results from both CUs...');
      }

      console.log(chalk.cyan('\nFetching balance data from CUs...'));

      const [balancesA, balancesB] = await Promise.all([
        cuClient.getResultFromCU(messageId, processId, cuUrlA),
        cuClient.getResultFromCU(messageId, processId, cuUrlB)
      ]);

      if (options.verbose) {
        reporter.printInfo(`CU A returned ${Object.keys(balancesA).length} addresses`);
        reporter.printInfo(`CU B returned ${Object.keys(balancesB).length} addresses`);
        reporter.printInfo('Comparing balances...');
      }

      const comparator = new CUComparator();
      const comparisons = comparator.compareBalances(balancesA, balancesB);
      const report = comparator.generateReport(
        comparisons,
        processId,
        messageId,
        cuUrlA,
        cuUrlB
      );

      await reporter.generateCUComparisonReport(report, outputFormat, options.file);

      if (report.mismatchCount > 0 || report.onlyInA > 0 || report.onlyInB > 0) {
        process.exit(1);
      } else {
        if (outputFormat === 'console') {
          reporter.printSuccess('CU comparison completed - all balances match!');
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
