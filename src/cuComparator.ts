import { CUBalanceResponse, CUComparisonResult, CUComparisonReport } from './types';

export class CUComparator {
  
  compareBalances(
    balancesA: CUBalanceResponse,
    balancesB: CUBalanceResponse
  ): CUComparisonResult[] {
    const allAddresses = new Set([
      ...Object.keys(balancesA),
      ...Object.keys(balancesB)
    ]);

    const results: CUComparisonResult[] = [];

    for (const address of allAddresses) {
      const balA = balancesA[address];
      const balB = balancesB[address];

      const onlyInA = balA !== undefined && balB === undefined;
      const onlyInB = balB !== undefined && balA === undefined;

      let match = false;
      let difference: string | undefined;

      if (!onlyInA && !onlyInB) {
        const normalizedA = this.normalizeBalance(balA);
        const normalizedB = this.normalizeBalance(balB);
        match = normalizedA === normalizedB;
        
        if (!match) {
          difference = this.calculateDifference(normalizedA, normalizedB);
        }
      }

      results.push({
        address,
        cuABalance: balA,
        cuBBalance: balB,
        match,
        onlyInA,
        onlyInB,
        difference
      });
    }

    return results;
  }

  generateReport(
    comparisons: CUComparisonResult[],
    processId: string,
    messageId: string,
    cuAUrl: string,
    cuBUrl: string
  ): CUComparisonReport {
    const uniqueToA = comparisons.filter(c => c.onlyInA);
    const uniqueToB = comparisons.filter(c => c.onlyInB);
    const common = comparisons.filter(c => !c.onlyInA && !c.onlyInB);
    const matches = common.filter(c => c.match);
    const mismatches = common.filter(c => !c.match);

    const totalAddressesA = comparisons.filter(c => c.cuABalance !== undefined).length;
    const totalAddressesB = comparisons.filter(c => c.cuBBalance !== undefined).length;
    const commonAddresses = common.length;
    const matchingCount = matches.length;
    const mismatchCount = mismatches.length;

    const accuracyPercentage = commonAddresses > 0
      ? (matchingCount / commonAddresses) * 100
      : 0;

    const totalDiscrepancy = this.calculateTotalDiscrepancy(mismatches);

    return {
      processId,
      messageId,
      cuAUrl,
      cuBUrl,
      totalAddressesA,
      totalAddressesB,
      commonAddresses,
      onlyInA: uniqueToA.length,
      onlyInB: uniqueToB.length,
      matchingCount,
      mismatchCount,
      accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
      totalDiscrepancy,
      mismatches,
      matches,
      uniqueToA,
      uniqueToB,
      timestamp: new Date().toISOString(),
    };
  }

  private normalizeBalance(balance: string | undefined): string {
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

  private calculateTotalDiscrepancy(mismatches: CUComparisonResult[]): string {
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
}
