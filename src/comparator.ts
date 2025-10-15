import { BalanceComparison, ComparisonReport, AOBalanceResponse } from './types';

export class BalanceComparator {
  
  compareBalances(
    address: string,
    aoBalance: string,
    hyperbeamBalance: string
  ): BalanceComparison {
    const normalizedAOBalance = this.normalizeBalance(aoBalance);
    const normalizedHyperbeamBalance = this.normalizeBalance(hyperbeamBalance);
    
    const match = normalizedAOBalance === normalizedHyperbeamBalance;
    
    const comparison: BalanceComparison = {
      address,
      aoBalance: normalizedAOBalance,
      hyperbeamBalance: normalizedHyperbeamBalance,
      match,
    };

    if (!match) {
      comparison.difference = this.calculateDifference(
        normalizedAOBalance,
        normalizedHyperbeamBalance
      );
    }

    return comparison;
  }

  generateReport(
    comparisons: BalanceComparison[],
    processId: string
  ): ComparisonReport {
    const mismatches = comparisons.filter(c => !c.match);
    const matches = comparisons.filter(c => c.match);
    
    const totalAddresses = comparisons.length;
    const matchingCount = matches.length;
    const mismatchCount = mismatches.length;
    
    const accuracyPercentage = totalAddresses > 0
      ? (matchingCount / totalAddresses) * 100
      : 0;

    const totalDiscrepancy = this.calculateTotalDiscrepancy(mismatches);

    return {
      totalAddresses,
      matchingCount,
      mismatchCount,
      accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
      totalDiscrepancy,
      mismatches,
      matches,
      timestamp: new Date().toISOString(),
      processId,
    };
  }

  private normalizeBalance(balance: string): string {
    if (!balance) {
      return '0';
    }

    const cleanedBalance = balance.toString().trim();
    
    if (cleanedBalance === '' || cleanedBalance === 'null' || cleanedBalance === 'undefined') {
      return '0';
    }

    try {
      const numericValue = BigInt(cleanedBalance);
      return numericValue.toString();
    } catch {
      return '0';
    }
  }

  private calculateDifference(balance1: string, balance2: string): string {
    try {
      const b1 = BigInt(balance1);
      const b2 = BigInt(balance2);
      const diff = b1 - b2;
      return diff.toString();
    } catch {
      return '0';
    }
  }

  private calculateTotalDiscrepancy(mismatches: BalanceComparison[]): string {
    try {
      let total = BigInt(0);
      
      for (const mismatch of mismatches) {
        if (mismatch.difference) {
          const absDiff = BigInt(mismatch.difference);
          total += absDiff < 0 ? -absDiff : absDiff;
        }
      }
      
      return total.toString();
    } catch {
      return '0';
    }
  }

  extractAddresses(aoBalances: AOBalanceResponse): string[] {
    return Object.keys(aoBalances);
  }
}
