import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ComparisonReport, CUComparisonReport, OutputFormat } from './types';

export class Reporter {
  
  async generateReport(
    report: ComparisonReport,
    format: OutputFormat,
    outputFile?: string
  ): Promise<void> {
    switch (format) {
      case 'console':
        this.printConsoleReport(report);
        break;
      case 'json':
        await this.generateJsonReport(report, outputFile);
        break;
      case 'csv':
        await this.generateCsvReport(report, outputFile);
        break;
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  private printConsoleReport(report: ComparisonReport): void {
    console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
    console.log(chalk.bold.cyan('  BALANCE COMPARISON REPORT'));
    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log();

    console.log(chalk.bold('Process ID:'), report.processId);
    console.log(chalk.bold('Timestamp:'), new Date(report.timestamp).toLocaleString());
    console.log(chalk.bold('Total Addresses:'), report.totalAddresses);
    console.log();

    console.log(chalk.bold('Summary:'));
    console.log('  ' + chalk.green('✓ Matching:'), report.matchingCount);
    console.log('  ' + chalk.red('✗ Mismatching:'), report.mismatchCount);
    console.log('  ' + chalk.bold('Accuracy:'), `${report.accuracyPercentage.toFixed(2)}%`);
    console.log('  ' + chalk.bold('Total Discrepancy:'), report.totalDiscrepancy);
    console.log();

    if (report.mismatchCount > 0) {
      console.log(chalk.bold.red('MISMATCHED BALANCES:'));
      console.log(chalk.red('─'.repeat(80)));
      console.log();

      report.mismatches.forEach((mismatch, index) => {
        console.log(chalk.bold(`[${index + 1}] Address:`), mismatch.address);
        console.log('    ' + chalk.yellow('AO Balance:'), mismatch.aoBalance);
        console.log('    ' + chalk.yellow('Hyperbeam Balance:'), mismatch.hyperbeamBalance);
        console.log('    ' + chalk.red('Difference:'), mismatch.difference || '0');
        console.log();
      });
    } else {
      console.log(chalk.bold.green('✓ All balances match!'));
      console.log();
    }

    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log();
  }

  private async generateJsonReport(
    report: ComparisonReport,
    outputFile?: string
  ): Promise<void> {
    const fileName = outputFile || `balance-report-${Date.now()}.json`;
    const filePath = path.resolve(fileName);

    const jsonContent = JSON.stringify(report, null, 2);
    
    await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
    
    console.log(chalk.green(`✓ JSON report saved to: ${filePath}`));
  }

  private async generateCsvReport(
    report: ComparisonReport,
    outputFile?: string
  ): Promise<void> {
    const fileName = outputFile || `balance-report-${Date.now()}.csv`;
    const filePath = path.resolve(fileName);

    const headers = [
      'Address',
      'AO Balance',
      'Hyperbeam Balance',
      'Match',
      'Difference'
    ];

    const rows = [headers.join(',')];

    const allComparisons = [...report.mismatches, ...report.matches];
    
    for (const comparison of allComparisons) {
      const row = [
        comparison.address,
        comparison.aoBalance,
        comparison.hyperbeamBalance,
        comparison.match ? 'Yes' : 'No',
        comparison.difference || '0'
      ];
      rows.push(row.join(','));
    }

    rows.push('');
    rows.push('Summary');
    rows.push(`Total Addresses,${report.totalAddresses}`);
    rows.push(`Matching,${report.matchingCount}`);
    rows.push(`Mismatching,${report.mismatchCount}`);
    rows.push(`Accuracy,${report.accuracyPercentage.toFixed(2)}%`);
    rows.push(`Total Discrepancy,${report.totalDiscrepancy}`);
    rows.push(`Process ID,${report.processId}`);
    rows.push(`Timestamp,${report.timestamp}`);

    const csvContent = rows.join('\n');
    
    await fs.promises.writeFile(filePath, csvContent, 'utf-8');
    
    console.log(chalk.green(`✓ CSV report saved to: ${filePath}`));
  }

  printError(error: Error): void {
    console.error(chalk.red('\n✗ Error:'), error.message);
    console.error();
  }

  printWarning(message: string): void {
    console.warn(chalk.yellow('⚠ Warning:'), message);
  }

  printInfo(message: string): void {
    console.log(chalk.blue('ℹ Info:'), message);
  }

  printSuccess(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  async generateCUComparisonReport(
    report: CUComparisonReport,
    format: OutputFormat,
    outputFile?: string
  ): Promise<void> {
    switch (format) {
      case 'console':
        this.printCUConsoleReport(report);
        break;
      case 'json':
        await this.generateCUJsonReport(report, outputFile);
        break;
      case 'csv':
        await this.generateCUCsvReport(report, outputFile);
        break;
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  private printCUConsoleReport(report: CUComparisonReport): void {
    console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
    console.log(chalk.bold.cyan('  CU BALANCE COMPARISON REPORT'));
    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log();

    console.log(chalk.bold('Process ID:'), report.processId);
    console.log(chalk.bold('Message ID:'), report.messageId);
    console.log(chalk.bold('Timestamp:'), new Date(report.timestamp).toLocaleString());
    console.log();

    console.log(chalk.bold('CU Endpoints:'));
    console.log('  ' + chalk.blue('CU A:'), report.cuAUrl);
    console.log('  ' + chalk.blue('CU B:'), report.cuBUrl);
    console.log();

    console.log(chalk.bold('Summary:'));
    console.log('  ' + chalk.bold('Total Addresses (CU A):'), report.totalAddressesA);
    console.log('  ' + chalk.bold('Total Addresses (CU B):'), report.totalAddressesB);
    console.log('  ' + chalk.bold('Common Addresses:'), report.commonAddresses);
    console.log('  ' + chalk.yellow('Only in CU A:'), report.onlyInA);
    console.log('  ' + chalk.yellow('Only in CU B:'), report.onlyInB);
    console.log('  ' + chalk.green('✓ Matching:'), report.matchingCount);
    console.log('  ' + chalk.red('✗ Mismatching:'), report.mismatchCount);
    console.log('  ' + chalk.bold('Accuracy:'), `${report.accuracyPercentage.toFixed(2)}%`);
    console.log('  ' + chalk.bold('Total Discrepancy:'), report.totalDiscrepancy);
    console.log();

    if (report.uniqueToA.length > 0) {
      console.log(chalk.bold.yellow(`UNIQUE TO CU A (${report.onlyInA}):`));
      console.log(chalk.yellow('─'.repeat(80)));
      report.uniqueToA.slice(0, 10).forEach((item, index) => {
        console.log(chalk.bold(`[${index + 1}] Address:`), item.address);
        console.log('    ' + chalk.blue('Balance:'), item.cuABalance);
      });
      if (report.uniqueToA.length > 10) {
        console.log(chalk.dim(`... and ${report.uniqueToA.length - 10} more`));
      }
      console.log();
    }

    if (report.uniqueToB.length > 0) {
      console.log(chalk.bold.yellow(`UNIQUE TO CU B (${report.onlyInB}):`));
      console.log(chalk.yellow('─'.repeat(80)));
      report.uniqueToB.slice(0, 10).forEach((item, index) => {
        console.log(chalk.bold(`[${index + 1}] Address:`), item.address);
        console.log('    ' + chalk.blue('Balance:'), item.cuBBalance);
      });
      if (report.uniqueToB.length > 10) {
        console.log(chalk.dim(`... and ${report.uniqueToB.length - 10} more`));
      }
      console.log();
    }

    if (report.mismatchCount > 0) {
      console.log(chalk.bold.red(`MISMATCHED BALANCES (${report.mismatchCount}):`));
      console.log(chalk.red('─'.repeat(80)));
      console.log();

      report.mismatches.slice(0, 20).forEach((mismatch, index) => {
        console.log(chalk.bold(`[${index + 1}] Address:`), mismatch.address);
        console.log('    ' + chalk.yellow('CU A Balance:'), mismatch.cuABalance);
        console.log('    ' + chalk.yellow('CU B Balance:'), mismatch.cuBBalance);
        console.log('    ' + chalk.red('Difference:'), mismatch.difference || '0');
        console.log();
      });

      if (report.mismatches.length > 20) {
        console.log(chalk.dim(`... and ${report.mismatches.length - 20} more mismatches`));
        console.log();
      }
    } else if (report.onlyInA === 0 && report.onlyInB === 0) {
      console.log(chalk.bold.green('✓ All balances match perfectly!'));
      console.log();
    }

    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log();
  }

  private async generateCUJsonReport(
    report: CUComparisonReport,
    outputFile?: string
  ): Promise<void> {
    const fileName = outputFile || `cu-comparison-${Date.now()}.json`;
    const filePath = path.resolve(fileName);

    const jsonContent = JSON.stringify(report, null, 2);
    
    await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
    
    console.log(chalk.green(`✓ JSON report saved to: ${filePath}`));
  }

  private async generateCUCsvReport(
    report: CUComparisonReport,
    outputFile?: string
  ): Promise<void> {
    const fileName = outputFile || `cu-comparison-${Date.now()}.csv`;
    const filePath = path.resolve(fileName);

    const headers = [
      'Address',
      'CU A Balance',
      'CU B Balance',
      'Status',
      'Difference'
    ];

    const rows = [headers.join(',')];

    const allComparisons = [
      ...report.uniqueToA,
      ...report.uniqueToB,
      ...report.mismatches,
      ...report.matches
    ];
    
    for (const comparison of allComparisons) {
      let status = 'Match';
      if (comparison.onlyInA) status = 'Only in CU A';
      else if (comparison.onlyInB) status = 'Only in CU B';
      else if (!comparison.match) status = 'Mismatch';

      const row = [
        comparison.address,
        comparison.cuABalance || '',
        comparison.cuBBalance || '',
        status,
        comparison.difference || '0'
      ];
      rows.push(row.join(','));
    }

    rows.push('');
    rows.push('Summary');
    rows.push(`Process ID,${report.processId}`);
    rows.push(`Message ID,${report.messageId}`);
    rows.push(`CU A,${report.cuAUrl}`);
    rows.push(`CU B,${report.cuBUrl}`);
    rows.push(`Total Addresses (CU A),${report.totalAddressesA}`);
    rows.push(`Total Addresses (CU B),${report.totalAddressesB}`);
    rows.push(`Common Addresses,${report.commonAddresses}`);
    rows.push(`Only in CU A,${report.onlyInA}`);
    rows.push(`Only in CU B,${report.onlyInB}`);
    rows.push(`Matching,${report.matchingCount}`);
    rows.push(`Mismatching,${report.mismatchCount}`);
    rows.push(`Accuracy,${report.accuracyPercentage.toFixed(2)}%`);
    rows.push(`Total Discrepancy,${report.totalDiscrepancy}`);
    rows.push(`Timestamp,${report.timestamp}`);

    const csvContent = rows.join('\n');
    
    await fs.promises.writeFile(filePath, csvContent, 'utf-8');
    
    console.log(chalk.green(`✓ CSV report saved to: ${filePath}`));
  }
}
