#!/usr/bin/env node

import { Command } from 'commander';
import { getConfig, validateConfig } from './config';
import { BalanceProcessor } from './processor';
import { BalanceComparator } from './comparator';
import { Reporter } from './reporter';
import { OutputFormat } from './types';

const program = new Command();

program
  .name('balance-checker')
  .description('CLI tool to validate AO process balances against Hyperbeam API')
  .version('1.0.0')
  .argument('<process-id>', 'AO process ID to check balances for')
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

      if (options.verbose) {
        reporter.printInfo(`Using CU_URL: ${config.cuUrl}`);
        reporter.printInfo(`Using Hyperbeam: ${config.hyperbeamBaseUrl}`);
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

      const processor = new BalanceProcessor(config);
      const comparisons = await processor.validateAndProcess(
        processId,
        options.progress
      );

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
